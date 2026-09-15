import { Mutex } from '../utils/mutex.js';
import { getDatabaseValue, setDatabaseValue } from '../utils/database.js';
import { CULTIVATION_REALMS, CULTIVATION_STAGES } from '../config/cultivationGame.js';
import {
  addInventoryItem,
  getCultivationProfile,
  getCultivationRequired,
  getRealmDisplay,
  isMaxRealm,
  saveCultivationProfile,
} from './cultivationService.js';
import { getActivePet } from './cultivationPet.js';
import { amplifyPetEffect, getCavePetBonus } from './cultivationCave.js';
import {
  getActiveFormation,
  getFormationLevel,
  getFormationState,
} from './cultivationFormation.js';

const KEY_PREFIX = 'games:cultivation:heavenly-tribulation:';
const CHAN_TIEN_INDEX = Math.max(0, CULTIVATION_REALMS.indexOf('Chân Tiên'));
export const TRIBULATION_MAX_HP = 100;

const PET_BONUS = {
  'Phàm': 1,
  'Lương Phẩm': 2,
  'Hiếm': 3,
  'Cực Hiếm': 5,
  'Thần Thoại': 9,
  'Tiên Phẩm': 20,
};

const FORMATION_GRADE = {
  five_elements: 1,
  wind_lightning: 2,
  frozen_spirit: 3,
  yin_yang: 4,
  chaos_unity: 5,
};

