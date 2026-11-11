/**
 * hskConfig.js — Cấu hình, bảng cấp độ HSK 3.0 & Emoji Components V2 (Usagi Tiên Tôn).
 */

export const HSK_ADMIN_ROLE_ID =
  process.env.HSK_ADMIN_ROLE_ID ||
  process.env.WORD_GUESS_ADMIN_ROLE_ID ||
  process.env.ADMIN_ROLE_ID ||
  '1545305594712432640';

export const HSK_ALLOWED_ADMIN_ROLES = new Set(
  [HSK_ADMIN_ROLE_ID, '1545305594712432640', '1541303749916754001'].filter(Boolean),
);

export const HSK_DEFAULTS = {
  ROUND_DURATION_SECONDS: 45,
  MIN_DURATION_SECONDS: 15,
  MAX_DURATION_SECONDS: 300,
  NEXT_ROUND_DELAY_MS: 5000,
  IDLE_TIMEOUT_MS: 3 * 60 * 1000,
  IDLE_TIMER_TOLERANCE_MS: 1000,
  NIGHT_LOCK_START_HOUR: 0,
  NIGHT_LOCK_END_HOUR: 8,
  NIGHT_LOCK_TIMEZONE: 'Asia/Ho_Chi_Minh',
  BXH_PAGE_SIZE: 5,
  NOTEBOOK_PAGE_SIZE: 3,
  RECENT_WORDS_LIMIT: 120,
  WRONG_WORDS_LIMIT: 200,
  MASTERED_IDS_LIMIT: 400,
  SESSION_TTL_MS: 15 * 60 * 1000,
  SESSION_MAX_ENTRIES: 300,
  SRS_INTERVAL_DAYS: [1, 4, 10, 21],
};

export const HSK_BANDS = [
  {
    id: 1,
    code: '1',
    name: 'HSK 1',
    shortLabel: 'HSK 1 · Sơ cấp 1',
    selectLabel: 'HSK 1 · Sơ cấp 1 (~500 từ)',
    selectDescription: 'Giao tiếp cơ bản hàng ngày theo quy chuẩn HSK 3.0',
    file: 'hsk1.json',
  },
  {
    id: 2,
    code: '2',
    name: 'HSK 2',
    shortLabel: 'HSK 2 · Sơ cấp 2',
    selectLabel: 'HSK 2 · Sơ cấp 2 (~1.272 từ)',
    selectDescription: 'Mở rộng sinh hoạt, du lịch, học tập và cảm xúc',
    file: 'hsk2.json',
  },
  {
    id: 3,
    code: '3',
    codeName: 'HSK 3',
    name: 'HSK 3',
    shortLabel: 'HSK 3 · Sơ cấp 3',
    selectLabel: 'HSK 3 · Sơ cấp 3 (~2.245 từ)',
    selectDescription: 'Giao tiếp tự tin về học tập, công việc, cuộc sống',
    file: 'hsk3.json',
  },
  {
    id: 4,
    code: '4',
    name: 'HSK 4',
    shortLabel: 'HSK 4 · Trung cấp 4',
    selectLabel: 'HSK 4 · Trung cấp 4 (~3.245 từ)',
    selectDescription: 'Thảo luận đa chủ đề, phỏng vấn, báo chí phổ thông',
    file: 'hsk4.json',
  },
  {
    id: 5,
    code: '5',
    name: 'HSK 5',
    shortLabel: 'HSK 5 · Trung cấp 5',
    selectLabel: 'HSK 5 · Trung cấp 5 (~4.316 từ)',
    selectDescription: 'Đọc báo, tiểu luận, bày tỏ quan điểm mạch lạc',
    file: 'hsk5.json',
  },
  {
    id: 6,
    code: '6',
    name: 'HSK 6',
    shortLabel: 'HSK 6 · Trung cấp 6',
    selectLabel: 'HSK 6 · Trung cấp 6 (~5.456 từ)',
    selectDescription: 'Học thuật, kinh tế, xã hội, khoa học chuyên sâu',
    file: 'hsk6.json',
  },
  {
    id: 7,
    code: '7-9',
    name: 'HSK 7–9',
    shortLabel: 'HSK 7–9 · Cao cấp',
    selectLabel: 'HSK 7–9 · Cao cấp (~11.092 từ)',
    selectDescription: 'Thành ngữ, văn phong hàn lâm và diễn đạt tinh tế',
    file: 'hsk7_9.json',
  },
];

