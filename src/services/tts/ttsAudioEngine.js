import crypto, { randomUUID } from 'node:crypto';
import axios from 'axios';
import { logger } from '../../utils/logger.js';
import { getVoiceById, getDefaultVoice, getSpeedRate } from './ttsVoices.js';

let WSClient = globalThis.WebSocket;
try {
  const wsMod = await import('ws');
  if (wsMod.default || wsMod.WebSocket) {
    WSClient = wsMod.default || wsMod.WebSocket;
  }
} catch {
  // Use globalThis.WebSocket in Node 22
}

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';

/**
 * Tạo token Sec-MS-GEC để xác thực với máy chủ Bing Edge TTS
 * Thuật toán chuẩn: (Date.now() ticks kể từ năm 1601 làm tròn xuống 5 phút) + TRUSTED_CLIENT_TOKEN -> SHA256 (uppercase)
 */
function generateSecMsGec() {
  try {
    const ticks = BigInt(Date.now()) * 10000n + 116444736000000000n;
    const rounded = ticks - (ticks % 3000000000n);
    const str = `${rounded}${TRUSTED_CLIENT_TOKEN}`;
    return crypto.createHash('sha256').update(str).digest('hex').toUpperCase();
  } catch (err) {
    logger.warn('Failed to calculate Sec-MS-GEC:', err?.message);
    return '';
  }
}

/**
 * Tách văn bản thành các đoạn ngắn hơn giới hạn maxLen để Google TTS đọc mượt mà
 */
function splitIntoChunks(text, maxLen = 180) {
  const clean = String(text || '').trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const sentences = clean.split(/(?<=[.!?,\n;])\s+/);
  const chunks = [];
  let current = '';

  for (const part of sentences) {
    if ((current + ' ' + part).trim().length <= maxLen) {
      current = (current ? current + ' ' + part : part).trim();
    } else {
      if (current) chunks.push(current);
      if (part.length <= maxLen) {
        current = part;
      } else {
        const words = part.split(/\s+/);
        let subCurrent = '';
        for (const word of words) {
          if ((subCurrent + ' ' + word).trim().length <= maxLen) {
            subCurrent = (subCurrent ? subCurrent + ' ' + word : word).trim();
          } else {
            if (subCurrent) chunks.push(subCurrent);
            subCurrent = word;
          }
        }
        current = subCurrent;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.filter(Boolean);
}

/**
 * Tổng hợp giọng đọc bằng Google Translate TTS với nhiều endpoint dự phòng
 */
export async function synthesizeGoogleTTS(text, lang = 'vi') {
  const chunks = splitIntoChunks(text, 180);
  if (!chunks.length) {
    throw new Error('Văn bản rỗng');
  }

  const normalizedLang = lang.split('-')[0] || 'vi';
  const endpoints = [
    (q) =>
      `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=${encodeURIComponent(normalizedLang)}&client=tw-ob`,
    (q) =>
      `https://translate.google.com.vn/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=${encodeURIComponent(normalizedLang)}&client=tw-ob`,
    (q) =>
      `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(q)}&tl=${encodeURIComponent(normalizedLang)}&client=tw-ob`,
  ];

  const buffers = [];

  for (const chunk of chunks) {
    let chunkBuffer = null;
    let lastError = null;

    for (const makeUrl of endpoints) {
      try {
        const url = makeUrl(chunk);
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 8000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Referer': 'https://translate.google.com/',
            'Accept': '*/*',
          },
        });
        if (response.data && response.data.byteLength > 0) {
          chunkBuffer = Buffer.from(response.data);
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!chunkBuffer) {
      throw lastError || new Error('Không thể tải âm thanh từ Google TTS');
    }

    buffers.push(chunkBuffer);
  }

  return Buffer.concat(buffers);
}

/**
 * Tổng hợp giọng đọc tự nhiên chuẩn Microsoft Edge Neural TTS có xác thực Sec-MS-GEC
 */
export async function synthesizeEdgeTTS(text, voiceName = 'vi-VN-HoaiMyNeural', rate = '+0%') {
  return new Promise((resolve, reject) => {
    if (!WSClient) {
      return reject(new Error('WebSocket client không khả dụng'));
    }

    const connectionId = randomUUID().replace(/-/g, '');
    const secMsGec = generateSecMsGec();
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=1-130.0.2849.68&ConnectionId=${connectionId}`;

    let ws;
    try {
      ws = new WSClient(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
          'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
        },
      });
    } catch (e) {
      return reject(e);
    }

    const audioChunks = [];
    let completed = false;

    const timeout = setTimeout(() => {
      if (!completed) {
        completed = true;
        try {
          ws.close();
        } catch {}
        if (audioChunks.length > 0) {
          resolve(Buffer.concat(audioChunks));
        } else {
          reject(new Error('Edge TTS timed out after 10s'));
        }
      }
    }, 10000);

    const onOpen = () => {
      // 1. Cấu hình định dạng âm thanh MP3
      const configMsg =
        `Content-Type:application/json;charset=utf-8\r\nPath:speech.config\r\n\r\n` +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: {
                  sentenceBoundaryEnabled: 'false',
                  wordBoundaryEnabled: 'false',
                },
                outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
              },
            },
          },
        });

      if (typeof ws.send === 'function') {
        ws.send(configMsg);
      }

      // 2. Escape XML và gửi SSML
      const safeText = String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

      const requestId = randomUUID().replace(/-/g, '');
      const ssml =
        `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
        `<voice name='${voiceName}'>` +
        `<prosody pitch='+0Hz' rate='${rate}' volume='+0%'>${safeText}</prosody>` +
        `</voice></speak>`;

      const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    };

    const handleMessageData = (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const str = buf.toString('utf8');

      // 1. Kiểm tra tín hiệu kết thúc turn
      if (str.includes('Path:turn.end')) {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          try {
            ws.close();
          } catch {}
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(new Error('Edge TTS không nhận được dữ liệu âm thanh'));
          }
        }
        return;
      }

      // 2. Tách dữ liệu âm thanh binary: 2 byte header length + header text (chứa Path:audio) + audio payload
      if (buf.length >= 2) {
        const headerLen = buf.readUInt16BE(0);
        if (headerLen > 0 && buf.length > headerLen + 2) {
          const headerStr = buf.subarray(2, headerLen + 2).toString('utf8');
          if (headerStr.includes('Path:audio')) {
            const audioData = buf.subarray(headerLen + 2);
            if (audioData.length > 0) {
              audioChunks.push(audioData);
            }
          }
        }
      }
    };

    if (typeof ws.on === 'function') {
      ws.on('open', onOpen);
      ws.on('message', (data) => handleMessageData(data));
      ws.on('error', (err) => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          reject(err);
        }
      });
      ws.on('close', () => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(new Error('WebSocket đóng'));
          }
        }
      });
    } else {
      ws.onopen = onOpen;
      ws.onmessage = async (event) => {
        let data = event.data;
        if (typeof Blob !== 'undefined' && data instanceof Blob) {
          data = Buffer.from(await data.arrayBuffer());
        }
        handleMessageData(data);
      };
      ws.onerror = (err) => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          reject(err);
        }
      };
      ws.onclose = () => {
        if (!completed) {
          completed = true;
          clearTimeout(timeout);
          if (audioChunks.length > 0) {
            resolve(Buffer.concat(audioChunks));
          } else {
            reject(new Error('WebSocket đóng'));
          }
        }
      };
    }
  });
}

