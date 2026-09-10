import {
  ChannelType,
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getDatabaseValue,
  setDatabaseValue,
} from '../../utils/database.js';

import {
  CULTIVATION_MAINTENANCE_MESSAGE,
  CULTIVATION_RESUMED_MESSAGE,
  getCultivationMaintenance,
  setCultivationMaintenance,
} from '../../services/cultivationMaintenance.js';

const ADMIN_ROLE_ID =
  '1541303749916754001';

function getThreadKey(
  guildId,
  userId,
) {
  return `games:cultivation:thread:${guildId}:${userId}`;
}

function hasAdminRole(interaction) {
  return Boolean(
    interaction.member?.roles?.cache?.has?.(
      ADMIN_ROLE_ID,
    ),
  );
}

async function collectCultivationThreads(parentChannel) {
  const threads = new Map();

  const addCollection = (collection) => {
    for (const thread of collection?.values?.() || []) {
      if (
        thread?.isThread?.() &&
        thread.parentId === parentChannel.id
      ) {
        threads.set(thread.id, thread);
      }
    }
  };

  const active = await parentChannel.threads
    .fetchActive()
    .catch(() => null);

  addCollection(active?.threads);

  const archivedPublic = await parentChannel.threads
    .fetchArchived({
      type: 'public',
      fetchAll: true,
    })
    .catch(() => null);

  addCollection(archivedPublic?.threads);

  const archivedPrivate = await parentChannel.threads
    .fetchArchived({
      type: 'private',
      fetchAll: true,
    })
    .catch(() => null);

  addCollection(archivedPrivate?.threads);

  return [...threads.values()];
}

function getCustomIds(message) {
  const ids = [];

  for (const row of message.components || []) {
    for (const component of row.components || []) {
      if (component.customId) {
        ids.push(String(component.customId));
      }
    }
  }

  return ids;
}

function isCultivationDashboardMessage(
  message,
  botUserId,
) {
  if (
    !message ||
    message.author?.id !== botUserId
  ) {
    return false;
  }

  return getCustomIds(message).some(
    customId =>
      customId.startsWith('tutien_'),
  );
}

function extractOwnerId(message) {
  for (const customId of getCustomIds(message)) {
    if (!customId.startsWith('tutien_')) {
      continue;
    }

    const parts = customId.split(':');
    const possibleId = parts[1];

    if (/^\d{15,25}$/.test(possibleId || '')) {
      return possibleId;
    }
  }

  return null;
}

async function reopenThreadIfNeeded(thread) {
  try {
    if (thread.locked) {
      await thread.setLocked(false);
    }
  } catch {}

  try {
    if (thread.archived) {
      await thread.setArchived(false);
    }
  } catch {}
}

async function clearDashboardFromThread(
  thread,
  client,
  guildId,
) {
  await reopenThreadIfNeeded(thread);

  let deleted = 0;
  const owners = new Set();

  const messages = await thread.messages
    .fetch({ limit: 100 })
    .catch(() => null);

  if (messages) {
    for (const message of messages.values()) {
      if (
        !isCultivationDashboardMessage(
          message,
          client.user.id,
        )
      ) {
        continue;
      }

      const ownerId =
        extractOwnerId(message);

      if (ownerId) {
        owners.add(ownerId);
      }

      await message.delete()
        .then(() => {
          deleted += 1;
        })
        .catch(() => {});
    }
  }

  for (const ownerId of owners) {
    const key =
      getThreadKey(
        guildId,
        ownerId,
      );

    const saved =
      await getDatabaseValue(
        client,
        key,
        null,
      );

    if (
      saved?.threadId === thread.id
    ) {
      await setDatabaseValue(
        client,
        key,
        {
          ...saved,
          dashboardMessageId: null,
          updatedAt: Date.now(),
        },
      );
    }
  }

  return deleted;
}

async function broadcastToThreads(
  threads,
  content,
) {
  let sent = 0;

  for (const thread of threads) {
    await reopenThreadIfNeeded(thread);

    await thread.send({ content })
      .then(() => {
        sent += 1;
      })
      .catch(() => {});
  }

  return sent;
}

