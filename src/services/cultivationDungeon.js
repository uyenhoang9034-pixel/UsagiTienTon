import { Mutex } from '../utils/mutex.js';

import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

import {
  addInventoryItem,
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  FORMATION_DEFINITIONS,
  getActiveFormation,
  getFormationLevel,
  getFormationState,
  saveFormationState,
} from './cultivationFormation.js';

import {
  getActivePet,
} from './cultivationPet.js';

const DUNGEON_KEY_PREFIX = 'games:cultivation:dungeon:';

export const DUNGEON_DAILY_ATTEMPTS = 3;
export const DUNGEON_MAX_HP = 100;

export const DUNGEON_PET_SUCCESS_BONUS = {
  'Phàm': 1,
  'Lương Phẩm': 2,
  'Hiếm': 3,
  'Cực Hiếm': 5,
  'Thần Thoại': 9,
  'Tiên Phẩm': 20,
};

export const DUNGEON_FORMATION_GRADE_BONUS = {
  five_elements: 1,
  wind_lightning: 2,
  frozen_spirit: 3,
  yin_yang: 4,
  chaos_unity: 5,
};

export const DUNGEON_SHOP = {
  thien_linh_thao: { id: 'thien_linh_thao', name: 'Thiên Linh Thảo', price: 10, type: 'inventory' },
  huyen_thiet: { id: 'huyen_thiet', name: 'Huyền Thiết', price: 20, type: 'inventory' },
  vo_danh_kiem_pho: { id: 'vo_danh_kiem_pho', name: 'Vô Danh Kiếm Phổ', price: 30, type: 'inventory' },
  co_phu: { id: 'co_phu', name: 'Thượng Cổ Phù', price: 30, type: 'inventory' },
  tran_van: { id: 'tran_van', name: 'Trận Văn', price: 90, type: 'formation_essence' },
};

function stateKey(guildId, userId) { return `${DUNGEON_KEY_PREFIX}${guildId}:${userId}`; }
function guildPrefix(guildId) { return `${DUNGEON_KEY_PREFIX}${guildId}:`; }

function todayKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

function randomInt(min, max) {
  const low = Math.ceil(Math.min(min, max));
  const high = Math.floor(Math.max(min, max));
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }

function normalizeState(raw, guildId, userId) {
  const day = todayKey();
  const source = raw && typeof raw === 'object' ? raw : {};
  const sameDay = source.dayKey === day;
  const activeRun = source.activeRun && typeof source.activeRun === 'object'
    ? { floor: Math.max(1, Math.floor(Number(source.activeRun.floor) || 1)), hp: clamp(Math.round(Number(source.activeRun.hp) || 0), 0, DUNGEON_MAX_HP), startedAt: Number(source.activeRun.startedAt) || Date.now() }
    : null;
  return {
    version: 1, guildId, userId, dayKey: day,
    attemptsUsed: sameDay ? clamp(Math.floor(Number(source.attemptsUsed) || 0), 0, DUNGEON_DAILY_ATTEMPTS) : 0,
    highestFloor: Math.max(0, Math.floor(Number(source.highestFloor) || 0)),
    essence: Math.max(0, Math.floor(Number(source.essence) || 0)),
    clears: Math.max(0, Math.floor(Number(source.clears) || 0)),
    failures: Math.max(0, Math.floor(Number(source.failures) || 0)),
    activeRun: sameDay ? activeRun : null,
    updatedAt: Date.now(),
  };
}

async function saveDungeonState(client, state) {
  const normalized = normalizeState(state, state.guildId, state.userId);
  normalized.updatedAt = Date.now();
  await setDatabaseValue(client, stateKey(state.guildId, state.userId), normalized);
  return normalized;
}

export async function getDungeonState(client, guildId, userId) {
  const key = stateKey(guildId, userId);
  const raw = await getDatabaseValue(client, key, null);
  const state = normalizeState(raw, guildId, userId);
  if (!raw || raw.dayKey !== state.dayKey || Number(raw.version) !== 1) await saveDungeonState(client, state);
  return state;
}

