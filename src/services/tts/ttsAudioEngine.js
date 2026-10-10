import crypto, { randomUUID } from 'node:crypto';
import axios from 'axios';
import WebSocket from 'ws';
import { logger } from '../../utils/logger.js';
import { getVoiceById, getDefaultVoice, getSpeedRate } from './ttsVoices.js';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const CHROMIUM_FULL_VERSION = '143.0.3650.75';
const CHROMIUM_MAJOR_VERSION = '143';
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

/**
 * Tạo token Sec-MS-GEC để xác thực với máy chủ Bing Edge TTS
 * Chuẩn công thức theo rany2/edge-tts:
 * Windows file time (bắt đầu từ 1601-01-01) = (Unix timestamp + 11644473600) * 10,000,000 ticks/giây
 * Làm tròn xuống cửa sổ 5 phút (3,000,000,000 ticks)
 * Hash SHA-256 chuỗi `${ticks}${TRUSTED_CLIENT_TOKEN}` -> in hoa hex
 */
function generateSecMsGec() {
  try {
    const unixSeconds = Math.floor(Date.now() / 1000);
    const winEpochTicks = (BigInt(unixSeconds) + 11644473600n) * 10000000n;
    const rounded = winEpochTicks - (winEpochTicks % 3000000000n);
    const str = `${rounded.toString()}${TRUSTED_CLIENT_TOKEN}`;
    return crypto.createHash('sha256').update(str, 'ascii').digest('hex').toUpperCase();
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
 * Hỗ trợ Hoài My (Nữ VN), Nam Minh (Nam VN), Nanami (Anime JP), Jenny, Guy,...
 */
export async function synthesizeEdgeTTS(
  text,
  voiceName = 'vi-VN-HoaiMyNeural',
  rate = '+0%',
  pitch = '+0Hz',
) {
  return new Promise((resolve, reject) => {
    const connectionId = randomUUID().replace(/-/g, '');
    const secMsGec = generateSecMsGec();
    const url = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}&Sec-MS-GEC=${secMsGec}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}&ConnectionId=${connectionId}`;

    let ws;
    try {
      ws = new WebSocket(url, {
        headers: {
          'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
          'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache',
          'Accept-Encoding': 'gzip, deflate, br, zstd',
          'Accept-Language': 'en-US,en;q=0.9',
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

    ws.on('open', () => {
      // 1. Cấu hình định dạng âm thanh MP3 chất lượng cao
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

      ws.send(configMsg);

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
        `<prosody pitch='${pitch}' rate='${rate}' volume='+0%'>${safeText}</prosody>` +
        `</voice></speak>`;

      const ssmlMsg = `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    });

    ws.on('message', (data) => {
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
    });

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
          reject(new Error('WebSocket đóng trước khi nhận đủ dữ liệu'));
        }
      }
    });
  });
}

/**
 * Tổng hợp giọng đọc bằng TikTok TTS
 * Hỗ trợ endpoint TikTok chính thức kèm cookie sessionid (tùy chọn qua TIKTOK_SESSION_ID trong .env)
 */
