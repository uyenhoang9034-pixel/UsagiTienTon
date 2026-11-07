import crypto from 'node:crypto';
import { logger } from '../utils/logger.js';

/**
 * Message Flag Discord Components V2
 */
export const IS_COMPONENTS_V2 = 1 << 15; // 32768

/**
 * Mã màu thương hiệu Usagi (Hồng pastel #F3AFC8 = 15969992)
 */
export const USAGI_COLOR = 15969992;
export const WARNING_COLOR = 16705372; // #FEE75C

/**
 * Hệ thống custom animated emoji theo yêu cầu
 */
export const RANDOM_EMOJIS = {
  TITLE: '<a:trangtrig52:1567818998475657246>',
  INDICATOR: '<a:trangtrig31:1546905996893626440>',
  BULLET: '<a:trangtrig54:1567819312775823402>',
  WARNING: '<a:trangtrig49:1567818140375851018>',
  BUTTON_DICE: {
    name: 'trangtrig52',
    id: '1567818998475657246',
    animated: true,
  },
};

/**
 * Cache lưu danh sách lựa chọn cho session Reroll (TTL: 2 giờ)
 */
const choiceSessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of choiceSessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      choiceSessions.delete(id);
    }
  }
}

export function saveChoiceSession(sessionId, items, userId) {
  cleanupExpiredSessions();
  choiceSessions.set(sessionId, {
    items,
    userId,
    createdAt: Date.now(),
  });
}

export function getChoiceSession(sessionId) {
  return choiceSessions.get(sessionId) || null;
}

/**
 * Sinh số nguyên ngẫu nhiên (chỉ số nguyên, không thập phân)
 */
export function getRandomInteger(min, max) {
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  return crypto.randomInt(lower, upper + 1);
}

/**
 * Phân tích input đầu vào của lệnh random
 */
export function parseRandomInput(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') {
    return { type: 'guide' };
  }

  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { type: 'guide' };
  }

  // 1. Khoảng số: vd "1-10000", "1 - 10000", "50 100", "-5 - 10", "1 đến 100"
  const rangeMatch = trimmed.match(/^(-?\d+)\s*(?:[-–—~]|đến|to|\s)\s*(-?\d+)$/i);
  if (rangeMatch) {
    let min = parseInt(rangeMatch[1], 10);
    let max = parseInt(rangeMatch[2], 10);
    if (min > max) [min, max] = [max, min];
    return { type: 'number', min, max };
  }

  // 2. Một số duy nhất: vd "100" -> tự hiểu 1 đến 100
  const singleNumberMatch = trimmed.match(/^(\d+)$/);
  if (singleNumberMatch) {
    const max = parseInt(singleNumberMatch[1], 10);
    if (max <= 1) {
      return { type: 'guide' };
    }
    return { type: 'number', min: 1, max };
  }

  // 3. Danh sách mục: phân tách bởi xuống dòng, dấu gạch đứng |, dấu phẩy ,, hoặc dấu gạch ngang -
  let items = [];
  if (trimmed.includes('\n')) {
    items = trimmed.split('\n');
  } else if (trimmed.includes('|')) {
    items = trimmed.split('|');
  } else if (trimmed.includes(',')) {
    items = trimmed.split(',');
  } else {
    items = trimmed.split(/\s*[-–—]\s*/);
  }

  items = items.map((s) => s.trim()).filter((s) => s.length > 0);

  if (items.length < 2) {
    return { type: 'guide' };
  }

  return { type: 'choice', items };
}

/**
 * Build payload V2 cho kết quả random số (không title, không footer)
 */