export default {
  category: 'Games',

  data:
    new SlashCommandBuilder()
      .setName('tutienmode')
      .setDescription('GM: Bật hoặc tạm đóng toàn bộ Tiên Lộ để cập nhật.')
      .addSubcommand(
        subcommand =>
          subcommand
            .setName('disable')
            .setDescription('Tạm đóng Tiên Lộ, xóa dashboard hiện tại và báo bảo trì.'),
      )
      .addSubcommand(
        subcommand =>
          subcommand
            .setName('enable')
            .setDescription('Mở lại Tiên Lộ và thông báo cho toàn bộ đạo hữu.'),
      ),

  async execute(interaction, _guildConfig, client) {
    const runtimeClient =
      client || interaction.client;

    if (
      !interaction.guild ||
      !interaction.guildId
    ) {
      return interaction.reply({
        content: 'Lệnh này chỉ dùng được trong server.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!hasAdminRole(interaction)) {
      return interaction.reply({
        content: '❌ Bạn không có quyền điều khiển trạng thái Tiên Lộ.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!runtimeClient?.db) {
      return interaction.reply({
        content: '❌ Database Tiên Lộ chưa sẵn sàng.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    const parentChannel =
      await interaction.guild.channels.fetch(
        CULTIVATION_CONFIG.channelId,
      ).catch(() => null);

    if (
      !parentChannel ||
      !parentChannel.threads
    ) {
      return interaction.editReply({
        content: `❌ Không tìm thấy kênh Tu Tiên <#${CULTIVATION_CONFIG.channelId}> hoặc kênh không hỗ trợ chủ đề.`,
      });
    }

    const action =
      interaction.options.getSubcommand(true);

    const state =
      await getCultivationMaintenance(
        runtimeClient,
        interaction.guildId,
      );

    const threads =
      await collectCultivationThreads(
        parentChannel,
      );

    if (action === 'disable') {
      if (state.enabled) {
        return interaction.editReply({
          content: '⚔️ Tiên Lộ hiện đã ở trạng thái bế quan cập nhật rồi.',
        });
      }

      await setCultivationMaintenance(
        runtimeClient,
        interaction.guildId,
        true,
        interaction.user.id,
      );

      let deletedDashboards = 0;

      for (const thread of threads) {
        deletedDashboards +=
          await clearDashboardFromThread(
            thread,
            runtimeClient,
            interaction.guildId,
          );
      }

      const sent =
        await broadcastToThreads(
          threads,
          CULTIVATION_MAINTENANCE_MESSAGE,
        );

      return interaction.editReply({
        content:
          `⚔️ **Đã bế quan Tiên Lộ.**\n` +
          `• Giữ nguyên **${threads.length}** chủ đề Tiên Lộ.\n` +
          `• Đã xóa **${deletedDashboards}** dashboard đang mở.\n` +
          `• Đã gửi thông báo cập nhật tới **${sent}** chủ đề.\n` +
          '• Người chơi tạm thời không thể mở `/tutien` hoặc dùng các nút Tiên Lộ.',
      });
    }

    if (action === 'enable') {
      if (!state.enabled) {
        return interaction.editReply({
          content: '🌸 Tiên Lộ hiện đã mở sẵn rồi.',
        });
      }

      await setCultivationMaintenance(
        runtimeClient,
        interaction.guildId,
        false,
        interaction.user.id,
      );

      const sent =
        await broadcastToThreads(
          threads,
          CULTIVATION_RESUMED_MESSAGE,
        );

      return interaction.editReply({
        content:
          `🌸 **Tiên môn đã tái khai.**\n` +
          `• Đã gửi thông báo mở lại tới **${sent}/${threads.length}** chủ đề.\n` +
          '• Mỗi đạo hữu có thể vào chủ đề riêng và dùng `/tutien` để mở dashboard mới.',
      });
    }

    return interaction.editReply({
      content: '❌ Không xác định được chế độ Tiên Lộ.',
    });
  },
};
