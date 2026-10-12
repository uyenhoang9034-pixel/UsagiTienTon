import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

import {
  getMarriageKey,
  getMarriageRegistryKey,
} from '../utils/database/keys.js';

import { MARRIAGE_CONFIG } from '../config/marriageConfig.js';

export const MARRIAGE_INTERACT_COOLDOWN_MS = MARRIAGE_CONFIG.interact.cooldownMs;
export const MARRIAGE_DAILY_COOLDOWN_MS = MARRIAGE_CONFIG.checkIn.cooldownMs;
export const MARRIAGE_GIFT_COOLDOWN_MS = MARRIAGE_CONFIG.gifts.cooldownMs;

export const LOVE_GIFTS = MARRIAGE_CONFIG.gifts.items;
export const LOVE_LEVELS = MARRIAGE_CONFIG.levels;

export function getLoveLevel(points = 0) {
  let matched = LOVE_LEVELS[0];
  for (const tier of LOVE_LEVELS) {
    if (points >= tier.min) {
      matched = tier;
    } else {
      break;
    }
  }
  return matched;
}

/**
 * Chuẩn hoá dữ liệu người dùng sang dạng hỗ trợ nhiều bạn đời (Đa thê đa phu / Hậu cung)
 */
export function normalizeUserMarriage(raw, userId) {
  if (!raw || typeof raw !== 'object') {
    return { userId, spouses: {} };
  }

  if (raw.spouses && typeof raw.spouses === 'object') {
    return {
      userId: raw.userId || userId,
      spouses: raw.spouses,
    };
  }

  // Tương thích ngược: nếu trước đó đã lưu dạng 1 bạn đời duy nhất
  if (raw.spouseId) {
    return {
      userId,
      spouses: {
        [raw.spouseId]: {
          spouseId: raw.spouseId,
          marriedAt: raw.marriedAt || Date.now(),
          lovePoints: raw.lovePoints || 100,
          bio: raw.bio || 'Bên nhau trọn đời!',
          ring: raw.ring || '💍 Nhẫn Ước Hẹn Vĩnh Cửu',
          lastInteractedAt: raw.lastInteractedAt || null,
          lastDailyAt: raw.lastDailyAt || null,
          lastGiftAt: raw.lastGiftAt || null,
          streak: raw.streak || 0,
          proposalMessage: raw.proposalMessage || '',
        },
      },
    };
  }

  return { userId, spouses: {} };
}

export async function getUserMarriage(client, guildId, userId) {
  if (!guildId || !userId) return { userId, spouses: {} };
  const key = getMarriageKey(guildId, userId);
  const raw = await getDatabaseValue(client, key, null);
  return normalizeUserMarriage(raw, userId);
}

export async function saveUserMarriage(client, guildId, userId, data) {
  const key = getMarriageKey(guildId, userId);
  await setDatabaseValue(client, key, data);
}

export function areMarried(user1Data, user2Id) {
  return Boolean(user1Data?.spouses?.[user2Id]);
}

export function getSpouseList(userData) {
  if (!userData?.spouses) return [];
  return Object.values(userData.spouses);
}

export function getCoupleKey(user1Id, user2Id) {
  return [String(user1Id), String(user2Id)].sort().join(':');
}

