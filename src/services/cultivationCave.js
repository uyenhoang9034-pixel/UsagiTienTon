import { Mutex } from '../utils/mutex.js';
import {
  addInventoryItem,
  getCultivationProfile,
  removeInventoryItem,
  saveCultivationProfile,
} from './cultivationService.js';

const PREFIX = 'games:cultivation:cave:';
const HOUR_MS = 60 * 60 * 1000;
const MAX_LEVEL = 10;

export const CAVE_BUILDINGS = {
  field: { name: 'Linh Điền', description: 'Sản sinh Thiên Linh Thảo.', baseStone: 60000, ore: 1 },
  gathering: { name: 'Tụ Linh Trận', description: 'Tăng hiệu suất sản xuất của Động Phủ.', baseStone: 90000, ore: 2 },
  alchemy: { name: 'Luyện Đan Phòng', description: 'Tăng tỷ lệ thành công khi Luyện Đan.', baseStone: 80000, ore: 2 },
  forge: { name: 'Luyện Khí Thất', description: 'Tăng tỷ lệ thành công khi Luyện Khí.', baseStone: 80000, ore: 2 },
  pet: { name: 'Linh Thú Viên', description: 'Tăng hiệu quả trợ lực của Linh Thú.', baseStone: 70000, ore: 1 },
};

function key(guildId, userId) { return `${PREFIX}${guildId}:${userId}`; }
function n(v, fallback = 0) { const x = Number(v); return Number.isFinite(x) ? Math.max(0, Math.floor(x)) : fallback; }

function normalize(raw, now = Date.now()) {
  const buildings = {};
  for (const id of Object.keys(CAVE_BUILDINGS)) buildings[id] = Math.min(MAX_LEVEL, Math.max(1, n(raw?.buildings?.[id], 1)));
  return {
    version: 1,
    buildings,
    storedHerbs: n(raw?.storedHerbs),
    herbProgress: Math.max(0, Number(raw?.herbProgress) || 0),
    lastUpdatedAt: n(raw?.lastUpdatedAt, now) || now,
  };
}

function totalLevel(state) { return Object.values(state.buildings).reduce((a, b) => a + b, 0); }
function caveName(total) {
  if (total >= 46) return 'Thái Hư Tiên Phủ';
  if (total >= 36) return 'Động Thiên Phúc Địa';
  if (total >= 26) return 'Tử Phủ Tiên Cư';
  if (total >= 16) return 'Linh Tuyền Động Phủ';
  return 'Tiểu Động Phủ';
}
function gatheringBonus(state) { return state.buildings.gathering * 0.02; }
function herbPerDay(state) { return state.buildings.field * (1 + gatheringBonus(state)); }
function herbCapacity(state) { return Math.max(2, state.buildings.field * 2); }

function accrue(raw, now = Date.now()) {
  const state = normalize(raw, now);
  const elapsed = Math.max(0, now - state.lastUpdatedAt);
  const produced = (elapsed / (24 * HOUR_MS)) * herbPerDay(state) + state.herbProgress;
  const whole = Math.floor(produced);
  state.herbProgress = produced - whole;
  state.storedHerbs = Math.min(herbCapacity(state), state.storedHerbs + whole);
  if (state.storedHerbs >= herbCapacity(state)) state.herbProgress = 0;
  state.lastUpdatedAt = now;
  return state;
}

async function getState(client, guildId, userId) {
  const raw = await client.db.get(key(guildId, userId));
  const state = accrue(raw);
  await client.db.set(key(guildId, userId), state);
  return state;
}

function upgradeCost(id, nextLevel) {
  const cfg = CAVE_BUILDINGS[id];
  return {
    spiritStones: Math.round(cfg.baseStone * Math.pow(1.8, nextLevel - 2)),
    huyenThiet: cfg.ore * Math.max(1, nextLevel - 1),
  };
}

