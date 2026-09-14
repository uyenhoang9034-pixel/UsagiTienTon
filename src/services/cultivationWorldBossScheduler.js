import { logger } from '../utils/logger.js';

import {
  ensureWorldBoss,
  finalizeWorldBoss,
  getCultivationThreadData,
  getWorldBossState,
  listPendingWorldBossRewards,
  saveWorldBossReward,
} from './cultivationWorldBoss.js';

import {
  buildWorldBossRewardMessage,
} from './cultivationWorldBossUI.js';

const WORLD_BOSS_PREFIX = 'games:cultivation:worldBoss:';
const CHECK_INTERVAL_MS = 60_000;

let timer = null;
let running = false;

async function reopenThread(thread) {
  try {
    if (thread.locked) await thread.setLocked(false);
  } catch {}

  try {
    if (thread.archived) await thread.setArchived(false);
  } catch {}
}

async function settleExpiredBosses(client, guildId) {
  if (!client.db?.list) return;

  const prefix = `${WORLD_BOSS_PREFIX}${guildId}:`;
  const keys = await client.db.list(prefix);

  for (const key of keys || []) {
    const state = await client.db.get(key, null);
    if (!state || state.status !== 'active') continue;

    if (Date.now() >= Number(state.endsAt || 0)) {
      await finalizeWorldBoss(
        client,
        guildId,
        state.eventId,
        state.currentHp <= 0 ? 'defeated' : 'escaped',
      );
    }
  }
}

export async function deliverPendingWorldBossReward(client, guild, record) {
  const threadData = await getCultivationThreadData(
    client,
    guild.id,
    record.userId,
  );

  if (!threadData?.threadId) {
    logger.warn(
      `[WORLD BOSS] Không tìm thấy thread của ${record.userId} để gửi thưởng ${record.eventId}.`,
    );
    return false;
  }

  const thread = await guild.channels
    .fetch(threadData.threadId)
    .catch(() => null);

  if (!thread?.isThread?.()) {
    logger.warn(
      `[WORLD BOSS] Thread ${threadData.threadId} của ${record.userId} không tồn tại hoặc không còn là thread.`,
    );
    return false;
  }

  await reopenThread(thread);

  if (record.messageId) {
    const existing = await thread.messages
      .fetch(record.messageId)
      .catch(() => null);

    if (existing) return true;
  }

  const message = await thread
    .send(buildWorldBossRewardMessage(record))
    .catch(error => {
      logger.warn(
        `[WORLD BOSS] Không thể gửi thưởng ${record.eventId}/${record.userId}: ${error?.message || error}`,
      );
      return null;
    });

  if (!message?.id) return false;

  record.messageId = message.id;
  await saveWorldBossReward(client, record);
  return true;
}

export async function deliverPendingWorldBossRewardsForGuild(client, guild) {
  const pending = await listPendingWorldBossRewards(client, guild.id);
  let sent = 0;

  for (const record of pending) {
    if (await deliverPendingWorldBossReward(client, guild, record)) {
      sent += 1;
    }
  }

  return sent;
}

export async function runCultivationWorldBossCycle(client) {
  if (running || !client?.isReady?.()) return;
  running = true;

  try {
    for (const guild of client.guilds.cache.values()) {
      try {
        await settleExpiredBosses(client, guild.id);
        await ensureWorldBoss(client, guild.id);
        await getWorldBossState(client, guild.id);
        await deliverPendingWorldBossRewardsForGuild(client, guild);
      } catch (error) {
        logger.warn(
          `[WORLD BOSS] Lỗi vòng đời guild ${guild.id}: ${error?.message || error}`,
        );
      }
    }
  } finally {
    running = false;
  }
}

export function startCultivationWorldBossScheduler(client) {
  if (timer) return timer;

  void runCultivationWorldBossCycle(client);

  timer = setInterval(
    () => void runCultivationWorldBossCycle(client),
    CHECK_INTERVAL_MS,
  );

  timer.unref?.();
  logger.info('Cultivation World Boss scheduler started.');
  return timer;
}
