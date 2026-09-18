import { Mutex } from '../utils/mutex.js';

import {
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  getPetEffectValue,
} from './cultivationPet.js';

import {
  amplifySafePetEffect,
  getSafeCavePetBonus,
} from './cultivationCavePetBonus.js';

import {
  getFormationResonance,
  getFormationState,
} from './cultivationFormation.js';

import {
  recordWorldBossAchievementStats,
} from './cultivationAchievement.js';

import {
  addImmortalOrderProgress,
} from './cultivationImmortalOrder.js';

import { getHeavenlyModifier } from './cultivationHeavenlySecret.js';

const WORLD_BOSS_PREFIX = 'games:cultivation:worldBoss:';
const WORLD_BOSS_REWARD_PREFIX = 'games:cultivation:worldBossReward:';
const THREAD_PREFIX = 'games:cultivation:thread:';
const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const WORLD_BOSS_ATTACK_LIMIT = 2;
export const WORLD_BOSS_HP_RATIO = 0.90;
const WORLD_BOSS_MAX_HP_RATIO = 1.25;
const WORLD_BOSS_DISPARITY_WEIGHT = 0.35;
const WORLD_BOSS_STRONGEST_HIT_FLOOR = 8;

const ONE_DAY_RESET_DATE = '2026-09-14';
const ONE_DAY_RESET_SUFFIX = 'r3';

export const WORLD_BOSS_REWARDS = {
  1: 2_500_000,
  2: 1_500_000,
  3: 1_000_000,
  other: 750_000,
};

const BOSS_POOL = [
  'Cửu U Thôn Thiên Ma Long',
  'Xích Huyết Thiên Yêu',
  'Huyền Minh Cổ Ma',
  'Thái Cổ Nghiệt Long',
  'Vạn Cốt Yêu Hoàng',
];

function dateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

function getRawWorldBossDateKey(date = new Date()) {
  const p = dateParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function getWorldBossDateKey(date = new Date()) {
  const raw = getRawWorldBossDateKey(date);
  return raw === ONE_DAY_RESET_DATE
    ? `${raw}-${ONE_DAY_RESET_SUFFIX}`
    : raw;
}

function getDayBounds(date = new Date()) {
  const p = dateParts(date);
  const start = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    -7,
    0,
    0,
    0,
  );
  return {
    startsAt: start,
    endsAt: start + 24 * 60 * 60 * 1000,
  };
}

function bossKey(guildId, eventId) {
  return `${WORLD_BOSS_PREFIX}${guildId}:${eventId}`;
}

function rewardKey(guildId, eventId, userId) {
  return `${WORLD_BOSS_REWARD_PREFIX}${guildId}:${eventId}:${userId}`;
}

function threadKey(guildId, userId) {
  return `${THREAD_PREFIX}${guildId}:${userId}`;
}

