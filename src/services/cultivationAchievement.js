import { Mutex } from '../utils/mutex.js';

import {
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  CULTIVATION_PETS,
} from './cultivationPet.js';

import {
  getFormationEye,
  getFormationHeart,
  getFormationLevel,
  getFormationSlotLevels,
  getFormationState,
} from './cultivationFormation.js';

const ACHIEVEMENT_PREFIX = 'games:cultivation:achievement:';

export const ACHIEVEMENT_CATEGORIES = {
  cultivation: 'Tu Luyện',
  breakthrough: 'Đột Phá',
  adventure: 'Thám Hiểm',
  alchemy: 'Luyện Đan',
  forge: 'Luyện Khí',
  pets: 'Linh Thú',
  formation: 'Trận Pháp',
  wealth: 'Tài Phú',
  boss: 'Yêu Vương',
  journey: 'Tiên Đồ',
};

function def(id, category, name, target, reward, points, metric, title = null) {
  return {
    id,
    category,
    name,
    target,
    reward,
    points,
    metric,
    title,
  };
}

export const ACHIEVEMENT_DEFINITIONS = [
  def('cultivate_001', 'cultivation', 'Nhất Niệm Nhập Tiên', 1, 10000, 5, 'cultivateCount'),
  def('cultivate_010', 'cultivation', 'Tiên Đồ Sơ Khai', 10, 30000, 10, 'cultivateCount'),
  def('cultivate_050', 'cultivation', 'Đạo Tâm Sơ Thành', 50, 100000, 20, 'cultivateCount'),
  def('cultivate_100', 'cultivation', 'Bách Luyện Đạo Tâm', 100, 250000, 30, 'cultivateCount', 'Bách Luyện Đạo Tâm'),
  def('cultivate_500', 'cultivation', 'Thiên Chuy Bách Luyện', 500, 1000000, 50, 'cultivateCount'),
  def('cultivate_1000', 'cultivation', 'Vạn Pháp Quy Tâm', 1000, 3000000, 100, 'cultivateCount', 'Vạn Pháp Quy Tâm'),

  def('breakthrough_001', 'breakthrough', 'Phá Cảnh', 1, 30000, 10, 'breakthroughSuccess'),
  def('breakthrough_010', 'breakthrough', 'Nghịch Thiên Cải Mệnh', 10, 200000, 30, 'breakthroughSuccess'),
  def('breakthrough_025', 'breakthrough', 'Đại Đạo Vô Cương', 25, 1000000, 70, 'breakthroughSuccess', 'Đại Đạo Vô Cương'),

  def('adventure_001', 'adventure', 'Sơ Xuất Tiên Môn', 1, 10000, 5, 'adventureCount'),
  def('adventure_010', 'adventure', 'Du Lịch Tứ Phương', 10, 50000, 10, 'adventureCount'),
  def('adventure_100', 'adventure', 'Bách Lý Tiên Tung', 100, 500000, 30, 'adventureCount'),
  def('adventure_500', 'adventure', 'Cửu Tử Nhất Sinh', 500, 2000000, 70, 'adventureCount', 'Cửu Tử Nhất Sinh'),

  def('alchemy_001', 'alchemy', 'Khai Lô', 1, 10000, 5, 'alchemySuccess'),
  def('alchemy_010', 'alchemy', 'Đan Hương Sơ Khởi', 10, 50000, 10, 'alchemySuccess'),
  def('alchemy_100', 'alchemy', 'Đan Đạo Sơ Thành', 100, 500000, 30, 'alchemySuccess'),
  def('alchemy_500', 'alchemy', 'Đan Đạo Tông Sư', 500, 2500000, 80, 'alchemySuccess', 'Đan Đạo Tông Sư'),

  def('forge_001', 'forge', 'Khai Lô Luyện Khí', 1, 10000, 5, 'forgeSuccess'),
  def('forge_100', 'forge', 'Bách Luyện Thành Khí', 100, 500000, 30, 'forgeSuccess'),
  def('forge_500', 'forge', 'Thần Binh Chi Chủ', 500, 2500000, 80, 'forgeSuccess', 'Thần Binh Chi Chủ'),

  def('pets_001', 'pets', 'Tiên Thú Hữu Duyên', 1, 50000, 10, 'petOwnedCount'),
  def('pets_003', 'pets', 'Linh Thú Thành Đàn', 3, 300000, 25, 'petOwnedCount'),
  def('pets_all', 'pets', 'Vạn Thú Quy Tâm', 1, 3000000, 100, 'petCollectionComplete', 'Vạn Thú Chi Chủ'),

  def('formation_010', 'formation', 'Trận Đồ Tiểu Thành', 10, 100000, 15, 'formationMaxLevel'),
  def('formation_050', 'formation', 'Trận Đạo Đại Thành', 50, 750000, 40, 'formationMaxLevel'),
  def('formation_100', 'formation', 'Nhất Niệm Thành Trận', 100, 2000000, 80, 'formationMaxLevel', 'Trận Đạo Tông Sư'),
  def('formation_parts_100', 'formation', 'Vạn Trận Quy Nhất', 1, 10000000, 150, 'formationAllPartsMax', 'Vạn Trận Chi Tôn'),

  def('wealth_10000', 'wealth', 'Túi Có Linh Thạch', 10000, 5000, 5, 'highestSpiritStones'),
  def('wealth_100000', 'wealth', 'Tiểu Hữu Gia Tài', 100000, 20000, 10, 'highestSpiritStones'),
  def('wealth_1000000', 'wealth', 'Nhất Phương Phú Hào', 1000000, 100000, 20, 'highestSpiritStones'),
  def('wealth_10000000', 'wealth', 'Phú Khả Địch Quốc', 10000000, 500000, 40, 'highestSpiritStones', 'Tiên Gia Phú Hào'),
  def('wealth_100000000', 'wealth', 'Tài Thông Tiên Giới', 100000000, 2000000, 80, 'highestSpiritStones'),
  def('wealth_1000000000', 'wealth', 'Kim Sơn Ngân Hải', 1000000000, 10000000, 150, 'highestSpiritStones', 'Tài Thông Tiên Giới'),

  def('boss_attack_001', 'boss', 'Sơ Kiến Yêu Vương', 1, 50000, 10, 'worldBossAttacks'),
  def('boss_kill_001', 'boss', 'Trảm Yêu', 1, 300000, 25, 'worldBossKills', 'Trảm Yêu Giả'),
  def('boss_kill_010', 'boss', 'Yêu Vương Khắc Tinh', 10, 3000000, 80, 'worldBossKills', 'Yêu Vương Khắc Tinh'),
  def('boss_hit_10000000', 'boss', 'Nhất Kích Kinh Thiên', 10000000, 1000000, 50, 'worldBossBestHit', 'Nhất Kích Kinh Thiên'),
  def('boss_top1_001', 'boss', 'Độc Chiếm Ngao Đầu', 1, 5000000, 100, 'worldBossTop1', 'Trảm Yêu Chí Tôn'),

  def('journey_010', 'journey', 'Bách Xích Can Đầu', 10, 500000, 30, 'achievementCompleted'),
  def('journey_025', 'journey', 'Danh Chấn Tiên Đồ', 25, 2000000, 70, 'achievementCompleted', 'Danh Chấn Tiên Đồ'),
  def('journey_038', 'journey', 'Tiên Đồ Viên Mãn', 38, 20000000, 200, 'achievementCompleted', 'Tiên Đồ Chí Tôn'),
];