export async function synthesizeTikTokTTS(text, voice = 'vi_female_01') {
  const clean = String(text || '').slice(0, 300);
  const sessionId = process.env.TIKTOK_SESSION_ID || '581a1225c93f9b4bb9aacc49e4ebc5a9';

  const endpoints = [
    `https://api16-normal-c-useast1a.tiktokv.com/media/api/text/speech/invoke/?text_speaker=${encodeURIComponent(voice)}&req_text=${encodeURIComponent(clean)}&speaker_map_type=0&aid=1233`,
    `https://api16-normal-v6.tiktokv.com/media/api/text/speech/invoke/?text_speaker=${encodeURIComponent(voice)}&req_text=${encodeURIComponent(clean)}&speaker_map_type=0&aid=1233`,
    `https://api16-normal-v6.byteoversea.com/media/api/text/speech/invoke/?text_speaker=${encodeURIComponent(voice)}&req_text=${encodeURIComponent(clean)}&speaker_map_type=0&aid=1233`,
    `https://api.tiktokv.com/media/api/text/speech/invoke/?text_speaker=${encodeURIComponent(voice)}&req_text=${encodeURIComponent(clean)}&speaker_map_type=0&aid=1233`,
  ];

  let lastError = null;

  for (const url of endpoints) {
    try {
      const response = await axios.post(url, null, {
        headers: {
          'User-Agent':
            'com.zhiliaoapp.musically/2022600030 (Linux; U; Android 7.1.2; es_ES; SM-G988N; Build/NRD90M;tt-ok/3.12.13.1)',
          'Cookie': `sessionid=${sessionId}`,
        },
        timeout: 5000,
      });

      const body = response.data;
      if (body?.status_code === 0 && body?.data?.v_str) {
        return Buffer.from(body.data.v_str, 'base64');
      }
      lastError = new Error(`TikTok status ${body?.status_code}: ${body?.message || 'Không có âm thanh'}`);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('Không thể tạo giọng TikTok');
}

/**
 * Hàm điều phối chung:
 * Tự động chọn engine thích hợp và fallback thông minh (không bao giờ ép tất cả về Google!)
 */
export async function synthesizeSpeech(text, { voiceId = 'vi-VN-HoaiMyNeural', speed = '1.0x' } = {}) {
  const voice = getVoiceById(voiceId) || getDefaultVoice();
  // Nếu giọng có rate mặc định (như TikTok +15%), và người dùng đang để 1.0x, ưu tiên nhịp đọc của giọng đó
  const baseRate = getSpeedRate(speed);
  const rate = (speed === '1.0x' && voice.rate) ? voice.rate : baseRate;
  const pitch = voice.pitch || '+0Hz';

  // 1. Nếu giọng được chọn là Edge Neural (Hoài My, Nam Minh, Nanami, Jenny, Guy, SunHi, Xiaoxiao,...)
  if (voice.engine === 'edge') {
    try {
      const buffer = await synthesizeEdgeTTS(text, voice.voiceName, rate, pitch);
      if (buffer && buffer.length > 0) {
        return { buffer, voice, engine: 'edge' };
      }
    } catch (edgeError) {
      logger.warn(`Edge TTS (${voice.id}) gặp lỗi: ${edgeError?.message}. Đang thử fallback...`);
    }
  }

  // 2. Nếu giọng được chọn là TikTok
  if (voice.engine === 'tiktok') {
    try {
      const buffer = await synthesizeTikTokTTS(text, voice.voiceName);
      if (buffer && buffer.length > 0) {
        return { buffer, voice, engine: 'tiktok' };
      }
    } catch (tiktokError) {
      logger.warn(`TikTok TTS (${voice.id}) lỗi: ${tiktokError?.message}. Fallback sang phong cách TikTok tương ứng...`);
    }

    // NÂNG CẤP ĐẶC BIỆT:
    // Nếu TikTok API chưa có session hoặc bị chặn, bot fallback sang Edge Neural nhưng với
    // CAO ĐỘ (PITCH) và TỐC ĐỘ (RATE) đặc trưng của TikTok!
    // Nữ TikTok: pitch +18Hz, rate +15% -> Biến giọng thành giọng nữ lí lắc, nhí nhảnh, cao và nhanh đặc trưng TikTok!
    // Nam TikTok: pitch -5Hz, rate +10% -> Biến giọng thành giọng nam dứt khoát, bắt tai!
    try {
      const isNam = voice.gender === 'Nam';
      const edgeFallback = isNam ? 'vi-VN-NamMinhNeural' : 'vi-VN-HoaiMyNeural';
      const tiktokPitch = voice.pitch || (isNam ? '-5Hz' : '+18Hz');
      const tiktokRate = (speed === '1.0x' && voice.rate) ? voice.rate : (isNam ? '+10%' : '+15%');

      const buffer = await synthesizeEdgeTTS(text, edgeFallback, tiktokRate, tiktokPitch);
      if (buffer && buffer.length > 0) {
        logger.info(
          `TikTok style qua Edge Neural (${edgeFallback}, pitch=${tiktokPitch}, rate=${tiktokRate}) thành công`,
        );
        return { buffer, voice, engine: 'edge' };
      }
    } catch (fallbackEdgeError) {
      logger.warn(`Fallback Edge cho TikTok cũng lỗi: ${fallbackEdgeError?.message}`);
    }
  }

  // 3. Nếu là tiếng Việt và Edge lỗi, thử TikTok trước khi xuống Google
  if (voice.engine === 'edge' && voice.lang === 'vi') {
    try {
      const tiktokVoice = voice.gender === 'Nam' ? 'vi_male_01' : 'vi_female_01';
      const buffer = await synthesizeTikTokTTS(text, tiktokVoice);
      if (buffer && buffer.length > 0) {
        return { buffer, voice, engine: 'tiktok' };
      }
    } catch {}
  }

  // 4. Nếu người dùng chọn giọng Google cụ thể (hoặc fallback bất khả kháng cuối cùng)
  const fallbackLang = voice.lang || 'vi';
  const buffer = await synthesizeGoogleTTS(text, fallbackLang);
  return { buffer, voice, engine: 'google' };
}
