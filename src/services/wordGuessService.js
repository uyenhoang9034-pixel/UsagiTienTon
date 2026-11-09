import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import {
  WORD_GUESS_ADMIN_ROLE_ID,
  WORD_GUESS_ALLOWED_ADMIN_ROLES,
  WORD_GUESS_DEFAULTS,
  WORD_GUESS_EMOJIS,
  WORD_GUESS_BUTTON_EMOJIS,
  formatWordGuessTitle,
} from '../config/wordGuessConfig.js';
import { isBotOwner } from '../config/bot.js';
import { getDatabaseValue, setDatabaseValue } from '../utils/database.js';
import { getWordGuessConfigKey, getWordGuessRegistryKey } from '../utils/database/keys.js';
import { logger } from '../utils/logger.js';

export const IS_COMPONENTS_V2 = MessageFlags.IsComponentsV2 || (1 << 15);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WORDS_FILE_PATH = path.resolve(__dirname, '../data/wordGuessWords.json');

let cachedWordBank = null;

/**
 * Hàng đợi mutex theo từng server để tránh race condition khi ghi DB / cập nhật streak.
 */
const guildOperationQueues = new Map();

/**
 * Trạng thái ván chơi đang diễn ra trong RAM (key: guildId).
 */
const activeRounds = new Map();

/**
 * Cache các guildId đã ghi vào danh sách khôi phục để không đọc DB registry mỗi ván.
 */
const registeredGuildCache = new Set();

/**
 * Timer đang chạy theo từng server (key: guildId -> { hintTimeout, endTimeout, nextRoundTimeout }).
 */
const activeTimers = new Map();

/**
 * Thời điểm có tương tác chơi gần nhất (gửi đáp án / bấm Mở gợi ý / bắt đầu ván) theo guildId.
 */
const guildLastActivityAt = new Map();

/**
 * Regex chuẩn hóa vị trí dấu thanh cũ/mới tiếng Việt (chỉ chuẩn hóa cặp cùng có dấu, tuyệt đối KHÔNG bỏ dấu).
 */
const TONE_PLACEMENT_EQUIVALENTS = [
  ['oà', 'òa'],
  ['oá', 'óa'],
  ['oả', 'ỏa'],
  ['oã', 'õa'],
  ['oạ', 'ọa'],
  ['oè', 'òe'],
  ['oé', 'óe'],
  ['oẻ', 'ỏe'],
  ['oẽ', 'õe'],
  ['oẹ', 'ọe'],
  ['ùy', 'uỳ'],
  ['úy', 'uý'],
  ['ủy', 'uỷ'],
  ['ũy', 'uỹ'],
  ['ụy', 'uỵ'],
];

/**
 * Nạp danh sách từ vựng tiếng Việt một lần từ JSON (lazy-load tối ưu RAM).
 * @returns {string[]}
 */
