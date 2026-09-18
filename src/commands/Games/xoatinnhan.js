import {
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';

const ADMIN_ROLE_ID = '1541303749916754001';
const MAX_DELETE_COUNT = 1000;
const FETCH_SIZE = 100;
const BULK_DELETE_AGE_MS = 14 * 24 * 60 * 60 * 1000;
const BULK_DELETE_SAFETY_MS = 60 * 1000;

function hasAdminRole(member) {
  return Boolean(member?.roles?.cache?.has(ADMIN_ROLE_ID));
}

function canManageMessages(channel) {
  return Boolean(
    channel?.isTextBased?.() &&
    typeof channel.messages?.fetch === 'function',
  );
}

async function fetchMessagesBefore(channel, before = null) {
  return channel.messages.fetch({
    limit: FETCH_SIZE,
    ...(before ? { before } : {}),
  });
}

async function deleteOldMessages(messages) {
  let deleted = 0;
  let failed = 0;

  for (const message of messages) {
    try {
      await message.delete();
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  return { deleted, failed };
}

export default {
  data: new SlashCommandBuilder()
    .setName('xoatinnhan')
    .setDescription('Admin: Xóa số lượng tin nhắn gần nhất trong kênh.')
    .addIntegerOption((option) =>
      option
        .setName('soluong')
        .setDescription(`Số tin cần xóa (1-${MAX_DELETE_COUNT}), gồm cả tin cũ.`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_DELETE_COUNT),
    ),

  category: 'Games',

  async execute(interaction) {
    try {
      if (!interaction.guildId || !interaction.guild) {
        return interaction.reply({
          content: 'Lệnh này chỉ có thể sử dụng trong server.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!hasAdminRole(interaction.member)) {
        return interaction.reply({
          content: 'Bạn không có quyền sử dụng lệnh xóa tin nhắn.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const channel = interaction.channel;

      if (!canManageMessages(channel)) {
        return interaction.reply({
          content: 'Kênh này không hỗ trợ xóa lịch sử tin nhắn.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const botMember = interaction.guild.members.me;
      const permissions = channel.permissionsFor?.(botMember);

      if (
        !permissions?.has(PermissionFlagsBits.ViewChannel) ||
        !permissions?.has(PermissionFlagsBits.ReadMessageHistory) ||
        !permissions?.has(PermissionFlagsBits.ManageMessages)
      ) {
        return interaction.reply({
          content:
            'Bot cần quyền **View Channel**, **Read Message History** và **Manage Messages** trong kênh này.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const requested = interaction.options.getInteger('soluong', true);

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      let remaining = requested;
      let deleted = 0;
      let failed = 0;
      let before = null;
      let reachedEnd = false;

      while (remaining > 0 && !reachedEnd) {
        const batch = await fetchMessagesBefore(channel, before);

        if (!batch.size) {
          reachedEnd = true;
          break;
        }

        const fetched = [...batch.values()];
        before = fetched[fetched.length - 1]?.id || null;

        const candidates = fetched.slice(0, remaining);

        if (!candidates.length) {
          reachedEnd = true;
          break;
        }

        const cutoff =
          Date.now() -
          BULK_DELETE_AGE_MS +
          BULK_DELETE_SAFETY_MS;

        const recent = candidates.filter(
          (message) => message.createdTimestamp > cutoff,
        );

        const old = candidates.filter(
          (message) => message.createdTimestamp <= cutoff,
        );

        if (recent.length > 0) {
          try {
            const result = await channel.bulkDelete(
              recent.map((message) => message.id),
              true,
            );
            const bulkDeleted = result?.size || 0;
            deleted += bulkDeleted;
            failed += Math.max(0, recent.length - bulkDeleted);
          } catch {
            const fallback = await deleteOldMessages(recent);
            deleted += fallback.deleted;
            failed += fallback.failed;
          }
        }

        if (old.length > 0) {
          const oldResult = await deleteOldMessages(old);
          deleted += oldResult.deleted;
          failed += oldResult.failed;
        }

        remaining -= candidates.length;

        if (batch.size < FETCH_SIZE) {
          reachedEnd = true;
        }
      }

      const lines = [
        `🧹 Đã xử lý **${requested.toLocaleString('vi-VN')}** tin nhắn gần nhất.`,
        `✅ Xóa thành công: **${deleted.toLocaleString('vi-VN')}**`,
      ];

      if (failed > 0) {
        lines.push(
          `⚠️ Không thể xóa: **${failed.toLocaleString('vi-VN')}**`,
        );
      }

      if (deleted + failed < requested) {
        lines.push(
          `ℹ️ Kênh chỉ còn **${(deleted + failed).toLocaleString('vi-VN')}** tin có thể tìm thấy trong phạm vi đã duyệt.`,
        );
      }

      return interaction.editReply({
        content: lines.join('\n'),
      });
    } catch (error) {
      console.error('[XOA TIN NHAN ERROR]', error);

      const content =
        `Xóa tin nhắn bị lỗi: \`${error?.message || 'Unknown error'}\``;

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content }).catch(() => {});
      }

      return interaction.reply({
        content,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  },
};
