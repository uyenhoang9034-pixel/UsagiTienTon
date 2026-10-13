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

/**
 * Gọi Gemini API chính thức nếu có GEMINI_API_KEY
 */
async function callGeminiAPI(prompt, history = []) {
  const apiKey = String(process.env.GEMINI_API_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!apiKey) return null;

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

  // Thử các model Gemini 3.8 chính thức được hỗ trợ
  const priorityModels = ['gemini-3.8-flash', 'gemini-3.8-pro', 'gemini-3.5-flash'];

  for (const model of priorityModels) {
    const text = await tryCallGeminiModel(model, payload, apiKey);
    if (text) return text;
  }

  // Nếu các model trên đều bị nghẽn, tự động gọi API ListModels để lấy danh sách model thực tế được cấp
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listRes = await axios.get(listUrl, { timeout: 10000 });
    const remoteModels = (listRes.data?.models || [])
      .filter((m) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''))
      .filter((m) => !priorityModels.includes(m));

    logger.info(`[AI Text] Auto-discovered ${remoteModels.length} additional Gemini models: ${remoteModels.slice(0, 5).join(', ')}`);

    for (const model of remoteModels) {
      const text = await tryCallGeminiModel(model, payload, apiKey, 2);
      if (text) return text;
    }
  } catch (listErr) {
    logger.warn('[AI Text] Failed to auto-discover Gemini models:', listErr.message);
  }

  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function tryCallGeminiModel(model, payload, apiKey, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await axios.post(url, payload, {
        timeout: 30000,
        headers: { 'Content-Type': 'application/json' },
      });

      const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        logger.info(`[AI Text] Gemini model ${model} responded successfully (attempt ${attempt}) ✅`);
        return text;
      }
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      const status = err.response?.status;
      const isHighDemand =
        status === 429 ||
        status === 503 ||
        /high demand|spikes in demand|resource has been exhausted|quota|temporarily unavailable/i.test(errMsg);

      logger.warn(`[AI Text] Gemini (${model}) attempt ${attempt} failed: ${errMsg}`);

      if (isHighDemand && attempt < maxAttempts) {
        const delay = attempt * 1500;
        logger.info(`[AI Text] High demand spike on ${model}, retrying in ${delay / 1000}s...`);
        await sleep(delay);
        continue;
      }

      break;
    }
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
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  return response.data?.choices?.[0]?.message?.content || null;
}

/**
 * Gọi Pollinations AI (Miễn phí 100%, không cần API key, tốc độ cao)
 * Tích hợp cơ chế kép: Thử POST nhanh, nếu bị nghẽn thì tự động Fallback sang GET
 */
async function callPollinationsAI(prompt, history = []) {
  // Chỉ lấy tối đa 6 lượt hội thoại gần nhất để tránh phình to payload gây chậm trễ
  const recentHistory = history.slice(-6);

  const messages = [
    { role: 'system', content: AI_CONFIG.systemPrompt },
    ...recentHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  // 1. Thử gọi qua phương thức POST (mặc định model nhẹ, phản hồi 2-4s)
  try {
    const response = await axios.post(
      'https://text.pollinations.ai/',
      {
        messages,
        temperature: 0.7,
      },
      {
        timeout: 45000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'UsagiTienTonBot/2.1 (Discord Bot)',
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
    logger.warn('[AI Text] Pollinations POST failed or timed out, trying GET fallback:', postError.message);
  }

  // 2. Fallback sang phương thức GET trực tiếp nếu POST bị nghẽn mạng (rút gọn system prompt để tránh lỗi 414 URI Too Long)
  try {
    const encodedPrompt = encodeURIComponent(String(prompt || '').slice(0, 500));
    const shortSystem = encodeURIComponent('Ban la em bot Usagi mup rup xeo sac tren Discord');
    const getUrl = `https://text.pollinations.ai/${encodedPrompt}?system=${shortSystem}`;

    const getResponse = await axios.get(getUrl, {
      timeout: 35000,
      headers: {
        'User-Agent': 'UsagiTienTonBot/2.1 (Discord Bot)',
      },
    });

    if (typeof getResponse.data === 'string' && getResponse.data.trim()) {
      return getResponse.data;
    }
  } catch (getError) {
    logger.error('[AI Text] Pollinations GET also failed:', getError.message);
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

  // 2. Thử Gemini API nếu có key
  if (process.env.GEMINI_API_KEY) {
    try {
      answer = await callGeminiAPI(prompt, cleanHistory);
      if (answer) providerUsed = 'gemini';
    } catch (err) {
      logger.warn('[AI Text] Gemini API call failed, falling back:', err.message);
    }
  }

  // 3. Thử OpenAI API nếu có key
  if (!answer && process.env.OPENAI_API_KEY) {
    try {
      answer = await callOpenAIAPI(prompt, cleanHistory);
      if (answer) providerUsed = 'openai';
    } catch (err) {
      logger.warn('[AI Text] OpenAI API call failed, falling back:', err.message);
    }
  }

  // 4. Fallback sang Pollinations AI miễn phí
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