export function loadWordBank() {
  if (Array.isArray(cachedWordBank) && cachedWordBank.length > 0) {
    return cachedWordBank;
  }

  try {
    const raw = fs.readFileSync(WORDS_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cachedWordBank = parsed
        .map((w) => String(w || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN'))
        .filter((w) => w.length > 0);
    }
  } catch (error) {
    logger.error('[WordGuess] Không thể nạp kho từ wordGuessWords.json:', error);
    cachedWordBank = ['hoa hồng', 'bánh chưng', 'mùa xuân', 'cầu vồng'];
  }

  return cachedWordBank;
}

function releaseUnusedWordBankCache() {
  if (activeRounds.size === 0 && activeTimers.size === 0) {
    cachedWordBank = null;
  }
}

export function getWordGuessNow(client = null, overrideNow = undefined) {
  if (typeof overrideNow === 'number' && Number.isFinite(overrideNow)) {
    return overrideNow;
  }
  if (typeof client?._wordGuessNow === 'function') {
    const mocked = client._wordGuessNow();
    if (typeof mocked === 'number' && Number.isFinite(mocked)) {
      return mocked;
    }
  }
  return Date.now();
}

/**
 * Lấy giờ/phút/giây hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7).
 * @param {number} [nowMs]
 * @returns {{ hour: number, minute: number, second: number }}
 */
export function getVietnamTimeParts(nowMs = Date.now()) {
  const date = new Date(nowMs);
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: WORD_GUESS_DEFAULTS.NIGHT_LOCK_TIMEZONE || 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    const parts = formatter.formatToParts(date);
    const pickPart = (type) => Number.parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    return {
      hour: pickPart('hour') % 24,
      minute: pickPart('minute'),
      second: pickPart('second'),
    };
  } catch {
    const vnDate = new Date(nowMs + 7 * 60 * 60 * 1000);
    return {
      hour: vnDate.getUTCHours(),
      minute: vnDate.getUTCMinutes(),
      second: vnDate.getUTCSeconds(),
    };
  }
}

/**
 * Khóa cứng ban đêm từ 00:00 đến 08:00 sáng (8 tiếng, giờ Việt Nam) để tránh ngốn RAM.
 * @param {number} [nowMs]
 */
export function isWordGuessNightLock(nowMs = Date.now()) {
  const { hour, minute, second } = getVietnamTimeParts(nowMs);
  const startHour = WORD_GUESS_DEFAULTS.NIGHT_LOCK_START_HOUR ?? 0;
  const endHour = WORD_GUESS_DEFAULTS.NIGHT_LOCK_END_HOUR ?? 8;
  const locked = hour >= startHour && hour < endHour;
  return {
    locked,
    hour,
    minute,
    second,
    startHour,
    endHour,
    currentTimeText: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
  };
}

/**
 * Chạy tuần tự thao tác đọc-ghi theo từng guildId để tránh xung đột streak.
 * @template T
 * @param {string} guildId
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function withGuildLock(guildId, fn) {
  const key = String(guildId || 'global');
  const previous = guildOperationQueues.get(key) || Promise.resolve();
  const next = previous.then(fn, fn);
  const cleanup = next.then(
    () => {
      if (guildOperationQueues.get(key) === cleanup) {
        guildOperationQueues.delete(key);
      }
    },
    () => {
      if (guildOperationQueues.get(key) === cleanup) {
        guildOperationQueues.delete(key);
      }
    },
  );
  guildOperationQueues.set(key, cleanup);
  return next;
}

/**
 * Chuẩn hóa đáp án tiếng Việt CÓ DẤU:
 * - Giữ nguyên toàn bộ dấu thanh và dấu mũ (nhắn không dấu sẽ KHÔNG khớp).
 * - Chỉ đồng nhất quy tắc đặt dấu thanh cũ/mới (vd: hòa / hoà, thúy / thuý).
 * @param {string} input
 * @returns {string}
 */
export function normalizeVietnameseGuess(input) {
  let normalized = String(input || '')
    .normalize('NFC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('vi-VN');

  for (const [oldStyle, newStyle] of TONE_PLACEMENT_EQUIVALENTS) {
    if (normalized.includes(oldStyle)) {
      normalized = normalized.split(oldStyle).join(newStyle);
    }
  }

  return normalized;
}

/**
 * Kiểm tra xem thành viên có quyền Admin quản trị Đoán Từ hay không.
 * Hỗ trợ role 1545305594712432640, role cấu hình, Chủ server, BOT OWNER và quyền Administrator.
 * @param {import('discord.js').GuildMember | object | null} member
 * @param {string | null} userId
 * @param {import('discord.js').Guild | null} [guild]
 * @param {import('discord.js').PermissionsBitField | null} [memberPermissions]
 * @returns {boolean}
 */
export function isWordGuessAdmin(member, userId, guild = null, memberPermissions = null) {
  const uid = String(userId || member?.id || member?.user?.id || '');
  if (uid && isBotOwner(uid)) {
    return true;
  }

  const targetGuild = guild || member?.guild;
  if (uid && targetGuild?.ownerId && String(targetGuild.ownerId) === uid) {
    return true;
  }

  const perms = memberPermissions || member?.permissions;
  if (perms?.has?.(PermissionFlagsBits.Administrator)) {
    return true;
  }

  if (!member) {
    return false;
  }

  for (const roleId of WORD_GUESS_ALLOWED_ADMIN_ROLES) {
    if (
      member.roles?.cache?.has?.(roleId) ||
      (Array.isArray(member.roles) && member.roles.includes(roleId)) ||
      (Array.isArray(member._roles) && member._roles.includes(roleId))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Thống kê số chữ cái (không tính khoảng trắng) và số từ của cụm từ tiếng Việt.
 * @param {string} phrase
 * @returns {{ letterCount: number, wordCount: number }}
 */
export function getWordStats(phrase) {
  const clean = String(phrase || '').normalize('NFC').trim().replace(/\s+/g, ' ');
  const compact = clean.replace(/\s+/g, '');
  const letterCount = Array.from(compact).length;
  const wordCount = clean ? clean.split(' ').length : 0;
  return { letterCount, wordCount };
}

/**
 * Xáo trộn các ký tự của cụm từ, in hoa và chèn khoảng trắng giữa từng chữ (vd: "I A H Y S Ẩ T").
 * @param {string} phrase
 * @returns {string}
 */
export function scrambleVietnameseWord(phrase) {
  const compactUpper = String(phrase || '')
    .normalize('NFC')
    .replace(/\s+/g, '')
    .toLocaleUpperCase('vi-VN');

  const chars = Array.from(compactUpper);
  if (chars.length <= 1) {
    return chars.join(' ');
  }

  const uniqueChars = new Set(chars);
  if (uniqueChars.size <= 1) {
    return chars.join(' ');
  }

  for (let attempt = 0; attempt < 15; attempt++) {
    const shuffled = [...chars];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    if (shuffled.join('') !== compactUpper) {
      return shuffled.join(' ');
    }
  }

  // Fallback xoay vòng nếu ngẫu nhiên trùng lại chuỗi gốc
  return [...chars.slice(1), chars[0]].join(' ');
}

/**
 * Tạo khung gợi ý mở chữ cái đầu của từng từ (vd: "S _ _   T _ _ _").
 * @param {string} phrase
 * @returns {string}
 */
export function buildHintMask(phrase) {
  const words = String(phrase || '')
    .normalize('NFC')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .map((word) => {
      const letters = Array.from(word);
      if (letters.length === 0) {
        return '';
      }
      const first = letters[0].toLocaleUpperCase('vi-VN');
      const maskedRest = letters.slice(1).map(() => '_');
      return [first, ...maskedRest].join(' ');
    })
    .join('   ');
}

/**
 * Chọn ngẫu nhiên một từ mới không trùng với các từ gần đây.
 * @param {string[]} recentWords
 * @returns {string}
 */
export function pickNextWord(recentWords = []) {
  const bank = loadWordBank();
  const recentSet = new Set(
    (Array.isArray(recentWords) ? recentWords : []).map((w) => normalizeVietnameseGuess(w)),
  );

  let pool = bank.filter((w) => !recentSet.has(normalizeVietnameseGuess(w)));
  if (pool.length === 0) {
    const lastWord = recentWords.length > 0 ? normalizeVietnameseGuess(recentWords[recentWords.length - 1]) : null;
    pool = lastWord ? bank.filter((w) => normalizeVietnameseGuess(w) !== lastWord) : bank;
  }
  if (pool.length === 0) {
    pool = bank;
  }

  const index = crypto.randomInt(0, pool.length);
  return pool[index];
}

/**
 * Cấu trúc config mặc định cho mỗi guild.
 * @param {string} guildId
 */
export function createDefaultGuildConfig(guildId) {
  return {
    guildId: String(guildId),
    enabled: false,
    channelId: null,
    durationSeconds: WORD_GUESS_DEFAULTS.ROUND_DURATION_SECONDS,
    autoStart: true,
    idlePaused: false,
    recentWords: [],
    stats: {},
    updatedAt: null,
  };
}

function normalizeUserStat(userId, raw = {}) {
  return {
    userId: String(userId),
    currentStreak: Math.max(0, Number(raw.currentStreak) || 0),
    bestStreak: Math.max(0, Number(raw.bestStreak) || 0),
    totalWins: Math.max(0, Number(raw.totalWins) || 0),
    bestTimeMs: typeof raw.bestTimeMs === 'number' && Number.isFinite(raw.bestTimeMs) && raw.bestTimeMs >= 0
      ? raw.bestTimeMs
      : null,
    lastWinAt: raw.lastWinAt || null,
  };
}

function normalizeGuildConfig(guildId, raw = null) {
  const base = createDefaultGuildConfig(guildId);
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const duration = Number(raw.durationSeconds);
  const clampedDuration = Number.isFinite(duration)
    ? Math.max(WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS, Math.min(WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS, Math.round(duration)))
    : base.durationSeconds;

  const stats = {};
  if (raw.stats && typeof raw.stats === 'object') {
    for (const [uid, stat] of Object.entries(raw.stats)) {
      if (!uid) continue;
      stats[uid] = normalizeUserStat(uid, stat);
    }
  }

  return {
    guildId: String(guildId),
    enabled: Boolean(raw.enabled),
    channelId: raw.channelId ? String(raw.channelId) : null,
    durationSeconds: clampedDuration,
    autoStart: raw.autoStart !== undefined ? Boolean(raw.autoStart) : true,
    idlePaused: Boolean(raw.idlePaused),
    recentWords: Array.isArray(raw.recentWords)
      ? raw.recentWords.slice(-WORD_GUESS_DEFAULTS.RECENT_WORDS_LIMIT)
      : [],
    stats,
    updatedAt: raw.updatedAt || null,
  };
}

export async function getWordGuessGuildConfig(client, guildId) {
  const raw = await getDatabaseValue(client, getWordGuessConfigKey(guildId), null);
  return normalizeGuildConfig(guildId, raw);
}

export async function registerWordGuessGuild(client, guildId) {
  if (!guildId) return;
  const id = String(guildId);
  if (registeredGuildCache.has(id)) {
    return;
  }
  const registryKey = getWordGuessRegistryKey();
  const list = await getDatabaseValue(client, registryKey, []);
  const current = Array.isArray(list) ? list.map(String) : [];
  if (!current.includes(id)) {
    current.push(id);
    await setDatabaseValue(client, registryKey, current);
  }
  registeredGuildCache.add(id);
}

export async function saveWordGuessGuildConfig(client, guildId, config) {
  const normalized = normalizeGuildConfig(guildId, {
    ...config,
    updatedAt: new Date().toISOString(),
  });
  await setDatabaseValue(client, getWordGuessConfigKey(guildId), normalized);
  if (normalized.channelId) {
    await registerWordGuessGuild(client, guildId);
  }
  return normalized;
}

/**
 * Lấy danh sách bảng xếp hạng sắp xếp theo Streak (bestStreak DESC -> currentStreak DESC -> totalWins DESC -> bestTimeMs ASC).
 * @param {object} config
 */
export function getLeaderboardEntries(config) {
  const statsMap = config?.stats && typeof config.stats === 'object' ? config.stats : {};
  const entries = [];

  for (const [uid, rawStat] of Object.entries(statsMap)) {
    const stat = normalizeUserStat(uid, rawStat);
    if (stat.bestStreak > 0 || stat.totalWins > 0 || stat.currentStreak > 0) {
      entries.push(stat);
    }
  }

  entries.sort((a, b) => {
    if (b.bestStreak !== a.bestStreak) return b.bestStreak - a.bestStreak;
    if (b.currentStreak !== a.currentStreak) return b.currentStreak - a.currentStreak;
    if (b.totalWins !== a.totalWins) return b.totalWins - a.totalWins;
    const timeA = a.bestTimeMs ?? Number.POSITIVE_INFINITY;
    const timeB = b.bestTimeMs ?? Number.POSITIVE_INFINITY;
    if (timeA !== timeB) return timeA - timeB;
    return a.userId.localeCompare(b.userId);
  });

  return entries;
}

export function getPlayerLeaderboardPosition(config, userId) {
  const uid = String(userId || '');
  const entries = getLeaderboardEntries(config);
  const index = entries.findIndex((entry) => entry.userId === uid);
  const stats = index >= 0 ? entries[index] : normalizeUserStat(uid, config?.stats?.[uid]);
  return {
    entries,
    rank: index >= 0 ? index + 1 : null,
    stats,
    totalPlayers: entries.length,
  };
}

// =========================================================================
// PAYLOAD BUILDERS (DISCORD COMPONENTS V2 — KHÔNG VIỀN, NÚT XÁM)
// =========================================================================

/**
 * 1. Giao diện Bắt Đầu Ván Đoán Từ.
 */
export function buildRoundStartPayloadV2({
  scrambledDisplay,
  letterCount,
  wordCount,
  durationSeconds,
  roundId,
  autoStart = true,
  hintDisabled = false,
}) {
  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatWordGuessTitle('TRÒ CHƠI ĐOÁN TỪ BẮT ĐẦU!'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${WORD_GUESS_EMOJIS.LANGUAGE} **Ngôn ngữ:** Tiếng Việt`,
              `${WORD_GUESS_EMOJIS.SCRAMBLED} **Từ xáo trộn:** \`${scrambledDisplay}\``,
              `${WORD_GUESS_EMOJIS.HINT} **Gợi ý:** Từ gồm **${letterCount} chữ cái** và **${wordCount} từ**.`,
              `${WORD_GUESS_EMOJIS.TIME} **Thời gian suy nghĩ:** **${durationSeconds} giây**`,
              `${WORD_GUESS_EMOJIS.STREAK} **Tính điểm:** **+1 Streak cá nhân** cho người đoán đúng`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `-# ${autoStart ? 'Tự động bắt đầu' : 'Ván thủ công'} • Nhắn đáp án có dấu trực tiếp vào kênh (hết giờ mới đổi từ)`,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: 'Mở gợi ý',
                emoji: WORD_GUESS_BUTTON_EMOJIS.HINT,
                custom_id: `doantu_hint:${roundId}`,
                disabled: Boolean(hintDisabled),
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * 2. Giao diện Gợi Ý Chữ Cái Đầu (giữa giờ hoặc khi người chơi bấm Mở gợi ý).
 */
export function buildMidHintPayloadV2({
  elapsedSeconds,
  remainingSeconds,
  hintMask,
  triggeredByUser = false,
}) {
  const introLine = triggeredByUser
    ? `${WORD_GUESS_EMOJIS.TIME} Đã qua **${elapsedSeconds} giây** — gợi ý chữ cái đầu đã được mở!`
    : `${WORD_GUESS_EMOJIS.TIME} Đã qua **${elapsedSeconds} giây** nhưng vẫn chưa có ai đoán ra từ lần này~`;

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatWordGuessTitle('GỢI Ý CHỮ CÁI ĐẦU!'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              introLine,
              `${WORD_GUESS_EMOJIS.HINT} **Khung gợi ý:** \`${hintMask}\``,
              `${WORD_GUESS_EMOJIS.TIME} **Thời gian còn lại:** **${remainingSeconds} giây**`,
              `${WORD_GUESS_EMOJIS.STREAK} Đoán đúng ngay để cộng **+1 Streak cá nhân**!`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: '-# Mỗi người chơi được lưu chuỗi cá nhân và xếp hạng theo Streak',
          },
        ],
      },
    ],
  };
}

/**
 * 3. Giao diện Thông Báo Đoán Đúng & Cộng Streak Cá Nhân.
 */
export function buildRoundWinPayloadV2({
  winnerId,
  answer,
  reactionSeconds,
  winnerStats,
  nextRoundDelaySeconds = 5,
  autoStart = true,
  pausedNight = false,
}) {
  const answerUpper = String(answer || '').normalize('NFC').toLocaleUpperCase('vi-VN');
  const currentStreak = winnerStats?.currentStreak ?? 1;
  const bestStreak = Math.max(currentStreak, winnerStats?.bestStreak ?? 1);
  const footerLine = pausedNight
    ? 'Đã bước sang khung giờ nghỉ ban đêm (00:00 - 08:00) — nghỉ ngơi nha, hẹn 08:00 sáng~'
    : autoStart
      ? `Tự động bắt đầu ván mới sau ${nextRoundDelaySeconds} giây...`
      : 'Ván chơi đã kết thúc • Dùng /doantu-admin để bắt đầu ván tiếp theo';

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatWordGuessTitle('CHÍNH XÁC RỒI NÈ!'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${WORD_GUESS_EMOJIS.WINNER} **Người đoán đúng:** <@${winnerId}>`,
              `${WORD_GUESS_EMOJIS.STATUS} **Đáp án chính xác:** \`${answerUpper}\``,
              `${WORD_GUESS_EMOJIS.TIME} **Tốc độ phản xạ:** **${reactionSeconds} giây**`,
              `${WORD_GUESS_EMOJIS.STREAK} **Chuỗi cá nhân hiện tại:** **${currentStreak} streak** (Kỷ lục của bạn: ${bestStreak} streak)`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `-# ${footerLine}`,
          },
        ],
      },
    ],
  };
}

