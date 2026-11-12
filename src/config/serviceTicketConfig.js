/**
 * Cấu hình & hằng số cho hệ thống Ticket Đặt Hàng / Dịch Vụ & Hỗ Trợ
 */

export const SERVICE_TICKET_IDS = Object.freeze({
  SP_TICKET_ROLE_ID: '1545295139390619768',
  CATEGORY_ID: '1570337527015936121',
  PANEL_CHANNEL_ID: '1570346905928474624',
  FEEDBACK_CHANNEL_ID: '1570348805155594290',
  LOG_CHANNEL_ID: '1570357576770654289',
  TOS_MESSAGE_URL: 'https://discord.com/channels/1541279801183178754/1570341834570342501/1570357980900106335',
  DEV_BOT_SUPPORT_USER_ID: '872792190651334707',
  CHINESE_TEACHER_ZALO: '0846140504',
});

export const MAX_OPEN_SERVICE_TICKETS_PER_USER = 2;
export const SERVICE_TICKET_CHANNEL_PREFIX = '𓂃⋆';
export const SERVICE_TICKET_BANNER_FILENAME = 'ticket.png';
export const SERVICE_TICKET_BANNER_REL_PATH = 'assets/ticket/ticket.png';
export const SERVICE_TICKET_BANNER_FALLBACK_URL = 'https://files.catbox.moe/xdd9hc.png';

export const SERVICE_TICKET_EMOJIS = Object.freeze({
  HEADER_L: '<a:trangtrig2:1546040703375904801>',
  HEADER_R: '<a:trangtrig3:1546040818261954610>',
  BULLET_SERVICE: '<a:trangtrig60:1569558191551942696>',
  SUB_SECTION: '<a:trangtrig61:1569559986550612051>',
  HEART: '<a:heartg1:1545307544808071258>',
  BANG: '<a:bang2:1546891483250954290>',
  LOG_BULLET: '<a:trangtrig31:1546905996893626440>',
  NUM_1: '<a:1_:1563484001765949550>',
  NUM_2: '<a:2_:1563484061111156828>',
  NUM_3: '<a:3_:1563484342779388045>',
  NUM_4: '<a:4_:1563484724725424209>',
  BUTTON_BUY: {
    name: 'trangtrig62',
    id: '1569560241190871152',
    animated: true,
  },
  BUTTON_SUPPORT: {
    name: 'trangtrig61',
    id: '1569559986550612051',
    animated: true,
  },
  FEEDBACK_REACT: '<a:trangtrig60:1569558191551942696>',
  STICKY_HEART: '<a:heartg8:1567818755793358928>',
});

export const SERVICE_CATALOG = Object.freeze({
  codebot: {
    key: 'codebot',
    label: 'Vibe Code Bot Discord',
    aliases: ['codebot', 'code bot', 'bot discord'],
  },
  nitrodecor: {
    key: 'nitrodecor',
    label: 'Discord Nitro & Decor',
    aliases: ['nitrodecor', 'nitro decor', 'nitro & decor', 'nitro', 'decor', 'decoration'],
  },
  chinese: {
    key: 'chinese',
    label: 'Lớp học Tiếng Trung 1:1',
    aliases: ['chinese', 'tieng trung', 'trung'],
  },
  khac: {
    key: 'khac',
    label: 'Dịch vụ khác',
    aliases: ['khac'],
  },
  hotro: {
    key: 'hotro',
    label: 'Hỗ trợ / Giải đáp / Bảo hành',
    aliases: ['hotro', 'ho tro'],
  },
});

export const SERVICE_BUY_MODAL_PROMPT =
  'Xin chào bạn, bạn muốn sử dụng dịch vụ nào ở server bọn mình ạ? Hiện tại bọn mình đang có: "codebot / nitrodecor / chinese / khác". Xin vui lòng nhập đúng nội dung và keyword dịch vụ để bot dễ xử lý (ví dụ: chinese).';

export const SERVICE_SUPPORT_MODAL_PROMPT =
  'Xin chào bạn, bạn cần tụi mình hỗ trợ vấn đề gì ạ?';

export const SERVICE_DM_FOOTER =
  '-# Đây là thông báo của bot, vui lòng không rep tin nhắn này. Nếu có bất kì vấn đề gì xin vui lòng nhắn ở ticket. Xin cảm ơn!';

/**
 * Chuẩn hóa chuỗi tiếng Việt để so khớp keyword ổn định.
 */
export function normalizeKeywordText(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

/**
 * Nhận diện keyword dịch vụ Mua Hàng: codebot / nitrodecor / chinese / khac (khác).
 * Hỗ trợ nhập đơn thuần ("chinese") hoặc nhập kèm mô tả ("chinese - học giao tiếp").
 * Trả về null nếu không khớp từ khóa hợp lệ.
 */
export function parseBuyServiceKeyword(rawInput) {
  const normalized = normalizeKeywordText(rawInput);
  if (!normalized) {
    return null;
  }

  const orderedKeys = ['codebot', 'nitrodecor', 'chinese', 'khac'];

  // 1. Ưu tiên khớp chính xác hoặc bắt đầu bằng keyword/alias
  for (const key of orderedKeys) {
    const entry = SERVICE_CATALOG[key];
    for (const alias of entry.aliases) {
      if (
        normalized === alias ||
        normalized.startsWith(`${alias} `) ||
        normalized.startsWith(`${alias}:`) ||
        normalized.startsWith(`${alias}-`) ||
        normalized.startsWith(`${alias}/`) ||
        normalized.startsWith(`${alias},`)
      ) {
        return entry;
      }
    }
  }

  // 2. Fallback: tìm keyword/alias xuất hiện như một cụm từ độc lập trong câu
  const escapedMatches = (haystack, needle) => {
    const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`, 'i');
    return regex.test(haystack);
  };

  for (const key of orderedKeys) {
    const entry = SERVICE_CATALOG[key];
    for (const alias of entry.aliases) {
      if (escapedMatches(normalized, alias)) {
        return entry;
      }
    }
  }

  return null;
}

export function buildServiceTicketChannelName(serviceKey, ticketNumber) {
  const safeKey = String(serviceKey || 'khac')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '') || 'khac';
  const safeNumber = Number.isInteger(Number(ticketNumber)) && Number(ticketNumber) > 0
    ? Number(ticketNumber)
    : 1;
  return `${SERVICE_TICKET_CHANNEL_PREFIX}ticket-${safeKey}-${safeNumber}`;
}

export function getServiceTicketCounterStorageKey(guildId) {
  return `guild:${guildId}:service_ticket_counters`;
}

export function getServiceTicketStaffCacheKey(guildId) {
  return `guild:${guildId}:service_ticket_staff_ids`;
}

export function getFeedbackStickyStorageKey(guildId) {
  return `guild:${guildId}:service_ticket_feedback_sticky`;
}

