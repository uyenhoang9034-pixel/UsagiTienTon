import {
  ChannelType,
  Events,
} from 'discord.js';

import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

import { logger } from '../utils/logger.js';

const CULTIVATION_CHANNEL_ID =
  '1547233544412205066';

const CULTIVATION_ROLE_ID =
  '1547581204759318579';

function getThreadKey(
  guildId,
  userId,
) {
  return `games:cultivation:thread:${guildId}:${userId}`;
}

function buildThreadName(member) {
  const rawName =
    member.displayName ||
    member.user?.globalName ||
    member.user?.username ||
    member.id;

  return `🌸 Tiên Lộ · ${rawName}`
    .slice(0, 100);
}

async function fetchExistingThread(
  guild,
  threadId,
) {
  if (!threadId) {
    return null;
  }

  try {
    const channel =
      await guild.channels.fetch(
        threadId,
      );

    return channel?.isThread?.()
      ? channel
      : null;
  } catch {
    return null;
  }
}

async function restoreThread(
  thread,
  member,
) {
  try {
    if (thread.locked) {
      await thread.setLocked(false);
    }
  } catch (error) {
    logger.warn(
      `[CULTIVATION THREAD] Could not unlock ${thread.id}:`,
      error,
    );
  }

  try {
    if (thread.archived) {
      await thread.setArchived(false);
    }
  } catch (error) {
    logger.warn(
      `[CULTIVATION THREAD] Could not unarchive ${thread.id}:`,
      error,
    );
  }

  try {
    await thread.members.add(
      member.id,
    );
  } catch (error) {
    logger.warn(
      `[CULTIVATION THREAD] Could not add ${member.id} to ${thread.id}:`,
      error,
    );
  }

  return thread;
}

async function createPersonalThread(
  parentChannel,
  member,
) {
  const commonOptions = {
    name:
      buildThreadName(
        member,
      ),
    autoArchiveDuration:
      1440,
    reason:
      `Tiên Lộ cá nhân cho ${member.user?.tag || member.id}`,
  };

  let thread;

  try {
    thread =
      await parentChannel
        .threads
        .create({
          ...commonOptions,
          type:
            ChannelType.PrivateThread,
          invitable:
            false,
        });
  } catch (privateError) {
    logger.warn(
      '[CULTIVATION THREAD] Private thread creation failed; falling back to public thread:',
      privateError,
    );

    thread =
      await parentChannel
        .threads
        .create({
          ...commonOptions,
          type:
            ChannelType.PublicThread,
        });
  }

  await thread.members.add(
    member.id,
  );

  await thread.send({
    content:
      `🌸 <@${member.id}> — Tiên Lộ của đạo hữu đã được khai mở.\n` +
      'Hãy dùng `/tutien` **một lần duy nhất** tại đây để mở giao diện tu hành. Sau đó tiếp tục chơi trên chính giao diện ấy, không mở thêm giao diện mới.',
  });

  return thread;
}

async function handleRoleGranted(
  member,
  client,
) {
  const parentChannel =
    await member.guild.channels.fetch(
      CULTIVATION_CHANNEL_ID,
    );

  if (
    !parentChannel ||
    !parentChannel.threads
  ) {
    logger.error(
      `[CULTIVATION THREAD] Channel ${CULTIVATION_CHANNEL_ID} is not a thread-capable channel.`,
    );
    return;
  }

  const key =
    getThreadKey(
      member.guild.id,
      member.id,
    );

  const saved =
    await getDatabaseValue(
      client,
      key,
      null,
    );

  const existingThread =
    await fetchExistingThread(
      member.guild,
      saved?.threadId,
    );

  if (existingThread) {
    await restoreThread(
      existingThread,
      member,
    );

    await setDatabaseValue(
      client,
      key,
      {
        ...(saved || {}),
        threadId:
          existingThread.id,
        userId:
          member.id,
        updatedAt:
          Date.now(),
      },
    );

    return;
  }

  const thread =
    await createPersonalThread(
      parentChannel,
      member,
    );

  await setDatabaseValue(
    client,
    key,
    {
      threadId:
        thread.id,
      dashboardMessageId:
        null,
      userId:
        member.id,
      createdAt:
        Date.now(),
      updatedAt:
        Date.now(),
    },
  );

  logger.info(
    `[CULTIVATION THREAD] Created ${thread.id} for ${member.id}.`,
  );
}

async function handleRoleRemoved(
  member,
  client,
) {
  const key =
    getThreadKey(
      member.guild.id,
      member.id,
    );

  const saved =
    await getDatabaseValue(
      client,
      key,
      null,
    );

  const thread =
    await fetchExistingThread(
      member.guild,
      saved?.threadId,
    );

  if (!thread) {
    return;
  }

  try {
    if (!thread.archived) {
      await thread.setArchived(true);
    }
  } catch (error) {
    logger.warn(
      `[CULTIVATION THREAD] Could not archive ${thread.id}:`,
      error,
    );
  }

  try {
    if (!thread.locked) {
      await thread.setLocked(true);
    }
  } catch (error) {
    logger.warn(
      `[CULTIVATION THREAD] Could not lock ${thread.id}:`,
      error,
    );
  }

  await setDatabaseValue(
    client,
    key,
    {
      ...(saved || {}),
      threadId:
        thread.id,
      userId:
        member.id,
      updatedAt:
        Date.now(),
    },
  );
}

export default {
  name:
    Events.GuildMemberUpdate,

  async execute(
    oldMember,
    newMember,
    client,
  ) {
    try {
      if (
        newMember.user?.bot ||
        !client?.db
      ) {
        return;
      }

      const hadRole =
        oldMember.roles.cache.has(
          CULTIVATION_ROLE_ID,
        );

      const hasRole =
        newMember.roles.cache.has(
          CULTIVATION_ROLE_ID,
        );

      if (
        !hadRole &&
        hasRole
      ) {
        await handleRoleGranted(
          newMember,
          client,
        );
        return;
      }

      if (
        hadRole &&
        !hasRole
      ) {
        await handleRoleRemoved(
          newMember,
          client,
        );
      }
    } catch (error) {
      logger.error(
        '[CULTIVATION THREAD] GuildMemberUpdate error:',
        error,
      );
    }
  },
};
