import { Mutex } from '../utils/mutex.js';
import { getDatabaseValue, setDatabaseValue } from '../utils/database.js';
import { getCultivationProfile, saveCultivationProfile, addInventoryItem } from './cultivationService.js';

const KEY_PREFIX = 'games:cultivation:immortal-order:';
const DUNGEON_KEY_PREFIX = 'games:cultivation:dungeon:';
export const IMMORTAL_ORDER_EMOJI = '<:tttienlenh:1549055213048959070>';

export const IMMORTAL_ORDER_QUESTS = [
  { id: 'cultivate_100', category: 'cultivation', name: 'Nhất Tâm Tu Đạo', description: 'Tu luyện 100 lần', metric: 'cultivateCount', target: 100, points: 100 },
  { id: 'breakthrough_10', category: 'cultivation', name: 'Nghịch Thiên Cải Mệnh', description: 'Đột phá thành công 10 lần', metric: 'breakthroughSuccess', target: 10, points: 150 },
  { id: 'dungeon_10', category: 'dungeon', name: 'Bí Cảnh Sơ Thám', description: 'Vượt thành công 10 tầng Bí Cảnh', metric: 'dungeonClears', target: 10, points: 50 },
  { id: 'dungeon_50', category: 'dungeon', name: 'Bí Cảnh Chinh Phục', description: 'Vượt thành công 50 tầng Bí Cảnh', metric: 'dungeonClears', target: 50, points: 150 },
  { id: 'dungeon_100', category: 'dungeon', name: 'Vạn Cảnh Quy Phục', description: 'Vượt thành công 100 tầng Bí Cảnh', metric: 'dungeonClears', target: 100, points: 300 },
  { id: 'boss_attack_10', category: 'boss', name: 'Trảm Ma Thập Chiến', description: 'Khiêu chiến Boss Thế Giới 10 lần', metric: 'bossAttacks', target: 10, points: 100 },
  { id: 'boss_damage_100m', category: 'boss', name: 'Tru Ma Đại Nghiệp', description: 'Gây tổng 100.000.000 sát thương Boss Thế Giới', metric: 'bossDamage', target: 100_000_000, points: 250 },
  { id: 'alchemy_30', category: 'craft', name: 'Đan Đạo Sơ Thành', description: 'Luyện đan thành công 30 lần', metric: 'alchemySuccess', target: 30, points: 100 },
  { id: 'forge_30', category: 'craft', name: 'Luyện Khí Đại Sư', description: 'Luyện khí thành công 30 lần', metric: 'forgeSuccess', target: 30, points: 100 },
  { id: 'formation_spend_500', category: 'formation', name: 'Trận Đạo Nhập Môn', description: 'Tiêu tổng cộng 500 Trận Văn', metric: 'formationEssenceSpent', target: 500, points: 100 },
  { id: 'formation_spend_2000', category: 'formation', name: 'Trận Đạo Đại Thành', description: 'Tiêu tổng cộng 2.000 Trận Văn', metric: 'formationEssenceSpent', target: 2000, points: 250 },
];

export const IMMORTAL_ORDER_MILESTONES = [
  { points: 100, spiritStones: 100_000, items: { thien_linh_thao: 3 } },
  { points: 250, spiritStones: 250_000, items: { huyen_thiet: 3 } },
  { points: 500, spiritStones: 500_000, items: { vo_danh_kiem_pho: 2 } },
  { points: 800, spiritStones: 800_000, items: { co_phu: 2 } },
  { points: 1200, spiritStones: 1_200_000, items: { thien_linh_thao: 5, huyen_thiet: 5 } },
  { points: 1800, spiritStones: 1_800_000, items: { vo_danh_kiem_pho: 3, co_phu: 3 } },
  { points: 2500, spiritStones: 2_500_000, items: { thien_linh_thao: 10, huyen_thiet: 10, vo_danh_kiem_pho: 5, co_phu: 5 } },
];

function key(guildId, userId) { return `${KEY_PREFIX}${guildId}:${userId}`; }
function dungeonKey(guildId, userId) { return `${DUNGEON_KEY_PREFIX}${guildId}:${userId}`; }
function num(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
function normalize(raw, guildId, userId) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    version: 1,
    guildId,
    userId,
    points: num(source.points),
    metrics: source.metrics && typeof source.metrics === 'object' ? { ...source.metrics } : {},
    completed: source.completed && typeof source.completed === 'object' ? { ...source.completed } : {},
    claimedMilestones: source.claimedMilestones && typeof source.claimedMilestones === 'object' ? { ...source.claimedMilestones } : {},
    updatedAt: Date.now(),
  };
}