function snapshot(profile, state) {
  const total = totalLevel(state);
  return {
    profile, state, totalLevel: total, caveName: caveName(total),
    herbPerDay: herbPerDay(state), herbCapacity: herbCapacity(state),
    gatheringBonus: gatheringBonus(state),
    alchemyBonus: state.buildings.alchemy * 0.01,
    forgeBonus: state.buildings.forge * 0.01,
    petBonus: state.buildings.pet * 0.01,
  };
}

export async function getCaveSnapshot(client, guildId, userId) {
  const [profile, state] = await Promise.all([getCultivationProfile(client, guildId, userId), getState(client, guildId, userId)]);
  return snapshot(profile, state);
}

// Linh Thú Viên khuếch đại phần trăm trợ lực của Linh Thú theo phép nhân.
// Ví dụ pet +20%, Linh Thú Viên +5% hiệu quả => 20% * 1.05 = 21%.
// Không dùng helper này cho flag nhị phân như guaranteed_breakthrough/adventure_always_positive.
export async function getCavePetBonus(client, guildId, userId) {
  const state = await getState(client, guildId, userId);
  return Math.min(0.10, Math.max(0, Number(state.buildings?.pet) || 0) * 0.01);
}

export function amplifyPetEffect(effectValue, cavePetBonus, { cap = null } = {}) {
  const base = Math.max(0, Number(effectValue) || 0);
  if (base <= 0) return 0;

  const bonus = Math.min(0.10, Math.max(0, Number(cavePetBonus) || 0));
  let amplified = base * (1 + bonus);

  if (Number.isFinite(Number(cap))) {
    amplified = Math.min(Math.max(0, Number(cap)), amplified);
  }

  return amplified;
}

export async function collectCave(client, guildId, userId) {
  return Mutex.runExclusive(`cultivation:${guildId}:${userId}`, async () => {
    const [profile, state] = await Promise.all([getCultivationProfile(client, guildId, userId), getState(client, guildId, userId)]);
    const amount = n(state.storedHerbs);
    if (!amount) return { ok: false, reason: 'nothing_to_collect', ...snapshot(profile, state), collected: 0 };
    addInventoryItem(profile, 'thien_linh_thao', amount);
    state.storedHerbs = 0;
    state.herbProgress = 0;
    state.lastUpdatedAt = Date.now();
    const [saved] = await Promise.all([saveCultivationProfile(client, profile), client.db.set(key(guildId, userId), state)]);
    return { ok: true, collected: amount, ...snapshot(saved, state) };
  });
}

export async function upgradeCaveBuilding(client, guildId, userId, buildingId) {
  return Mutex.runExclusive(`cultivation:${guildId}:${userId}`, async () => {
    if (!CAVE_BUILDINGS[buildingId]) return { ok: false, reason: 'invalid_building' };
    const [profile, state] = await Promise.all([getCultivationProfile(client, guildId, userId), getState(client, guildId, userId)]);
    const current = state.buildings[buildingId];
    if (current >= MAX_LEVEL) return { ok: false, reason: 'max_level', buildingId, ...snapshot(profile, state) };
    const next = current + 1;
    const cost = upgradeCost(buildingId, next);
    if ((profile.spiritStones || 0) < cost.spiritStones) return { ok: false, reason: 'not_enough_stones', cost, buildingId, ...snapshot(profile, state) };
    if ((profile.inventory?.huyen_thiet || 0) < cost.huyenThiet) return { ok: false, reason: 'not_enough_ore', cost, buildingId, ...snapshot(profile, state) };
    profile.spiritStones -= cost.spiritStones;
    removeInventoryItem(profile, 'huyen_thiet', cost.huyenThiet);
    state.buildings[buildingId] = next;
    state.lastUpdatedAt = Date.now();
    const [saved] = await Promise.all([saveCultivationProfile(client, profile), client.db.set(key(guildId, userId), state)]);
    return { ok: true, buildingId, oldLevel: current, newLevel: next, cost, ...snapshot(saved, state) };
  });
}

export function getCaveUpgradeCost(buildingId, currentLevel) {
  if (!CAVE_BUILDINGS[buildingId] || currentLevel >= MAX_LEVEL) return null;
  return upgradeCost(buildingId, currentLevel + 1);
}
