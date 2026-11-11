import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import {
  HSK_ADMIN_ROLE_ID,
  HSK_ALLOWED_ADMIN_ROLES,
  HSK_ARENA_LEVEL_CHOICES,
  HSK_BANDS,
  HSK_BUTTON_EMOJIS,
  HSK_DEFAULTS,
  HSK_EMOJIS,
  encodeStudyTierCode,
  formatHskTitle,
  getArenaLevelMeta,
  getBandMeta,
  getBandsForStudyTier,
  getStudyTierMeta,
  normalizeStudyTier,
} from '../config/hskConfig.js';
import { isBotOwner } from '../config/bot.js';
import { getDatabaseValue, setDatabaseValue } from '../utils/database.js';
import {
  getHskGuildConfigKey,
  getHskRegistryKey,
  getHskUserProgressKey,
} from '../utils/database/keys.js';
import { logger } from '../utils/logger.js';

export const IS_COMPONENTS_V2 = MessageFlags.IsComponentsV2 || (1 << 15);

const DAY_MS = 24 * 60 * 60 * 1000;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const HSK_DATA_DIR = path.resolve(__dirname, '../data/hsk3');

/**
 * Cache theo từng band trong RAM (key: bandId 1..7 -> Array<Word>).
 * Giữ tối giản để phù hợp giới hạn --max-old-space-size=128.
 */
const bandWordCache = new Map();

/**
 * Mutex tuần tự hóa thao tác DB theo từng guild / từng user.
 */
const guildOperationQueues = new Map();
const userOperationQueues = new Map();

/**
 * Trạng thái ván Đấu Trường công khai theo từng server (key: guildId).
 */
const activeArenaRounds = new Map();

/**
 * Timer cho các ván Đấu Trường (key: guildId -> { endTimeout, nextRoundTimeout }).
 */
const activeArenaTimers = new Map();

/**
 * Thời điểm tương tác gần nhất ở Đấu Trường theo guildId (tính khóa 3 phút vắng người).
 */
const guildLastActivityAt = new Map();

/**
 * Cache guild đã đăng ký auto-resume.
 */
const registeredGuildCache = new Set();

/**
 * Phiên ôn luyện cá nhân Ephemeral tạm thời (key: `${guildId}:${userId}`), tự dọn theo TTL & max cap.
 */
const personalSessions = new Map();

// =========================================================================
// TIỆN ÍCH CHUNG & NẠP TỪ VỰNG PHÂN MẢNH (SHARDED LAZY LOAD)
// =========================================================================

export function getHskNow(client = null, overrideNow = undefined) {
  if (typeof overrideNow === 'number' && Number.isFinite(overrideNow)) {
    return overrideNow;
  }
  if (typeof client?._hskNow === 'function') {
    const mocked = client._hskNow();
    if (typeof mocked === 'number' && Number.isFinite(mocked)) {
      return mocked;
    }
  }
  return Date.now();
}