/**
 * 4. Giao diện Hết Thời Gian Suy Nghĩ (đổi từ và đưa streak tất cả người chơi về 0).
 */
export function buildRoundTimeoutPayloadV2({
  answer,
  durationSeconds,
  nextRoundDelaySeconds = 5,
  autoStart = true,
  pausedIdle = false,
  pausedNight = false,
}) {
  const answerUpper = String(answer || '').normalize('NFC').toLocaleUpperCase('vi-VN');
  const footerLine = pausedNight
    ? 'Đã bước sang khung giờ nghỉ ban đêm (00:00 - 08:00) — xem thẻ thông báo bên dưới'
    : pausedIdle
      ? 'Đã quá 3 phút chưa có người chơi — xem thẻ Tạm kết thúc bên dưới'
      : autoStart
        ? `Tự động chuyển sang từ mới sau ${nextRoundDelaySeconds} giây...`
        : 'Trò chơi đang ở chế độ thủ công • Dùng /doantu-admin để chơi tiếp';

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatWordGuessTitle('HẾT THỜI GIAN SUY NGHĨ!'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${WORD_GUESS_EMOJIS.TIME} Tiếc quá, đã hết **${durationSeconds} giây** mà chưa có ai đoán trúng từ khóa này!`,
              `${WORD_GUESS_EMOJIS.STATUS} **Đáp án đúng là:** \`${answerUpper}\``,
              `${WORD_GUESS_EMOJIS.STREAK} Không ai giữ được lượt — chuỗi hiện tại của tất cả người chơi trở về **0 streak**.`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `-# ${footerLine}`,
          },
        ],
      },
    ],
  };
}