function getPetSuccessBonus(profile) {
  const pet = getActivePet(profile);
  if (!pet) return { pet: null, bonus: 0 };
  return { pet, bonus: DUNGEON_PET_SUCCESS_BONUS[pet.rarity] || 0 };
}

function getFormationLevelBand(level) {
  const safeLevel = clamp(Math.floor(Number(level) || 1), 1, 100);
  if (safeLevel <= 20) return 1;
  if (safeLevel <= 40) return 2;
  if (safeLevel <= 60) return 3;
  if (safeLevel <= 80) return 4;
  return 5;
}

async function getFormationProtection(client, guildId, userId) {
  const state = await getFormationState(client, guildId, userId);
  const active = getActiveFormation(state);
  if (!active) return { state, formation: null, level: 0, gradeBonus: 0, levelBonus: 0, reduction: 0 };
  const level = getFormationLevel(state, active.id);
  const gradeBonus = DUNGEON_FORMATION_GRADE_BONUS[active.id] || 1;
  const levelBonus = getFormationLevelBand(level);
  return { state, formation: active, level, gradeBonus, levelBonus, reduction: gradeBonus + levelBonus };
}

function getPlayerPowerStep(profile) {
  return Math.max(0, Math.floor(Number(profile?.realmIndex) || 0) * 4 + Math.floor(Number(profile?.stageIndex) || 0));
}

function getFloorRecommendedStep(floor) {
  return Math.max(0, Math.floor((Math.max(1, floor) - 1) / 5));
}

function getBaseSuccessChance(profile, floor) {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  const playerStep = getPlayerPowerStep(profile);
  const recommendedStep = getFloorRecommendedStep(safeFloor);
  const difference = playerStep - recommendedStep;

  // Bí Cảnh chủ động giữ xác suất thấp hơn: người mạnh chỉ nhận tối đa +4% lợi thế cảnh giới.
  // Càng đi sâu tỷ lệ càng giảm, Thủ Hộ Giả mỗi 5 tầng bị trừ thêm.
  const realmAdjustment = difference >= 0
    ? Math.min(4, difference)
    : Math.max(-20, difference * 4);
  const depthPenalty = Math.min(35, Math.floor((safeFloor - 1) / 2) * 2);
  const guardianPenalty = safeFloor % 5 === 0 ? 8 : 0;
  const chance = 78 + realmAdjustment - depthPenalty - guardianPenalty;

  return clamp(Math.round(chance), 20, 82);
}

function getRawHpLoss(floor, success) {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  const depthBonus = Math.min(12, Math.floor((safeFloor - 1) / 10) * 2);
  const guardian = safeFloor % 5 === 0;

  // Tầng thường: 12–16% trước Trận Pháp.
  // Thủ Hộ Giả: 20–28% trước Trận Pháp. Tầng sâu tiếp tục tăng nhẹ.
  const normalLoss = guardian
    ? 20 + depthBonus + randomInt(0, 8)
    : 12 + depthBonus + randomInt(0, 4);

  if (success) return normalLoss;
  return Math.round(normalLoss * 1.5);
}

function applyFormationProtection(rawLoss, reductionPercent) {
  const reduced = Math.round(Math.max(0, rawLoss) * (1 - clamp(reductionPercent, 0, 100) / 100));
  return Math.max(2, reduced);
}

function getEssenceRange(floor) {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  const band = Math.ceil(safeFloor / 10);
  const ranges = [[10,15],[15,25],[25,35],[35,50],[50,70],[70,90],[90,115],[115,145],[145,180],[180,220]];
  if (band <= ranges.length) return ranges[band - 1];
  const extraBands = band - 10;
  return [220 + (extraBands - 1) * 35, 255 + (extraBands - 1) * 40];
}