export function getVietnamTimeParts(nowMs = Date.now()) {
  const date = new Date(nowMs);
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: HSK_DEFAULTS.NIGHT_LOCK_TIMEZONE || 'Asia/Ho_Chi_Minh',
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

export function isHskNightLock(nowMs = Date.now()) {
  const { hour, minute, second } = getVietnamTimeParts(nowMs);
  const startHour = HSK_DEFAULTS.NIGHT_LOCK_START_HOUR ?? 0;
  const endHour = HSK_DEFAULTS.NIGHT_LOCK_END_HOUR ?? 8;
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

export function withHskGuildLock(guildId, fn) {
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

export function withHskUserLock(guildId, userId, fn) {
  const key = `${String(guildId || 'dm')}:${String(userId)}`;
  const previous = userOperationQueues.get(key) || Promise.resolve();
  const next = previous.then(fn, fn);
  const cleanup = next.then(
    () => {
      if (userOperationQueues.get(key) === cleanup) {
        userOperationQueues.delete(key);
      }
    },
    () => {
      if (userOperationQueues.get(key) === cleanup) {
        userOperationQueues.delete(key);
      }
    },
  );
  userOperationQueues.set(key, cleanup);
  return next;
}

function readBandFileSync(bandId) {
  const meta = getBandMeta(bandId);
  const filePath = path.join(HSK_DATA_DIR, meta.file);
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Lazy-load từ vựng của duy nhất 1 cấp HSK.
 * @param {number|string} bandId
 * @returns {Array<object>}
 */
export function loadBandWords(bandId) {
  const safeBand = getBandMeta(bandId).id;
  if (bandWordCache.has(safeBand)) {
    return bandWordCache.get(safeBand);
  }

  try {
    const words = readBandFileSync(safeBand);
    bandWordCache.set(safeBand, words);
    return words;
  } catch (error) {
    logger.error(`[HSK] Không thể đọc dữ liệu từ vựng band ${safeBand}:`, error);
    return [];
  }
}

export function getLoadedBandCacheSize() {
  return bandWordCache.size;
}

/**
 * Giải phóng cache của các cấp HSK không có Đấu trường nào đang dùng (giữ heap siêu nhẹ).
 */
export function evictUnusedBandCaches(pinnedBandIds = []) {
  const keep = new Set(pinnedBandIds.map(Number));
  for (const round of activeArenaRounds.values()) {
    if (round?.word?.band) {
      keep.add(Number(round.word.band));
    }
  }
  for (const key of Array.from(bandWordCache.keys())) {
    if (!keep.has(key)) {
      bandWordCache.delete(key);
    }
  }
}

/**
 * Trích số band từ wordId dạng `b3_12` để chỉ nạp đúng 1 mảnh JSON.
 * @param {string} wordId
 */
export function parseBandFromWordId(wordId) {
  const match = String(wordId || '').match(/^b([1-7])_/);
  return match ? Number(match[1]) : null;
}

export function findWordById(wordId) {
  const band = parseBandFromWordId(wordId);
  if (band) {
    const words = loadBandWords(band);
    return words.find((w) => w.id === wordId) || null;
  }

  for (const b of HSK_BANDS) {
    const words = loadBandWords(b.id);
    const hit = words.find((w) => w.id === wordId);
    if (hit) return hit;
  }
  return null;
}

/**
 * Chuẩn hóa Pinyin không thanh điệu + Tiếng Việt không dấu để tra cứu nhanh.
 */
export function normalizeSearchKey(input) {
  return String(input || '')
    .replace(/ü|ǖ|ǘ|ǚ|ǜ/gi, 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/['’\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Tra cứu từ vựng trên toàn bộ HSK 3.0 (cấp 1–9) theo chữ Hán, Pinyin có/không dấu, hoặc nghĩa Việt.
 * Đọc tuần tự từng shard không ghim cố định vào RAM nếu chưa cache.
 * @param {string} query
 * @param {{ maxResults?: number }} [options]
 */
export function searchHskVocabulary(query, { maxResults = 4 } = {}) {
  const rawQuery = String(query || '').trim();
  const normQuery = normalizeSearchKey(rawQuery);
  const compactQuery = normQuery.replace(/\s+/g, '');
  if (!rawQuery || !normQuery) {
    return [];
  }

  const scored = [];
  for (const bandMeta of HSK_BANDS) {
    const words = bandWordCache.has(bandMeta.id)
      ? bandWordCache.get(bandMeta.id)
      : readBandFileSync(bandMeta.id);

    for (const w of words) {
      let score = 0;
      const pyNorm = normalizeSearchKey(w.pinyin);
      const pyCompact = pyNorm.replace(/\s+/g, '');
      const meaningNorm = normalizeSearchKey(w.meaning);
      const hanzi = w.hanzi || '';
      const trad = w.traditional || '';

      if (hanzi === rawQuery || trad === rawQuery) {
        score = 100;
      } else if (hanzi.includes(rawQuery) || trad.includes(rawQuery)) {
        score = 80;
      } else if (pyNorm === normQuery || pyCompact === compactQuery) {
        score = 75;
      } else if (pyNorm.startsWith(normQuery) || pyCompact.startsWith(compactQuery)) {
        score = 60;
      } else if (meaningNorm === normQuery) {
        score = 55;
      } else if (pyNorm.includes(normQuery) || pyCompact.includes(compactQuery)) {
        score = 45;
      } else if (meaningNorm.includes(normQuery)) {
        score = 35;
      }

      if (score > 0) {
        scored.push({ score, word: w });
      }
    }
  }

  scored.sort((a, b) => b.score - a.score || a.word.band - b.word.band || a.word.id.localeCompare(b.word.id));
  return scored.slice(0, maxResults).map((entry) => entry.word);
}

function truncateLabel(text, maxLen = 78) {
  const clean = String(text || '').trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1)}…`;
}

function shuffleCopy(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// =========================================================================
// PHÂN QUYỀN ADMIN & LƯU TRỮ POSTGRESQL
// =========================================================================

export function isHskAdmin(member, userId, guild = null, memberPermissions = null) {
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

  for (const roleId of HSK_ALLOWED_ADMIN_ROLES) {
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

export function createDefaultHskGuildConfig(guildId) {
  return {
    guildId: String(guildId),
    enabled: false,
    channelId: null,
    studyChannels: {
      elementary: null,
      advanced: null,
    },
    arenaLevelKey: '1',
    arenaMode: 'vi', // 'vi' | 'mixed'
    durationSeconds: HSK_DEFAULTS.ROUND_DURATION_SECONDS,
    autoStart: true,
    idlePaused: false,
    roundCounter: 0,
    recentWordIds: [],
    stats: {},
    updatedAt: null,
  };
}

function normalizeArenaStat(userId, raw = {}) {
  return {
    userId: String(userId),
    currentStreak: Math.max(0, Number(raw.currentStreak) || 0),
    bestStreak: Math.max(0, Number(raw.bestStreak) || 0),
    totalWins: Math.max(0, Number(raw.totalWins) || 0),
    bestTimeMs:
      typeof raw.bestTimeMs === 'number' && Number.isFinite(raw.bestTimeMs) && raw.bestTimeMs >= 0
        ? raw.bestTimeMs
        : null,
    lastWinAt: raw.lastWinAt || null,
  };
}

function normalizeHskGuildConfig(guildId, raw = null) {
  const base = createDefaultHskGuildConfig(guildId);
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const duration = Number(raw.durationSeconds);
  const clampedDuration = Number.isFinite(duration)
    ? Math.max(
        HSK_DEFAULTS.MIN_DURATION_SECONDS,
        Math.min(HSK_DEFAULTS.MAX_DURATION_SECONDS, Math.round(duration)),
      )
    : base.durationSeconds;

  const stats = {};
  if (raw.stats && typeof raw.stats === 'object') {
    for (const [uid, stat] of Object.entries(raw.stats)) {
      if (!uid) continue;
      stats[uid] = normalizeArenaStat(uid, stat);
    }
  }

  const validLevelKey = HSK_ARENA_LEVEL_CHOICES.some((c) => c.key === String(raw.arenaLevelKey))
    ? String(raw.arenaLevelKey)
    : base.arenaLevelKey;

  const validArenaMode = raw.arenaMode === 'mixed' ? 'mixed' : 'vi';
  const rawStudy = raw.studyChannels && typeof raw.studyChannels === 'object' ? raw.studyChannels : {};

  return {
    guildId: String(guildId),
    enabled: Boolean(raw.enabled),
    channelId: raw.channelId ? String(raw.channelId) : null,
    studyChannels: {
      elementary: rawStudy.elementary ? String(rawStudy.elementary) : null,
      advanced: rawStudy.advanced ? String(rawStudy.advanced) : null,
    },
    arenaLevelKey: validLevelKey,
    arenaMode: validArenaMode,
    durationSeconds: clampedDuration,
    autoStart: raw.autoStart !== undefined ? Boolean(raw.autoStart) : true,
    idlePaused: Boolean(raw.idlePaused),
    roundCounter: Math.max(0, Number(raw.roundCounter) || 0),
    recentWordIds: Array.isArray(raw.recentWordIds)
      ? raw.recentWordIds.slice(-HSK_DEFAULTS.RECENT_WORDS_LIMIT).map(String)
      : [],
    stats,
    updatedAt: raw.updatedAt || null,
  };
}

export function detectChannelStudyTier(config, channelId) {
  const cid = String(channelId || '');
  if (!cid || !config?.studyChannels) return 'all';
  if (config.studyChannels.elementary === cid) return 'elementary';
  if (config.studyChannels.advanced === cid) return 'advanced';
  return 'all';
}

export async function getHskGuildConfig(client, guildId) {
  const raw = await getDatabaseValue(client, getHskGuildConfigKey(guildId), null);
  return normalizeHskGuildConfig(guildId, raw);
}

export async function registerHskGuild(client, guildId) {
  if (!guildId) return;
  const id = String(guildId);
  if (registeredGuildCache.has(id)) {
    return;
  }
  const registryKey = getHskRegistryKey();
  const list = await getDatabaseValue(client, registryKey, []);
  const current = Array.isArray(list) ? list.map(String) : [];
  if (!current.includes(id)) {
    current.push(id);
    await setDatabaseValue(client, registryKey, current);
  }
  registeredGuildCache.add(id);
}

export async function saveHskGuildConfig(client, guildId, config) {
  const normalized = normalizeHskGuildConfig(guildId, {
    ...config,
    updatedAt: new Date().toISOString(),
  });
  await setDatabaseValue(client, getHskGuildConfigKey(guildId), normalized);
  if (normalized.channelId) {
    await registerHskGuild(client, guildId);
  }
  return normalized;
}

export function createDefaultHskUserProgress(guildId, userId) {
  return {
    userId: String(userId),
    guildId: String(guildId || 'dm'),
    selectedBand: 1,
    elementaryBand: 1,
    advancedBand: 4,
    quizType: 'vi',
    personalStreak: 0,
    bestPersonalStreak: 0,
    masteredIds: [],
    wrongWords: {},
    srs: {},
    updatedAt: null,
  };
}

function normalizeUserProgress(guildId, userId, raw = null) {
  const base = createDefaultHskUserProgress(guildId, userId);
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const selectedBand = getBandMeta(raw.selectedBand || 1).id;
  const rawElemBand = Number(raw.elementaryBand);
  const elementaryBand =
    Number.isInteger(rawElemBand) && rawElemBand >= 1 && rawElemBand <= 3
      ? rawElemBand
      : selectedBand >= 1 && selectedBand <= 3
        ? selectedBand
        : 1;
  const rawAdvBand = Number(raw.advancedBand);
  const advancedBand =
    Number.isInteger(rawAdvBand) && rawAdvBand >= 4 && rawAdvBand <= 7
      ? rawAdvBand
      : selectedBand >= 4 && selectedBand <= 7
        ? selectedBand
        : 4;
  const quizType = ['vi', 'pinyin', 'cloze'].includes(raw.quizType) ? raw.quizType : 'vi';
  const masteredIds = Array.isArray(raw.masteredIds)
    ? Array.from(new Set(raw.masteredIds.map(String))).slice(-HSK_DEFAULTS.MASTERED_IDS_LIMIT)
    : [];

  const wrongWords = {};
  if (raw.wrongWords && typeof raw.wrongWords === 'object') {
    const entries = Object.entries(raw.wrongWords).slice(0, HSK_DEFAULTS.WRONG_WORDS_LIMIT);
    for (const [wid, entry] of entries) {
      if (!entry || typeof entry !== 'object') continue;
      wrongWords[wid] = {
        id: String(entry.id || wid),
        band: getBandMeta(entry.band || parseBandFromWordId(wid) || 1).id,
        hanzi: String(entry.hanzi || ''),
        pinyin: String(entry.pinyin || ''),
        meaning: String(entry.meaning || ''),
        wrongCount: Math.max(1, Number(entry.wrongCount) || 1),
        lastWrongAt: Number(entry.lastWrongAt) || 0,
      };
    }
  }

  const srs = {};
  if (raw.srs && typeof raw.srs === 'object') {
    const entries = Object.entries(raw.srs).slice(0, HSK_DEFAULTS.MASTERED_IDS_LIMIT);
    for (const [wid, state] of entries) {
      if (!state || typeof state !== 'object') continue;
      srs[wid] = {
        intervalDays: Math.max(0, Number(state.intervalDays) || 0),
        dueAt: Number(state.dueAt) || 0,
        reps: Math.max(0, Number(state.reps) || 0),
      };
    }
  }

  return {
    userId: String(userId),
    guildId: String(guildId || 'dm'),
    selectedBand,
    elementaryBand,
    advancedBand,
    quizType,
    personalStreak: Math.max(0, Number(raw.personalStreak) || 0),
    bestPersonalStreak: Math.max(0, Number(raw.bestPersonalStreak) || 0),
    masteredIds,
    wrongWords,
    srs,
    updatedAt: raw.updatedAt || null,
  };
}

export function getEffectiveBandForTier(progress, studyTier = 'all') {
  const tier = normalizeStudyTier(studyTier);
  if (tier === 'elementary') {
    const eb = Number(progress?.elementaryBand);
    if (Number.isInteger(eb) && eb >= 1 && eb <= 3) return eb;
    const sb = Number(progress?.selectedBand);
    return Number.isInteger(sb) && sb >= 1 && sb <= 3 ? sb : 1;
  }
  if (tier === 'advanced') {
    const ab = Number(progress?.advancedBand);
    if (Number.isInteger(ab) && ab >= 4 && ab <= 7) return ab;
    const sb = Number(progress?.selectedBand);
    return Number.isInteger(sb) && sb >= 4 && sb <= 7 ? sb : 4;
  }
  return getBandMeta(progress?.selectedBand || 1).id;
}

export function applyBandSelectionForTier(progress, bandId, studyTier = 'all') {
  const tier = normalizeStudyTier(studyTier);
  const parsed = getBandMeta(bandId).id;
  let resolvedBand = parsed;
  if (tier === 'elementary' && (parsed < 1 || parsed > 3)) {
    resolvedBand = 1;
  } else if (tier === 'advanced' && (parsed < 4 || parsed > 7)) {
    resolvedBand = 4;
  }

  const next = {
    ...progress,
    selectedBand: resolvedBand,
  };
  if (resolvedBand >= 1 && resolvedBand <= 3) {
    next.elementaryBand = resolvedBand;
  } else {
    next.advancedBand = resolvedBand;
  }
  return next;
}

export async function getHskUserProgress(client, guildId, userId) {
  const scopeGuild = String(guildId || 'dm');
  const raw = await getDatabaseValue(client, getHskUserProgressKey(scopeGuild, userId), null);
  return normalizeUserProgress(scopeGuild, userId, raw);
}

export async function saveHskUserProgress(client, guildId, userId, progress) {
  const scopeGuild = String(guildId || 'dm');
  const normalized = normalizeUserProgress(scopeGuild, userId, {
    ...progress,
    updatedAt: new Date().toISOString(),
  });
  await setDatabaseValue(client, getHskUserProgressKey(scopeGuild, userId), normalized);
  return normalized;
}

export function recordWordMistake(progress, word, nowMs = Date.now()) {
  if (!progress || !word) return progress;
  const wrongWords = { ...(progress.wrongWords || {}) };
  const prev = wrongWords[word.id];

  wrongWords[word.id] = {
    id: word.id,
    band: word.band,
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning: word.meaning,
    wrongCount: (prev?.wrongCount || 0) + 1,
    lastWrongAt: nowMs,
  };

  // Giới hạn dung lượng object trong DB
  const sortedEntries = Object.entries(wrongWords).sort(
    (a, b) => (b[1].lastWrongAt || 0) - (a[1].lastWrongAt || 0),
  );
  const trimmedWrongWords = Object.fromEntries(sortedEntries.slice(0, HSK_DEFAULTS.WRONG_WORDS_LIMIT));

  const masteredSet = new Set(progress.masteredIds || []);
  masteredSet.delete(word.id);

  const srs = { ...(progress.srs || {}) };
  srs[word.id] = {
    intervalDays: 0,
    dueAt: nowMs,
    reps: 0,
  };

  return {
    ...progress,
    wrongWords: trimmedWrongWords,
    masteredIds: Array.from(masteredSet),
    srs,
  };
}

export function markWordMasteredInProgress(progress, wordId, { intervalDays = 4, nowMs = Date.now() } = {}) {
  const wrongWords = { ...(progress.wrongWords || {}) };
  delete wrongWords[wordId];

  const masteredSet = new Set(progress.masteredIds || []);
  masteredSet.add(wordId);

  const srs = { ...(progress.srs || {}) };
  const prev = srs[wordId] || { intervalDays: 0, reps: 0 };
  srs[wordId] = {
    intervalDays,
    dueAt: nowMs + intervalDays * DAY_MS,
    reps: prev.reps + 1,
  };

  return {
    ...progress,
    wrongWords,
    masteredIds: Array.from(masteredSet).slice(-HSK_DEFAULTS.MASTERED_IDS_LIMIT),
    srs,
  };
}

export function getUserNotebookSummary(progress, nowMs = Date.now()) {
  const wrongList = Object.values(progress?.wrongWords || {}).sort(
    (a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0) || (b.wrongCount || 0) - (a.wrongCount || 0),
  );
  const dueSrsIds = new Set(wrongList.map((w) => w.id));
  for (const [wid, srsEntry] of Object.entries(progress?.srs || {})) {
    if ((srsEntry?.dueAt || 0) <= nowMs) {
      dueSrsIds.add(wid);
    }
  }
  return {
    wrongList,
    wrongCount: wrongList.length,
    dueCount: dueSrsIds.size,
    masteredCount: Array.isArray(progress?.masteredIds) ? progress.masteredIds.length : 0,
  };
}

// =========================================================================
// QUẢN LÝ PHIÊN ÔN CÁ NHÂN TRONG RAM (BOUNDED TTL)
// =========================================================================

function sweepPersonalSessions(nowMs = Date.now()) {
  for (const [key, session] of personalSessions.entries()) {
    if (!session || nowMs - (session.updatedAt || 0) > HSK_DEFAULTS.SESSION_TTL_MS) {
      personalSessions.delete(key);
    }
  }
  while (personalSessions.size > HSK_DEFAULTS.SESSION_MAX_ENTRIES) {
    const oldestKey = personalSessions.keys().next().value;
    if (!oldestKey) break;
    personalSessions.delete(oldestKey);
  }
}

export function getPersonalSession(guildId, userId, nowMs = Date.now()) {
  sweepPersonalSessions(nowMs);
  const key = `${String(guildId || 'dm')}:${String(userId)}`;
  return personalSessions.get(key) || null;
}

export function setPersonalSession(guildId, userId, patch = {}, nowMs = Date.now()) {
  sweepPersonalSessions(nowMs);
  const key = `${String(guildId || 'dm')}:${String(userId)}`;
  const prev = personalSessions.get(key) || {};
  const next = {
    ...prev,
    ...patch,
    updatedAt: nowMs,
  };
  // Re-insert để cập nhật thứ tự LRU
  personalSessions.delete(key);
  personalSessions.set(key, next);
  return next;
}

// =========================================================================
// SINH CÂU HỎI TRẮC NGHIỆM, FLASHCARD SRS & ĐẤU TRƯỜNG
// =========================================================================

/**
 * Sinh một câu hỏi trắc nghiệm 4 lựa chọn cho 1 từ HSK 3.0.
 * @param {object} word
 * @param {'vi'|'pinyin'|'cloze'} quizType
 * @param {Array<object>} bandWords
 */
export function buildQuestionFromWord(word, quizType = 'vi', bandWords = null) {
  const poolWords = Array.isArray(bandWords) && bandWords.length >= 4 ? bandWords : loadBandWords(word.band);
  let resolvedType = ['vi', 'pinyin', 'cloze'].includes(quizType) ? quizType : 'vi';

  let optionsRaw;
  let promptTitle;
  let promptSubtitle;
  let modeLabel;

  if (resolvedType === 'pinyin' && Array.isArray(word.pyDist) && word.pyDist.length >= 3) {
    optionsRaw = [word.pinyin, ...word.pyDist.slice(0, 3)];
    promptTitle = word.hanzi;
    modeLabel = '汉字 → Pinyin & Thanh điệu';
    promptSubtitle = `Cấp ${getBandMeta(word.band).name} (${word.pos}) · Chọn phiên âm Pinyin chính xác`;
  } else if (
    resolvedType === 'cloze' &&
    word.clozeZh &&
    Array.isArray(word.clozeDist) &&
    word.clozeDist.length >= 3
  ) {
    optionsRaw = [word.hanzi, ...word.clozeDist.slice(0, 3)];
    promptTitle = word.clozeZh;
    modeLabel = 'Điền khuyết / Ngữ cảnh';
    promptSubtitle = `Cấp ${getBandMeta(word.band).name} · Chọn từ đúng nhất điền vào chỗ trống ____`;
  } else {
    resolvedType = 'vi';
    const otherMeanings = shuffleCopy(
      poolWords
        .filter((w) => w.id !== word.id && w.meaning && w.meaning !== word.meaning)
        .map((w) => w.meaning),
    );
    const uniqueDistractors = [];
    for (const m of otherMeanings) {
      if (!uniqueDistractors.includes(m)) {
        uniqueDistractors.push(m);
      }
      if (uniqueDistractors.length === 3) break;
    }
    optionsRaw = [word.meaning, ...uniqueDistractors];
    promptTitle = word.hanzi;
    modeLabel = '汉字 → Nghĩa tiếng Việt';
    promptSubtitle = `Cấp ${getBandMeta(word.band).name} (${word.pos}) · Chọn nghĩa tiếng Việt đúng nhất`;
  }

  const targetValue = optionsRaw[0];
  const shuffledOptions = shuffleCopy(optionsRaw).map((opt) => truncateLabel(opt, 72));
  const correctIndex = Math.max(0, shuffledOptions.indexOf(truncateLabel(targetValue, 72)));

  return {
    qId: crypto.randomBytes(3).toString('hex'),
    wordId: word.id,
    band: word.band,
    quizType: resolvedType,
    modeLabel,
    promptTitle,
    promptSubtitle,
    options: shuffledOptions,
    correctIndex,
    hintShown: false,
    answeredIndex: null,
  };
}

export function createPersonalQuizQuestion(progress, options = {}) {
  const studyTier = normalizeStudyTier(options.studyTier);
  const bandId = getEffectiveBandForTier(progress, studyTier);
  const quizType = options.quizType || progress?.quizType || 'vi';
  const excludeWordId = options.excludeWordId || null;

  let chosenWord = null;
  if (options.focusWrongOnly) {
    const wrongEntries = Object.values(progress?.wrongWords || {});
    if (wrongEntries.length > 0) {
      const candidates =
        wrongEntries.length > 1 && excludeWordId
          ? wrongEntries.filter((w) => w.id !== excludeWordId)
          : wrongEntries;
      const picked = candidates[crypto.randomInt(0, candidates.length)];
      chosenWord = findWordById(picked.id);
    }
  }

  const bandWords = loadBandWords(bandId);
  if (!chosenWord && bandWords.length > 0) {
    const masteredSet = new Set(progress?.masteredIds || []);
    let pool = bandWords.filter((w) => w.id !== excludeWordId && !masteredSet.has(w.id));
    if (pool.length === 0) {
      pool = bandWords.filter((w) => w.id !== excludeWordId);
    }
    if (pool.length === 0) {
      pool = bandWords;
    }
    chosenWord = pool[crypto.randomInt(0, pool.length)];
  }

  const questionPool =
    chosenWord && chosenWord.band !== bandId ? loadBandWords(chosenWord.band) : bandWords;
  const q = buildQuestionFromWord(chosenWord, quizType, questionPool);
  return {
    question: q,
    word: chosenWord,
    focusWrongOnly: Boolean(options.focusWrongOnly && Object.keys(progress?.wrongWords || {}).length > 0),
  };
}

export function pickNextFlashcardForUser(progress, { excludeWordId = null, nowMs = Date.now(), studyTier = 'all' } = {}) {
  const bandId = getEffectiveBandForTier(progress, studyTier);
  const bandWords = loadBandWords(bandId);
  if (bandWords.length === 0) {
    return null;
  }

  // 1. Ưu tiên từ hay sai thuộc band đang chọn trước, sau đó đến từ sai ở bất kỳ band nào
  const wrongEntries = Object.values(progress?.wrongWords || {}).filter((w) => w.id !== excludeWordId);
  const wrongInBand = wrongEntries.filter((w) => w.band === bandId);
  if (wrongInBand.length > 0) {
    const found = findWordById(wrongInBand[0].id);
    if (found) return { word: found, bandWords, indexInBand: bandWords.findIndex((w) => w.id === found.id) };
  }

  // 2. Từ đến hạn ôn SRS trong band
  const dueInBand = bandWords.filter((w) => {
    if (w.id === excludeWordId) return false;
    const srsEntry = progress?.srs?.[w.id];
    return srsEntry && (srsEntry.dueAt || 0) <= nowMs;
  });
  if (dueInBand.length > 0) {
    const word = dueInBand[crypto.randomInt(0, dueInBand.length)];
    return { word, bandWords, indexInBand: bandWords.findIndex((w) => w.id === word.id) };
  }

  // 3. Từ chưa thuộc trong band
  const masteredSet = new Set(progress?.masteredIds || []);
  let freshPool = bandWords.filter((w) => w.id !== excludeWordId && !masteredSet.has(w.id));
  if (freshPool.length === 0) {
    freshPool = bandWords.filter((w) => w.id !== excludeWordId);
  }
  if (freshPool.length === 0) {
    freshPool = bandWords;
  }

  const chosen = freshPool[crypto.randomInt(0, freshPool.length)];
  return {
    word: chosen,
    bandWords,
    indexInBand: Math.max(0, bandWords.findIndex((w) => w.id === chosen.id)),
  };
}

export function computeNextSrsIntervalDays(progress, wordId) {
  const prevReps = progress?.srs?.[wordId]?.reps || 0;
  const intervals = HSK_DEFAULTS.SRS_INTERVAL_DAYS;
  // Lần đầu chọn Đã thuộc: +4 ngày (index 1, đúng với preview), sau đó +10 -> +21
  const idx = Math.min(intervals.length - 1, Math.max(1, prevReps + 1));
  return intervals[idx];
}

// =========================================================================
// BẢNG XẾP HẠNG ĐẤU TRƯỜNG HSK 3.0
// =========================================================================

export function getHskLeaderboardEntries(config) {
  const statsMap = config?.stats && typeof config.stats === 'object' ? config.stats : {};
  const entries = [];

  for (const [uid, rawStat] of Object.entries(statsMap)) {
    const stat = normalizeArenaStat(uid, rawStat);
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

export function getPlayerHskLeaderboardPosition(config, userId) {
  const uid = String(userId || '');
  const entries = getHskLeaderboardEntries(config);
  const index = entries.findIndex((entry) => entry.userId === uid);
  const stats = index >= 0 ? entries[index] : normalizeArenaStat(uid, config?.stats?.[uid]);
  return {
    entries,
    rank: index >= 0 ? index + 1 : null,
    stats,
    totalPlayers: entries.length,
  };
}

// =========================================================================
// PAYLOAD BUILDERS (DISCORD COMPONENTS V2 — KHÔNG VIỀN, NÚT XÁM, KHÔNG BACKTICK PINYIN)
// =========================================================================

function formatHsk2Note(word) {
  if (!word) return '';
  return word.hsk2 ? `HSK 2.0: cấp ${word.hsk2}` : 'Từ mới chuẩn HSK 3.0';
}

function formatWordBoldPair(hanzi, pinyin) {
  return `**${hanzi}** (**${pinyin}**)`;
}

/**
 * 1. MENU ÔN LUYỆN CÁ NHÂN (`HSK 3.0 — ÔN LUYỆN TIẾNG TRUNG CÁ NHÂN`)
 * - Đúng tuyệt đối giao diện người dùng duyệt:
 *   + Không footer
 *   + Emoji & bố cục từng dòng theo chỉ định
 *   + Toàn bộ nút xám (style: 2), không thanh màu container
 */
export function buildPersonalHubPayloadV2({
  ownerId,
  progress,
  studyTier = 'all',
  ephemeral = true,
  nowMs = Date.now(),
}) {
  const normalizedTier = normalizeStudyTier(studyTier);
  const tierCode = encodeStudyTierCode(normalizedTier);
  const tierMeta = getStudyTierMeta(normalizedTier);
  const effectiveBandId = getEffectiveBandForTier(progress, normalizedTier);
  const bandMeta = getBandMeta(effectiveBandId);
  const availableBands = getBandsForStudyTier(normalizedTier);
  const { wrongCount, dueCount, masteredCount } = getUserNotebookSummary(progress, nowMs);
  const uid = String(ownerId);

  return {
    flags: ephemeral ? (MessageFlags.Ephemeral | IS_COMPONENTS_V2) : IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatHskTitle('HSK 3.0 — ÔN LUYỆN TIẾNG TRUNG CÁ NHÂN'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              'Chào bạn! Mời bạn chọn cấp độ HSK 3.0 bên dưới rồi bấm chế độ muốn ôn nha:',
              `${HSK_EMOJIS.LEVEL} Cấp độ đang chọn: **${bandMeta.selectLabel}**${tierMeta ? ` · ${tierMeta.name}` : ''}`,
              `${HSK_EMOJIS.STREAK} Chuỗi đúng hiện tại: **${progress?.personalStreak ?? 0} câu**`,
              `> Đã thuộc: **${masteredCount} từ**`,
              `${HSK_EMOJIS.NOTEBOOK} Sổ tay từ cần ôn: **${dueCount} từ**`,
              `> **${wrongCount} từ** vừa trả lời sai`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: `hsk_select_band:${uid}:${tierCode}`,
                placeholder: tierMeta
                  ? `Đang chọn: ${bandMeta.name} — đổi cấp ${tierMeta.name}`
                  : `Đang chọn: ${bandMeta.name} — bấm để đổi cấp độ`,
                min_values: 1,
                max_values: 1,
                options: availableBands.map((band) => ({
                  label: band.selectLabel,
                  value: String(band.id),
                  description: band.selectDescription,
                  default: band.id === bandMeta.id,
                })),
              },
            ],
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: 'Trắc nghiệm 4 nút',
                emoji: HSK_BUTTON_EMOJIS.ACTION,
                custom_id: `hsk_mode_quiz:${uid}:${tierCode}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: 'Flashcard + SRS',
                emoji: HSK_BUTTON_EMOJIS.ACTION,
                custom_id: `hsk_mode_flash:${uid}:${tierCode}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: `Sổ tay (${wrongCount})`,
                emoji: HSK_BUTTON_EMOJIS.NOTEBOOK,
                custom_id: `hsk_mode_notebook:${uid}:${tierCode}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: 'Xem đấu trường',
                emoji: HSK_BUTTON_EMOJIS.ARENA,
                custom_id: `hsk_mode_arena:${uid}:${tierCode}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * 2. GIAO DIỆN TRẮC NGHIỆM CÁ NHÂN (`TRẮC NGHIỆM HSK 3.0 — <CẤP>`)
 */
export function buildPersonalQuizPayloadV2({
  ownerId,
  progress,
  word,
  question,
  studyTier = 'all',
  focusWrongOnly = false,
  feedbackMessage = null,
  ephemeral = true,
}) {
  const uid = String(ownerId);
  const tierCode = encodeStudyTierCode(studyTier);
  const bandMeta = getBandMeta(word?.band || getEffectiveBandForTier(progress, studyTier));
  const letters = ['A', 'B', 'C', 'D'];
  const isAnswered = Number.isInteger(question?.answeredIndex);
  const activeType = question?.quizType || 'vi';

  const bodyLines = [
    `${HSK_EMOJIS.LEVEL} **${question.modeLabel}** • ${bandMeta.name} (${word.posVi})${focusWrongOnly ? ' • Đang ôn từ hay sai' : ''}`,
    '',
    activeType === 'cloze' ? `**${question.promptTitle}**` : `## **${question.promptTitle}**`,
    question.promptSubtitle,
  ];

  if (question.hintShown && activeType !== 'pinyin') {
    const tradNote = word.traditional && word.traditional !== word.hanzi ? ` • Phồn thể: **${word.traditional}**` : '';
    bodyLines.push(`${HSK_EMOJIS.HINT} **Gợi ý:** Pinyin ${formatWordBoldPair(word.hanzi, word.pinyin)}${tradNote}`);
  }

  if (feedbackMessage) {
    bodyLines.push('', feedbackMessage);
  }

  const answerButtons = (question.options || []).map((opt, idx) => {
    let prefix = `${letters[idx]}. `;
    if (isAnswered) {
      if (idx === question.correctIndex) prefix = `✓ ${letters[idx]}. `;
      else if (idx === question.answeredIndex) prefix = `✕ ${letters[idx]}. `;
    }
    return {
      type: 2,
      style: 2, // Xám
      label: truncateLabel(`${prefix}${opt}`, 78),
      custom_id: `hsk_quiz_ans:${uid}:${question.qId}:${idx}:${tierCode}`,
      disabled: isAnswered,
    };
  });

  return {
    flags: ephemeral ? (MessageFlags.Ephemeral | IS_COMPONENTS_V2) : IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatHskTitle(`TRẮC NGHIỆM HSK 3.0 — ${bandMeta.name}`),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: activeType === 'vi' ? '✓ 汉字 → Nghĩa' : '汉字 → Nghĩa',
                custom_id: `hsk_quiz_type:${uid}:vi:${tierCode}`,
              },
              {
                type: 2,
                style: 2,
                label: activeType === 'pinyin' ? '✓ 汉字 → Pinyin' : '汉字 → Pinyin',
                custom_id: `hsk_quiz_type:${uid}:pinyin:${tierCode}`,
              },
              {
                type: 2,
                style: 2,
                label: activeType === 'cloze' ? '✓ Điền khuyết' : 'Điền khuyết',
                custom_id: `hsk_quiz_type:${uid}:cloze:${tierCode}`,
              },
            ],
          },
          {
            type: 10,
            content: bodyLines.join('\n'),
          },
          {
            type: 1,
            components: answerButtons.slice(0, 2),
          },
          {
            type: 1,
            components: answerButtons.slice(2, 4),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: 'Gợi ý Pinyin',
                emoji: HSK_BUTTON_EMOJIS.HINT,
                custom_id: `hsk_quiz_hint:${uid}:${question.qId}:${tierCode}`,
                disabled: Boolean(question.hintShown || isAnswered || activeType === 'pinyin'),
              },
              {
                type: 2,
                style: 2, // Xám — chevron giống booking ảnh mẫu
                label: '❯❯ Câu tiếp theo',
                custom_id: `hsk_quiz_next:${uid}:${tierCode}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: 'Về menu',
                emoji: HSK_BUTTON_EMOJIS.ACTION,
                custom_id: `hsk_home:${uid}:${tierCode}`,
              },
            ],
          },
          {
            type: 10,
            content: `-# Chuỗi đúng hiện tại: ${progress?.personalStreak ?? 0} câu (Kỷ lục: ${progress?.bestPersonalStreak ?? 0}) • Trả lời sai tự lưu vào Sổ tay`,
          },
        ],
      },
    ],
  };
}