export async function createMarriage(client, guildId, user1Id, user2Id, options = {}) {
  if (!guildId || !user1Id || !user2Id) return false;

  const now = Date.now();
  const bio = (options.bio || 'Bên nhau trọn đời!').trim().slice(0, 120);
  const proposalMessage = (options.proposalMessage || '').trim().slice(0, 150);

  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const relationshipForU1 = {
    spouseId: user2Id,
    marriedAt: now,
    lovePoints: 100,
    bio,
    ring: '💍 Nhẫn Ước Hẹn Vĩnh Cửu',
    lastInteractedAt: null,
    lastDailyAt: null,
    lastGiftAt: null,
    streak: 0,
    proposalMessage,
  };

  const relationshipForU2 = {
    ...relationshipForU1,
    spouseId: user1Id,
  };

  u1.spouses[user2Id] = relationshipForU1;
  u2.spouses[user1Id] = relationshipForU2;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  // Cập nhật guild registry
  const registryKey = getMarriageRegistryKey(guildId);
  const currentRegistry = (await getDatabaseValue(client, registryKey, [])) || [];
  const coupleKey = getCoupleKey(user1Id, user2Id);

  const filtered = Array.isArray(currentRegistry)
    ? currentRegistry.filter((item) => item.coupleKey !== coupleKey)
    : [];

  filtered.push({
    coupleKey,
    user1Id,
    user2Id,
    marriedAt: now,
  });

  await setDatabaseValue(client, registryKey, filtered);
  return true;
}

export async function deleteMarriage(client, guildId, user1Id, user2Id) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const coupleData = u1.spouses[user2Id];
  if (!coupleData) return false;

  delete u1.spouses[user2Id];
  delete u2.spouses[user1Id];

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  // Xóa khỏi registry
  const registryKey = getMarriageRegistryKey(guildId);
  const currentRegistry = (await getDatabaseValue(client, registryKey, [])) || [];
  const coupleKey = getCoupleKey(user1Id, user2Id);

  if (Array.isArray(currentRegistry)) {
    const filtered = currentRegistry.filter((item) => item.coupleKey !== coupleKey);
    await setDatabaseValue(client, registryKey, filtered);
  }

  return coupleData;
}

export async function interactMarriage(client, guildId, user1Id, user2Id, actionType) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses[user2Id];
  const rel2 = u2.spouses[user1Id];

  if (!rel1 || !rel2) return { error: 'NOT_MARRIED' };

  const now = Date.now();
  const lastTime = Math.max(rel1.lastInteractedAt || 0, rel2.lastInteractedAt || 0);

  if (lastTime && now - lastTime < MARRIAGE_INTERACT_COOLDOWN_MS) {
    const remainingMs = MARRIAGE_INTERACT_COOLDOWN_MS - (now - lastTime);
    return {
      error: 'COOLDOWN',
      remainingMs,
      data: rel1,
    };
  }

  const pointGains = {
    hon: 25,
    om: 20,
    date: 30,
    tangqua: 35,
    xoadau: 20,
  };

  const gained = pointGains[actionType] || 20;
  const currentPoints = Math.max(rel1.lovePoints || 0, rel2.lovePoints || 0);
  const newPoints = currentPoints + gained;

  rel1.lovePoints = newPoints;
  rel1.lastInteractedAt = now;
  rel2.lovePoints = newPoints;
  rel2.lastInteractedAt = now;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  return {
    success: true,
    pointsGained: gained,
    totalPoints: newPoints,
    level: getLoveLevel(newPoints),
  };
}

export async function dailyLoveCheckIn(client, guildId, user1Id, user2Id) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses[user2Id];
  const rel2 = u2.spouses[user1Id];

  if (!rel1 || !rel2) return { error: 'NOT_MARRIED' };

  const now = Date.now();
  const lastDaily = Math.max(rel1.lastDailyAt || 0, rel2.lastDailyAt || 0);

  if (lastDaily && now - lastDaily < MARRIAGE_DAILY_COOLDOWN_MS) {
    const remainingMs = MARRIAGE_DAILY_COOLDOWN_MS - (now - lastDaily);
    return {
      error: 'COOLDOWN',
      remainingMs,
      data: rel1,
    };
  }

  // Tính chuỗi streak (nếu quá 36 tiếng không điểm danh thì đứt chuỗi)
  const oneDayAndHalf = 36 * 60 * 60 * 1000;
  let streak = rel1.streak || 0;
  if (lastDaily && now - lastDaily <= oneDayAndHalf) {
    streak += 1;
  } else {
    streak = 1;
  }

  const basePoints = 50;
  const streakBonus = Math.min(50, streak * 5); // Thưởng thêm tối đa +50 từ streak
  const totalGained = basePoints + streakBonus;

  const currentPoints = Math.max(rel1.lovePoints || 0, rel2.lovePoints || 0);
  const newPoints = currentPoints + totalGained;

  rel1.lovePoints = newPoints;
  rel1.lastDailyAt = now;
  rel1.streak = streak;

  rel2.lovePoints = newPoints;
  rel2.lastDailyAt = now;
  rel2.streak = streak;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  return {
    success: true,
    pointsGained: totalGained,
    basePoints,
    streakBonus,
    streak,
    totalPoints: newPoints,
    level: getLoveLevel(newPoints),
  };
}