function number(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function rewardForRank(rank) {
  return WORLD_BOSS_REWARDS[rank] || WORLD_BOSS_REWARDS.other;
}

export function getWorldBossAttackLimit(state, userId) {
  const bonus = number(state?.bonusAttacks?.[userId]);
  return WORLD_BOSS_ATTACK_LIMIT + bonus;
}

function chooseBossName(eventId) {
  let hash = 0;
  for (const char of String(eventId)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return BOSS_POOL[hash % BOSS_POOL.length];
}

async function listEligibleUserIds(client, guildId) {
  if (!client.db?.list) return [];
  const prefix = `${THREAD_PREFIX}${guildId}:`;
  const keys = await client.db.list(prefix);
  return [...new Set(
    (keys || [])
      .map(key => String(key).slice(prefix.length))
      .filter(id => /^\d{15,25}$/.test(id)),
  )];
}

async function estimatePlayerDamage(client, guildId, userId) {
  const profile = await getCultivationProfile(
    client,
    guildId,
    userId,
    { create: false },
  );

  if (!profile) return null;

  const formation = await getFormationState(client, guildId, userId);
  const resonance = getFormationResonance(formation);

  const base = Math.max(
    1_000,
    number(profile.totalCultivation),
    number(profile.cultivation),
  );

  const rootBonus = Math.max(0, Number(profile.spiritRoot?.cultivateBonus) || 0);
  const equipmentBonus = profile.equipment?.equipped === 'thanh_phong_kiem' ? 0.05 : 0;
  const techniqueBonus = profile.techniques?.active === 'thanh_van_kiem_quyet' ? 0.08 : 0;
  const basePetBonus = Math.max(0, getPetEffectValue(profile, 'cultivation_bonus'));
  const cavePetBonus = await getSafeCavePetBonus(client, guildId, userId);
  const petBonus = amplifySafePetEffect(basePetBonus, cavePetBonus);
  const formationBonus = Math.max(0, Number(resonance?.effects?.cultivationBonus) || 0);
  const bonusPercent =
    rootBonus + equipmentBonus + techniqueBonus + petBonus + formationBonus;

  return {
    userId,
    base,
    bonusPercent,
    estimatedDamage: Math.max(1, Math.round(base * (1 + bonusPercent))),
  };
}

export async function calculateWorldBossCapacity(client, guildId) {
  const userIds = await listEligibleUserIds(client, guildId);
  const players = [];

  for (const userId of userIds) {
    const estimate = await estimatePlayerDamage(client, guildId, userId);
    if (estimate) players.push(estimate);
  }

  const totalTwoHitPotential = players.reduce(
    (sum, player) => sum + player.estimatedDamage * WORLD_BOSS_ATTACK_LIMIT,
    0,
  );

  const strongestEstimatedHit = players.reduce(
    (max, player) => Math.max(max, player.estimatedDamage),
    0,
  );

  const strongestTwoHitPotential = strongestEstimatedHit * WORLD_BOSS_ATTACK_LIMIT;

  const concentration = totalTwoHitPotential > 0
    ? strongestTwoHitPotential / totalTwoHitPotential
    : 0;

  const effectiveHpRatio = Math.min(
    WORLD_BOSS_MAX_HP_RATIO,
    WORLD_BOSS_HP_RATIO + concentration * WORLD_BOSS_DISPARITY_WEIGHT,
  );

  const serverScaledHp = Math.round(
    totalTwoHitPotential * effectiveHpRatio,
  );

  const strongestPlayerFloorHp = Math.round(
    strongestEstimatedHit * WORLD_BOSS_STRONGEST_HIT_FLOOR,
  );

  const heavenlyHpBonus = getHeavenlyModifier(guildId, 'boss_hp');
  const maxHp = Math.max(
    1_000_000,
    Math.round(Math.max(serverScaledHp, strongestPlayerFloorHp) * (1 + heavenlyHpBonus)),
  );

  return {
    players,
    totalTwoHitPotential,
    strongestEstimatedHit,
    strongestTwoHitPotential,
    strongestPlayerFloorHp,
    concentration,
    effectiveHpRatio,
    maxHp,
  };
}

export async function ensureWorldBoss(client, guildId, now = new Date()) {
  const eventId = getWorldBossDateKey(now);
  const key = bossKey(guildId, eventId);
  const existing = await client.db.get(key, null);

  if (existing && typeof existing === 'object') {
    existing.bonusAttacks ||= {};
    return existing;
  }

  const lockKey = `world-boss-create:${guildId}:${eventId}`;
  return Mutex.runExclusive(lockKey, async () => {
    const recheck = await client.db.get(key, null);
    if (recheck && typeof recheck === 'object') {
      recheck.bonusAttacks ||= {};
      return recheck;
    }

    const capacity = await calculateWorldBossCapacity(client, guildId);
    const bounds = getDayBounds(now);
    const state = {
      version: 4,
      guildId,
      eventId,
      bossId: `boss_${eventId}`,
      bossName: chooseBossName(eventId),
      maxHp: capacity.maxHp,
      currentHp: capacity.maxHp,
      startsAt: bounds.startsAt,
      endsAt: bounds.endsAt,
      status: 'active',
      endReason: null,
      participants: {},
      bonusAttacks: {},
      eligiblePlayerCount: capacity.players.length,
      totalTwoHitPotential: capacity.totalTwoHitPotential,
      strongestEstimatedHit: capacity.strongestEstimatedHit,
      strongestTwoHitPotential: capacity.strongestTwoHitPotential,
      strongestPlayerFloorHp: capacity.strongestPlayerFloorHp,
      powerConcentration: capacity.concentration,
      hpRatio: capacity.effectiveHpRatio,
      rewardsFinalized: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await client.db.set(key, state);
    return state;
  });
}

export async function getWorldBossState(client, guildId, now = new Date()) {
  const state = await ensureWorldBoss(client, guildId, now);
  if (state.status === 'active' && Date.now() >= Number(state.endsAt || 0)) {
    return finalizeWorldBoss(client, guildId, state.eventId, 'escaped');
  }
  return state;
}

export async function adjustWorldBossBonusAttacks(client, guildId, userId, delta) {
  const eventId = getWorldBossDateKey();
  const lockKey = `world-boss:${guildId}:${eventId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const state = await getWorldBossState(client, guildId);
    state.bonusAttacks ||= {};

    const before = number(state.bonusAttacks[userId]);
    const requested = Math.trunc(Number(delta) || 0);
    const after = Math.max(0, Math.min(1_000_000_000, before + requested));

    if (after > 0) state.bonusAttacks[userId] = after;
    else delete state.bonusAttacks[userId];

    state.updatedAt = Date.now();
    await client.db.set(bossKey(guildId, eventId), state);

    return {
      state,
      before,
      after,
      changed: after - before,
      attackLimit: getWorldBossAttackLimit(state, userId),
      attacksUsed: number(state.participants?.[userId]?.attacks),
      attacksRemaining: Math.max(
        0,
        getWorldBossAttackLimit(state, userId) - number(state.participants?.[userId]?.attacks),
      ),
    };
  });
}

export function getWorldBossLeaderboard(state) {
  return Object.entries(state?.participants || {})
    .map(([userId, data]) => ({
      userId,
      damage: number(data?.damage),
      attacks: number(data?.attacks),
      bestHit: number(data?.bestHit),
    }))
    .filter(entry => entry.damage > 0)
    .sort((a, b) => b.damage - a.damage || a.userId.localeCompare(b.userId));
}

export function getWorldBossTotalDamage(state) {
  return getWorldBossLeaderboard(state)
    .reduce((sum, entry) => sum + entry.damage, 0);
}

export async function attackWorldBoss(client, guildId, userId) {
  const eventId = getWorldBossDateKey();
  const lockKey = `world-boss:${guildId}:${eventId}`;

  return Mutex.runExclusive(lockKey, async () => {
    let state = await getWorldBossState(client, guildId);

    if (state.status !== 'active' || state.currentHp <= 0) {
      return { ok: false, reason: 'ended', state };
    }

    const contribution = state.participants?.[userId] || {
      damage: 0,
      attacks: 0,
      bestHit: 0,
    };

    const attackLimit = getWorldBossAttackLimit(state, userId);
    if (number(contribution.attacks) >= attackLimit) {
      return { ok: false, reason: 'limit', state, contribution, attackLimit };
    }

    const estimate = await estimatePlayerDamage(client, guildId, userId);
    if (!estimate) {
      return { ok: false, reason: 'no_profile', state };
    }

    const variance = 0.90 + Math.random() * 0.20;
    const heavenlyBossDamage = getHeavenlyModifier(guildId, 'boss_damage');
    const rawDamage = Math.max(1, Math.round(estimate.estimatedDamage * variance * Math.max(0.10, 1 - heavenlyBossDamage)));
    const damage = Math.min(number(state.currentHp), rawDamage);

    contribution.damage = number(contribution.damage) + damage;
    contribution.attacks = number(contribution.attacks) + 1;
    contribution.bestHit = Math.max(number(contribution.bestHit), damage);

    state.participants = {
      ...(state.participants || {}),
      [userId]: contribution,
    };
    state.currentHp = Math.max(0, number(state.currentHp) - damage);
    state.updatedAt = Date.now();

    await client.db.set(bossKey(guildId, eventId), state);

    await recordWorldBossAchievementStats(
      client,
      guildId,
      userId,
      {
        attacks: 1,
        bestHit: damage,
      },
    );

    await addImmortalOrderProgress(client, guildId, userId, 'bossAttacks', 1);
    await addImmortalOrderProgress(client, guildId, userId, 'bossDamage', damage);

    let defeated = false;
    if (state.currentHp <= 0) {
      state = await finalizeWorldBoss(client, guildId, eventId, 'defeated');
      defeated = true;
    }

    return {
      ok: true,
      state,
      damage,
      estimatedDamage: estimate.estimatedDamage,
      contribution: state.participants?.[userId] || contribution,
      attackLimit,
      defeated,
    };
  });
}

export async function finalizeWorldBoss(client, guildId, eventId, reason = 'escaped') {
  const lockKey = `world-boss-finalize:${guildId}:${eventId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const key = bossKey(guildId, eventId);
    const state = await client.db.get(key, null);
    if (!state) return null;

    if (state.rewardsFinalized) return state;

    const leaderboard = getWorldBossLeaderboard(state);
    const totalDamage = leaderboard.reduce((sum, entry) => sum + entry.damage, 0);
    const defeated = reason === 'defeated' || number(state.currentHp) <= 0;

    state.status = 'ended';
    state.endReason = defeated ? 'defeated' : 'escaped';
    state.endedAt = Date.now();
    state.totalDamage = totalDamage;
    state.rewardsFinalized = true;
    state.updatedAt = Date.now();

    for (let index = 0; index < leaderboard.length; index += 1) {
      const entry = leaderboard[index];
      const rank = index + 1;
      const heavenlyBossReward = getHeavenlyModifier(guildId, 'boss_reward');
      const reward = Math.max(0, Math.round(rewardForRank(rank) * (1 + heavenlyBossReward)));
      const contributionRate = totalDamage > 0
        ? entry.damage / totalDamage
        : 0;

      const record = {
        version: 2,
        guildId,
        eventId,
        userId: entry.userId,
        bossName: state.bossName,
        endReason: state.endReason,
        damage: entry.damage,
        attacks: entry.attacks,
        attackLimit: getWorldBossAttackLimit(state, entry.userId),
        rank,
        contributionRate,
        reward,
        claimed: false,
        messageId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await client.db.set(
        rewardKey(guildId, eventId, entry.userId),
        record,
      );

      await recordWorldBossAchievementStats(
        client,
        guildId,
        entry.userId,
        {
          kills: defeated ? 1 : 0,
          top1: rank === 1 ? 1 : 0,
        },
      );
    }

    await client.db.set(key, state);
    return state;
  });
}

export async function getWorldBossReward(client, guildId, eventId, userId) {
  return client.db.get(rewardKey(guildId, eventId, userId), null);
}

export async function saveWorldBossReward(client, record) {
  const saved = { ...record, updatedAt: Date.now() };
  await client.db.set(
    rewardKey(saved.guildId, saved.eventId, saved.userId),
    saved,
  );
  return saved;
}

export async function claimWorldBossReward(client, guildId, eventId, userId) {
  const lockKey = `world-boss-reward:${guildId}:${eventId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const record = await getWorldBossReward(client, guildId, eventId, userId);
    if (!record) return { ok: false, reason: 'not_found' };
    if (record.claimed) return { ok: false, reason: 'already_claimed', record };

    record.claimed = true;
    record.claimedAt = Date.now();
    await saveWorldBossReward(client, record);

    try {
      const profile = await getCultivationProfile(client, guildId, userId);
      profile.spiritStones = number(profile.spiritStones) + number(record.reward);
      const savedProfile = await saveCultivationProfile(client, profile);
      return { ok: true, record, profile: savedProfile };
    } catch (error) {
      record.claimed = false;
      record.claimedAt = null;
      await saveWorldBossReward(client, record);
      throw error;
    }
  });
}

export async function listPendingWorldBossRewards(client, guildId) {
  if (!client.db?.list) return [];
  const prefix = `${WORLD_BOSS_REWARD_PREFIX}${guildId}:`;
  const keys = await client.db.list(prefix);
  const records = [];

  for (const key of keys || []) {
    const record = await client.db.get(key, null);
    if (record && !record.claimed) records.push(record);
  }

  return records;
}

export async function getCultivationThreadData(client, guildId, userId) {
  return client.db.get(threadKey(guildId, userId), null);
}
