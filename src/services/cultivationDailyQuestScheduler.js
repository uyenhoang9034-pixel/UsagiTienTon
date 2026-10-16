import { logger } from '../utils/logger.js';

import {
  clearDailyQuestPreviousMessageId,
  isDailyQuestComplete,
  rollDailyQuests,
  setDailyQuestMessageId,
  syncDailyQuests,
} from './cultivationDailyQuest.js';

import {
  buildDailyQuestEmbed,
  buildDailyQuestRows,
} from './cultivationDailyQuestUI.js';

import {
  getAchievementSnapshot,
} from './cultivationAchievement.js';

const THREAD_PREFIX = 'games:cultivation:thread:';
// Tăng lên 5 phút (300_000ms) để giảm tải CPU, REST API và Network Egress trên Railway
const CHECK_INTERVAL_MS = 5 * 60_000;

let timer = null;
let running = false;
const lastRenderedSignatures = new Map();

async function reopenThread(thread) {
  try {
    if (thread.locked) await thread.setLocked(false);
  } catch {}

  try {
    if (thread.archived) await thread.setArchived(false);
  } catch {}
}

async function fetchMessage(thread, messageId) {
  if (!messageId) return null;

  return thread.messages
    .fetch(messageId)
    .catch(() => null);
}

async function deleteMessage(thread, messageId) {
  const message = await fetchMessage(thread, messageId);
  if (!message) return false;

  return message.delete()
    .then(() => true)
    .catch(() => false);
}

function getThreadKey(guildId, userId) {
  return `${THREAD_PREFIX}${guildId}:${userId}`;
}

async function setThreadDailyQuestMessageId(
  client,
  guildId,
  userId,
  messageId,
) {
  const key = getThreadKey(guildId, userId);
  const saved = await client.db.get(key, null);
  if (!saved) return;

  await client.db.set(key, {
    ...saved,
    dailyQuestMessageId: messageId || null,
    updatedAt: Date.now(),
  });
}

async function getThreadEntries(client, guild) {
  if (!client.db || typeof client.db.list !== 'function') {
    return [];
  }

  const prefix = `${THREAD_PREFIX}${guild.id}:`;
  const keys = await client.db.list(prefix);
  const entries = [];

  for (const key of keys || []) {
    const userId = String(key).slice(prefix.length);
    if (!/^\d{15,25}$/.test(userId)) continue;

    const saved = await client.db.get(key, null);
    if (!saved?.threadId) continue;

    entries.push({
      userId,
      threadId: saved.threadId,
    });
  }

  return entries;
}

async function processPlayer(client, guild, entry) {
  const playerKey = `${guild.id}:${entry.userId}`;

  // Tận dụng cache của Discord.js trước khi gọi REST API để tiết kiệm băng thông và CPU
  const thread =
    guild.channels.cache.get(entry.threadId) ||
    (await guild.channels.fetch(entry.threadId).catch(() => null));

  if (!thread?.isThread?.()) return;

  await reopenThread(thread);

  let state = await rollDailyQuests(
    client,
    guild.id,
    entry.userId,
  );

  // Khi sang ngày mới, panel ngày cũ phải biến mất trước khi đăng panel mới.
  if (state.previousMessageId) {
    await deleteMessage(thread, state.previousMessageId);
    state = await clearDailyQuestPreviousMessageId(
      client,
      guild.id,
      entry.userId,
    );
    await setThreadDailyQuestMessageId(
      client,
      guild.id,
      entry.userId,
      null,
    );
    lastRenderedSignatures.delete(playerKey);
  }

  state = await syncDailyQuests(
    client,
    guild.id,
    entry.userId,
  );

  // Đồng thời ghi nhận mốc Linh Thạch cao nhất cho Thành Tựu.
  await getAchievementSnapshot(
    client,
    guild.id,
    entry.userId,
  ).catch(() => null);

  // Hoàn thành toàn bộ: thưởng đã được sync/claim tự động, panel tự xóa.
  if (isDailyQuestComplete(state)) {
    if (state.messageId) {
      await deleteMessage(thread, state.messageId);
      await setDailyQuestMessageId(
        client,
        guild.id,
        entry.userId,
        null,
      );
      await setThreadDailyQuestMessageId(
        client,
        guild.id,
        entry.userId,
        null,
      );
    }
    lastRenderedSignatures.delete(playerKey);
    return;
  }

  // Tạo signature ngắn gọn để phát hiện tiến độ nhiệm vụ có thay đổi không
  const currentSignature = Array.isArray(state.quests)
    ? state.quests.map((q) => `${q.id}:${q.progress}:${q.completed ? 1 : 0}`).join('|')
    : '';

  // 🚀 TỐI ƯU CỰC MẠNH: Nếu panel đã tồn tại và tiến độ chưa thay đổi, BỎ QUA không edit!
  if (state.messageId && lastRenderedSignatures.get(playerKey) === currentSignature) {
    return;
  }

  const member =
    guild.members.cache.get(entry.userId) ||
    (await guild.members.fetch(entry.userId).catch(() => null));
  const user =
    member?.user ||
    client.users.cache.get(entry.userId) ||
    (await client.users.fetch(entry.userId).catch(() => null));

  if (!user) return;

  const payload = {
    embeds: [buildDailyQuestEmbed(user, state)],
    components: buildDailyQuestRows(entry.userId, state),
  };

  let message = await fetchMessage(thread, state.messageId);

  if (message) {
    await message.edit(payload).catch(() => null);
    lastRenderedSignatures.set(playerKey, currentSignature);
    await setThreadDailyQuestMessageId(
      client,
      guild.id,
      entry.userId,
      message.id,
    );
    return;
  }

  message = await thread.send(payload).catch(error => {
    logger.warn(
      `[DAILY QUEST] Không thể gửi Nhật Nhiệm cho ${entry.userId}: ${error?.message || error}`,
    );
    return null;
  });

  if (message?.id) {
    lastRenderedSignatures.set(playerKey, currentSignature);
    await setDailyQuestMessageId(
      client,
      guild.id,
      entry.userId,
      message.id,
    );
    await setThreadDailyQuestMessageId(
      client,
      guild.id,
      entry.userId,
      message.id,
    );
  }
}

export async function runCultivationDailyQuestCycle(client) {
  if (running || !client?.isReady?.()) return;
  running = true;

  try {
    for (const guild of client.guilds.cache.values()) {
      const entries = await getThreadEntries(client, guild);

      for (const entry of entries) {
        try {
          await processPlayer(client, guild, entry);
        } catch (error) {
          logger.warn(
            `[DAILY QUEST] Lỗi xử lý ${guild.id}/${entry.userId}: ${error?.message || error}`,
          );
        }
      }
    }
  } finally {
    running = false;
  }
}

export function startCultivationDailyQuestScheduler(client) {
  if (timer) return timer;

  // Chạy ngay khi bot online để tự bù trường hợp Railway restart qua 00:00.
  void runCultivationDailyQuestCycle(client);

  timer = setInterval(
    () => void runCultivationDailyQuestCycle(client),
    CHECK_INTERVAL_MS,
  );

  timer.unref?.();
  logger.info('Cultivation Daily Quest scheduler started.');
  return timer;
}