function stateKey(guildId, userId) {
  return `${ACHIEVEMENT_PREFIX}${guildId}:${userId}`;
}

function defaultState(guildId, userId) {
  return {
    version: 1,
    guildId,
    userId,
    claimed: {},
    titles: {
      unlocked: [],
      equipped: null,
    },
    stats: {
      highestSpiritStones: 0,
      worldBossAttacks: 0,
      worldBossKills: 0,
      worldBossBestHit: 0,
      worldBossTop1: 0,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function normalizeState(raw, guildId, userId) {
  const base = defaultState(guildId, userId);
  const source = raw && typeof raw === 'object' ? raw : {};
  const unlocked = Array.isArray(source.titles?.unlocked)
    ? source.titles.unlocked.filter(Boolean).map(String)
    : [];

  return {
    ...base,
    ...source,
    version: 1,
    guildId,
    userId,
    claimed: {
      ...(source.claimed && typeof source.claimed === 'object'
        ? source.claimed
        : {}),
    },
    titles: {
      unlocked: [...new Set(unlocked)],
      equipped: typeof source.titles?.equipped === 'string'
        ? source.titles.equipped
        : null,
    },
    stats: {
      ...base.stats,
      ...(source.stats || {}),
    },
  };
}

async function saveState(client, state) {
  const saved = {
    ...state,
    updatedAt: Date.now(),
  };
  await client.db.set(stateKey(state.guildId, state.userId), saved);
  return saved;
}

export async function getAchievementState(client, guildId, userId) {
  const raw = await client.db.get(stateKey(guildId, userId), null);
  const state = normalizeState(raw, guildId, userId);
  if (!raw) await saveState(client, state);
  return state;
}

function profileStat(profile, key) {
  return Math.max(0, Number(profile?.stats?.[key]) || 0);
}

function countOwnedPets(profile) {
  return Object.keys(profile?.pets?.owned || {})
    .filter(id => profile.pets.owned[id] === true && CULTIVATION_PETS[id])
    .length;
}

function isPetCollectionComplete(profile) {
  const all = Object.values(CULTIVATION_PETS)
    .filter(pet => pet && pet.id);
  if (all.length === 0) return false;
  return all.every(pet => profile?.pets?.owned?.[pet.id] === true);
}

function formationMetrics(formation) {
  const ids = Object.keys(formation?.formationLevels || {});
  const maxLevel = ids.length
    ? Math.max(...ids.map(id => getFormationLevel(formation, id)))
    : 1;

  let allPartsMax = false;
  for (const id of ids) {
    const formationLevel = getFormationLevel(formation, id);
    const slots = getFormationSlotLevels(formation, id);
    const eye = getFormationEye(formation, id);
    const heart = getFormationHeart(formation, id);

    if (
      formationLevel >= 100 &&
      slots.length > 0 &&
      slots.every(level => level >= 100) &&
      eye.level >= 100 &&
      heart.level >= 100
    ) {
      allPartsMax = true;
      break;
    }
  }

  return {
    formationMaxLevel: maxLevel,
    formationAllPartsMax: allPartsMax ? 1 : 0,
  };
}

function getRawMetric(snapshot, metric) {
  const { profile, formation, state } = snapshot;

  const map = {
    cultivateCount: profileStat(profile, 'cultivateCount'),
    breakthroughSuccess: profileStat(profile, 'breakthroughSuccess'),
    adventureCount: profileStat(profile, 'adventureCount'),
    alchemySuccess: profileStat(profile, 'alchemySuccess'),
    forgeSuccess: profileStat(profile, 'forgeSuccess'),
    petOwnedCount: countOwnedPets(profile),
    petCollectionComplete: isPetCollectionComplete(profile) ? 1 : 0,
    highestSpiritStones: Math.max(
      0,
      Number(state.stats.highestSpiritStones) || 0,
      Number(profile.spiritStones) || 0,
    ),
    worldBossAttacks: Math.max(0, Number(state.stats.worldBossAttacks) || 0),
    worldBossKills: Math.max(0, Number(state.stats.worldBossKills) || 0),
    worldBossBestHit: Math.max(0, Number(state.stats.worldBossBestHit) || 0),
    worldBossTop1: Math.max(0, Number(state.stats.worldBossTop1) || 0),
    ...formationMetrics(formation),
  };

  return Math.max(0, Number(map[metric]) || 0);
}

function calculateProgress(snapshot) {
  const baseDefinitions = ACHIEVEMENT_DEFINITIONS.filter(
    item => item.metric !== 'achievementCompleted',
  );

  const baseProgress = baseDefinitions.map(item => {
    const current = getRawMetric(snapshot, item.metric);
    return {
      ...item,
      current,
      completed: current >= item.target,
      claimed: snapshot.state.claimed?.[item.id] === true,
    };
  });

  const completedBase = baseProgress.filter(item => item.completed).length;
  const journeyProgress = ACHIEVEMENT_DEFINITIONS
    .filter(item => item.metric === 'achievementCompleted')
    .map(item => ({
      ...item,
      current: completedBase,
      completed: completedBase >= item.target,
      claimed: snapshot.state.claimed?.[item.id] === true,
    }));

  return [...baseProgress, ...journeyProgress];
}

export async function getAchievementSnapshot(client, guildId, userId) {
  const [profile, formation, state] = await Promise.all([
    getCultivationProfile(client, guildId, userId),
    getFormationState(client, guildId, userId),
    getAchievementState(client, guildId, userId),
  ]);

  const currentStones = Math.max(0, Number(profile.spiritStones) || 0);
  if (currentStones > (Number(state.stats.highestSpiritStones) || 0)) {
    state.stats.highestSpiritStones = currentStones;
    await saveState(client, state);
  }

  const snapshot = { profile, formation, state };
  const achievements = calculateProgress(snapshot);
  const completed = achievements.filter(item => item.completed).length;
  const claimed = achievements.filter(item => item.claimed).length;
  const points = achievements
    .filter(item => item.completed)
    .reduce((sum, item) => sum + item.points, 0);

  return {
    ...snapshot,
    achievements,
    completed,
    claimed,
    points,
  };
}

export async function claimAchievement(client, guildId, userId, achievementId) {
  const lockKey = `cultivation-achievement:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const snapshot = await getAchievementSnapshot(client, guildId, userId);
    const achievement = snapshot.achievements.find(item => item.id === achievementId);

    if (!achievement) {
      return { ok: false, reason: 'not_found' };
    }

    if (!achievement.completed) {
      return { ok: false, reason: 'not_completed', achievement };
    }

    if (snapshot.state.claimed?.[achievement.id] === true) {
      return { ok: false, reason: 'already_claimed', achievement };
    }

    // Khóa trạng thái trước khi cộng thưởng để double-click không thể nhận 2 lần.
    snapshot.state.claimed[achievement.id] = true;

    if (achievement.title) {
      snapshot.state.titles.unlocked = [
        ...new Set([
          ...snapshot.state.titles.unlocked,
          achievement.title,
        ]),
      ];

      if (!snapshot.state.titles.equipped) {
        snapshot.state.titles.equipped = achievement.title;
      }
    }

    await saveState(client, snapshot.state);

    snapshot.profile.spiritStones =
      Math.max(0, Number(snapshot.profile.spiritStones) || 0) +
      Math.max(0, Number(achievement.reward) || 0);

    const savedProfile = await saveCultivationProfile(client, snapshot.profile);

    if (!savedProfile) {
      snapshot.state.claimed[achievement.id] = false;
      await saveState(client, snapshot.state);
      return { ok: false, reason: 'save_failed', achievement };
    }

    snapshot.state.stats.highestSpiritStones = Math.max(
      Number(snapshot.state.stats.highestSpiritStones) || 0,
      Number(savedProfile.spiritStones) || 0,
    );
    await saveState(client, snapshot.state);

    return {
      ok: true,
      achievement,
      profile: savedProfile,
      state: snapshot.state,
    };
  });
}

export async function recordWorldBossAchievementStats(
  client,
  guildId,
  userId,
  {
    attacks = 0,
    kills = 0,
    bestHit = 0,
    top1 = 0,
  } = {},
) {
  const lockKey = `cultivation-achievement:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const state = await getAchievementState(client, guildId, userId);
    state.stats.worldBossAttacks =
      Math.max(0, Number(state.stats.worldBossAttacks) || 0) + Math.max(0, attacks);
    state.stats.worldBossKills =
      Math.max(0, Number(state.stats.worldBossKills) || 0) + Math.max(0, kills);
    state.stats.worldBossBestHit = Math.max(
      Math.max(0, Number(state.stats.worldBossBestHit) || 0),
      Math.max(0, Number(bestHit) || 0),
    );
    state.stats.worldBossTop1 =
      Math.max(0, Number(state.stats.worldBossTop1) || 0) + Math.max(0, top1);
    return saveState(client, state);
  });
}

export async function setAchievementTitle(client, guildId, userId, title) {
  const lockKey = `cultivation-achievement:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const state = await getAchievementState(client, guildId, userId);
    if (title !== null && !state.titles.unlocked.includes(title)) {
      return { ok: false, reason: 'not_unlocked' };
    }
    state.titles.equipped = title;
    await saveState(client, state);
    return { ok: true, state };
  });
}
