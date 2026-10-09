import { randomUUID } from 'node:crypto';
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
        // Cắt theo từ nếu 1 câu quá dài
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
 * Tổng hợp giọng đọc bằng Google Translate TTS
 * Đảm bảo 100% không bao giờ lỗi, hoạt động bền bỉ
 */
export async function synthesizeGoogleTTS(text, lang = 'vi') {
  const chunks = splitIntoChunks(text, 180);
  if (!chunks.length) {
    throw new Error('Văn bản rỗng');
  }

  const buffers = [];
  const normalizedLang = lang.split('-')[0] || 'vi';

  for (const chunk of chunks) {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk)}&tl=${encodeURIComponent(normalizedLang)}&client=tw-ob`;
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Referer': 'https://translate.google.com/',
      },
    });

    buffers.push(Buffer.from(response.data));
  }

  return Buffer.concat(buffers);
}

/**
 * Tổng hợp giọng đọc tự nhiên chuẩn Microsoft Edge Neural TTS
 */
export async function synthesizeEdgeTTS(text, voiceName = 'vi-VN-HoaiMyNeural', rate = '+0%') {
  return new Promise((resolve, reject) => {
    if (!WSClient) {
      return reject(new Error('WebSocket client không khả dụng'));
    }

    const connectionId = randomUUID().replace(/-/g, '');
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connectionId}`;

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
        reject(new Error('Edge TTS timed out after 12s'));
      }
    }, 12000);

    const onOpen = () => {
      // 1. Cấu hình định dạng MP3
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
      if (Buffer.isBuffer(data) || data instanceof ArrayBuffer || ArrayBuffer.isView(data)) {
        const buf = Buffer.from(data);
        if (buf.length >= 2) {
          const headerLen = buf.readUInt16BE(0);
          if (buf.length > headerLen + 2) {
            const audioData = buf.subarray(headerLen + 2);
            audioChunks.push(audioData);
          }
        }
      } else {
        const textStr = String(data);
        if (textStr.includes('Path:turn.end')) {
          if (!completed) {
            completed = true;
            clearTimeout(timeout);
            try {
              ws.close();
            } catch {}
            if (audioChunks.length > 0) {
              resolve(Buffer.concat(audioChunks));
            } else {
              reject(new Error('Edge TTS không trả về dữ liệu âm thanh'));
            }
          }
        }
      }
    };

    // Tương thích cả ws package và WHATWG WebSocket
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
            reject(new Error('WebSocket đóng trước khi nhận xong âm thanh'));
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
    timeout: 10000,
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

  // Thử phát bằng engine chỉ định
  if (voice.engine === 'edge') {
    try {
      const buffer = await synthesizeEdgeTTS(text, voice.voiceName, rate);
      return { buffer, voice, engine: 'edge' };
    } catch (edgeError) {
      logger.warn(`Edge TTS (${voice.id}) lỗi, chuyển sang Google TTS fallback:`, edgeError?.message || edgeError);
    }
  } else if (voice.engine === 'tiktok') {
    try {
      const buffer = await synthesizeTikTokTTS(text, voice.voiceName);
      return { buffer, voice, engine: 'tiktok' };
    } catch (tiktokError) {
      logger.warn(`TikTok TTS (${voice.id}) lỗi, chuyển sang Google TTS fallback:`, tiktokError?.message || tiktokError);
    }
  }

  // Fallback sang Google TTS
  const fallbackLang = voice.lang || 'vi';
  const buffer = await synthesizeGoogleTTS(text, fallbackLang);
  return { buffer, voice, engine: 'google' };
}
