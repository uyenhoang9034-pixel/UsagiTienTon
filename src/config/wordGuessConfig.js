/**
 * wordGuessConfig.js — Cấu hình & Emoji chuẩn Components V2 cho tính năng Đoán Từ (Usagi Tiên Tôn).
 */

export const WORD_GUESS_ADMIN_ROLE_ID =
  process.env.WORD_GUESS_ADMIN_ROLE_ID ||
  process.env.ADMIN_ROLE_ID ||
  '1545305594712432640';

export const WORD_GUESS_ALLOWED_ADMIN_ROLES = new Set(
  [WORD_GUESS_ADMIN_ROLE_ID, '1545305594712432640', '1541303749916754001'].filter(Boolean),
);

export const WORD_GUESS_DEFAULTS = {
  ROUND_DURATION_SECONDS: 60,
  MIN_DURATION_SECONDS: 15,
  MAX_DURATION_SECONDS: 300,
  NEXT_ROUND_DELAY_MS: 5000,
  IDLE_TIMEOUT_MS: 3 * 60 * 1000,
  IDLE_TIMER_TOLERANCE_MS: 1000,
  NIGHT_LOCK_START_HOUR: 0,
  NIGHT_LOCK_END_HOUR: 8,
  NIGHT_LOCK_TIMEZONE: 'Asia/Ho_Chi_Minh',
  BXH_PAGE_SIZE: 5,
  RECENT_WORDS_LIMIT: 200,
};

export const WORD_GUESS_EMOJIS = {
  TITLE: '<a:trangtrig53:1567819189866201219>',
  LANGUAGE: '<a:trangtrig18:1546068102817775626>',
  SCRAMBLED: '<a:trangtrig49:1567818140375851018>',
  HINT: '<a:heartg1:1545307544808071258>',
  TIME: '<:trangtri2:1567819836279492652>',
  STREAK: '<a:trangtrig29:1546385117478527016>',
  STATUS: '<a:trangtrig31:1546905996893626440>',
  WINNER: '<a:heartg1:1545307544808071258>',
  CHANNEL: '<a:trangtrig30:1546905942476464178>',
  ADMIN_START: '<a:bunnyg4:1541439959385374760>',
  ADMIN_DISABLE: '<a:bang3:1546891744237461635>',
  RANK_EMOJIS: [
    '<a:1_:1563484001765949550>',
    '<a:2_:1563484061111156828>',
    '<a:3_:1563484342779388045>',
    '<a:4_:1563484724725424209>',
    '<a:5_:1563484794623365151>',
  ],
};

/**
 * Chuyển chuỗi `<a:name:id>` hoặc `<:name:id>` thành object `{ id, name, animated }` cho Discord Button component.
 * @param {string} emojiString
 * @returns {{ id: string, name: string, animated: boolean } | undefined}
 */
export function parseCustomEmojiObject(emojiString) {
  const match = String(emojiString || '').trim().match(/^<(a?):([a-zA-Z0-9_]+):(\d+)>$/);
  if (!match) {
    return undefined;
  }

  return {
    animated: match[1] === 'a',
    name: match[2],
    id: match[3],
  };
}

export const WORD_GUESS_BUTTON_EMOJIS = {
  HINT: parseCustomEmojiObject(WORD_GUESS_EMOJIS.HINT),
  ADMIN_START: parseCustomEmojiObject(WORD_GUESS_EMOJIS.ADMIN_START),
  ADMIN_TOGGLE: parseCustomEmojiObject(WORD_GUESS_EMOJIS.STATUS),
  ADMIN_TIME: parseCustomEmojiObject(WORD_GUESS_EMOJIS.TIME),
  ADMIN_DISABLE: parseCustomEmojiObject(WORD_GUESS_EMOJIS.ADMIN_DISABLE),
};

/**
 * Định dạng tiêu đề chuẩn V2: `<a:trangtrig53:...> **IN HOA** <a:trangtrig53:...>`
 * @param {string} title
 * @returns {string}
 */
export function formatWordGuessTitle(title) {
  const upperTitle = String(title || '').trim().toUpperCase();
  return `${WORD_GUESS_EMOJIS.TITLE} **${upperTitle}** ${WORD_GUESS_EMOJIS.TITLE}`;
}