/**
 * Tổng hợp giọng đọc bằng TikTok TTS
 */
export async function synthesizeTikTokTTS(text, voice = 'vi_female_01') {
  const clean = String(text || '').slice(0, 300);
  const url = `https://api16-normal-v6.byteoversea.com/media/api/text/speech/invoke/?text_speaker=${encodeURIComponent(voice)}&req_text=${encodeURIComponent(clean)}&speaker_map_type=0&aid=1233`;

  const response = await axios.post(url, null, {
    headers: {
      'User-Agent':
        'com.zhiliaoapp.musically/2022600030 (Linux; U; Android 7.1.2; es_ES; SM-G988N; Build/NRD90M;tt-ok/3.12.13.1)',
      'Cookie': 'sessionid=abc;',
    },
    timeout: 8000,
  });

  const body = response.data;
  if (body?.status_code !== 0 || !body?.data?.v_str) {
    throw new Error(`TikTok TTS error: ${body?.message || 'Không có âm thanh'}`);
  }

  return Buffer.from(body.data.v_str, 'base64');
}

/**
 * Hàm điều phối chung:
 * Tự động chọn engine thích hợp và fallback nếu có trục trặc
 */
export async function synthesizeSpeech(text, { voiceId = 'vi-VN-HoaiMyNeural', speed = '1.0x' } = {}) {
  const voice = getVoiceById(voiceId) || getDefaultVoice();
  const rate = getSpeedRate(speed);

  // 1. Thử Edge TTS nếu voice là edge
  if (voice.engine === 'edge') {
    try {
      const buffer = await synthesizeEdgeTTS(text, voice.voiceName, rate);
      if (buffer && buffer.length > 0) {
        return { buffer, voice, engine: 'edge' };
      }
    } catch (edgeError) {
      logger.warn(`Edge TTS (${voice.id}) lỗi, chuyển sang fallback:`, edgeError?.message || edgeError);
    }
  }

  // 2. Thử TikTok TTS nếu voice là tiktok
  if (voice.engine === 'tiktok') {
    try {
      const buffer = await synthesizeTikTokTTS(text, voice.voiceName);
      if (buffer && buffer.length > 0) {
        return { buffer, voice, engine: 'tiktok' };
      }
    } catch (tiktokError) {
      logger.warn(`TikTok TTS (${voice.id}) lỗi, chuyển sang fallback:`, tiktokError?.message || tiktokError);
    }
  }

  // 3. Nếu là tiếng Việt và Edge lỗi, thử TikTok tiếng Việt trước khi xuống Google
  if (voice.lang === 'vi') {
    try {
      const tiktokVoice = voice.gender === 'Nam' ? 'vi_male_01' : 'vi_female_01';
      const buffer = await synthesizeTikTokTTS(text, tiktokVoice);
      if (buffer && buffer.length > 0) {
        return { buffer, voice, engine: 'tiktok' };
      }
    } catch {
      // Tiếp tục xuống Google
    }
  }

  // 4. Fallback cuối cùng sang Google TTS
  const fallbackLang = voice.lang || 'vi';
  const buffer = await synthesizeGoogleTTS(text, fallbackLang);
  return { buffer, voice, engine: 'google' };
}