export const HSK_ARENA_LEVEL_CHOICES = [
  { key: '1', label: 'HSK 1 · Sơ cấp 1', bands: [1] },
  { key: '2', label: 'HSK 2 · Sơ cấp 2', bands: [2] },
  { key: '3', label: 'HSK 3 · Sơ cấp 3', bands: [3] },
  { key: '4', label: 'HSK 4 · Trung cấp 4', bands: [4] },
  { key: '5', label: 'HSK 5 · Trung cấp 5', bands: [5] },
  { key: '6', label: 'HSK 6 · Trung cấp 6', bands: [6] },
  { key: '7', label: 'HSK 7–9 · Cao cấp', bands: [7] },
  { key: 'mixed_1_3', label: 'Hỗn hợp Sơ cấp (HSK 1–3)', bands: [1, 2, 3] },
  { key: 'mixed_all', label: 'Tổng hợp tất cả (HSK 1–9)', bands: [1, 2, 3, 4, 5, 6, 7] },
];

export const HSK_EMOJIS = {
  TITLE_LEFT: '<a:trangtrig2:1546040703375904801>',
  TITLE_RIGHT: '<a:trangtrig3:1546040818261954610>',
  LEVEL: '<a:trangtrig61:1569559986550612051>',
  STREAK: '<a:trangtrig29:1546385117478527016>',
  NOTEBOOK: '<a:trangtrig18:1546068102817775626>',
  ACTION: '<a:trangtrig62:1569560241190871152>',
  ARENA: '<a:trangtrig1:1546040442548654140>',
  HINT: '<a:trangtrig49:1567818140375851018>',
  FLIP: '<a:trangtrig54:1567819312775823402>',
  CHECK: '<a:trangtrig31:1546905996893626440>',
  TIME: '<:trangtri2:1567819836279492652>',
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
 * Chuyển `<a:name:id>` hoặc `<:name:id>` thành object `{ id, name, animated }` cho nút Discord.
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

export const HSK_BUTTON_EMOJIS = {
  LEVEL: parseCustomEmojiObject(HSK_EMOJIS.LEVEL),
  STREAK: parseCustomEmojiObject(HSK_EMOJIS.STREAK),
  NOTEBOOK: parseCustomEmojiObject(HSK_EMOJIS.NOTEBOOK),
  ACTION: parseCustomEmojiObject(HSK_EMOJIS.ACTION),
  ARENA: parseCustomEmojiObject(HSK_EMOJIS.ARENA),
  HINT: parseCustomEmojiObject(HSK_EMOJIS.HINT),
  FLIP: parseCustomEmojiObject(HSK_EMOJIS.FLIP),
  CHECK: parseCustomEmojiObject(HSK_EMOJIS.CHECK),
  TIME: parseCustomEmojiObject(HSK_EMOJIS.TIME),
  ADMIN_DISABLE: parseCustomEmojiObject(HSK_EMOJIS.ADMIN_DISABLE),
};

export function getBandMeta(bandId) {
  const parsed = Number(bandId);
  return HSK_BANDS.find((b) => b.id === parsed) || HSK_BANDS[0];
}

export function getArenaLevelMeta(levelKey) {
  const normalized = String(levelKey || '1');
  return HSK_ARENA_LEVEL_CHOICES.find((item) => item.key === normalized) || HSK_ARENA_LEVEL_CHOICES[0];
}

/**
 * Tiêu đề đồng bộ chuẩn V2: `<a:trangtrig2:...> **IN HOA** <a:trangtrig3:...>`
 * @param {string} title
 * @returns {string}
 */
export function formatHskTitle(title) {
  const upperTitle = String(title || '').trim().toUpperCase();
  return `${HSK_EMOJIS.TITLE_LEFT} **${upperTitle}** ${HSK_EMOJIS.TITLE_RIGHT}`;
}