export function buildNumberPayloadV2(result, min, max, userId) {
  // Chỉ lấy số nguyên thuần, không phân cách thập phân
  const formattedNumber = String(Math.floor(result));

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17, // Container
        accent_color: USAGI_COLOR,
        components: [
          {
            type: 10, // Text Display
            content: `${RANDOM_EMOJIS.TITLE} **KẾT QUẢ RANDOM**\n${RANDOM_EMOJIS.INDICATOR} \` ${formattedNumber} \``,
          },
          {
            type: 14, // Separator
            divider: true,
            spacing: 1,
          },
          {
            type: 10, // Text Display
            content: `${RANDOM_EMOJIS.BULLET} **Phạm vi:** ${min} - ${max}\n${RANDOM_EMOJIS.BULLET} **Người quay random:** <@${userId}> | ID: ${userId}`,
          },
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button
                style: 2, // Màu xám (Secondary)
                label: 'Quay lại',
                emoji: RANDOM_EMOJIS.BUTTON_DICE,
                custom_id: `rd_reroll_num:${min}:${max}:${userId}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho kết quả random danh sách lựa chọn (không title, không footer, không nút xóa)
 */
export function buildChoicePayloadV2(chosen, items, userId, sessionId = null) {
  const sid = sessionId || crypto.randomUUID().slice(0, 8);
  saveChoiceSession(sid, items, userId);

  // Hiển thị tối đa 15 mục để không vượt giới hạn độ dài của tin nhắn Discord
  const displayItems = items.slice(0, 15);
  const itemsText = displayItems.map((item) => `> - ${item}`).join('\n');
  const overflowText =
    items.length > 15
      ? `\n> - *...và ${items.length - 15} mục khác*`
      : '';

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17, // Container
        accent_color: USAGI_COLOR,
        components: [
          {
            type: 10, // Text Display
            content: `${RANDOM_EMOJIS.TITLE} **VẬN MAY ĐÃ MỈM CƯỜI VỚI**\n${RANDOM_EMOJIS.INDICATOR} \` ${chosen} \``,
          },
          {
            type: 14, // Separator
            divider: true,
            spacing: 1,
          },
          {
            type: 10, // Text Display
            content: `${RANDOM_EMOJIS.BULLET} **Danh sách tham gia (${items.length} mục):**\n${itemsText}${overflowText}\n${RANDOM_EMOJIS.BULLET} **Người quay random:** <@${userId}> | ID: ${userId}`,
          },
          {
            type: 1, // Action Row
            components: [
              {
                type: 2, // Button
                style: 2, // Màu xám (Secondary)
                label: 'Chọn lại',
                emoji: RANDOM_EMOJIS.BUTTON_DICE,
                custom_id: `rd_reroll_choice:${sid}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho hướng dẫn khi cú pháp chưa chính xác (bỏ footer)
 */
export function buildGuidePayloadV2() {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17, // Container
        accent_color: WARNING_COLOR,
        components: [
          {
            type: 10, // Text Display
            content: `${RANDOM_EMOJIS.WARNING} **Cú pháp chưa chính xác!**\n${RANDOM_EMOJIS.INDICATOR} **Gợi ý cú pháp siêu nhanh từ Usagi:**\n> - \`&random <số> - <số>\` (ví dụ: \`&random 1 - 10000\`)\n> - \`&random <mục 1> - <mục 2> - <mục 3>\`\n> - Rút gọn: \`&rd 100\` hoặc \`&rd A, B, C\``,
          },
        ],
      },
    ],
  };
}

/**
 * Xử lý trực tiếp input và trả về payload tương ứng
 */
export function processRandomInput(rawInput, userId) {
  const parsed = parseRandomInput(rawInput);

  if (parsed.type === 'number') {
    const result = getRandomInteger(parsed.min, parsed.max);
    return buildNumberPayloadV2(result, parsed.min, parsed.max, userId);
  }

  if (parsed.type === 'choice') {
    const chosenIndex = getRandomInteger(0, parsed.items.length - 1);
    const chosen = parsed.items[chosenIndex];
    return buildChoicePayloadV2(chosen, parsed.items, userId);
  }

  return buildGuidePayloadV2();
}

/**
 * Trích xuất danh sách lựa chọn từ fallback text trong trường hợp session bị mất sau khi bot khởi động lại
 */
export function extractChoicesFromMessage(message) {
  try {
    const container = message?.components?.[0];
    const textComponents = container?.components?.filter((c) => c.type === 10) || [];
    const listComponent = textComponents[1];

    if (!listComponent?.content) {
      return null;
    }

    const content = listComponent.content;
    const lines = content.split('\n');
    const items = [];

    for (const line of lines) {
      const match = line.match(/^>\s*-\s+(.+)$/);
      if (match && !match[1].startsWith('*...và ')) {
        items.push(match[1].trim());
      }
    }

    const userMatch = content.match(/ID:\s*(\d+)/);
    const userId = userMatch ? userMatch[1] : null;

    if (items.length >= 2) {
      return { items, userId };
    }
  } catch (err) {
    logger.warn('[RandomService] Không thể extract items từ message fallback:', err);
  }

  return null;
}

/**
 * Trigger kiểm tra tin nhắn & xử lý &random hoặc &rd
 */
export const RANDOM_TRIGGER_REGEX = /^[&!](?:random|rd)\b(?:\s+([\s\S]*))?$/i;

export async function handleRandomMessage(message, client) {
  if (typeof message.content !== 'string' || !message.content) {
    return false;
  }

  const match = message.content.match(RANDOM_TRIGGER_REGEX);
  if (!match) {
    return false;
  }

  const rawArgs = match[1] || '';
  const payload = processRandomInput(rawArgs, message.author.id);

  await message.reply(payload);
  return true;
}