/**
 * 4b. Giao diện Tạm Kết Thúc sau 3 phút không có ai chơi (nút Chơi tiếp màu xám + emoji heartg1).
 */
export function buildIdlePausedPayloadV2({
  idleMinutes = Math.round(WORD_GUESS_DEFAULTS.IDLE_TIMEOUT_MS / 60000),
  resumeDisabled = false,
  resumedByUserId = null,
} = {}) {
  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatWordGuessTitle('TẠM KẾT THÚC DO VẮNG NGƯỜI CHƠI'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${WORD_GUESS_EMOJIS.TIME} Đã quá **${idleMinutes} phút** chưa có ai tham gia đoán từ.`,
              `${WORD_GUESS_EMOJIS.STATUS} **Trạng thái:** Bot tạm kết thúc để tránh làm trôi tin nhắn kênh.`,
              `${WORD_GUESS_EMOJIS.STREAK} Khi nào có thời gian chơi tiếp, hãy bấm nút bên dưới để mở ván mới ngay nha~`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: resumedByUserId
              ? `-# Đã được <@${resumedByUserId}> bấm Chơi tiếp`
              : '-# Bấm nút Chơi tiếp bên dưới bất cứ lúc nào để chơi lại từ mới',
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: 'Chơi tiếp',
                emoji: WORD_GUESS_BUTTON_EMOJIS.HINT, // <a:heartg1:1545307544808071258>
                custom_id: 'doantu_resume',
                disabled: Boolean(resumeDisabled),
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * 4c. Giao diện Khóa Ban Đêm (00:00 - 08:00 sáng giờ Việt Nam) để bot nghỉ 8 tiếng, tránh ngốn RAM.
 */
export function buildNightLockPayloadV2({
  currentTimeText = null,
  startHour = WORD_GUESS_DEFAULTS.NIGHT_LOCK_START_HOUR,
  endHour = WORD_GUESS_DEFAULTS.NIGHT_LOCK_END_HOUR,
  includeResumeButton = false,
  resumeDisabled = false,
  ephemeral = true,
  configSavedNotice = false,
} = {}) {
  const startLabel = `${String(startHour).padStart(2, '0')}:00`;
  const endLabel = `${String(endHour).padStart(2, '0')}:00`;
  const timeInfo = currentTimeText
    ? `Hiện đang là **${currentTimeText}** — bot đang tạm khóa ban đêm để tiết kiệm RAM.`
    : 'Bot đang tạm khóa ban đêm để tiết kiệm RAM.';
  const footerLine = configSavedNotice
    ? `Đã lưu cấu hình kênh chơi • Trò chơi sẽ mở lại từ ${endLabel} sáng`
    : 'Chuỗi Streak và BXH vẫn được bảo lưu nguyên vẹn qua đêm';

  const containerChildren = [
    {
      type: 10,
      content: formatWordGuessTitle('BOT ĐANG KHÓA NGHỈ BAN ĐÊM'),
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: [
        `${WORD_GUESS_EMOJIS.TIME} **Khung giờ nghỉ cố định:** **${startLabel} - ${endLabel} sáng** (8 tiếng, giờ Việt Nam)`,
        `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} **Trạng thái hiện tại:** ${timeInfo}`,
        `${WORD_GUESS_EMOJIS.HINT} **Thời gian mở lại:** Bạn vui lòng quay lại bấm **Chơi tiếp** sau **${endLabel} sáng** nha~`,
      ].join('\n'),
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: `-# ${footerLine}`,
    },
  ];

  if (includeResumeButton) {
    containerChildren.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 2, // Xám
          label: 'Chơi tiếp',
          emoji: WORD_GUESS_BUTTON_EMOJIS.HINT, // <a:heartg1:1545307544808071258>
          custom_id: 'doantu_resume',
          disabled: Boolean(resumeDisabled),
        },
      ],
    });
  }

  return {
    flags: ephemeral ? (MessageFlags.Ephemeral | IS_COMPONENTS_V2) : IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: containerChildren,
      },
    ],
  };
}

/**
 * 5. Giao diện Bảng Xếp Hạng Streak (5 người/trang, phân trang kiểu profile booking: ❮❮ | 1/N | ❯❯).
 */