function buildFloorReward(floor) {
  const safeFloor = Math.max(1, Math.floor(Number(floor) || 1));
  const boss = safeFloor % 5 === 0;
  const majorBoss = safeFloor % 10 === 0;
  const [essenceMin, essenceMax] = getEssenceRange(safeFloor);
  const bossMultiplier = majorBoss ? 2 : boss ? 1.5 : 1;
  const baseMaterial = 1 + Math.min(3, Math.floor((safeFloor - 1) / 40));
  const materialBonus = boss ? 1 : 0;
  return {
    floor: safeFloor, boss, majorBoss,
    spiritStones: Math.round((25_000 + safeFloor * 5_000) * bossMultiplier),
    essence: Math.max(1, Math.round(randomInt(essenceMin, essenceMax) * bossMultiplier)),
    items: {
      thien_linh_thao: baseMaterial + materialBonus,
      huyen_thiet: baseMaterial + materialBonus,
      vo_danh_kiem_pho: Math.max(1, Math.ceil(baseMaterial / 2)) + materialBonus,
      co_phu: Math.max(1, Math.ceil(baseMaterial / 2)) + materialBonus,
    },
    formationEssence: majorBoss ? 3 : boss ? 2 : 1,
  };
}

async function applyFloorReward(client, guildId, userId, profile, reward) {
  profile.spiritStones = Math.max(0, Number(profile.spiritStones) || 0) + reward.spiritStones;
  for (const [itemId, quantity] of Object.entries(reward.items)) addInventoryItem(profile, itemId, quantity);
  await saveCultivationProfile(client, profile);
  const formationState = await getFormationState(client, guildId, userId);
  formationState.formationEssence = Math.max(0, Number(formationState.formationEssence) || 0) + reward.formationEssence;
  await saveFormationState(client, guildId, userId, formationState);
}

export async function getDungeonSnapshot(client, guildId, userId, { isAdmin = false } = {}) {
  const [state, profile, formation] = await Promise.all([
    getDungeonState(client, guildId, userId), getCultivationProfile(client, guildId, userId), getFormationProtection(client, guildId, userId),
  ]);
  const petInfo = getPetSuccessBonus(profile);
  const floor = state.activeRun?.floor || state.highestFloor + 1;
  const baseChance = getBaseSuccessChance(profile, floor);
  const successChance = Math.min(100, baseChance + petInfo.bonus);
  return { state, profile, formation, pet: petInfo.pet, petBonus: petInfo.bonus, floor, baseChance, successChance, isAdmin,
    attemptsRemaining: isAdmin ? Infinity : Math.max(0, DUNGEON_DAILY_ATTEMPTS - state.attemptsUsed) };
}

export async function startDungeonRun(client, guildId, userId, { isAdmin = false } = {}) {
  return Mutex.runExclusive(`cultivation:dungeon:start:${guildId}:${userId}`, async () => {
    const state = await getDungeonState(client, guildId, userId);
    if (state.activeRun) return { ok: true, resumed: true, ...(await getDungeonSnapshot(client, guildId, userId, { isAdmin })) };
    if (!isAdmin && state.attemptsUsed >= DUNGEON_DAILY_ATTEMPTS) return { ok: false, reason: 'daily_limit', ...(await getDungeonSnapshot(client, guildId, userId, { isAdmin })) };
    if (!isAdmin) state.attemptsUsed += 1;
    state.activeRun = { floor: state.highestFloor + 1, hp: DUNGEON_MAX_HP, startedAt: Date.now() };
    await saveDungeonState(client, state);
    return { ok: true, resumed: false, ...(await getDungeonSnapshot(client, guildId, userId, { isAdmin })) };
  });
}

