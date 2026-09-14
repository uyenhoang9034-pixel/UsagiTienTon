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

const THREAD_PREFIX = 'games:cultivation:thread:';
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
  const thread = await guild.channels
    .fetch(entry.threadId)
    .catch(() => null);

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
  }

  state = await syncDailyQuests(
    client,
    guild.id,
    entry.userId,
  );

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
    }
    return;
  }

  const member = await guild.members
    .fetch(entry.userId)
    .catch(() => null);
  const user = member?.user || await client.users
    .fetch(entry.userId)
    .catch(() => null);

  if (!user) return;

  const payload = {
    embeds: [buildDailyQuestEmbed(user, state)],
    components: buildDailyQuestRows(entry.userId, state),
  };

  let message = await fetchMessage(thread, state.messageId);

  if (message) {
    await message.edit(payload).catch(() => null);
    return;
  }

  message = await thread.send(payload).catch(error => {
    logger.warn(
      `[DAILY QUEST] Không thể gửi Nhật Nhiệm cho ${entry.userId}: ${error?.message || error}`,
    );
    return null;
  });

  if (message?.id) {
    await setDailyQuestMessageId(
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