export function buildLeaderboardPayloadV2({
  entries = [],
  page = 0,
  requesterStats = null,
  requesterRank = null,
}) {
  const pageSize = WORD_GUESS_DEFAULTS.BXH_PAGE_SIZE;
  const totalEntries = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const rawPage = Number(page);
  const safePage = Number.isInteger(rawPage)
    ? Math.max(0, Math.min(totalPages - 1, rawPage))
    : 0;

  const pageEntries = entries.slice(safePage * pageSize, (safePage + 1) * pageSize);

  let bodyContent;
  if (totalEntries === 0) {
    bodyContent = [
      `${WORD_GUESS_EMOJIS.STREAK} Chưa có người chơi nào ghi nhận streak trong server này!`,
      `${WORD_GUESS_EMOJIS.HINT} Hãy tham gia đoán từ tiếng Việt có dấu để ghi danh lên **Top 1** nha~`,
    ].join('\n');
  } else {
    bodyContent = pageEntries
      .map((entry, idx) => {
        const globalRank = safePage * pageSize + idx + 1;
        const rankBadge = globalRank <= 5
          ? WORD_GUESS_EMOJIS.RANK_EMOJIS[globalRank - 1]
          : `**#${globalRank}**`;
        return `${rankBadge} <@${entry.userId}> — ${WORD_GUESS_EMOJIS.STREAK} **${entry.bestStreak} streak** (Hiện tại: ${entry.currentStreak} • ${entry.totalWins} từ)`;
      })
      .join('\n');
  }

  const footerText = requesterRank && requesterStats
    ? `-# Trang ${safePage + 1}/${totalPages} (${totalEntries} người chơi) • Hạng của bạn: #${requesterRank} (Kỷ lục: ${requesterStats.bestStreak} streak • Đang giữ: ${requesterStats.currentStreak} streak)`
    : `-# Trang ${safePage + 1}/${totalPages} (${totalEntries} người chơi) • Xếp hạng theo kỷ lục Streak cá nhân`;

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatWordGuessTitle('BẢNG XẾP HẠNG STREAK ĐOÁN TỪ'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: bodyContent,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: footerText,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: '❮❮',
                disabled: totalPages <= 1,
                custom_id: `doantu_bxh_prev:${safePage}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: `${safePage + 1}/${totalPages}`,
                disabled: true,
                custom_id: `doantu_bxh_page:${safePage}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: '❯❯',
                disabled: totalPages <= 1,
                custom_id: `doantu_bxh_next:${safePage}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Giao diện xem Streak cá nhân (`/doantu streak`).
 */
export function buildPersonalStreakPayloadV2({
  userId,
  stats,
  rank = null,
  totalPlayers = 0,
  channelId = null,
}) {
  const bestTimeText = stats?.bestTimeMs != null
    ? `**${(stats.bestTimeMs / 1000).toFixed(1)} giây**`
    : 'Chưa có kỷ lục';

  const lines = [
    `${WORD_GUESS_EMOJIS.WINNER} **Người chơi:** <@${userId}>`,
    `${WORD_GUESS_EMOJIS.STREAK} **Chuỗi hiện tại:** **${stats?.currentStreak ?? 0} streak**`,
    `${WORD_GUESS_EMOJIS.STREAK} **Kỷ lục cao nhất:** **${stats?.bestStreak ?? 0} streak**`,
    `${WORD_GUESS_EMOJIS.STATUS} **Số từ đã đoán đúng:** **${stats?.totalWins ?? 0} từ**`,
    `${WORD_GUESS_EMOJIS.TIME} **Tốc độ nhanh nhất:** ${bestTimeText}`,
  ];

  if (channelId) {
    lines.push(`${WORD_GUESS_EMOJIS.CHANNEL} **Kênh trò chơi:** <#${channelId}>`);
  }

  const rankPrefix = rank ? `Thứ hạng: #${rank}/${totalPlayers} • ` : '';

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatWordGuessTitle('CHUỖI STREAK CÁ NHÂN'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: lines.join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `-# ${rankPrefix}Streak chỉ về 0 khi hết giờ đổi từ mà không ai đoán ra`,
          },
        ],
      },
    ],
  };
}

/**
 * 6. Giao diện Bảng Điều Khiển Admin (`/doantu-admin`, luôn Ephemeral chỉ Admin thấy).
 */