export async function challengeDungeonFloor(client, guildId, userId, { isAdmin = false } = {}) {
  return Mutex.runExclusive(`cultivation:dungeon:fight:${guildId}:${userId}`, async () => {
    const state = await getDungeonState(client, guildId, userId);
    if (!state.activeRun) return { ok: false, reason: 'no_active_run', ...(await getDungeonSnapshot(client, guildId, userId, { isAdmin })) };
    const [profile, formation] = await Promise.all([getCultivationProfile(client, guildId, userId), getFormationProtection(client, guildId, userId)]);
    const petInfo = getPetSuccessBonus(profile);
    const floor = state.activeRun.floor;
    const baseChance = getBaseSuccessChance(profile, floor);
    const successChance = Math.min(100, baseChance + petInfo.bonus);
    const success = successChance >= 100 || Math.random() * 100 < successChance;
    const rawHpLoss = getRawHpLoss(floor, success);
    const hpLoss = applyFormationProtection(rawHpLoss, formation.reduction);
    const hpBefore = state.activeRun.hp;
    const hpAfter = Math.max(0, hpBefore - hpLoss);

    if (!success) {
      state.failures += 1; state.activeRun = null; await saveDungeonState(client, state);
      return { ok: true, success: false, floor, hpBefore, hpAfter, hpLoss, rawHpLoss, baseChance, successChance, pet: petInfo.pet, petBonus: petInfo.bonus, formation, state, isAdmin };
    }

    const reward = buildFloorReward(floor);
    state.highestFloor = Math.max(state.highestFloor, floor); state.clears += 1; state.essence += reward.essence;
    const exhausted = hpAfter <= 0;
    if (exhausted) state.activeRun = null;
    else state.activeRun = { ...state.activeRun, floor: floor + 1, hp: hpAfter };
    await saveDungeonState(client, state);
    await applyFloorReward(client, guildId, userId, profile, reward);
    return { ok: true, success: true, exhausted, floor, nextFloor: floor + 1, hpBefore, hpAfter, hpLoss, rawHpLoss, baseChance, successChance, pet: petInfo.pet, petBonus: petInfo.bonus, formation, reward, state, isAdmin };
  });
}

export async function leaveDungeonRun(client, guildId, userId, { isAdmin = false } = {}) {
  return Mutex.runExclusive(`cultivation:dungeon:leave:${guildId}:${userId}`, async () => {
    const state = await getDungeonState(client, guildId, userId);
    const floor = state.activeRun?.floor || null; const hp = state.activeRun?.hp ?? null;
    state.activeRun = null; await saveDungeonState(client, state);
    return { ok: true, floor, hp, ...(await getDungeonSnapshot(client, guildId, userId, { isAdmin })) };
  });
}

export async function buyDungeonShopItem(client, guildId, userId, itemId, { isAdmin = false } = {}) {
  return Mutex.runExclusive(`cultivation:dungeon:shop:${guildId}:${userId}`, async () => {
    const entry = DUNGEON_SHOP[itemId];
    if (!entry) return { ok: false, reason: 'unknown_item', ...(await getDungeonSnapshot(client, guildId, userId, { isAdmin })) };
    const state = await getDungeonState(client, guildId, userId);
    if (state.essence < entry.price) return { ok: false, reason: 'not_enough_essence', item: entry, ...(await getDungeonSnapshot(client, guildId, userId, { isAdmin })) };
    state.essence -= entry.price; await saveDungeonState(client, state);
    if (entry.type === 'formation_essence') {
      const formationState = await getFormationState(client, guildId, userId);
      formationState.formationEssence = Math.max(0, Number(formationState.formationEssence) || 0) + 1;
      await saveFormationState(client, guildId, userId, formationState);
    } else {
      const profile = await getCultivationProfile(client, guildId, userId); addInventoryItem(profile, entry.id, 1); await saveCultivationProfile(client, profile);
    }
    return { ok: true, item: entry, ...(await getDungeonSnapshot(client, guildId, userId, { isAdmin })) };
  });
}

export async function getDungeonLeaderboard(client, guildId, limit = 10) {
  const prefix = guildPrefix(guildId);
  const keys = typeof client?.db?.list === 'function' ? await client.db.list(prefix) : [];
  const entries = [];
  for (const key of keys || []) {
    const userId = String(key).slice(prefix.length); if (!userId) continue;
    const raw = await getDatabaseValue(client, key, null); if (!raw) continue;
    const state = normalizeState(raw, guildId, userId);
    entries.push({ userId, highestFloor: state.highestFloor, clears: state.clears, essence: state.essence });
  }
  return entries.sort((a, b) => b.highestFloor - a.highestFloor || b.clears - a.clears || b.essence - a.essence).slice(0, Math.max(1, Math.floor(Number(limit) || 10)));
}

export function getDungeonFormationGradeName(formationId) {
  return FORMATION_DEFINITIONS[formationId]?.name || 'Chưa bố trí';
}