async function save(client, state) {
  state.updatedAt = Date.now();
  await setDatabaseValue(client, key(state.guildId, state.userId), state);
  return state;
}

export async function getImmortalOrderState(client, guildId, userId) {
  return normalize(await getDatabaseValue(client, key(guildId, userId), null), guildId, userId);
}

function settleCompleted(state) {
  const newlyCompleted = [];
  for (const quest of IMMORTAL_ORDER_QUESTS) {
    if (state.completed[quest.id]) continue;
    if (num(state.metrics[quest.metric]) < quest.target) continue;
    state.completed[quest.id] = Date.now();
    state.points += quest.points;
    newlyCompleted.push(quest);
  }
  return newlyCompleted;
}

async function syncCoreProgress(client, guildId, userId, state, profile) {
  const dungeon = await getDatabaseValue(client, dungeonKey(guildId, userId), null);
  state.metrics.cultivateCount = Math.max(
    num(state.metrics.cultivateCount),
    num(profile?.stats?.cultivateCount),
  );
  state.metrics.breakthroughSuccess = Math.max(
    num(state.metrics.breakthroughSuccess),
    num(profile?.stats?.breakthroughSuccess),
  );
  state.metrics.dungeonClears = Math.max(
    num(state.metrics.dungeonClears),
    num(dungeon?.clears),
  );
  return state;
}

export async function addImmortalOrderProgress(client, guildId, userId, metric, amount = 1) {
  return Mutex.runExclusive(`cultivation:immortal-order:${guildId}:${userId}`, async () => {
    const state = await getImmortalOrderState(client, guildId, userId);
    state.metrics[metric] = num(state.metrics[metric]) + num(amount);
    const newlyCompleted = settleCompleted(state);
    await save(client, state);
    return { state, newlyCompleted };
  });
}

export async function getImmortalOrderSnapshot(client, guildId, userId) {
  const [state, profile] = await Promise.all([
    getImmortalOrderState(client, guildId, userId),
    getCultivationProfile(client, guildId, userId),
  ]);
  await syncCoreProgress(client, guildId, userId, state, profile);
  settleCompleted(state);
  await save(client, state);
  const quests = IMMORTAL_ORDER_QUESTS.map(quest => ({
    ...quest,
    progress: Math.min(quest.target, num(state.metrics[quest.metric])),
    completed: Boolean(state.completed[quest.id]),
  }));
  return {
    state,
    profile,
    quests,
    completedCount: quests.filter(q => q.completed).length,
    totalCount: quests.length,
    nextMilestone: IMMORTAL_ORDER_MILESTONES.find(m => m.points > state.points) || null,
  };
}

export async function claimImmortalOrderMilestone(client, guildId, userId, milestonePoints) {
  return Mutex.runExclusive(`cultivation:immortal-order:claim:${guildId}:${userId}`, async () => {
    const milestone = IMMORTAL_ORDER_MILESTONES.find(entry => entry.points === num(milestonePoints));
    if (!milestone) return { ok: false, reason: 'unknown_milestone' };
    const state = await getImmortalOrderState(client, guildId, userId);
    const profile = await getCultivationProfile(client, guildId, userId);
    await syncCoreProgress(client, guildId, userId, state, profile);
    settleCompleted(state);
    if (state.claimedMilestones[String(milestone.points)]) return { ok: false, reason: 'already_claimed', milestone };
    if (state.points < milestone.points) return { ok: false, reason: 'not_reached', milestone };

    // Persist claim marker before delivering reward to make repeated button presses idempotent.
    state.claimedMilestones[String(milestone.points)] = Date.now();
    await save(client, state);

    profile.spiritStones = num(profile.spiritStones) + milestone.spiritStones;
    for (const [itemId, quantity] of Object.entries(milestone.items || {})) addInventoryItem(profile, itemId, quantity);
    await saveCultivationProfile(client, profile);
    return { ok: true, milestone, state };
  });
}