/**
 * 3. GIAO DIỆN FLASHCARD SRS (`FLASHCARD HSK 3.0 — SRS NHẮC NGẮT QUÃNG`)
 */
export function buildPersonalFlashcardPayloadV2({
  ownerId,
  progress,
  word,
  indexInBand = 0,
  totalInBand = 45,
  flipped = false,
  statusNotice = null,
  studyTier = 'all',
  ephemeral = true,
}) {
  const uid = String(ownerId);
  const tierCode = encodeStudyTierCode(studyTier);
  const bandMeta = getBandMeta(word?.band || getEffectiveBandForTier(progress, studyTier));
  const nextGoodDays = computeNextSrsIntervalDays(progress, word.id);
  const tradNote = word.traditional && word.traditional !== word.hanzi ? ` • Phồn thể: **${word.traditional}**` : '';

  const cardLines = [
    `${HSK_EMOJIS.LEVEL} **${bandMeta.name}** • Từ loại: **${word.pos}** (${word.posVi}) • Thẻ **${indexInBand + 1}/${totalInBand}** (${formatHsk2Note(word)})`,
    '',
    `## **${word.hanzi}**`,
  ];

  if (flipped) {
    cardLines.push(
      `**Pinyin:** **${word.pinyin}**${tradNote}`,
      `**Nghĩa:** **${word.meaning}**`,
      '',
      `**Ví dụ:** ${word.exZh}`,
      `> **${word.exPy}**`,
      `> ${word.exVi}`,
    );
    if (word.note) {
      cardLines.push(`**Ghi chú:** ${word.note}`);
    }
  } else {
    cardLines.push('Thử nhẩm Pinyin và nghĩa tiếng Việt trước khi lật thẻ nha~');
  }

  if (statusNotice) {
    cardLines.push('', statusNotice);
  }

  const children = [
    {
      type: 10,
      content: formatHskTitle('FLASHCARD HSK 3.0 — SRS NHẮC NGẮT QUÃNG'),
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: cardLines.join('\n'),
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
  ];

  if (!flipped) {
    children.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 2, // Xám
          label: 'Lật thẻ xem đáp án',
          emoji: HSK_BUTTON_EMOJIS.FLIP,
          custom_id: `hsk_flash_flip:${uid}:${word.id}:${tierCode}`,
        },
        {
          type: 2,
          style: 2, // Xám
          label: 'Về menu',
          emoji: HSK_BUTTON_EMOJIS.ACTION,
          custom_id: `hsk_home:${uid}:${tierCode}`,
        },
      ],
    });
  } else {
    children.push(
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 2, // Xám
            label: 'Quên (Ôn lại ngay)',
            emoji: HSK_BUTTON_EMOJIS.STREAK,
            custom_id: `hsk_flash_rate:${uid}:${word.id}:again:${tierCode}`,
          },
          {
            type: 2,
            style: 2, // Xám
            label: 'Nhớ mang máng (+1 ngày)',
            custom_id: `hsk_flash_rate:${uid}:${word.id}:hard:${tierCode}`,
          },
          {
            type: 2,
            style: 2, // Xám
            label: `Đã thuộc (+${nextGoodDays} ngày)`,
            emoji: HSK_BUTTON_EMOJIS.CHECK,
            custom_id: `hsk_flash_rate:${uid}:${word.id}:good:${tierCode}`,
          },
        ],
      },
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 2, // Xám
            label: 'Về menu',
            emoji: HSK_BUTTON_EMOJIS.ACTION,
            custom_id: `hsk_home:${uid}:${tierCode}`,
          },
        ],
      },
    );
  }

  children.push({
    type: 10,
    content: '-# Lịch nhắc SRS lưu bền vững theo từng từ trong PostgreSQL',
  });

  return {
    flags: ephemeral ? (MessageFlags.Ephemeral | IS_COMPONENTS_V2) : IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: children,
      },
    ],
  };
}

