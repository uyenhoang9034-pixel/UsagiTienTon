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
 * Gọi Gemini API chính thức nếu có GEMINI_API_KEY
 */
async function callGeminiAPI(prompt, history = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = [];

  // Thêm lịch sử hội thoại
  for (const msg of history) {
    contents.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  // Thêm câu hỏi hiện tại
  contents.push({
    role: 'user',
    parts: [{ text: prompt }],
  });

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

  const response = await axios.post(url, payload, {
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' },
  });

  const candidate = response.data?.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text;
  return text || null;
}

/**
 * Gọi OpenAI API nếu có OPENAI_API_KEY
 */
async function callOpenAIAPI(prompt, history = []) {
  const apiKey = process.env.OPENAI_API_KEY;
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
 */
async function callPollinationsAI(prompt, history = []) {
  const url = 'https://text.pollinations.ai/';

  const messages = [
    { role: 'system', content: AI_CONFIG.systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: prompt },
  ];

  const response = await axios.post(
    url,
    {
      messages,
      model: 'openai',
      temperature: 0.7,
    },
    {
      timeout: 35000,
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (typeof response.data === 'string') {
    return response.data;
  }

  if (response.data?.content) {
    return response.data.content;
  }

  if (response.data?.choices?.[0]?.message?.content) {
    return response.data.choices[0].message.content;
  }

  return String(response.data || '');
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

  let answer = null;
  let providerUsed = 'unknown';

  // 2. Thử Gemini API nếu có key
  if (process.env.GEMINI_API_KEY) {
    try {
      answer = await callGeminiAPI(prompt, history);
      if (answer) providerUsed = 'gemini';
    } catch (err) {
      logger.warn('[AI Text] Gemini API call failed, falling back:', err.message);
    }
  }

  // 3. Thử OpenAI API nếu có key
  if (!answer && process.env.OPENAI_API_KEY) {
    try {
      answer = await callOpenAIAPI(prompt, history);
      if (answer) providerUsed = 'openai';
    } catch (err) {
      logger.warn('[AI Text] OpenAI API call failed, falling back:', err.message);
    }
  }

  // 4. Fallback sang Pollinations AI miễn phí
  if (!answer) {
    try {
      answer = await callPollinationsAI(prompt, history);
      if (answer) providerUsed = 'pollinations';
    } catch (err) {
      logger.error('[AI Text] Pollinations AI call failed:', err.message);
    }
  }

  if (!answer) {
    return {
      success: false,
      text: 'Dạ hiện tại máy chủ AI đang bận một chút, bạn thử nhắn lại sau vài giây giúp Usagi nhé~ 🐰💦',
    };
  }

  // 5. Kiểm tra an toàn: Lọc sạch bất kỳ khối code nào còn sót lại
  const sanitized = sanitizeCodeFromResponse(answer);

  logger.info(`[AI Text] Generated response using ${providerUsed} (${sanitized.length} chars)`);

  return {
    success: true,
    text: sanitized,
    provider: providerUsed,
  };
}
