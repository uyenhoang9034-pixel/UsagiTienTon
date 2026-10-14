import axios from 'axios';
import { AI_CONFIG } from './aiConfig.js';
import { logger } from '../../utils/logger.js';

/**
 * Kiểm tra xem người dùng có đang yêu cầu viết code / lập trình hay không.
 */
export function isCodeRequest(text = '') {
  const content = String(text || '').trim();
  if (!content) return false;

  const codePatterns = [
    /\b(?:viết|làm|tạo|cho\s+xin|hãy\s+viết|code\s+hộ|code\s+giúp|lập\s+trình)\s+(?:cho\s+.*?\s+)?(?:đoạn\s+)?(?:code|mã\s+nguồn|script|chương\s+trình)\b/i,
    /\b(?:viết|hãy\s+viết|tạo)\s+(?:hàm|class|function|bot|tool|script|chương\s+trình)\s+(?:bằng|trong|với)?\s*(?:python|javascript|typescript|js|ts|c\+\+|cpp|c#|java|php|html|css|sql|rust|golang|go|ruby)\b/i,
    /\b(?:write|generate|create)\s+(?:some\s+)?(?:code|script|program)\b/i,
    /\b(?:solve\s+leetcode|giải\s+bài\s+tập\s+lập\s+trình|viết\s+thuật\s+toán\s+bằng)\b/i,
    /\b(?:viết\s+code|code\s+cho|hướng\s+dẫn\s+code|lập\s+trình\s+giúp)\b/i,
  ];

  return codePatterns.some((regex) => regex.test(content));
}

/**
 * Lọc và loại bỏ các khối code trong câu trả lời nếu AI lỡ xuất code.
 */
export function sanitizeCodeFromResponse(responseText = '') {
  let text = String(responseText || '');

  // Phát hiện khối code markdown: ```python ... ``` hoặc ```js ... ```
  const codeBlockRegex = /```(?:[a-zA-Z0-9_\-+]+)?\s*[\r\n]+[\s\S]*?```/g;

  if (codeBlockRegex.test(text)) {
    text = text.replace(
      codeBlockRegex,
      '\n> 🐰 *[Em bot Usagi múp rụp xin phép không cung cấp mã nguồn/code đâu nha bác~ Bác tự code đi nè! 💅]*\n',
    );
  }

  return text.trim();
}

/**
 * Loại bỏ triệt để các tiền tố kịch bản dạng "EM: ", "Em: ", "Usagi: ", "**EM:** ", "Bot: "
 * cũng như các hành động nhại lại trong dấu sao và chuẩn hóa viết thường chữ "em" ở giữa câu.
 */
export function cleanDialoguePrefix(responseText = '') {
  let text = String(responseText || '').trim();

  // 1. Loại bỏ tiền tố kịch bản ở đầu tin nhắn (ví dụ "Em: ", "EM: ", "**Em:** ", "Usagi: ")
  text = text.replace(
    /^[\s*_#>\-\[]*(?:em(?:\s+bot)?(?:\s+usagi)?(?:\s+múp\s+rụp)?|usagi|bot|ai|assistant|trợ\s+lý)[\]\s*_]*\s*:\s*/i,
    '',
  );

  // 2. Loại bỏ các tiền tố ở đầu các dòng kế tiếp
  text = text.replace(
    /\n[\s*_#>\-\[]*(?:em(?:\s+bot)?(?:\s+usagi)?(?:\s+múp\s+rụp)?|usagi|bot|ai|assistant|trợ\s+lý)[\]\s*_]*\s*:\s*/gi,
    '\n',
  );

  // 3. Loại bỏ hành động nhại lại trong dấu sao ở đầu câu nếu có (ví dụ "*hì* ", "*cười* ")
  text = text.replace(/^\s*\*[^*]{1,20}\*\s*/i, '');

  // 4. Chuẩn hóa chữ "Em" ở giữa câu thành chữ thường "em" (trừ khi đứng ở đầu câu/sau dấu chấm)
  text = text.replace(/(?<=\b[a-zA-Z0-9À-ỹ]+\s+)Em\b/g, 'em');

  return text.trim();
}

// Bộ nhớ đệm lưu các API key / model Gemini bị hết hạn mức (Quota Exceeded) để tránh gọi lặp lại làm treo bot
const blockedGeminiKeys = new Map();

function isGeminiKeyBlocked(key) {
  const unblockAt = blockedGeminiKeys.get(key);
  if (!unblockAt) return false;
  if (Date.now() > unblockAt) {
    blockedGeminiKeys.delete(key);
    return false;
  }
  return true;
}

function blockGeminiKey(key, durationMs = 60 * 60 * 1000) {
  blockedGeminiKeys.set(key, Date.now() + durationMs);
}

/**
 * Gọi Gemini API chính thức với hỗ trợ xoay vòng nhiều key (key1, key2...) và tự động bỏ qua key hết quota
 */
async function callGeminiAPI(prompt, history = []) {
  const rawKeyString = String(process.env.GEMINI_API_KEY || '').trim();
  if (!rawKeyString) return null;

  // Hỗ trợ cấu hình nhiều key cách nhau bởi dấu phẩy hoặc chấm phẩy
  const apiKeys = rawKeyString
    .split(/[,;\n]+/)
    .map((k) => k.trim().replace(/^["']|["']$/g, ''))
    .filter(Boolean);

  const availableKeys = apiKeys.filter((k) => !isGeminiKeyBlocked(k));
  if (availableKeys.length === 0) {
    logger.warn('[AI Text] Tất cả GEMINI_API_KEY hiện tại đều đã hết hạn mức (Quota Exceeded), chuyển sang AI dự phòng...');
    return null;
  }

  const rawContents = [];

  // 1. Thêm lịch sử hội thoại gần nhất
  for (const msg of history.slice(-6)) {
    if (!msg.content?.trim()) continue;
    rawContents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content.trim() }],
    });
  }

  // 2. Thêm câu hỏi hiện tại
  rawContents.push({
    role: 'user',
    parts: [{ text: prompt.trim() }],
  });

  // 3. Đảm bảo lượt mở đầu luôn là user
  while (rawContents.length > 0 && rawContents[0].role !== 'user') {
    rawContents.shift();
  }

  // 4. Gộp các lượt liên tiếp cùng role để tránh lỗi 400 của Gemini
  const contents = [];
  for (const item of rawContents) {
    const last = contents[contents.length - 1];
    if (last && last.role === item.role) {
      last.parts[0].text += `\n${item.parts[0].text}`;
    } else {
      contents.push({ role: item.role, parts: [{ text: item.parts[0].text }] });
    }
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: AI_CONFIG.systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const activeModels = ['gemini-3.8-flash', 'gemini-3.5-flash-lite'];

  for (const apiKey of availableKeys) {
    for (const model of activeModels) {
      const result = await tryCallGeminiModel(model, payload, apiKey);
      if (result.success) {
        return result.text;
      }
      if (result.quotaExceeded) {
        // Khóa key này lại 1 giờ để không spam tiếp
        logger.warn(`[AI Text] Gemini key ${apiKey.slice(0, 6)}... hết hạn mức (Quota Exceeded). Đang tự động chuyển sang nguồn khác.`);
        blockGeminiKey(apiKey, 60 * 60 * 1000);
        break; // Chuyển sang key tiếp theo
      }
    }
  }

  return null;
}

async function tryCallGeminiModel(model, payload, apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const response = await axios.post(url, payload, {
      timeout: 10000, // Tối đa 10s cho mỗi lần gọi
      headers: { 'Content-Type': 'application/json' },
    });

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      logger.info(`[AI Text] Gemini model ${model} responded successfully ✅`);
      return { success: true, text };
    }
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    const isQuota = /quota|rate.limit|resource.has.been.exhausted|limit:\s*\d+/i.test(errMsg);
    logger.warn(`[AI Text] Gemini (${model}) failed: ${errMsg}`);
    if (isQuota) {
      return { success: false, quotaExceeded: true };
    }
  }
  return { success: false, quotaExceeded: false };
}

let cachedGroqModels = null;

async function getAvailableGroqModel(apiKey) {
  if (process.env.GROQ_MODEL) return process.env.GROQ_MODEL;
  if (cachedGroqModels && cachedGroqModels.length > 0) return cachedGroqModels[0];

  try {
    const res = await axios.get('https://api.groq.com/openai/v1/models', {
      timeout: 5000,
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const models = (res.data?.data || [])
      .map((m) => m.id)
      .filter((id) => !id.includes('whisper') && !id.includes('vision') && !id.includes('guard'));

    logger.info(`[AI Text] Auto-discovered Groq models: ${models.slice(0, 5).join(', ')}`);

    // Danh sách ưu tiên theo chuẩn cập nhật mới nhất của Groq
    const preferred = [
      'openai/gpt-oss-120b',
      'qwen/qwen3.6-27b',
      'openai/gpt-oss-20b',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ];

    const selected = preferred.find((p) => models.includes(p)) || models[0];
    if (selected) {
      cachedGroqModels = [selected];
      return selected;
    }
  } catch (err) {
    logger.warn('[AI Text] Failed to auto-discover Groq models:', err.message);
  }
  return 'openai/gpt-oss-120b';
}

/**
 * Gọi Groq API (Miễn phí 100%, 14.400 request/ngày, tốc độ cực nhanh < 1s)
 */
async function callGroqAPI(prompt, history = []) {
  const apiKey = String(process.env.GROQ_API_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!apiKey) return null;

  const model = await getAvailableGroqModel(apiKey);
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  const recentHistory = history.slice(-6);
  const messages = [
    { role: 'system', content: AI_CONFIG.systemPrompt },
    ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  try {
    const response = await axios.post(
      url,
      {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
      },
    );

    const text = response.data?.choices?.[0]?.message?.content;
    if (text) {
      logger.info(`[AI Text] Groq model ${model} responded successfully ✅`);
      return text;
    }
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    logger.warn(`[AI Text] Groq API (${model}) failed: ${errMsg}`);
    cachedGroqModels = null; // Xóa cache để lần sau tự dò model khác
  }
  return null;
}

/**
 * Gọi OpenRouter API (Hỗ trợ các model free không giới hạn)
 */
async function callOpenRouterAPI(prompt, history = []) {
  const apiKey = String(process.env.OPENROUTER_API_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!apiKey) return null;

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const recentHistory = history.slice(-6);
  const messages = [
    { role: 'system', content: AI_CONFIG.systemPrompt },
    ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  try {
    const response = await axios.post(
      url,
      {
        model: process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free',
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      },
      {
        timeout: 12000,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://github.com/uyenhoang9034-pixel/UsagiTienTon',
          'X-Title': 'Usagi Tiên Tôn Bot',
        },
      },
    );

    const text = response.data?.choices?.[0]?.message?.content;
    if (text) {
      logger.info('[AI Text] OpenRouter responded successfully ✅');
      return text;
    }
  } catch (err) {
    const errMsg = err.response?.data?.error?.message || err.message;
    logger.warn(`[AI Text] OpenRouter API failed: ${errMsg}`);
  }
  return null;
}

/**
 * Gọi OpenAI API nếu có OPENAI_API_KEY
 */
async function callOpenAIAPI(prompt, history = []) {
  const apiKey = String(process.env.OPENAI_API_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!apiKey) return null;

  const url = 'https://api.openai.com/v1/chat/completions';

  const messages = [
    { role: 'system', content: AI_CONFIG.systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  const response = await axios.post(
    url,
    {
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    },
    {
      timeout: 20000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  return response.data?.choices?.[0]?.message?.content || null;
}

/**
 * Gọi Pollinations AI (Miễn phí 100%, không cần API key)
 */
async function callPollinationsAI(prompt, history = []) {
  // 1. Thử gọi GET trực tiếp (loại bỏ ký tự ? / # gây treo router CDN)
  try {
    const safePrompt = String(prompt || '')
      .replace(/[/?#%&=]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 300);

    const getUrl = `https://text.pollinations.ai/${encodeURIComponent(safePrompt)}?model=openai-fast`;

    const getResponse = await axios.get(getUrl, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });

    if (typeof getResponse.data === 'string' && getResponse.data.trim()) {
      return getResponse.data;
    }
  } catch (getError) {
    logger.warn(`[AI Text] Pollinations GET failed: ${getError.message}`);
  }

  // 2. Fallback sang POST
  try {
    const recentHistory = history.slice(-4);
    const messages = [
      { role: 'system', content: AI_CONFIG.systemPrompt },
      ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: prompt },
    ];

    const response = await axios.post(
      'https://text.pollinations.ai/',
      {
        messages,
        model: 'openai-fast',
        temperature: 0.7,
      },
      {
        timeout: 8000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        },
      },
    );

    if (typeof response.data === 'string' && response.data.trim()) {
      return response.data;
    }

    if (response.data?.content) {
      return response.data.content;
    }

    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content;
    }

    if (String(response.data || '').trim()) {
      return String(response.data);
    }
  } catch (postError) {
    logger.error(`[AI Text] Pollinations POST also failed: ${postError.message}`);
  }

  return null;
}

function prepareCleanHistory(history = []) {
  return history.map((m) => ({
    role: m.role,
    content: cleanDialoguePrefix(m.content),
  }));
}

/**
 * Hàm điều phối sinh câu trả lời AI với cơ chế Fallback tự động
 */
export async function generateAIResponse(prompt, history = []) {
  // 1. Chặn ngay nếu người dùng yêu cầu viết code
  if (isCodeRequest(prompt)) {
    return {
      success: true,
      text: AI_CONFIG.refusalMessage,
      isRefusal: true,
    };
  }

  const cleanHistory = prepareCleanHistory(history);
  let answer = null;
  let providerUsed = 'unknown';

  // 2. Thử Groq API nếu có GROQ_API_KEY (Siêu tốc < 1s, miễn phí 14.400 request/ngày)
  if (!answer && process.env.GROQ_API_KEY) {
    try {
      answer = await callGroqAPI(prompt, cleanHistory);
      if (answer) providerUsed = 'groq';
    } catch (err) {
      logger.warn('[AI Text] Groq API call failed, falling back:', err.message);
    }
  }

  // 3. Thử Gemini API nếu có key (tự động bỏ qua key hết quota và xoay vòng sang key khác)
  if (!answer && process.env.GEMINI_API_KEY) {
    try {
      answer = await callGeminiAPI(prompt, cleanHistory);
      if (answer) providerUsed = 'gemini';
    } catch (err) {
      logger.warn('[AI Text] Gemini API call failed, falling back:', err.message);
    }
  }

  // 4. Thử OpenRouter API nếu có OPENROUTER_API_KEY
  if (!answer && process.env.OPENROUTER_API_KEY) {
    try {
      answer = await callOpenRouterAPI(prompt, cleanHistory);
      if (answer) providerUsed = 'openrouter';
    } catch (err) {
      logger.warn('[AI Text] OpenRouter API call failed, falling back:', err.message);
    }
  }

  // 5. Thử OpenAI API nếu có OPENAI_API_KEY
  if (!answer && process.env.OPENAI_API_KEY) {
    try {
      answer = await callOpenAIAPI(prompt, cleanHistory);
      if (answer) providerUsed = 'openai';
    } catch (err) {
      logger.warn('[AI Text] OpenAI API call failed, falling back:', err.message);
    }
  }

  // 6. Fallback sang Pollinations AI miễn phí
  if (!answer) {
    try {
      answer = await callPollinationsAI(prompt, cleanHistory);
      if (answer) providerUsed = 'pollinations';
    } catch (err) {
      logger.error('[AI Text] Pollinations AI call failed:', err.message);
    }
  }

  if (!answer) {
    return {
      success: false,
      text: 'Dạ hiện tại máy chủ AI đang bận một chút, bác thử nhắn lại sau vài giây giúp em bot Usagi múp rụp nhé~ 🐰💦',
    };
  }

  // 5. Kiểm tra an toàn: Lọc sạch bất kỳ khối code nào còn sót lại và loại bỏ triệt để tiền tố EM:
  let sanitized = sanitizeCodeFromResponse(answer);
  sanitized = cleanDialoguePrefix(sanitized);

  logger.info(`[AI Text] Generated response using ${providerUsed} (${sanitized.length} chars)`);

  return {
    success: true,
    text: sanitized,
    provider: providerUsed,
  };
}