/**
 * 4. GIAO DIỆN SỔ TAY TỪ SAI & TRA CỨU NHANH (`SỔ TAY TỪ SAI & TRA CỨU NHANH HSK 3.0`)
 */
export function buildPersonalNotebookPayloadV2({
  ownerId,
  progress,
  page = 0,
  searchQuery = '',
  searchResults = [],
  studyTier = 'all',
  ephemeral = true,
  nowMs = Date.now(),
}) {
  const uid = String(ownerId);
  const tierCode = encodeStudyTierCode(studyTier);
  const { wrongList, wrongCount } = getUserNotebookSummary(progress, nowMs);
  const pageSize = HSK_DEFAULTS.NOTEBOOK_PAGE_SIZE;
  const totalPages = Math.max(1, Math.ceil(wrongList.length / pageSize));
  const safePage = Number.isInteger(page) ? Math.max(0, Math.min(totalPages - 1, page)) : 0;
  const visibleWrong = wrongList.slice(safePage * pageSize, (safePage + 1) * pageSize);

  const children = [
    {
      type: 10,
      content: formatHskTitle('SỔ TAY TỪ SAI & TRA CỨU NHANH HSK 3.0'),
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: `${HSK_EMOJIS.NOTEBOOK} **1. Từ cần ôn của bạn (${wrongCount} từ):**`,
    },
  ];

  if (visibleWrong.length === 0) {
    children.push({
      type: 10,
      content: `${HSK_EMOJIS.CHECK} Tuyệt vời! Sổ tay từ sai hiện đang trống — chưa có từ nào cần ôn bù.`,
    });
  } else {
    for (const w of visibleWrong) {
      const bandMeta = getBandMeta(w.band);
      children.push({
        type: 9,
        components: [
          {
            type: 10,
            content: [
              `${formatWordBoldPair(w.hanzi, w.pinyin)} · ${bandMeta.name}`,
              `> ${w.meaning} • Sai ${w.wrongCount} lần`,
            ].join('\n'),
          },
        ],
        accessory: {
          type: 2,
          style: 2, // Xám
          label: 'Đã thuộc',
          emoji: HSK_BUTTON_EMOJIS.CHECK,
          custom_id: `hsk_nb_done:${uid}:${w.id}:${safePage}:${tierCode}`,
        },
      });
    }
  }

  children.push(
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: '❮❮',
          custom_id: `hsk_nb_prev:${uid}:${safePage}:${tierCode}`,
          disabled: totalPages <= 1,
        },
        {
          type: 2,
          style: 2,
          label: `${safePage + 1}/${totalPages}`,
          custom_id: `hsk_nb_page:${uid}:${safePage}`,
          disabled: true,
        },
        {
          type: 2,
          style: 2,
          label: '❯❯',
          custom_id: `hsk_nb_next:${uid}:${safePage}:${tierCode}`,
          disabled: totalPages <= 1,
        },
        {
          type: 2,
          style: 2,
          label: 'Ôn lại ngay',
          emoji: HSK_BUTTON_EMOJIS.STREAK,
          custom_id: `hsk_nb_review:${uid}:${tierCode}`,
          disabled: wrongCount === 0,
        },
      ],
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
  );

  let lookupText;
  if (searchQuery) {
    if (searchResults.length > 0) {
      lookupText = [
        `${HSK_EMOJIS.HINT} **2. Kết quả tra cứu "${searchQuery}":**`,
        ...searchResults.slice(0, 3).map((w) => {
          const bandMeta = getBandMeta(w.band);
          const trad = w.traditional && w.traditional !== w.hanzi ? ` (Phồn thể: **${w.traditional}**)` : '';
          return [
            `${formatWordBoldPair(w.hanzi, w.pinyin)}${trad} · ${bandMeta.name} (${w.pos})`,
            `> **Nghĩa:** ${w.meaning} (${formatHsk2Note(w)})`,
            `> **Ví dụ:** ${w.exZh} — **${w.exPy}** (${w.exVi})`,
          ].join('\n');
        }),
      ].join('\n\n');
    } else {
      lookupText = `${HSK_EMOJIS.HINT} **2. Tra cứu nhanh:** Không tìm thấy từ khớp với **"${searchQuery}"** trong kho HSK 3.0.`;
    }
  } else {
    lookupText = `${HSK_EMOJIS.HINT} **2. Tra cứu nhanh:** Bấm nút bên dưới để nhập **chữ Hán**, **Pinyin** (vd: xunxu) hoặc **nghĩa tiếng Việt**.`;
  }

  children.push({
    type: 10,
    content: lookupText,
  });

  const bottomButtons = [
    {
      type: 2,
      style: 2,
      label: 'Tra cứu nhanh',
      emoji: HSK_BUTTON_EMOJIS.HINT,
      custom_id: `hsk_nb_search:${uid}:${tierCode}`,
    },
  ];
  if (searchQuery) {
    bottomButtons.push({
      type: 2,
      style: 2,
      label: 'Xoá kết quả tìm',
      custom_id: `hsk_nb_clear_search:${uid}:${tierCode}`,
    });
  }
  bottomButtons.push({
    type: 2,
    style: 2,
    label: 'Về menu',
    emoji: HSK_BUTTON_EMOJIS.ACTION,
    custom_id: `hsk_home:${uid}:${tierCode}`,
  });

  children.push({
    type: 1,
    components: bottomButtons,
  });

  return {
    flags: ephemeral ? (MessageFlags.Ephemeral | IS_COMPONENTS_V2) : IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: children,
      },
    ],
  };
}

/**
 * 4b. BẢNG PHÒNG ÔN LUYỆN CỐ ĐỊNH THEO PHÂN HỆ (`elementary`: HSK 1–3 | `advanced`: HSK 4–9)
 * - Admin đặt 1 lần trong từng kênh, member bấm nút chọn cấp độ hoặc vào thẳng chế độ học (Ephemeral riêng tư)
 */