function key(guildId, userId) { return `${KEY_PREFIX}${guildId}:${userId}`; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function formationLevelBonus(level) {
  const safe = clamp(Math.floor(Number(level) || 1), 1, 100);
  if (safe <= 20) return 1;
  if (safe <= 40) return 2;
  if (safe <= 60) return 3;
  if (safe <= 80) return 4;
  return 5;
}

async function getSupport(client, guildId, userId, profile) {
  const pet = getActivePet(profile);
  const petBaseBonus = pet ? PET_BONUS[pet.rarity] || 0 : 0;
  const cavePetBonus = pet ? await getCavePetBonus(client, guildId, userId) : 0;
  const petBonus = amplifyPetEffect(petBaseBonus, cavePetBonus, { cap: 100 });

  try {
    const state = await getFormationState(client, guildId, userId);
    const formation = getActiveFormation(state);
    if (!formation) {
      return { pet, petBaseBonus, cavePetBonus, petBonus, formation: null, formationLevel: 0, damageReduction: 0 };
    }
    const level = getFormationLevel(state, formation.id);
    const damageReduction = (FORMATION_GRADE[formation.id] || 1) + formationLevelBonus(level);
    return { pet, petBaseBonus, cavePetBonus, petBonus, formation, formationLevel: level, damageReduction };
  } catch {
    return { pet, petBaseBonus, cavePetBonus, petBonus, formation: null, formationLevel: 0, damageReduction: 0 };
  }
}

export function requiresHeavenlyTribulation(profile) {
  return Number(profile?.realmIndex) >= CHAN_TIEN_INDEX && !isMaxRealm(profile);
}

function totalBoltsFor(profile) {
  const realmOffset = Math.max(0, Number(profile.realmIndex) - CHAN_TIEN_INDEX);
  return Math.min(9, 6 + Math.floor(realmOffset / 4));
}

function baseResistChance(profile, boltIndex) {
  const realmOffset = Math.max(0, Number(profile.realmIndex) - CHAN_TIEN_INDEX);
  const boltPenalty = Math.max(0, Number(boltIndex) - 1) * 2;
  return clamp(82 - Math.floor(realmOffset * 0.8) - boltPenalty, 48, 82);
}

function normalizeSession(raw) {
  if (!raw || typeof raw !== 'object' || raw.active !== true) return null;
  return {
    version: 1,
    active: true,
    realmIndex: Math.max(0, Math.floor(Number(raw.realmIndex) || 0)),
    stageIndex: Math.max(0, Math.floor(Number(raw.stageIndex) || 0)),
    required: Math.max(1, Math.floor(Number(raw.required) || 1)),
    oldRealm: String(raw.oldRealm || ''),
    totalBolts: clamp(Math.floor(Number(raw.totalBolts) || 6), 3, 9),
    clearedBolts: clamp(Math.floor(Number(raw.clearedBolts) || 0), 0, 9),
    hp: clamp(Math.floor(Number(raw.hp) || 0), 0, TRIBULATION_MAX_HP),
    startedAt: Number(raw.startedAt) || Date.now(),
  };
}

async function saveSession(client, guildId, userId, session) {
  await setDatabaseValue(client, key(guildId, userId), session);
  return session;
}

export async function getHeavenlyTribulationSession(client, guildId, userId) {
  return normalizeSession(await getDatabaseValue(client, key(guildId, userId), null));
}

export async function getHeavenlyTribulationPreview(client, guildId, userId) {
  const profile = await getCultivationProfile(client, guildId, userId);
  const session = await getHeavenlyTribulationSession(client, guildId, userId);
  const support = await getSupport(client, guildId, userId, profile);

  if (session) {
    const nextBolt = session.clearedBolts + 1;
    const baseChance = baseResistChance(profile, nextBolt);
    return { ok: true, active: true, profile, session, support, baseChance, chance: Math.min(100, baseChance + support.petBonus) };
  }

  if (!requiresHeavenlyTribulation(profile)) return { ok: false, reason: 'not_required', profile, session: null, support };

  const required = getCultivationRequired(profile);
  if (profile.cultivation < required) return { ok: false, reason: 'not_ready', required, profile, session: null, support };

  const totalBolts = totalBoltsFor(profile);
  const baseChance = baseResistChance(profile, 1);
  return {
    ok: true,
    active: false,
    profile,
    session: { totalBolts, clearedBolts: 0, hp: TRIBULATION_MAX_HP, required, oldRealm: getRealmDisplay(profile) },
    support,
    baseChance,
    chance: Math.min(100, baseChance + support.petBonus),
  };
}

export async function startHeavenlyTribulation(client, guildId, userId) {
  return Mutex.runExclusive(`cultivation:tribulation:start:${guildId}:${userId}`, async () => {
    const existing = await getHeavenlyTribulationSession(client, guildId, userId);
    if (existing) return getHeavenlyTribulationPreview(client, guildId, userId);

    const profile = await getCultivationProfile(client, guildId, userId);
    if (!requiresHeavenlyTribulation(profile)) return { ok: false, reason: 'not_required', profile };
    const required = getCultivationRequired(profile);
    if (profile.cultivation < required) return { ok: false, reason: 'not_ready', required, profile };

    const session = {
      version: 1, active: true, realmIndex: profile.realmIndex, stageIndex: profile.stageIndex,
      required, oldRealm: getRealmDisplay(profile), totalBolts: totalBoltsFor(profile), clearedBolts: 0,
      hp: TRIBULATION_MAX_HP, startedAt: Date.now(),
    };
    await saveSession(client, guildId, userId, session);
    return getHeavenlyTribulationPreview(client, guildId, userId);
  });
}

function buildReward(profile) {
  const realmOffset = Math.max(0, Number(profile.realmIndex) - CHAN_TIEN_INDEX);
  return { spiritStones: 500_000 + realmOffset * 100_000, thienLinhThao: 5 + Math.floor(realmOffset / 3), coPhu: 2 + Math.floor(realmOffset / 5) };
}

function advanceRealm(profile) {
  if (profile.stageIndex < CULTIVATION_STAGES.length - 1) profile.stageIndex += 1;
  else { profile.stageIndex = 0; profile.realmIndex += 1; }
}

export async function faceNextTribulationBolt(client, guildId, userId) {
  return Mutex.runExclusive(`cultivation:tribulation:bolt:${guildId}:${userId}`, async () => {
    const session = await getHeavenlyTribulationSession(client, guildId, userId);
    if (!session) return { ok: false, reason: 'no_session' };

    const profile = await getCultivationProfile(client, guildId, userId);
    if (profile.realmIndex !== session.realmIndex || profile.stageIndex !== session.stageIndex) {
      await saveSession(client, guildId, userId, null);
      return { ok: false, reason: 'profile_changed', profile };
    }

    const support = await getSupport(client, guildId, userId, profile);
    const bolt = session.clearedBolts + 1;
    const baseChance = baseResistChance(profile, bolt);
    const chance = Math.min(100, baseChance + support.petBonus);
    const resisted = chance >= 100 || Math.random() * 100 < chance;

    const realmOffset = Math.max(0, profile.realmIndex - CHAN_TIEN_INDEX);
    const rawDamage = resisted
      ? randomInt(8 + Math.floor(realmOffset / 4), 14 + Math.floor(realmOffset / 3))
      : randomInt(18 + Math.floor(realmOffset / 3), 28 + Math.floor(realmOffset / 2));
    const damage = Math.max(1, Math.round(rawDamage * (1 - support.damageReduction / 100)));
    const hpBefore = session.hp;
    session.hp = Math.max(0, session.hp - damage);

    if (session.hp <= 0) {
      const loss = Math.min(profile.cultivation, Math.max(1, Math.round(session.required * 0.10)));
      profile.cultivation = Math.max(0, profile.cultivation - loss);
      profile.stats ||= {};
      profile.stats.breakthroughFail = Math.max(0, Number(profile.stats.breakthroughFail) || 0) + 1;
      const savedProfile = await saveCultivationProfile(client, profile);
      await saveSession(client, guildId, userId, null);
      return {
        ok: true, completed: true, success: false, resisted, bolt, totalBolts: session.totalBolts,
        hpBefore, hpAfter: 0, rawDamage, damage, chance, baseChance, support, loss,
        profile: savedProfile, oldRealm: session.oldRealm,
      };
    }

    session.clearedBolts += 1;
    if (session.clearedBolts >= session.totalBolts) {
      profile.cultivation = Math.max(0, profile.cultivation - session.required);
      const oldRealm = session.oldRealm;
      advanceRealm(profile);
      profile.stats ||= {};
      profile.stats.breakthroughSuccess = Math.max(0, Number(profile.stats.breakthroughSuccess) || 0) + 1;
      const reward = buildReward(profile);
      profile.spiritStones = Math.max(0, Number(profile.spiritStones) || 0) + reward.spiritStones;
      addInventoryItem(profile, 'thien_linh_thao', reward.thienLinhThao);
      addInventoryItem(profile, 'co_phu', reward.coPhu);
      const savedProfile = await saveCultivationProfile(client, profile);
      await saveSession(client, guildId, userId, null);
      return {
        ok: true, completed: true, success: true, resisted, bolt, totalBolts: session.totalBolts,
        hpBefore, hpAfter: session.hp, rawDamage, damage, chance, baseChance, support, reward,
        oldRealm, newRealm: getRealmDisplay(savedProfile), profile: savedProfile,
      };
    }

    await saveSession(client, guildId, userId, session);
    const nextBaseChance = baseResistChance(profile, session.clearedBolts + 1);
    return {
      ok: true, completed: false, success: true, resisted, bolt, totalBolts: session.totalBolts,
      hpBefore, hpAfter: session.hp, rawDamage, damage, chance, baseChance,
      nextChance: Math.min(100, nextBaseChance + support.petBonus), support, session, profile,
    };
  });
}
