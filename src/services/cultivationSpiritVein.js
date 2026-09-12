import {
  CULTIVATION_REALMS,
} from '../config/cultivationGame.js';

import {
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  Mutex,
} from '../utils/mutex.js';

const SPIRIT_VEIN_PREFIX = 'games:cultivation:spiritVein:';
const HOUR_MS = 60 * 60 * 1000;
const MAX_LEVEL = 10;

export const SPIRIT_VEIN_LEVELS = {
  1: { level: 1, productionPerHour: 300, capacity: 3_600, upgradeCost: 0, requiredRealmIndex: 0 },
  2: { level: 2, productionPerHour: 500, capacity: 6_000, upgradeCost: 15_000, requiredRealmIndex: 1 },
  3: { level: 3, productionPerHour: 800, capacity: 9_600, upgradeCost: 40_000, requiredRealmIndex: 2 },
  4: { level: 4, productionPerHour: 1_200, capacity: 14_400, upgradeCost: 100_000, requiredRealmIndex: 3 },
  5: { level: 5, productionPerHour: 1_800, capacity: 21_600, upgradeCost: 250_000, requiredRealmIndex: 4 },
  6: { level: 6, productionPerHour: 2_600, capacity: 31_200, upgradeCost: 600_000, requiredRealmIndex: 5 },
  7: { level: 7, productionPerHour: 3_800, capacity: 45_600, upgradeCost: 1_500_000, requiredRealmIndex: 6 },
  8: { level: 8, productionPerHour: 5_500, capacity: 66_000, upgradeCost: 4_000_000, requiredRealmIndex: 7 },
  9: { level: 9, productionPerHour: 8_000, capacity: 96_000, upgradeCost: 10_000_000, requiredRealmIndex: 8 },
  10: { level: 10, productionPerHour: 12_000, capacity: 144_000, upgradeCost: 25_000_000, requiredRealmIndex: 9 },
};

function key(guildId, userId) {
  return `${SPIRIT_VEIN_PREFIX}${guildId}:${userId}`;
}

function safeInteger(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.floor(number));
}

function normalizeState(raw, now = Date.now()) {
  const level = Math.min(
    MAX_LEVEL,
    Math.max(1, safeInteger(raw?.level, 1)),
  );

  const config = SPIRIT_VEIN_LEVELS[level];

  return {
    level,
    stored: Math.min(config.capacity, safeInteger(raw?.stored, 0)),
    lastUpdatedAt: safeInteger(raw?.lastUpdatedAt, now) || now,
  };
}

function accrueState(rawState, now = Date.now()) {
  const state = normalizeState(rawState, now);
  const config = SPIRIT_VEIN_LEVELS[state.level];
  const elapsedMs = Math.max(0, now - state.lastUpdatedAt);
  const generated = Math.floor(
    (elapsedMs / HOUR_MS) * config.productionPerHour,
  );

  return {
    ...state,
    stored: Math.min(config.capacity, state.stored + generated),
    lastUpdatedAt: now,
  };
}

async function getOrCreateState(client, guildId, userId) {
  const storageKey = key(guildId, userId);
  const raw = await client.db.get(storageKey);

  if (raw && typeof raw === 'object') {
    return normalizeState(raw);
  }

  const state = normalizeState(null);
  await client.db.set(storageKey, state);
  return state;
}

async function saveState(client, guildId, userId, state) {
  const normalized = normalizeState(state);
  await client.db.set(key(guildId, userId), normalized);
  return normalized;
}

function buildSnapshot(profile, rawState, now = Date.now()) {
  const state = accrueState(rawState, now);
  const config = SPIRIT_VEIN_LEVELS[state.level];
  const next = SPIRIT_VEIN_LEVELS[state.level + 1] || null;
  const fillRatio = config.capacity > 0
    ? Math.min(1, state.stored / config.capacity)
    : 0;
  const remaining = Math.max(0, config.capacity - state.stored);
  const timeUntilFullMs = remaining <= 0
    ? 0
    : Math.ceil((remaining / config.productionPerHour) * HOUR_MS);

  return {
    profile,
    state,
    config,
    next,
    fillRatio,
    timeUntilFullMs,
    isFull: state.stored >= config.capacity,
    isMaxLevel: state.level >= MAX_LEVEL,
    canAffordUpgrade: Boolean(
      next && (Number(profile.spiritStones) || 0) >= next.upgradeCost,
    ),
    meetsRealmRequirement: Boolean(
      next && (Number(profile.realmIndex) || 0) >= next.requiredRealmIndex,
    ),
    requiredRealmName: next
      ? CULTIVATION_REALMS[next.requiredRealmIndex] || 'Chân Tiên'
      : null,
  };
}

export async function getSpiritVeinSnapshot(client, guildId, userId) {
  const [profile, state] = await Promise.all([
    getCultivationProfile(client, guildId, userId),
    getOrCreateState(client, guildId, userId),
  ]);

  return buildSnapshot(profile, state);
}

export async function collectSpiritVein(client, guildId, userId) {
  const lockKey = `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const [profile, rawState] = await Promise.all([
      getCultivationProfile(client, guildId, userId),
      getOrCreateState(client, guildId, userId),
    ]);

    const now = Date.now();
    const state = accrueState(rawState, now);
    const collected = Math.max(0, safeInteger(state.stored, 0));

    if (collected <= 0) {
      return {
        ok: false,
        reason: 'nothing_to_collect',
        ...buildSnapshot(profile, state, now),
        collected: 0,
      };
    }

    profile.spiritStones =
      Math.max(0, Number(profile.spiritStones) || 0) + collected;

    state.stored = 0;
    state.lastUpdatedAt = now;

    const [savedProfile, savedState] = await Promise.all([
      saveCultivationProfile(client, profile),
      saveState(client, guildId, userId, state),
    ]);

    return {
      ok: true,
      collected,
      ...buildSnapshot(savedProfile, savedState, now),
    };
  });
}

export async function upgradeSpiritVein(client, guildId, userId) {
  const lockKey = `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const [profile, rawState] = await Promise.all([
      getCultivationProfile(client, guildId, userId),
      getOrCreateState(client, guildId, userId),
    ]);

    const now = Date.now();
    const state = accrueState(rawState, now);
    const next = SPIRIT_VEIN_LEVELS[state.level + 1] || null;

    if (!next) {
      return {
        ok: false,
        reason: 'max_level',
        ...buildSnapshot(profile, state, now),
      };
    }

    if ((Number(profile.realmIndex) || 0) < next.requiredRealmIndex) {
      return {
        ok: false,
        reason: 'realm_too_low',
        ...buildSnapshot(profile, state, now),
      };
    }

    if ((Number(profile.spiritStones) || 0) < next.upgradeCost) {
      return {
        ok: false,
        reason: 'not_enough_stones',
        ...buildSnapshot(profile, state, now),
      };
    }

    profile.spiritStones = Math.max(
      0,
      (Number(profile.spiritStones) || 0) - next.upgradeCost,
    );

    state.level = next.level;
    state.lastUpdatedAt = now;

    const [savedProfile, savedState] = await Promise.all([
      saveCultivationProfile(client, profile),
      saveState(client, guildId, userId, state),
    ]);

    return {
      ok: true,
      upgradeCost: next.upgradeCost,
      ...buildSnapshot(savedProfile, savedState, now),
    };
  });
}