export function buildStudyRoomLobbyPayloadV2(tier = 'elementary') {
  const normalizedTier = normalizeStudyTier(tier) === 'advanced' ? 'advanced' : 'elementary';
  const tierCode = encodeStudyTierCode(normalizedTier);
  const tierMeta = getStudyTierMeta(normalizedTier);
  const bands = getBandsForStudyTier(normalizedTier);

  const introLines =
    normalizedTier === 'elementary'
      ? [
          'Chào bạn! Đây là phòng tự học riêng tư dành cho trình độ **Sơ cấp (HSK 1 – HSK 3)**.',
          `${HSK_EMOJIS.LEVEL} **Phạm vi cấp độ:** **HSK 1 · HSK 2 · HSK 3** (Chuẩn HSK 3.0)`,
          `${HSK_EMOJIS.ACTION} **Cách sử dụng:** Bấm thẳng nút cấp độ hoặc chế độ bên dưới (chỉ mình bạn thấy, không trôi kênh!)`,
          `${HSK_EMOJIS.NOTEBOOK} **Công cụ:** Trắc nghiệm 4 nút • Flashcard SRS • Sổ tay từ sai & Tra cứu nhanh`,
        ]
      : [
          'Chào bạn! Đây là phòng tự học riêng tư dành cho trình độ **Trung & Cao cấp (HSK 4 – HSK 9)**.',
          `${HSK_EMOJIS.LEVEL} **Phạm vi cấp độ:** **HSK 4 · HSK 5 · HSK 6 · HSK 7–9** (Chuẩn HSK 3.0)`,
          `${HSK_EMOJIS.ACTION} **Cách sử dụng:** Bấm thẳng nút cấp độ hoặc chế độ bên dưới (chỉ mình bạn thấy, không trôi kênh!)`,
          `${HSK_EMOJIS.NOTEBOOK} **Công cụ:** Trắc nghiệm 4 nút • Flashcard SRS • Sổ tay từ sai & Tra cứu nhanh`,
        ];

  const bandButtons = bands.map((band) => ({
    type: 2,
    style: 2, // Xám
    label: `Ôn ${band.name}`,
    emoji: HSK_BUTTON_EMOJIS.LEVEL,
    custom_id: `hsk_room_band:${band.id}:${tierCode}`,
  }));

  const modeButtons = [
    {
      type: 2,
      style: 2,
      label: 'Trắc nghiệm 4 nút',
      emoji: HSK_BUTTON_EMOJIS.ACTION,
      custom_id: `hsk_room_mode:quiz:${tierCode}`,
    },
    {
      type: 2,
      style: 2,
      label: 'Flashcard + SRS',
      emoji: HSK_BUTTON_EMOJIS.ACTION,
      custom_id: `hsk_room_mode:flash:${tierCode}`,
    },
    {
      type: 2,
      style: 2,
      label: 'Sổ tay & Tra cứu',
      emoji: HSK_BUTTON_EMOJIS.NOTEBOOK,
      custom_id: `hsk_room_mode:notebook:${tierCode}`,
    },
    {
      type: 2,
      style: 2,
      label: 'Xem đấu trường',
      emoji: HSK_BUTTON_EMOJIS.ARENA,
      custom_id: `hsk_room_mode:arena:${tierCode}`,
    },
  ];

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatHskTitle(tierMeta.roomTitle),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: introLines.join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: bandButtons,
          },
          {
            type: 1,
            components: modeButtons,
          },
          {
            type: 10,
            content: '-# Không cần gõ lệnh • Bấm nút để mở bảng tự học riêng tư 24/7 (Tiến độ lưu bền vững vào PostgreSQL)',
          },
        ],
      },
    ],
  };
}

/**
 * 5. GIAO DIỆN ĐẤU TRƯỜNG KÊNH CHUNG (`ĐẤU TRƯỜNG HSK 3.0 — VÁN #N`)
 * - Member không cần gõ lệnh, trực tiếp bấm A/B/C/D, Mở gợi ý, Ôn luyện riêng, BXH Server, ❯❯ Ván mới
 */
