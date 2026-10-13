import axios from 'axios';
import { logger } from '../../utils/logger.js';

/**
 * Kiểm tra xem người dùng có đang yêu cầu vẽ/tạo ảnh hay không.
 */
export function isImageGenerationRequest(text = '') {
  const content = String(text || '').trim();
  if (!content) return false;

  // Lọc bỏ các câu hỏi lý thuyết, thông tin thuần túy
  if (
    /^(?:tại\s+sao|vì\s+sao|ai\s+(?:đã\s+)?(?:vẽ|tạo)|giải\s+thích|định\s+nghĩa|hướng\s+dẫn\s+vẽ|cách\s+vẽ|làm\s+sao\s+để\s+vẽ)/i.test(
      content,
    )
  ) {
    return false;
  }

  // Các mẫu câu yêu cầu vẽ hoặc tạo ảnh
  const imageTriggers = [
    /^(?:hãy\s+|xin\s+|làm\s+ơn\s+)?(?:vẽ|tạo|thiết\s+kế|design)\s+(?:cho\s+.*?\s+)?(?:một\s+)?(?:bức\s+)?(?:ảnh|hình|tranh)/i,
    /^(?:vẽ|tạo\s+ảnh|tạo\s+hình|tạo\s+tranh|design\s+ảnh|thiết\s+kế\s+ảnh|draw|paint|generate\s+image)\b/i,
    /(?:vẽ\s+(?:cho|giúp|hộ)\s+(?:mình|em|tôi|tao|bọn\s+mình))/i,
    /\b(?:vẽ\s+giúp|vẽ\s+hộ|vẽ\s+cho|vẽ\s+một\s+bức)\b/i,
  ];

  return imageTriggers.some((regex) => regex.test(content));
}

/**
 * Trích xuất prompt mô tả hình ảnh từ nội dung tin nhắn của người dùng.
 */
export function extractImagePrompt(text = '') {
  let prompt = String(text || '').trim();

  // Loại bỏ các tiền tố thông dụng như "hãy vẽ cho tôi", "tạo ảnh", "vẽ một bức tranh"
  prompt = prompt.replace(
    /^(?:hãy\s+|xin\s+|làm\s+ơn\s+)?(?:vẽ\s+(?:cho\s+(?:mình|tôi|em|tao)|giúp\s+(?:mình|tôi|em)|hộ\s+(?:mình|tôi|em))?|tạo\s+(?:ảnh|hình|bức\s+ảnh|bức\s+tranh)|design\s+ảnh|thiết\s+kế\s+ảnh|draw\s+|paint\s+|generate\s+image\s+(?:of\s+)?)(?:\s+một)?(?:\s+bức)?(?:\s+ảnh|\s+tranh|\s+hình)?(?:\s+về)?(?:\s+của)?(?:\s*:)?\s*/i,
    '',
  );

  return prompt.trim() || text.trim();
}

/**
 * Sinh ảnh AI chất lượng cao từ prompt và tải về buffer.
 */
export async function generateAIImage(userPrompt, options = {}) {
  const cleanPrompt = extractImagePrompt(userPrompt);
  const width = options.width || 1024;
  const height = options.height || 1024;
  const seed = options.seed || Math.floor(Math.random() * 10000000);

  // Pollinations AI image generator - Miễn phí, chất lượng cao, không cần token
  const encodedPrompt = encodeURIComponent(cleanPrompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

  logger.info(`[AI Image] Generating image for prompt: "${cleanPrompt}" | URL: ${imageUrl}`);

  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 45000,
      headers: {
        'User-Agent': 'UsagiTienTonBot/2.1 (Discord Bot)',
        Accept: 'image/jpeg,image/png,image/*',
      },
    });

    const buffer = Buffer.from(response.data);
    return {
      success: true,
      buffer,
      cleanPrompt,
      fileName: `usagi_design_${Date.now()}.jpg`,
      imageUrl,
    };
  } catch (error) {
    logger.error('[AI Image] Failed to fetch generated image:', error.message);
    return {
      success: false,
      error: error.message,
      cleanPrompt,
      imageUrl,
    };
  }
}