export function buildAdminPanelPayloadV2(config, currentRound = null, nowMs = Date.now()) {
  const duration = config?.durationSeconds ?? WORD_GUESS_DEFAULTS.ROUND_DURATION_SECONDS;
  const halfDuration = Math.max(1, Math.floor(duration / 2));
  const nightStatus = isWordGuessNightLock(nowMs);

  let statusLabel = 'Đang tắt';
  if (config?.channelId && config?.enabled) {
    if (nightStatus.locked) {
      statusLabel = 'Đang khóa nghỉ ban đêm (00:00 - 08:00 sáng)';
      if (currentRound && !currentRound.ended) {
        statusLabel += ' • Ván cuối đang khép lại';
      }
    } else if (config.idlePaused && (!currentRound || currentRound.ended)) {
      statusLabel = 'Đang tạm nghỉ (Quá 3 phút chưa có người chơi)';
    } else {
      statusLabel = config.autoStart
        ? 'Đang bật (Tự động bắt đầu liên hoàn)'
        : 'Đang bật (Chế độ thủ công)';
      if (currentRound && !currentRound.ended) {
        statusLabel += ' • Ván đang chạy';
      }
    }
  } else if (config?.channelId && !config?.enabled) {
    statusLabel = 'Đang tạm tắt';
  } else {
    statusLabel = 'Chưa thiết lập kênh chơi';
  }

  return {
    flags: MessageFlags.Ephemeral | IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatWordGuessTitle('QUẢN TRỊ TRÒ CHƠI ĐOÁN TỪ'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${WORD_GUESS_EMOJIS.CHANNEL} **Kênh trò chơi:** ${config?.channelId ? `<#${config.channelId}>` : 'Chưa chọn (Dùng `/doantu-admin setup`)'}`,
              `${WORD_GUESS_EMOJIS.STATUS} **Trạng thái:** ${statusLabel}`,
              `${WORD_GUESS_EMOJIS.LANGUAGE} **Ngôn ngữ:** Chỉ Tiếng Việt (Phải nhắn có dấu mới tính)`,
              `${WORD_GUESS_EMOJIS.TIME} **Thời gian suy nghĩ:** **${duration} giây** (Gợi ý lúc **${halfDuration} giây**)`,
              `${WORD_GUESS_EMOJIS.STREAK} **Xếp hạng & Điểm:** Streak cá nhân (5 người/trang)`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `-# Chỉ mình Admin (<@&${WORD_GUESS_ADMIN_ROLE_ID}>) nhìn thấy bảng điều khiển này`,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: 'Bắt đầu ngay',
                emoji: WORD_GUESS_BUTTON_EMOJIS.ADMIN_START,
                custom_id: 'doantu_admin_start',
                disabled: !config?.channelId,
              },
              {
                type: 2,
                style: 2, // Xám
                label: `Tự động: ${config?.autoStart ? 'BẬT' : 'TẮT'}`,
                emoji: WORD_GUESS_BUTTON_EMOJIS.ADMIN_TOGGLE,
                custom_id: 'doantu_admin_toggle',
              },
              {
                type: 2,
                style: 2, // Xám
                label: 'Chỉnh giây',
                emoji: WORD_GUESS_BUTTON_EMOJIS.ADMIN_TIME,
                custom_id: 'doantu_admin_time',
              },
              {
                type: 2,
                style: 2, // Xám
                label: config?.enabled ? 'Tắt kênh' : 'Bật lại',
                emoji: WORD_GUESS_BUTTON_EMOJIS.ADMIN_DISABLE,
                custom_id: 'doantu_admin_disable',
                disabled: !config?.channelId,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Payload thông báo V2 dùng chung cho thông báo lỗi/xác nhận.
 */
export function buildWordGuessNoticePayloadV2({
  title,
  message,
  footer = null,
  ephemeral = true,
}) {
  const inner = [
    {
      type: 10,
      content: formatWordGuessTitle(title),
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: message,
    },
  ];

  if (footer) {
    inner.push(
      {
        type: 14,
        divider: true,
        spacing: 1,
      },
      {
        type: 10,
        content: `-# ${footer}`,
      },
    );
  }

  return {
    flags: ephemeral ? (MessageFlags.Ephemeral | IS_COMPONENTS_V2) : IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: inner,
      },
    ],
  };
}

// =========================================================================
// QUẢN LÝ VÒNG CHƠI & TIMER
// =========================================================================

export function getActiveRound(guildId) {
  return activeRounds.get(String(guildId)) || null;
}

export function clearGuildTimers(guildId) {
  const key = String(guildId);
  const timers = activeTimers.get(key);
  if (timers) {
    if (timers.hintTimeout) clearTimeout(timers.hintTimeout);
    if (timers.endTimeout) clearTimeout(timers.endTimeout);
    if (timers.nextRoundTimeout) clearTimeout(timers.nextRoundTimeout);
    activeTimers.delete(key);
  }
}

export function markGuildActivity(guildId, timestamp = Date.now()) {
  guildLastActivityAt.set(String(guildId), timestamp);
}

export function getGuildLastActivityAt(guildId) {
  return guildLastActivityAt.get(String(guildId)) ?? null;
}

export function resetAllInMemoryRounds() {
  for (const guildId of activeTimers.keys()) {
    clearGuildTimers(guildId);
  }
  activeRounds.clear();
  registeredGuildCache.clear();
  guildLastActivityAt.clear();
  cachedWordBank = null;
}

async function resolveGuildChannel(client, channelId) {
  if (!client || !channelId) return null;
  const cached = client.channels?.cache?.get?.(channelId);
  if (cached) return cached;
  if (typeof client.channels?.fetch === 'function') {
    return client.channels.fetch(channelId).catch(() => null);
  }
  return null;
}

async function disableStartButtonOnRound(round) {
  if (!round?.message || typeof round.message.edit !== 'function') {
    return;
  }

  try {
    const disabledPayload = buildRoundStartPayloadV2({
      scrambledDisplay: round.scrambledDisplay,
      letterCount: round.letterCount,
      wordCount: round.wordCount,
      durationSeconds: round.durationSeconds,
      roundId: round.id,
      autoStart: round.autoStart,
      hintDisabled: true,
    });
    await round.message.edit(disabledPayload);
  } catch (error) {
    logger.debug('[WordGuess] Không thể khóa nút Mở gợi ý trên tin nhắn cũ:', error?.message);
  }
}

function scheduleNextRound(client, guildId, delayMs = WORD_GUESS_DEFAULTS.NEXT_ROUND_DELAY_MS) {
  const key = String(guildId);
  clearGuildTimers(key);
  const nightStatus = isWordGuessNightLock(getWordGuessNow(client));
  if (nightStatus.locked) {
    releaseUnusedWordBankCache();
    return false;
  }

  const nextRoundTimeout = setTimeout(async () => {
    try {
      clearGuildTimers(key);
      const currentConfig = await getWordGuessGuildConfig(client, key);
      if (currentConfig.enabled && currentConfig.autoStart && !currentConfig.idlePaused && currentConfig.channelId) {
        const result = await startWordGuessRound(client, key, { isAutoContinuation: true });
        if (result?.reason === 'NIGHT_LOCK') {
          const channel = await resolveGuildChannel(client, currentConfig.channelId);
          if (channel && typeof channel.send === 'function') {
            await channel.send(
              buildNightLockPayloadV2({
                currentTimeText: result.nightStatus.currentTimeText,
                startHour: result.nightStatus.startHour,
                endHour: result.nightStatus.endHour,
                includeResumeButton: true,
                ephemeral: false,
              }),
            );
          }
        }
      }
      releaseUnusedWordBankCache();
    } catch (error) {
      logger.error(`[WordGuess] Lỗi tự động bắt đầu ván mới ở guild ${key}:`, error);
    }
  }, delayMs);

  activeTimers.set(key, {
    hintTimeout: null,
    endTimeout: null,
    nextRoundTimeout,
  });
  return true;
}

/**
 * Bắt đầu một ván Đoán Từ mới trong kênh đã cấu hình của server.
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {object} [options]
 */
export async function startWordGuessRound(client, guildId, options = {}) {
  const key = String(guildId);
  const { scheduleTimers = true } = options;

  return withGuildLock(key, async () => {
    const config = await getWordGuessGuildConfig(client, key);
    if (!config.channelId) {
      return { success: false, reason: 'NO_CHANNEL', config };
    }
    if (!config.enabled && !options.forceEnable) {
      return { success: false, reason: 'DISABLED', config };
    }

    const now = getWordGuessNow(client, options.now);
    const nightStatus = isWordGuessNightLock(now);
    if (nightStatus.locked) {
      const staleRound = activeRounds.get(key);
      if (staleRound && !staleRound.ended) {
        staleRound.ended = true;
        await disableStartButtonOnRound(staleRound);
        activeRounds.delete(key);
      }
      clearGuildTimers(key);
      guildLastActivityAt.delete(key);

      let savedNightConfig = config;
      if (config.enabled && !config.idlePaused) {
        config.idlePaused = true;
        savedNightConfig = await saveWordGuessGuildConfig(client, key, config);
      }
      releaseUnusedWordBankCache();
      return { success: false, reason: 'NIGHT_LOCK', nightStatus, config: savedNightConfig };
    }

    if (options.forceEnable && !config.enabled) {
      config.enabled = true;
    }

    const channel = await resolveGuildChannel(client, config.channelId);
    if (!channel || typeof channel.send !== 'function') {
      return { success: false, reason: 'CHANNEL_NOT_FOUND', config };
    }

    // Đóng ván cũ nếu đang chạy dang dở
    const existing = activeRounds.get(key);
    if (existing && !existing.ended) {
      existing.ended = true;
      await disableStartButtonOnRound(existing);
    }
    clearGuildTimers(key);

    const word =
      typeof options.word === 'string' && options.word.trim()
        ? options.word.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN')
        : pickNextWord(config.recentWords);
    const { letterCount, wordCount } = getWordStats(word);
    const scrambledDisplay = scrambleVietnameseWord(word);
    const hintMask = buildHintMask(word);
    const roundId = crypto.randomBytes(4).toString('hex');

    if (!options.isAutoContinuation) {
      markGuildActivity(key, now);
    } else if (!guildLastActivityAt.has(key)) {
      markGuildActivity(key, now);
    }

    config.idlePaused = false;
    config.recentWords = [...(config.recentWords || []), word].slice(-WORD_GUESS_DEFAULTS.RECENT_WORDS_LIMIT);
    const savedConfig = await saveWordGuessGuildConfig(client, key, config);

    const round = {
      id: roundId,
      guildId: key,
      channelId: savedConfig.channelId,
      word,
      normalizedWord: normalizeVietnameseGuess(word),
      scrambledDisplay,
      hintMask,
      letterCount,
      wordCount,
      durationSeconds: savedConfig.durationSeconds,
      autoStart: savedConfig.autoStart,
      startedAt: now,
      hadActivity: false,
      hintRevealed: false,
      solved: false,
      ended: false,
      message: null,
    };

    const startPayload = buildRoundStartPayloadV2({
      scrambledDisplay,
      letterCount,
      wordCount,
      durationSeconds: round.durationSeconds,
      roundId,
      autoStart: round.autoStart,
      hintDisabled: false,
    });

    const sentMessage = await channel.send(startPayload);
    round.message = sentMessage;
    activeRounds.set(key, round);

    if (scheduleTimers) {
      const halfMs = Math.max(1000, Math.floor((round.durationSeconds * 1000) / 2));
      const fullMs = round.durationSeconds * 1000;

      const hintTimeout = setTimeout(() => {
        revealRoundHint(client, key, { roundId, triggeredByUser: false }).catch((err) =>
          logger.error(`[WordGuess] Lỗi mở gợi ý tự động guild ${key}:`, err),
        );
      }, halfMs);

      const endTimeout = setTimeout(() => {
        handleRoundTimeout(client, key, roundId).catch((err) =>
          logger.error(`[WordGuess] Lỗi xử lý hết giờ guild ${key}:`, err),
        );
      }, fullMs);

      activeTimers.set(key, {
        hintTimeout,
        endTimeout,
        nextRoundTimeout: null,
      });
    }

    return { success: true, round, config: savedConfig };
  });
}

/**
 * Mở gợi ý chữ cái đầu (do hết 1/2 thời gian hoặc người chơi bấm nút).
 */
export async function revealRoundHint(client, guildId, options = {}) {
  const key = String(guildId);
  const round = activeRounds.get(key);
  if (!round || round.ended || round.solved) {
    return { success: false, reason: 'ROUND_ENDED' };
  }
  if (options.roundId && round.id !== options.roundId) {
    return { success: false, reason: 'ROUND_MISMATCH' };
  }
  if (round.hintRevealed) {
    return { success: false, reason: 'ALREADY_REVEALED' };
  }

  // Đánh dấu đồng bộ trước khi await để chống click trùng
  const now = getWordGuessNow(client, options.now);
  round.hintRevealed = true;
  if (options.triggeredByUser) {
    round.hadActivity = true;
    markGuildActivity(key, now);
  }

  const timers = activeTimers.get(key);
  if (timers?.hintTimeout) {
    clearTimeout(timers.hintTimeout);
    timers.hintTimeout = null;
  }

  const elapsedSeconds = Math.max(
    1,
    Math.min(round.durationSeconds - 1, Math.round((now - round.startedAt) / 1000)),
  );
  const remainingSeconds = Math.max(1, round.durationSeconds - elapsedSeconds);

  const hintPayload = buildMidHintPayloadV2({
    elapsedSeconds,
    remainingSeconds,
    hintMask: round.hintMask,
    triggeredByUser: Boolean(options.triggeredByUser),
  });

  if (options.interaction) {
    const updatedStartPayload = buildRoundStartPayloadV2({
      scrambledDisplay: round.scrambledDisplay,
      letterCount: round.letterCount,
      wordCount: round.wordCount,
      durationSeconds: round.durationSeconds,
      roundId: round.id,
      autoStart: round.autoStart,
      hintDisabled: true,
    });
    await options.interaction.update(updatedStartPayload).catch(() => {});
  } else {
    await disableStartButtonOnRound(round);
  }

  const channel = options.interaction?.channel || (await resolveGuildChannel(client, round.channelId));
  if (channel && typeof channel.send === 'function') {
    await channel.send(hintPayload);
  }

  return { success: true, round };
}

/**
 * Xử lý khi hết giờ mà không có ai đoán ra:
 * Đổi từ và ĐƯA STREAK HIỆN TẠI CỦA TẤT CẢ NGƯỜI CHƠI VỀ 0 (giữ kỷ lục bestStreak).
 */
export async function handleRoundTimeout(client, guildId, roundId = null, options = {}) {
  const key = String(guildId);
  const round = activeRounds.get(key);
  if (!round || round.ended || round.solved) {
    return null;
  }
  if (roundId && round.id !== roundId) {
    return null;
  }

  // Đánh dấu đồng bộ trước khi await
  round.ended = true;
  clearGuildTimers(key);

  const { scheduleNext = true } = options;
  const now = getWordGuessNow(client, options.now);
  const lastActivity = guildLastActivityAt.get(key) ?? round.startedAt;
  const idleElapsedMs = Math.max(0, now - lastActivity);
  const toleranceMs = WORD_GUESS_DEFAULTS.IDLE_TIMER_TOLERANCE_MS ?? 1000;

  return withGuildLock(key, async () => {
    const config = await getWordGuessGuildConfig(client, key);
    const stats = { ...(config.stats || {}) };

    // Reset currentStreak của toàn bộ người chơi về 0 khi hết giờ đổi từ
    for (const uid of Object.keys(stats)) {
      const normalized = normalizeUserStat(uid, stats[uid]);
      stats[uid] = {
        ...normalized,
        currentStreak: 0,
      };
    }

    const nightStatus = isWordGuessNightLock(now);
    const shouldNightLock = Boolean(config.enabled) && nightStatus.locked;
    const shouldIdlePause =
      !shouldNightLock &&
      Boolean(config.enabled) &&
      Boolean(config.autoStart) &&
      idleElapsedMs + toleranceMs >= WORD_GUESS_DEFAULTS.IDLE_TIMEOUT_MS;

    config.stats = stats;
    config.idlePaused = shouldNightLock || shouldIdlePause;
    const savedConfig = await saveWordGuessGuildConfig(client, key, config);

    await disableStartButtonOnRound(round);

    const timeoutPayload = buildRoundTimeoutPayloadV2({
      answer: round.word,
      durationSeconds: round.durationSeconds,
      nextRoundDelaySeconds: Math.round(WORD_GUESS_DEFAULTS.NEXT_ROUND_DELAY_MS / 1000),
      autoStart: savedConfig.enabled && savedConfig.autoStart && !shouldIdlePause && !shouldNightLock,
      pausedIdle: shouldIdlePause,
      pausedNight: shouldNightLock,
    });

    const channel = await resolveGuildChannel(client, round.channelId);
    if (channel && typeof channel.send === 'function') {
      await channel.send(timeoutPayload);
      if (shouldNightLock) {
        const nightLockPayload = buildNightLockPayloadV2({
          currentTimeText: nightStatus.currentTimeText,
          startHour: nightStatus.startHour,
          endHour: nightStatus.endHour,
          includeResumeButton: true,
          ephemeral: false,
        });
        await channel.send(nightLockPayload);
      } else if (shouldIdlePause) {
        const idlePausePayload = buildIdlePausedPayloadV2({
          idleMinutes: Math.max(1, Math.round(WORD_GUESS_DEFAULTS.IDLE_TIMEOUT_MS / 60000)),
        });
        await channel.send(idlePausePayload);
      }
    }

    if (activeRounds.get(key) === round) {
      activeRounds.delete(key);
    }

    if (shouldNightLock || shouldIdlePause) {
      guildLastActivityAt.delete(key);
      releaseUnusedWordBankCache();
    } else if (scheduleNext && savedConfig.enabled && savedConfig.autoStart) {
      scheduleNextRound(client, key);
    }

    return { round, config: savedConfig, timeoutPayload, pausedIdle: shouldIdlePause, pausedNight: shouldNightLock };
  });
}

/**
 * Xử lý tin nhắn đoán từ trong kênh trò chơi.
 * - CHỈ chấp nhận đáp án Tiếng Việt CÓ DẤU đúng chính tả.
 * - Cộng +1 Streak cá nhân cho người đoán đúng; những người chơi khác VẪN GIỮ nguyên streak sang ván kế.
 * @returns {Promise<boolean>} true nếu tin nhắn là đáp án đúng và đã xử lý.
 */
export async function handleWordGuessMessage(message, client, options = {}) {
  if (!message || message.author?.bot || !message.guild) {
    return false;
  }

  const guildId = String(message.guild.id);
  const round = activeRounds.get(guildId);
  if (!round || round.ended || round.solved) {
    return false;
  }

  const msgChannelId = String(message.channelId || message.channel?.id || '');
  if (msgChannelId !== round.channelId) {
    return false;
  }

  const rawContent = typeof message.content === 'string' ? message.content.trim() : '';
  if (!rawContent || /^[!/&?]/.test(rawContent)) {
    return false;
  }

  const now = getWordGuessNow(client, options.now);

  // Ghi nhận vẫn đang có người chơi tham gia trong kênh (tính cả đoán thử chưa trúng)
  round.hadActivity = true;
  markGuildActivity(guildId, now);

  // Kiểm tra đáp án có dấu chuẩn NFC + quy tắc dấu thanh
  if (normalizeVietnameseGuess(rawContent) !== round.normalizedWord) {
    return false;
  }

  // Khóa đồng bộ ngay để chống race condition 2 người đoán trùng mili-giây
  round.solved = true;
  round.ended = true;
  clearGuildTimers(guildId);

  const reactionMs = Math.max(100, now - round.startedAt);
  const reactionSeconds = (reactionMs / 1000).toFixed(1);
  const winnerId = String(message.author.id);
  const { scheduleNext = true } = options;

  await withGuildLock(guildId, async () => {
    const config = await getWordGuessGuildConfig(client, guildId);
    const stats = { ...(config.stats || {}) };
    const prev = normalizeUserStat(winnerId, stats[winnerId]);

    const nextStreak = prev.currentStreak + 1;
    const nextBest = Math.max(prev.bestStreak, nextStreak);
    const updatedWinnerStat = {
      userId: winnerId,
      currentStreak: nextStreak,
      bestStreak: nextBest,
      totalWins: prev.totalWins + 1,
      bestTimeMs: prev.bestTimeMs == null ? reactionMs : Math.min(prev.bestTimeMs, reactionMs),
      lastWinAt: new Date().toISOString(),
    };

    stats[winnerId] = updatedWinnerStat;
    config.stats = stats;

    const nightStatus = isWordGuessNightLock(now);
    const shouldNightLock = Boolean(config.enabled) && nightStatus.locked;
    if (shouldNightLock) {
      config.idlePaused = true;
    }

    // Không reset currentStreak của các người chơi khác khi có người thắng
    const savedConfig = await saveWordGuessGuildConfig(client, guildId, config);

    await disableStartButtonOnRound(round);

    const winPayload = buildRoundWinPayloadV2({
      winnerId,
      answer: round.word,
      reactionSeconds,
      winnerStats: updatedWinnerStat,
      nextRoundDelaySeconds: Math.round(WORD_GUESS_DEFAULTS.NEXT_ROUND_DELAY_MS / 1000),
      autoStart: savedConfig.enabled && savedConfig.autoStart && !shouldNightLock,
      pausedNight: shouldNightLock,
    });

    const channel = message.channel || (await resolveGuildChannel(client, round.channelId));
    if (channel && typeof channel.send === 'function') {
      await channel.send(winPayload);
      if (shouldNightLock) {
        const nightLockPayload = buildNightLockPayloadV2({
          currentTimeText: nightStatus.currentTimeText,
          startHour: nightStatus.startHour,
          endHour: nightStatus.endHour,
          includeResumeButton: true,
          ephemeral: false,
        });
        await channel.send(nightLockPayload);
      }
    }

    if (activeRounds.get(guildId) === round) {
      activeRounds.delete(guildId);
    }

    if (shouldNightLock) {
      guildLastActivityAt.delete(guildId);
      releaseUnusedWordBankCache();
    } else if (scheduleNext && savedConfig.enabled && savedConfig.autoStart) {
      scheduleNextRound(client, guildId);
    }
  });

  return true;
}

/**
 * Tạm tắt trò chơi ở server hiện tại (giữ lại kênh & BXH streak).
 */
export async function disableWordGuessGuild(client, guildId) {
  const key = String(guildId);
  clearGuildTimers(key);
  guildLastActivityAt.delete(key);

  const existing = activeRounds.get(key);
  if (existing) {
    existing.ended = true;
    await disableStartButtonOnRound(existing);
    activeRounds.delete(key);
  }
  releaseUnusedWordBankCache();

  return withGuildLock(key, async () => {
    const config = await getWordGuessGuildConfig(client, key);
    config.enabled = false;
    config.idlePaused = false;
    return saveWordGuessGuildConfig(client, key, config);
  });
}

/**
 * Reset toàn bộ BXH streak của server.
 */
export async function resetGuildLeaderboard(client, guildId) {
  const key = String(guildId);
  return withGuildLock(key, async () => {
    const config = await getWordGuessGuildConfig(client, key);
    config.stats = {};
    return saveWordGuessGuildConfig(client, key, config);
  });
}

/**
 * Tự động khôi phục các phòng Đoán Từ đang bật autoStart khi bot khởi động xong.
 */
export async function initWordGuessAutoResume(client) {
  try {
    const nightStatus = isWordGuessNightLock(getWordGuessNow(client));
    if (nightStatus.locked) {
      releaseUnusedWordBankCache();
      logger.info(
        `[WordGuess] Đang trong khung giờ khóa ban đêm (${nightStatus.currentTimeText} VN, 00:00-08:00), bỏ qua tự động khôi phục.`,
      );
      return 0;
    }

    const registryList = await getDatabaseValue(client, getWordGuessRegistryKey(), []);
    if (!Array.isArray(registryList) || registryList.length === 0) {
      return 0;
    }

    let resumed = 0;
    for (const guildId of registryList) {
      try {
        const config = await getWordGuessGuildConfig(client, guildId);
        if (!config.enabled || !config.autoStart || config.idlePaused || !config.channelId) {
          continue;
        }
        const channel = await resolveGuildChannel(client, config.channelId);
        if (!channel) {
          continue;
        }
        const result = await startWordGuessRound(client, guildId);
        if (result?.success) {
          resumed += 1;
        }
      } catch (guildErr) {
        logger.warn(`[WordGuess] Không thể khôi phục game cho guild ${guildId}:`, guildErr);
      }
    }

    if (resumed > 0) {
      logger.info(`[WordGuess] Đã tự động khôi phục ${resumed} kênh Đoán Từ.`);
    }
    return resumed;
  } catch (error) {
    logger.error('[WordGuess] Lỗi initWordGuessAutoResume:', error);
    return 0;
  }
}