export function buildArenaRoundPayloadV2({
  roundNumber = 1,
  levelLabel,
  durationSeconds,
  word,
  question,
  roundId,
  topStreakEntry = null,
  controlsDisabled = false,
}) {
  const letters = ['A', 'B', 'C', 'D'];
  const bandMeta = getBandMeta(word.band);
  const topStreakLine = topStreakEntry
    ? `<@${topStreakEntry.userId}> (**${topStreakEntry.currentStreak} câu** • Kỷ lục: ${topStreakEntry.bestStreak})`
    : 'Chưa có ai — bấm đáp án đúng đầu tiên để mở chuỗi!';

  const hintPromptLine =
    question.quizType === 'cloze'
      ? `Gợi ý nghĩa: ${HSK_EMOJIS.HINT} Bấm "Mở gợi ý" để xem riêng`
      : `Pinyin: ${HSK_EMOJIS.HINT} Bấm "Mở gợi ý" để xem riêng`;

  const questionHeader =
    question.quizType === 'cloze'
      ? `**${question.promptTitle}**`
      : `## **${question.promptTitle}**`;

  const answerButtons = (question.options || []).map((opt, idx) => ({
    type: 2,
    style: 2, // Xám
    label: truncateLabel(`${letters[idx]}. ${opt}`, 78),
    custom_id: `hsk_arena_ans:${roundId}:${idx}`,
    disabled: Boolean(controlsDisabled),
  }));

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatHskTitle(`ĐẤU TRƯỜNG HSK 3.0 — VÁN #${roundNumber}`),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${HSK_EMOJIS.LEVEL} Cấp độ kênh: **${levelLabel || bandMeta.name}** (${bandMeta.name} · ${word.posVi})`,
              `${HSK_EMOJIS.TIME} Thời gian ván: **${durationSeconds} giây**`,
              '',
              questionHeader,
              question.promptSubtitle,
              hintPromptLine,
              `${HSK_EMOJIS.STREAK} Đang giữ chuỗi: ${topStreakLine}`,
            ].join('\n'),
          },
          {
            type: 1,
            components: answerButtons.slice(0, 2),
          },
          {
            type: 1,
            components: answerButtons.slice(2, 4),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: 'Mở gợi ý',
                emoji: HSK_BUTTON_EMOJIS.HINT,
                custom_id: `hsk_arena_hint:${roundId}`,
                disabled: Boolean(controlsDisabled),
              },
              {
                type: 2,
                style: 2, // Xám
                label: 'Ôn luyện riêng',
                emoji: HSK_BUTTON_EMOJIS.NOTEBOOK,
                custom_id: 'hsk_arena_personal',
              },
              {
                type: 2,
                style: 2, // Xám
                label: 'BXH Server',
                emoji: HSK_BUTTON_EMOJIS.ACTION,
                custom_id: 'hsk_arena_bxh',
              },
              {
                type: 2,
                style: 2, // Xám — chevron giống ảnh mẫu booking
                label: '❯❯ Ván mới',
                custom_id: `hsk_arena_next:${roundId}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * 6. THẺ KẾT QUẢ KHI CÓ NGƯỜI THẮNG VÁN ĐẤU TRƯỜNG
 */
export function buildArenaWinPayloadV2({
  roundNumber,
  winnerId,
  word,
  reactionSeconds,
  winnerStats,
  nextRoundDelaySeconds = 5,
  autoStart = true,
  pausedNight = false,
}) {
  const bandMeta = getBandMeta(word.band);
  const tradNote = word.traditional && word.traditional !== word.hanzi ? ` (Phồn thể: **${word.traditional}**)` : '';
  const footerLine = pausedNight
    ? 'Đã bước sang khung giờ nghỉ ban đêm (00:00 - 08:00) — nghỉ ngơi nha, hẹn 08:00 sáng~'
    : autoStart
      ? `Tự động mở ván mới sau ${nextRoundDelaySeconds} giây...`
      : 'Ván chơi đã kết thúc • Bấm ❯❯ Ván mới ở thẻ trên để chơi tiếp bất kỳ lúc nào';

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatHskTitle(`CHÍNH XÁC — VÁN #${roundNumber}`),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${HSK_EMOJIS.CHECK} **Người trả lời đúng:** <@${winnerId}> (**${reactionSeconds} giây**)`,
              `${HSK_EMOJIS.STREAK} **Chuỗi Đấu trường hiện tại:** **${winnerStats?.currentStreak ?? 1} câu** (Kỷ lục: ${winnerStats?.bestStreak ?? 1})`,
              `${HSK_EMOJIS.LEVEL} **Từ vựng chuẩn ${bandMeta.name}:** ${formatWordBoldPair(word.hanzi, word.pinyin)}${tradNote} — **${word.meaning}** (${formatHsk2Note(word)})`,
              `> **Ví dụ:** ${word.exZh} — **${word.exPy}**`,
              `> ${word.exVi}`,
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
 * 7. THẺ HẾT GIỜ VÁN ĐẤU TRƯỜNG
 */
export function buildArenaTimeoutPayloadV2({
  roundNumber,
  word,
  durationSeconds,
  nextRoundDelaySeconds = 5,
  autoStart = true,
  pausedIdle = false,
  pausedNight = false,
}) {
  const bandMeta = getBandMeta(word.band);
  const tradNote = word.traditional && word.traditional !== word.hanzi ? ` (Phồn thể: **${word.traditional}**)` : '';
  const footerLine = pausedNight
    ? 'Đã bước sang khung giờ nghỉ ban đêm (00:00 - 08:00) — xem thẻ thông báo bên dưới'
    : pausedIdle
      ? 'Đã quá 3 phút vắng người chơi — xem thẻ Tạm nghỉ bên dưới'
      : autoStart
        ? `Tự động chuyển sang từ mới sau ${nextRoundDelaySeconds} giây...`
        : 'Chế độ thủ công • Bấm ❯❯ Ván mới ở thẻ trên để chơi tiếp';

  return {
    flags: IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatHskTitle(`HẾT THỜI GIAN — VÁN #${roundNumber}`),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${HSK_EMOJIS.TIME} Đã hết **${durationSeconds} giây** nhưng chưa có ai chọn đúng đáp án!`,
              `${HSK_EMOJIS.LEVEL} **Đáp án (${bandMeta.name}):** ${formatWordBoldPair(word.hanzi, word.pinyin)}${tradNote} — **${word.meaning}**`,
              `> **Ví dụ:** ${word.exZh} — **${word.exPy}** (${word.exVi})`,
              `${HSK_EMOJIS.STREAK} Không có ai ghi điểm lượt này — chuỗi giữ lượt quay về **0**.`,
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
 * 8. THẺ TẠM NGHỈ SAU 3 PHÚT VẮNG NGƯỜI CHƠI
 */
export function buildHskIdlePausedPayloadV2({
  idleMinutes = Math.round(HSK_DEFAULTS.IDLE_TIMEOUT_MS / 60000),
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
            content: formatHskTitle('ĐẤU TRƯỜNG TẠM NGHỈ DO VẮNG NGƯỜI CHƠI'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${HSK_EMOJIS.TIME} Đã quá **${idleMinutes} phút** chưa có thành viên nào tương tác.`,
              `${HSK_EMOJIS.LEVEL} Bot tạm dừng tự động gửi ván mới để tiết kiệm RAM và tránh trôi kênh.`,
              `${HSK_EMOJIS.STREAK} Bạn vẫn có thể bấm **Ôn luyện riêng** hoặc **❯❯ Chơi tiếp** bất cứ lúc nào nha~`,
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
              : '-# Không cần gõ lệnh • Bấm nút bên dưới để tiếp tục đấu trường hoặc tự ôn riêng',
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: '❯❯ Chơi tiếp',
                custom_id: 'hsk_arena_resume',
                disabled: Boolean(resumeDisabled),
              },
              {
                type: 2,
                style: 2,
                label: 'Ôn luyện riêng',
                emoji: HSK_BUTTON_EMOJIS.NOTEBOOK,
                custom_id: 'hsk_arena_personal',
              },
              {
                type: 2,
                style: 2,
                label: 'BXH Server',
                emoji: HSK_BUTTON_EMOJIS.ACTION,
                custom_id: 'hsk_arena_bxh',
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * 9. THẺ KHÓA NGHỈ BAN ĐÊM (00:00 - 08:00 GIỜ VIỆT NAM)
 */
export function buildHskNightLockPayloadV2({
  currentTimeText = null,
  startHour = HSK_DEFAULTS.NIGHT_LOCK_START_HOUR,
  endHour = HSK_DEFAULTS.NIGHT_LOCK_END_HOUR,
  includeResumeButton = false,
  resumeDisabled = false,
  ephemeral = true,
  configSavedNotice = false,
} = {}) {
  const startLabel = `${String(startHour).padStart(2, '0')}:00`;
  const endLabel = `${String(endHour).padStart(2, '0')}:00`;
  const timeInfo = currentTimeText
    ? `Hiện đang là **${currentTimeText}** — đấu trường tạm nghỉ ban đêm để tiết kiệm RAM.`
    : 'Đấu trường đang tạm nghỉ ban đêm để tiết kiệm RAM.';
  const footerLine = configSavedNotice
    ? `Đã lưu cấu hình đấu trường • Sẽ tự mở lại sau ${endLabel} sáng (mục Ôn luyện riêng vẫn mở 24/7)`
    : 'Chuỗi Streak & Sổ tay vẫn bảo lưu nguyên vẹn • Ôn luyện riêng /hsk vẫn dùng được ban đêm';

  const children = [
    {
      type: 10,
      content: formatHskTitle('ĐẤU TRƯỜNG ĐANG NGHỈ BAN ĐÊM'),
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: [
        `${HSK_EMOJIS.TIME} **Khung giờ nghỉ đấu trường:** **${startLabel} - ${endLabel} sáng** (giờ Việt Nam)`,
        `${HSK_EMOJIS.ADMIN_DISABLE} **Trạng thái:** ${timeInfo}`,
        `${HSK_EMOJIS.NOTEBOOK} **Gợi ý:** Thành viên vẫn có thể bấm **Ôn luyện riêng** hoặc gõ **/hsk** để tự học xuyên đêm nha~`,
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
    children.push({
      type: 1,
      components: [
        {
          type: 2,
          style: 2,
          label: '❯❯ Chơi tiếp',
          custom_id: 'hsk_arena_resume',
          disabled: Boolean(resumeDisabled),
        },
        {
          type: 2,
          style: 2,
          label: 'Ôn luyện riêng',
          emoji: HSK_BUTTON_EMOJIS.NOTEBOOK,
          custom_id: 'hsk_arena_personal',
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
        components: children,
      },
    ],
  };
}

/**
 * 10. BẢNG XẾP HẠNG ĐẤU TRƯỜNG HSK 3.0 (5 NGƯỜI/TRANG, PHÂN TRANG ❮❮ | 1/N | ❯❯)
 */
export function buildHskLeaderboardPayloadV2({
  entries = [],
  page = 0,
  requesterStats = null,
  requesterRank = null,
  ephemeral = true,
}) {
  const pageSize = HSK_DEFAULTS.BXH_PAGE_SIZE;
  const totalEntries = entries.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const rawPage = Number(page);
  const safePage = Number.isInteger(rawPage) ? Math.max(0, Math.min(totalPages - 1, rawPage)) : 0;
  const pageEntries = entries.slice(safePage * pageSize, (safePage + 1) * pageSize);

  let bodyContent;
  if (totalEntries === 0) {
    bodyContent = [
      `${HSK_EMOJIS.STREAK} Chưa có thành viên nào ghi điểm tại Đấu trường HSK 3.0!`,
      `${HSK_EMOJIS.HINT} Hãy bấm đáp án trên thẻ đấu trường để ghi danh lên **Top 1** nha~`,
    ].join('\n');
  } else {
    bodyContent = pageEntries
      .map((entry, idx) => {
        const globalRank = safePage * pageSize + idx + 1;
        const rankBadge =
          globalRank <= 5 ? HSK_EMOJIS.RANK_EMOJIS[globalRank - 1] : `**#${globalRank}**`;
        return `${rankBadge} <@${entry.userId}> — ${HSK_EMOJIS.STREAK} **Kỷ lục ${entry.bestStreak}** (Hiện tại: ${entry.currentStreak} • ${entry.totalWins} từ)`;
      })
      .join('\n');
  }

  const footerText =
    requesterRank && requesterStats
      ? `-# Trang ${safePage + 1}/${totalPages} (${totalEntries} người) • Hạng của bạn: #${requesterRank} (Kỷ lục: ${requesterStats.bestStreak} • Hiện tại: ${requesterStats.currentStreak})`
      : `-# Trang ${safePage + 1}/${totalPages} (${totalEntries} người) • Xếp hạng theo kỷ lục Streak Đấu trường HSK 3.0`;

  return {
    flags: ephemeral ? (MessageFlags.Ephemeral | IS_COMPONENTS_V2) : IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatHskTitle('BẢNG XẾP HẠNG ĐẤU TRƯỜNG HSK 3.0'),
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
                style: 2,
                label: '❮❮',
                disabled: totalPages <= 1,
                custom_id: `hsk_bxh_prev:${safePage}`,
              },
              {
                type: 2,
                style: 2,
                label: `${safePage + 1}/${totalPages}`,
                disabled: true,
                custom_id: `hsk_bxh_page:${safePage}`,
              },
              {
                type: 2,
                style: 2,
                label: '❯❯',
                disabled: totalPages <= 1,
                custom_id: `hsk_bxh_next:${safePage}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * 11. BẢNG XEM ĐẤU TRƯỜNG TỪ MENU CÁ NHÂN
 */
export function buildPersonalArenaOverviewPayloadV2({
  ownerId,
  config,
  currentRound = null,
  requesterRank = null,
  requesterStats = null,
  studyTier = 'all',
  ephemeral = true,
  nowMs = Date.now(),
}) {
  const uid = String(ownerId);
  const tierCode = encodeStudyTierCode(studyTier);
  const levelMeta = getArenaLevelMeta(config?.arenaLevelKey);
  const nightStatus = isHskNightLock(nowMs);

  let statusLine = 'Chưa thiết lập kênh đấu trường (Admin dùng `/hsk-admin setup`)';
  if (config?.channelId) {
    if (!config.enabled) statusLine = 'Đang tạm tắt';
    else if (nightStatus.locked) statusLine = 'Đang nghỉ ban đêm (00:00 - 08:00 VN)';
    else if (config.idlePaused && (!currentRound || currentRound.ended)) statusLine = 'Đang tạm nghỉ do vắng người chơi';
    else if (currentRound && !currentRound.ended) statusLine = `Đang diễn ra **Ván #${currentRound.roundNumber}**`;
    else statusLine = 'Sẵn sàng mở ván mới';
  }

  const elemCh = config?.studyChannels?.elementary ? `<#${config.studyChannels.elementary}>` : 'Chưa thiết lập';
  const advCh = config?.studyChannels?.advanced ? `<#${config.studyChannels.advanced}>` : 'Chưa thiết lập';

  const lines = [
    `${HSK_EMOJIS.ARENA} **Kênh đấu trường:** ${config?.channelId ? `<#${config.channelId}>` : 'Chưa thiết lập'}`,
    `${HSK_EMOJIS.LEVEL} **Cấp độ đấu trường:** **${levelMeta.label}**`,
    `${HSK_EMOJIS.TIME} **Trạng thái:** ${statusLine}`,
    `${HSK_EMOJIS.NOTEBOOK} **Phòng ôn luyện:** Sơ cấp ${elemCh} • Trung–Cao ${advCh}`,
    `${HSK_EMOJIS.STREAK} **Thành tích Đấu trường:** Kỷ lục **${requesterStats?.bestStreak ?? 0}** • Hiện tại **${requesterStats?.currentStreak ?? 0}** • Thắng **${requesterStats?.totalWins ?? 0} câu**${requesterRank ? ` (Hạng #${requesterRank})` : ''}`,
    '',
    'Thành viên chỉ cần vào thẳng kênh đấu trường và bấm nút **A/B/C/D** để chơi, không cần gõ lệnh!',
  ];

  return {
    flags: ephemeral ? (MessageFlags.Ephemeral | IS_COMPONENTS_V2) : IS_COMPONENTS_V2,
    allowedMentions: { parse: [] },
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: formatHskTitle('THÔNG TIN ĐẤU TRƯỜNG HSK 3.0'),
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
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: 'BXH Server',
                emoji: HSK_BUTTON_EMOJIS.ACTION,
                custom_id: 'hsk_arena_bxh',
              },
              {
                type: 2,
                style: 2,
                label: 'Về menu',
                emoji: HSK_BUTTON_EMOJIS.ACTION,
                custom_id: `hsk_home:${uid}:${tierCode}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * 12. BẢNG QUẢN TRỊ ADMIN (`/hsk-admin`)
 */
export function buildHskAdminPanelPayloadV2(config, currentRound = null, nowMs = Date.now()) {
  const duration = config?.durationSeconds ?? HSK_DEFAULTS.ROUND_DURATION_SECONDS;
  const levelMeta = getArenaLevelMeta(config?.arenaLevelKey);
  const nightStatus = isHskNightLock(nowMs);
  const modeText = config?.arenaMode === 'mixed' ? 'Hỗn hợp (Nghĩa + Điền khuyết)' : 'Chỉ Nghĩa tiếng Việt';
  const elemChannel = config?.studyChannels?.elementary || null;
  const advChannel = config?.studyChannels?.advanced || null;

  let statusLabel = 'Chưa thiết lập kênh đấu trường';
  if (config?.channelId && config?.enabled) {
    if (nightStatus.locked) {
      statusLabel = 'Đang khóa nghỉ ban đêm (00:00 - 08:00 sáng)';
    } else if (config.idlePaused && (!currentRound || currentRound.ended)) {
      statusLabel = 'Đang tạm nghỉ (Quá 3 phút vắng người chơi)';
    } else {
      statusLabel = config.autoStart ? 'Đang bật (Tự động ván liên hoàn)' : 'Đang bật (Chế độ thủ công)';
      if (currentRound && !currentRound.ended) {
        statusLabel += ` • Ván #${currentRound.roundNumber} đang chạy`;
      }
    }
  } else if (config?.channelId && !config?.enabled) {
    statusLabel = 'Đang tạm tắt';
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
            content: formatHskTitle('QUẢN TRỊ ĐẤU TRƯỜNG & ÔN LUYỆN HSK 3.0'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${HSK_EMOJIS.ARENA} **1. Kênh đấu trường:** ${config?.channelId ? `<#${config.channelId}>` : 'Chưa chọn (`/hsk-admin setup`)'}`,
              `${HSK_EMOJIS.LEVEL} **Cấp độ đấu trường:** **${levelMeta.label}**`,
              `${HSK_EMOJIS.TIME} **Thời gian mỗi ván:** **${duration} giây** • **Kiểu:** ${modeText}`,
              `${HSK_EMOJIS.STREAK} **Trạng thái đấu trường:** ${statusLabel}`,
              `${HSK_EMOJIS.NOTEBOOK} **2. Ôn Sơ cấp (HSK 1–3):** ${elemChannel ? `<#${elemChannel}>` : 'Chưa chọn (`/hsk-admin setup-onluyen`)'}`,
              `${HSK_EMOJIS.NOTEBOOK} **3. Ôn Trung – Cao (HSK 4–9):** ${advChannel ? `<#${advChannel}>` : 'Chưa chọn (`/hsk-admin setup-onluyen`)'}`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1,
            components: [
              {
                type: 3,
                custom_id: 'hsk_admin_select_band',
                placeholder: `Đổi cấp độ đấu trường (Hiện tại: ${levelMeta.label})`,
                min_values: 1,
                max_values: 1,
                options: HSK_ARENA_LEVEL_CHOICES.map((lvl) => ({
                  label: lvl.label,
                  value: lvl.key,
                  default: lvl.key === levelMeta.key,
                })),
              },
            ],
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: '❯❯ Bắt đầu ngay',
                custom_id: 'hsk_admin_start',
                disabled: !config?.channelId,
              },
              {
                type: 2,
                style: 2,
                label: `Tự động: ${config?.autoStart ? 'BẬT' : 'TẮT'}`,
                emoji: HSK_BUTTON_EMOJIS.CHECK,
                custom_id: 'hsk_admin_toggle',
              },
              {
                type: 2,
                style: 2,
                label: config?.arenaMode === 'mixed' ? 'Kiểu: Hỗn hợp' : 'Kiểu: Nghĩa',
                emoji: HSK_BUTTON_EMOJIS.ACTION,
                custom_id: 'hsk_admin_mode',
              },
              {
                type: 2,
                style: 2,
                label: 'Chỉnh giây',
                emoji: HSK_BUTTON_EMOJIS.TIME,
                custom_id: 'hsk_admin_time',
              },
              {
                type: 2,
                style: 2,
                label: config?.enabled ? 'Tắt kênh' : 'Bật lại',
                emoji: HSK_BUTTON_EMOJIS.ADMIN_DISABLE,
                custom_id: 'hsk_admin_disable',
                disabled: !config?.channelId,
              },
            ],
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 2,
                label: 'Gửi lại bảng Sơ cấp',
                emoji: HSK_BUTTON_EMOJIS.NOTEBOOK,
                custom_id: 'hsk_admin_post_study:elementary',
                disabled: !elemChannel,
              },
              {
                type: 2,
                style: 2,
                label: 'Gửi lại bảng Trung–Cao',
                emoji: HSK_BUTTON_EMOJIS.NOTEBOOK,
                custom_id: 'hsk_admin_post_study:advanced',
                disabled: !advChannel,
              },
            ],
          },
          {
            type: 10,
            content: `-# Chỉ Admin (<@&${HSK_ADMIN_ROLE_ID}>) mới thấy bảng điều khiển này • Thành viên chỉ bấm nút trong kênh`,
          },
        ],
      },
    ],
  };
}

/**
 * 13. PAYLOAD THÔNG BÁO CHUNG (KHÔNG VIỀN, NÚT XÁM)
 */