export async function sendLoveGift(client, guildId, user1Id, user2Id, giftKey) {
  const gift = LOVE_GIFTS[giftKey];
  if (!gift) return { error: 'INVALID_GIFT' };

  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses[user2Id];
  const rel2 = u2.spouses[user1Id];

  if (!rel1 || !rel2) return { error: 'NOT_MARRIED' };

  const now = Date.now();
  const lastGift = Math.max(rel1.lastGiftAt || 0, rel2.lastGiftAt || 0);

  if (lastGift && now - lastGift < MARRIAGE_GIFT_COOLDOWN_MS) {
    const remainingMs = MARRIAGE_GIFT_COOLDOWN_MS - (now - lastGift);
    return {
      error: 'COOLDOWN',
      remainingMs,
      gift,
    };
  }

  const currentPoints = Math.max(rel1.lovePoints || 0, rel2.lovePoints || 0);
  const newPoints = currentPoints + gift.points;

  rel1.lovePoints = newPoints;
  rel1.lastGiftAt = now;
  rel2.lovePoints = newPoints;
  rel2.lastGiftAt = now;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  return {
    success: true,
    gift,
    pointsGained: gift.points,
    totalPoints: newPoints,
    level: getLoveLevel(newPoints),
  };
}

export async function updateMarriageBio(client, guildId, user1Id, user2Id, newBio) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses[user2Id];
  const rel2 = u2.spouses[user1Id];

  if (!rel1 || !rel2) return false;

  const cleanBio = newBio.trim().slice(0, 120);
  rel1.bio = cleanBio;
  rel2.bio = cleanBio;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);
  return true;
}

export async function addCoupleLovePoints(client, guildId, user1Id, user2Id, pointsToAdd) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses?.[user2Id];
  const rel2 = u2.spouses?.[user1Id];

  if (!rel1 || !rel2) return null;

  const currentPoints = Math.max(rel1.lovePoints || 0, rel2.lovePoints || 0);
  const newPoints = currentPoints + pointsToAdd;

  rel1.lovePoints = newPoints;
  rel2.lovePoints = newPoints;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  return {
    totalPoints: newPoints,
    level: getLoveLevel(newPoints),
  };
}

export async function getTopMarriages(client, guildId, limit = 10) {
  const registryKey = getMarriageRegistryKey(guildId);
  const registry = (await getDatabaseValue(client, registryKey, [])) || [];
  if (!Array.isArray(registry) || registry.length === 0) return [];

  const results = [];
  const visitedCouples = new Set();

  for (const item of registry) {
    if (visitedCouples.has(item.coupleKey)) continue;
    visitedCouples.add(item.coupleKey);

    const u1 = await getUserMarriage(client, guildId, item.user1Id);
    const rel = u1.spouses?.[item.user2Id];

    if (rel) {
      results.push({
        user1Id: item.user1Id,
        user2Id: item.user2Id,
        marriedAt: rel.marriedAt || item.marriedAt,
        lovePoints: rel.lovePoints || 0,
        bio: rel.bio || '',
        ring: rel.ring || '💍 Nhẫn Ước Hẹn Vĩnh Cửu',
        level: getLoveLevel(rel.lovePoints || 0),
        streak: rel.streak || 0,
      });
    }
  }

  results.sort((a, b) => b.lovePoints - a.lovePoints);
  return results.slice(0, limit);
}