export function buildHskNoticePayloadV2({
  title,
  message,
  footer = null,
  ephemeral = true,
  buttons = null,
}) {
  const inner = [
    {
      type: 10,
      content: formatHskTitle(title),
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

  if (Array.isArray(buttons) && buttons.length > 0) {
    inner.push({
      type: 1,
      components: buttons,
    });
  }

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
// QUẢN LÝ VÒNG CHƠI ĐẤU TRƯỜNG KÊNH CHUNG & TIMER
// =========================================================================

export function getActiveHskArenaRound(guildId) {
  return activeArenaRounds.get(String(guildId)) || null;
}

export function clearHskArenaTimers(guildId) {
  const key = String(guildId);
  const timers = activeArenaTimers.get(key);
  if (timers) {
    if (timers.endTimeout) clearTimeout(timers.endTimeout);
    if (timers.nextRoundTimeout) clearTimeout(timers.nextRoundTimeout);
    activeArenaTimers.delete(key);
  }
}

export function markHskArenaActivity(guildId, timestamp = Date.now()) {
  guildLastActivityAt.set(String(guildId), timestamp);
}

export function getHskArenaLastActivityAt(guildId) {
  return guildLastActivityAt.get(String(guildId)) ?? null;
}

export function resetAllHskRuntimeState() {
  for (const guildId of activeArenaTimers.keys()) {
    clearHskArenaTimers(guildId);
  }
  activeArenaRounds.clear();
  registeredGuildCache.clear();
  guildLastActivityAt.clear();
  personalSessions.clear();
  bandWordCache.clear();
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

function getCurrentStreakLeader(config) {
  const entries = getHskLeaderboardEntries(config).filter((e) => e.currentStreak > 0);
  if (entries.length === 0) return null;
  entries.sort((a, b) => b.currentStreak - a.currentStreak || b.bestStreak - a.bestStreak);
  return entries[0];
}

async function disableArenaRoundAnswers(round) {
  if (!round?.message || typeof round.message.edit !== 'function') {
    return;
  }

  try {
    const disabledPayload = buildArenaRoundPayloadV2({
      roundNumber: round.roundNumber,
      levelLabel: round.levelLabel,
      durationSeconds: round.durationSeconds,
      word: round.word,
      question: round.question,
      roundId: round.id,
      topStreakEntry: round.topStreakEntry,
      controlsDisabled: true,
    });
    await round.message.edit(disabledPayload);
  } catch (error) {
    logger.debug('[HSK] Không thể khóa nút đáp án trên thẻ Đấu trường cũ:', error?.message);
  }
}

function pickArenaWord(config) {
  const levelMeta = getArenaLevelMeta(config?.arenaLevelKey);
  const bands = levelMeta.bands;
  const recentSet = new Set(config?.recentWordIds || []);

  // Chọn ngẫu nhiên band từ cấu hình trước để chỉ phải nạp đúng 1 mảnh JSON vào RAM
  const candidateBand = bands[crypto.randomInt(0, bands.length)];
  const words = loadBandWords(candidateBand);
  let pool = words.filter((w) => !recentSet.has(w.id));
  if (pool.length === 0) {
    const lastId = config?.recentWordIds?.length ? config.recentWordIds[config.recentWordIds.length - 1] : null;
    pool = lastId ? words.filter((w) => w.id !== lastId) : words;
  }
  if (pool.length === 0) {
    pool = words;
  }

  const word = pool[crypto.randomInt(0, pool.length)];
  const quizType =
    config?.arenaMode === 'mixed' && crypto.randomInt(0, 10) < 3
      ? 'cloze'
      : 'vi';

  const question = buildQuestionFromWord(word, quizType, words);
  return { word, question, levelLabel: levelMeta.label };
}

function scheduleNextArenaRound(client, guildId, delayMs = HSK_DEFAULTS.NEXT_ROUND_DELAY_MS) {
  const key = String(guildId);
  clearHskArenaTimers(key);
  const nightStatus = isHskNightLock(getHskNow(client));
  if (nightStatus.locked) {
    evictUnusedBandCaches();
    return false;
  }

  const nextRoundTimeout = setTimeout(async () => {
    try {
      clearHskArenaTimers(key);
      const currentConfig = await getHskGuildConfig(client, key);
      if (currentConfig.enabled && currentConfig.autoStart && !currentConfig.idlePaused && currentConfig.channelId) {
        const result = await startHskArenaRound(client, key, { isAutoContinuation: true });
        if (result?.reason === 'NIGHT_LOCK') {
          const channel = await resolveGuildChannel(client, currentConfig.channelId);
          if (channel && typeof channel.send === 'function') {
            await channel.send(
              buildHskNightLockPayloadV2({
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
      evictUnusedBandCaches();
    } catch (error) {
      logger.error(`[HSK] Lỗi tự động mở ván Đấu trường ở guild ${key}:`, error);
    }
  }, delayMs);

  activeArenaTimers.set(key, {
    endTimeout: null,
    nextRoundTimeout,
  });
  return true;
}

export async function startHskArenaRound(client, guildId, options = {}) {
  const key = String(guildId);
  const { scheduleTimers = true } = options;

  return withHskGuildLock(key, async () => {
    const config = await getHskGuildConfig(client, key);
    if (!config.channelId) {
      return { success: false, reason: 'NO_CHANNEL', config };
    }
    if (!config.enabled && !options.forceEnable) {
      return { success: false, reason: 'DISABLED', config };
    }

    const now = getHskNow(client, options.now);
    const nightStatus = isHskNightLock(now);
    if (nightStatus.locked) {
      const staleRound = activeArenaRounds.get(key);
      if (staleRound && !staleRound.ended) {
        staleRound.ended = true;
        await disableArenaRoundAnswers(staleRound);
        activeArenaRounds.delete(key);
      }
      clearHskArenaTimers(key);
      guildLastActivityAt.delete(key);

      let savedNightConfig = config;
      if (config.enabled && !config.idlePaused) {
        config.idlePaused = true;
        savedNightConfig = await saveHskGuildConfig(client, key, config);
      }
      evictUnusedBandCaches();
      return { success: false, reason: 'NIGHT_LOCK', nightStatus, config: savedNightConfig };
    }

    if (options.forceEnable && !config.enabled) {
      config.enabled = true;
    }

    const channel = await resolveGuildChannel(client, config.channelId);
    if (!channel || typeof channel.send !== 'function') {
      return { success: false, reason: 'CHANNEL_NOT_FOUND', config };
    }

    const existing = activeArenaRounds.get(key);
    if (existing && !existing.ended) {
      existing.ended = true;
      await disableArenaRoundAnswers(existing);
    }
    clearHskArenaTimers(key);

    const { word, question, levelLabel } = pickArenaWord(config);
    const roundId = crypto.randomBytes(4).toString('hex');
    const roundNumber = (config.roundCounter || 0) + 1;
    const topStreakEntry = getCurrentStreakLeader(config);

    if (!options.isAutoContinuation) {
      markHskArenaActivity(key, now);
    } else if (!guildLastActivityAt.has(key)) {
      markHskArenaActivity(key, now);
    }

    config.idlePaused = false;
    config.roundCounter = roundNumber;
    config.recentWordIds = [...(config.recentWordIds || []), word.id].slice(-HSK_DEFAULTS.RECENT_WORDS_LIMIT);
    const savedConfig = await saveHskGuildConfig(client, key, config);

    const round = {
      id: roundId,
      roundNumber,
      guildId: key,
      channelId: savedConfig.channelId,
      levelLabel,
      word,
      question,
      topStreakEntry,
      durationSeconds: savedConfig.durationSeconds,
      autoStart: savedConfig.autoStart,
      startedAt: now,
      attemptedUsers: new Set(),
      ended: false,
      solved: false,
      message: null,
    };

    const payload = buildArenaRoundPayloadV2({
      roundNumber,
      levelLabel,
      durationSeconds: round.durationSeconds,
      word,
      question,
      roundId,
      topStreakEntry,
      controlsDisabled: false,
    });

    const sentMessage = await channel.send(payload);
    round.message = sentMessage;
    activeArenaRounds.set(key, round);

    if (scheduleTimers) {
      const fullMs = round.durationSeconds * 1000;
      const endTimeout = setTimeout(() => {
        handleHskArenaTimeout(client, key, roundId).catch((err) =>
          logger.error(`[HSK] Lỗi hết giờ Đấu trường guild ${key}:`, err),
        );
      }, fullMs);

      activeArenaTimers.set(key, {
        endTimeout,
        nextRoundTimeout: null,
      });
    }

    evictUnusedBandCaches([word.band]);
    return { success: true, round, config: savedConfig };
  });
}

export async function handleHskArenaAnswer(interaction, client, roundId, choiceIndex, options = {}) {
  const guildId = String(interaction.guildId || '');
  const userId = String(interaction.user?.id || '');
  const round = activeArenaRounds.get(guildId);

  if (!round || round.ended || round.solved) {
    return interaction.reply(
      buildHskNoticePayloadV2({
        title: 'VÁN ĐẤU ĐÃ KẾT THÚC',
        message: `${HSK_EMOJIS.TIME} Ván này đã kết thúc rồi! Bấm **❯❯ Ván mới** ngay trên thẻ đấu trường để chơi ván kế nha~`,
        ephemeral: true,
      }),
    );
  }

  if (roundId && round.id !== roundId) {
    return interaction.reply(
      buildHskNoticePayloadV2({
        title: 'THẺ CŨ ĐÃ QUA VÁN',
        message: `${HSK_EMOJIS.TIME} Ván này đã chuyển sang từ vựng mới rồi nha!`,
        ephemeral: true,
      }),
    );
  }

  const now = getHskNow(client, options.now);
  markHskArenaActivity(guildId, now);

  if (round.attemptedUsers.has(userId)) {
    return interaction.reply(
      buildHskNoticePayloadV2({
        title: 'ĐÃ DÙNG LƯỢT TRONG VÁN NÀY',
        message: `${HSK_EMOJIS.NOTEBOOK} Bạn đã thử trả lời ở **Ván #${round.roundNumber}** rồi (từ ${formatWordBoldPair(round.word.hanzi, round.word.pinyin)} đã được lưu vào Sổ tay). Đợi ván tiếp theo để gỡ lại nha~`,
        ephemeral: true,
      }),
    );
  }

  const isCorrect = choiceIndex === round.question.correctIndex;
  if (!isCorrect) {
    round.attemptedUsers.add(userId);
    const chosenLabel = round.question.options?.[choiceIndex] || '?';

    // Lưu từ sai vào Sổ tay cá nhân; tách biệt hoàn toàn streak Đấu trường vs Ôn luyện cá nhân
    await withHskUserLock(guildId, userId, async () => {
      const progress = await getHskUserProgress(client, guildId, userId);
      const updated = recordWordMistake(progress, round.word, now);
      await saveHskUserProgress(client, guildId, userId, updated);
    });

    await withHskGuildLock(guildId, async () => {
      const config = await getHskGuildConfig(client, guildId);
      if (config.stats?.[userId]) {
        config.stats[userId] = {
          ...normalizeArenaStat(userId, config.stats[userId]),
          currentStreak: 0,
        };
        await saveHskGuildConfig(client, guildId, config);
      }
    });

    return interaction.reply(
      buildHskNoticePayloadV2({
        title: 'CHƯA CHÍNH XÁC RỒI!',
        message: [
          `${HSK_EMOJIS.ADMIN_DISABLE} Đáp án bạn chọn (**${chosenLabel}**) chưa khớp với **${round.word.hanzi}**.`,
          `${HSK_EMOJIS.HINT} Gợi ý Pinyin: **${round.word.pinyin}** (${formatHsk2Note(round.word)})`,
          `${HSK_EMOJIS.NOTEBOOK} Từ này đã tự động lưu vào **Sổ tay từ cần ôn** của bạn để luyện riêng sau nhé!`,
        ].join('\n'),
        ephemeral: true,
        buttons: [
          {
            type: 2,
            style: 2,
            label: 'Mở Ôn luyện riêng',
            emoji: HSK_BUTTON_EMOJIS.NOTEBOOK,
            custom_id: 'hsk_arena_personal',
          },
        ],
      }),
    );
  }

  // Khóa đồng bộ ngay trước khi await để chống 2 người bấm cùng lúc
  round.solved = true;
  round.ended = true;
  clearHskArenaTimers(guildId);

  const reactionMs = Math.max(100, now - round.startedAt);
  const reactionSeconds = (reactionMs / 1000).toFixed(1);
  const { scheduleNext = true } = options;

  let updatedWinnerStat = null;
  let savedConfig = null;
  let shouldNightLock = false;
  let nightStatus = null;

  await withHskGuildLock(guildId, async () => {
    const config = await getHskGuildConfig(client, guildId);
    const stats = { ...(config.stats || {}) };
    const prev = normalizeArenaStat(userId, stats[userId]);

    const nextStreak = prev.currentStreak + 1;
    updatedWinnerStat = {
      userId,
      currentStreak: nextStreak,
      bestStreak: Math.max(prev.bestStreak, nextStreak),
      totalWins: prev.totalWins + 1,
      bestTimeMs: prev.bestTimeMs == null ? reactionMs : Math.min(prev.bestTimeMs, reactionMs),
      lastWinAt: new Date(now).toISOString(),
    };

    stats[userId] = updatedWinnerStat;
    config.stats = stats;

    nightStatus = isHskNightLock(now);
    shouldNightLock = Boolean(config.enabled) && nightStatus.locked;
    if (shouldNightLock) {
      config.idlePaused = true;
    }

    savedConfig = await saveHskGuildConfig(client, guildId, config);
  });

  // Đánh dấu từ đã thuộc cho người thắng; KHÔNG cộng vào personalStreak để tách biệt hoàn toàn với chuỗi tự ôn
  await withHskUserLock(guildId, userId, async () => {
    const progress = await getHskUserProgress(client, guildId, userId);
    const nextProgress = markWordMasteredInProgress(progress, round.word.id, { intervalDays: 4, nowMs: now });
    await saveHskUserProgress(client, guildId, userId, nextProgress);
  });

  // Khóa nút A/B/C/D & Mở gợi ý trên thẻ ván đấu (giữ Ôn luyện riêng, BXH, Ván mới vẫn bấm được)
  const disabledRoundPayload = buildArenaRoundPayloadV2({
    roundNumber: round.roundNumber,
    levelLabel: round.levelLabel,
    durationSeconds: round.durationSeconds,
    word: round.word,
    question: round.question,
    roundId: round.id,
    topStreakEntry: updatedWinnerStat,
    controlsDisabled: true,
  });

  if (typeof interaction.update === 'function') {
    await interaction.update(disabledRoundPayload).catch(async () => {
      await disableArenaRoundAnswers(round);
    });
  } else {
    await disableArenaRoundAnswers(round);
  }

  const winPayload = buildArenaWinPayloadV2({
    roundNumber: round.roundNumber,
    winnerId: userId,
    word: round.word,
    reactionSeconds,
    winnerStats: updatedWinnerStat,
    nextRoundDelaySeconds: Math.round(HSK_DEFAULTS.NEXT_ROUND_DELAY_MS / 1000),
    autoStart: Boolean(savedConfig?.enabled && savedConfig?.autoStart && !shouldNightLock),
    pausedNight: shouldNightLock,
  });

  const channel = interaction.channel || (await resolveGuildChannel(client, round.channelId));
  if (channel && typeof channel.send === 'function') {
    await channel.send(winPayload);
    if (shouldNightLock && nightStatus) {
      await channel.send(
        buildHskNightLockPayloadV2({
          currentTimeText: nightStatus.currentTimeText,
          startHour: nightStatus.startHour,
          endHour: nightStatus.endHour,
          includeResumeButton: true,
          ephemeral: false,
        }),
      );
    }
  }

  if (activeArenaRounds.get(guildId) === round) {
    activeArenaRounds.delete(guildId);
  }

  if (shouldNightLock) {
    guildLastActivityAt.delete(guildId);
    evictUnusedBandCaches();
  } else if (scheduleNext && savedConfig?.enabled && savedConfig?.autoStart) {
    scheduleNextArenaRound(client, guildId);
  }

  return true;
}

export async function handleHskArenaHint(interaction, client, roundId, options = {}) {
  const guildId = String(interaction.guildId || '');
  const round = activeArenaRounds.get(guildId);

  if (!round || round.ended || round.solved) {
    return interaction.reply(
      buildHskNoticePayloadV2({
        title: 'VÁN ĐẤU ĐÃ KẾT THÚC',
        message: `${HSK_EMOJIS.TIME} Ván đấu này đã kết thúc rồi! Bấm **❯❯ Ván mới** để mở lượt mới nha~`,
        ephemeral: true,
      }),
    );
  }

  if (roundId && round.id !== roundId) {
    return interaction.reply(
      buildHskNoticePayloadV2({
        title: 'THẺ CŨ ĐÃ QUA VÁN',
        message: `${HSK_EMOJIS.TIME} Thẻ này đã qua ván khác rồi nha!`,
        ephemeral: true,
      }),
    );
  }

  const now = getHskNow(client, options.now);
  markHskArenaActivity(guildId, now);

  const w = round.word;
  const bandMeta = getBandMeta(w.band);
  const tradInfo = w.traditional && w.traditional !== w.hanzi ? ` • Phồn thể: **${w.traditional}**` : '';

  const hintMessage =
    round.question.quizType === 'cloze'
      ? [
          `${HSK_EMOJIS.HINT} **Nghĩa từ cần điền:** **${w.meaning}** (${w.posVi} · ${bandMeta.name})`,
          `${HSK_EMOJIS.LEVEL} **Pinyin gợi ý:** **${w.pinyin}** (${formatHsk2Note(w)})`,
        ].join('\n')
      : [
          `${HSK_EMOJIS.HINT} **Chữ Hán & Pinyin:** ${formatWordBoldPair(w.hanzi, w.pinyin)}${tradInfo}`,
          `${HSK_EMOJIS.LEVEL} **Từ loại:** ${w.posVi} (${w.pos}) • **${bandMeta.name}** (${formatHsk2Note(w)})`,
          `> **Câu ví dụ:** ${w.exZh}`,
          `> **Phiên âm câu:** **${w.exPy}**`,
        ].join('\n');

  return interaction.reply(
    buildHskNoticePayloadV2({
      title: `GỢI Ý RIÊNG — VÁN #${round.roundNumber}`,
      message: hintMessage,
      footer: 'Chỉ mình bạn thấy gợi ý này — chọn đáp án A/B/C/D ở thẻ Đấu trường nhé!',
      ephemeral: true,
    }),
  );
}

export async function handleHskArenaTimeout(client, guildId, roundId = null, options = {}) {
  const key = String(guildId);
  const round = activeArenaRounds.get(key);
  if (!round || round.ended || round.solved) {
    return null;
  }
  if (roundId && round.id !== roundId) {
    return null;
  }

  round.ended = true;
  clearHskArenaTimers(key);

  const { scheduleNext = true } = options;
  const now = getHskNow(client, options.now);
  const lastActivity = guildLastActivityAt.get(key) ?? round.startedAt;
  const idleElapsedMs = Math.max(0, now - lastActivity);
  const toleranceMs = HSK_DEFAULTS.IDLE_TIMER_TOLERANCE_MS ?? 1000;

  return withHskGuildLock(key, async () => {
    const config = await getHskGuildConfig(client, key);
    const stats = { ...(config.stats || {}) };
    for (const uid of Object.keys(stats)) {
      stats[uid] = {
        ...normalizeArenaStat(uid, stats[uid]),
        currentStreak: 0,
      };
    }

    const nightStatus = isHskNightLock(now);
    const shouldNightLock = Boolean(config.enabled) && nightStatus.locked;
    const shouldIdlePause =
      !shouldNightLock &&
      Boolean(config.enabled) &&
      Boolean(config.autoStart) &&
      idleElapsedMs + toleranceMs >= HSK_DEFAULTS.IDLE_TIMEOUT_MS;

    config.stats = stats;
    config.idlePaused = shouldNightLock || shouldIdlePause;
    const savedConfig = await saveHskGuildConfig(client, key, config);

    await disableArenaRoundAnswers(round);

    const timeoutPayload = buildArenaTimeoutPayloadV2({
      roundNumber: round.roundNumber,
      word: round.word,
      durationSeconds: round.durationSeconds,
      nextRoundDelaySeconds: Math.round(HSK_DEFAULTS.NEXT_ROUND_DELAY_MS / 1000),
      autoStart: savedConfig.enabled && savedConfig.autoStart && !shouldIdlePause && !shouldNightLock,
      pausedIdle: shouldIdlePause,
      pausedNight: shouldNightLock,
    });

    const channel = await resolveGuildChannel(client, round.channelId);
    if (channel && typeof channel.send === 'function') {
      await channel.send(timeoutPayload);
      if (shouldNightLock) {
        await channel.send(
          buildHskNightLockPayloadV2({
            currentTimeText: nightStatus.currentTimeText,
            startHour: nightStatus.startHour,
            endHour: nightStatus.endHour,
            includeResumeButton: true,
            ephemeral: false,
          }),
        );
      } else if (shouldIdlePause) {
        await channel.send(
          buildHskIdlePausedPayloadV2({
            idleMinutes: Math.max(1, Math.round(HSK_DEFAULTS.IDLE_TIMEOUT_MS / 60000)),
          }),
        );
      }
    }

    if (activeArenaRounds.get(key) === round) {
      activeArenaRounds.delete(key);
    }

    if (shouldNightLock || shouldIdlePause) {
      guildLastActivityAt.delete(key);
      evictUnusedBandCaches();
    } else if (scheduleNext && savedConfig.enabled && savedConfig.autoStart) {
      scheduleNextArenaRound(client, key);
    }

    return {
      round,
      config: savedConfig,
      timeoutPayload,
      pausedIdle: shouldIdlePause,
      pausedNight: shouldNightLock,
    };
  });
}

export async function disableHskArenaGuild(client, guildId) {
  const key = String(guildId);
  clearHskArenaTimers(key);
  guildLastActivityAt.delete(key);

  const existing = activeArenaRounds.get(key);
  if (existing) {
    existing.ended = true;
    await disableArenaRoundAnswers(existing);
    activeArenaRounds.delete(key);
  }
  evictUnusedBandCaches();

  return withHskGuildLock(key, async () => {
    const config = await getHskGuildConfig(client, key);
    config.enabled = false;
    config.idlePaused = false;
    return saveHskGuildConfig(client, key, config);
  });
}

export async function resetHskGuildLeaderboard(client, guildId) {
  const key = String(guildId);
  return withHskGuildLock(key, async () => {
    const config = await getHskGuildConfig(client, key);
    config.stats = {};
    return saveHskGuildConfig(client, key, config);
  });
}

export async function initHskAutoResume(client) {
  try {
    const nightStatus = isHskNightLock(getHskNow(client));
    if (nightStatus.locked) {
      evictUnusedBandCaches();
      logger.info(
        `[HSK] Đang trong khung giờ khóa ban đêm (${nightStatus.currentTimeText} VN, 00:00-08:00), bỏ qua tự động khôi phục Đấu trường.`,
      );
      return 0;
    }

    const registryList = await getDatabaseValue(client, getHskRegistryKey(), []);
    if (!Array.isArray(registryList) || registryList.length === 0) {
      return 0;
    }

    let resumed = 0;
    for (const guildId of registryList) {
      try {
        const config = await getHskGuildConfig(client, guildId);
        if (!config.enabled || !config.autoStart || config.idlePaused || !config.channelId) {
          continue;
        }
        const channel = await resolveGuildChannel(client, config.channelId);
        if (!channel) {
          continue;
        }
        const result = await startHskArenaRound(client, guildId);
        if (result?.success) {
          resumed += 1;
        }
      } catch (guildErr) {
        logger.warn(`[HSK] Không thể khôi phục Đấu trường cho guild ${guildId}:`, guildErr);
      }
    }

    if (resumed > 0) {
      logger.info(`[HSK] Đã tự động khôi phục ${resumed} kênh Đấu trường HSK 3.0.`);
    }
    return resumed;
  } catch (error) {
    logger.error('[HSK] Lỗi initHskAutoResume:', error);
    return 0;
  }
}

export async function publishStudyRoomLobbyCard(client, channelOrId, tier = 'elementary') {
  const channel =
    channelOrId && typeof channelOrId === 'object' && typeof channelOrId.send === 'function'
      ? channelOrId
      : await resolveGuildChannel(client, channelOrId);

  if (!channel || typeof channel.send !== 'function') {
    return { success: false, reason: 'CHANNEL_NOT_FOUND' };
  }
  if (!hasBotSendPermission(channel)) {
    return { success: false, reason: 'NO_PERMISSION' };
  }

  const normalizedTier = normalizeStudyTier(tier) === 'advanced' ? 'advanced' : 'elementary';
  const payload = buildStudyRoomLobbyPayloadV2(normalizedTier);
  const sentMessage = await channel.send(payload);
  return { success: true, message: sentMessage, channel, tier: normalizedTier };
}

export function hasBotSendPermission(channel) {
  const botMember = channel?.guild?.members?.me;
  if (!botMember || typeof channel?.permissionsFor !== 'function') {
    return true;
  }
  const perms = channel.permissionsFor(botMember);
  return Boolean(
    perms?.has?.(PermissionFlagsBits.ViewChannel) &&
      perms?.has?.(PermissionFlagsBits.SendMessages),
  );
}
