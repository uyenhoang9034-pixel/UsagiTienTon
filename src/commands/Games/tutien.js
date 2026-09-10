import {
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
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildDashboardEmbed,
  buildDashboardRows,
} from '../../services/cultivationUI.js';

const CULTIVATION_ROLE_ID =
  '1547581204759318579';

function getThreadKey(
  guildId,
  userId,
) {
  return `games:cultivation:thread:${guildId}:${userId}`;
}

async function replyEphemeral(
  interaction,
  content,
) {
  return interaction.reply({
    content,
    flags:
      MessageFlags.Ephemeral,
  });
}

async function replyCommandError(
  interaction,
  error,
) {
  console.error(
    '[TU TIEN COMMAND ERROR]',
    error,
  );

  const content =
    'Tiên Lộ đang gặp lỗi khi mở hồ sơ. Thử lại sau một chút nhé.';

  if (
    interaction.deferred ||
    interaction.replied
  ) {
    return interaction.editReply({
      content,
      embeds: [],
      components: [],
    });
  }

  return replyEphemeral(
    interaction,
    content,
  );
}

async function hasExistingDashboard(
  interaction,
  dashboardMessageId,
) {
  if (!dashboardMessageId) {
    return false;
  }

  try {
    const message =
      await interaction.channel.messages.fetch(
        dashboardMessageId,
      );

    return Boolean(message);
  } catch {
    return false;
  }
}

export default {
  category:
    'Games',

  data:
    new SlashCommandBuilder()
      .setName(
        'tutien',
      )
      .setDescription(
        'Mở Tiên Lộ và bắt đầu hành trình tu tiên cùng Usagi.',
      ),

  async execute(
    interaction,
    _guildConfig,
    client,
  ) {
    try {
      /**
       * =====================================================
       * SERVER ONLY
       * =====================================================
       */

      if (
        !interaction.guildId ||
        !interaction.guild
      ) {
        return replyEphemeral(
          interaction,
          'Tiên Lộ chỉ có thể được sử dụng trong server.',
        );
      }

      /**
       * =====================================================
       * GAME ENABLED
       * =====================================================
       */

      if (
        !CULTIVATION_CONFIG
          .enabled
      ) {
        return replyEphemeral(
          interaction,
          'Tiên Lộ hiện đang tạm đóng.',
        );
      }

      const runtimeClient =
        client ||
        interaction.client;

      if (
        !runtimeClient?.db
      ) {
        throw new Error(
          'Cultivation database is not available.',
        );
      }

      /**
       * =====================================================
       * ROLE LOCK
       * =====================================================
       */

      const member =
        await interaction.guild.members.fetch(
          interaction.user.id,
        );

      if (
        !member.roles.cache.has(
          CULTIVATION_ROLE_ID,
        )
      ) {
        return replyEphemeral(
          interaction,
          '🌸 Đạo hữu chưa có Role Tu Tiên nên chưa thể khai mở Tiên Lộ.',
        );
      }

      /**
       * =====================================================
       * PERSONAL THREAD LOCK
       * =====================================================
       *
       * /tutien không còn chạy trực tiếp trong #tu-tiên.
       * Người chơi chỉ được mở game trong chủ đề Tiên Lộ
       * đã được bot tạo riêng cho chính mình.
       */

      if (
        !interaction.channel?.isThread?.() ||
        interaction.channel.parentId !==
          CULTIVATION_CONFIG.channelId
      ) {
        return replyEphemeral(
          interaction,
          `🌸 Đạo hữu hãy tiến vào **chủ đề Tiên Lộ của riêng mình** bên trong <#${CULTIVATION_CONFIG.channelId}> rồi dùng \`/tutien\` tại đó.`,
        );
      }

      const threadKey =
        getThreadKey(
          interaction.guildId,
          interaction.user.id,
        );

      const threadData =
        await getDatabaseValue(
          runtimeClient,
          threadKey,
          null,
        );

      if (
        !threadData?.threadId ||
        threadData.threadId !==
          interaction.channelId
      ) {
        return replyEphemeral(
          interaction,
          '🌸 Đây không phải Tiên Lộ của đạo hữu. Hãy sử dụng `/tutien` trong đúng chủ đề riêng của mình.',
        );
      }

      /**
       * =====================================================
       * ONE DASHBOARD ONLY
       * =====================================================
       */

      if (
        await hasExistingDashboard(
          interaction,
          threadData.dashboardMessageId,
        )
      ) {
        return replyEphemeral(
          interaction,
          `🌸 Đạo hữu đã có một giao diện Tiên Lộ đang mở trong chủ đề này. Hãy tiếp tục tu luyện trên giao diện đó, không cần dùng \`/tutien\` thêm lần nữa.`,
        );
      }

      await interaction.deferReply();

      /**
       * =====================================================
       * PROFILE
       * =====================================================
       */

      const existingProfile =
        await getCultivationProfile(
          runtimeClient,
          interaction.guildId,
          interaction.user.id,
          {
            create:
              false,
          },
        );

      const profile =
        existingProfile ||
        await getCultivationProfile(
          runtimeClient,
          interaction.guildId,
          interaction.user.id,
          {
            create:
              true,
          },
        );

      /**
       * =====================================================
       * DASHBOARD
       * =====================================================
       */

      const dashboardMessage =
        await interaction.editReply({
          embeds: [
            buildDashboardEmbed(
              interaction.user,
              profile,
              {
                isNew:
                  !existingProfile,
              },
            ),
          ],

          components:
            buildDashboardRows(
              interaction.user.id,
            ),
        });

      await setDatabaseValue(
        runtimeClient,
        threadKey,
        {
          ...threadData,
          threadId:
            interaction.channelId,
          dashboardMessageId:
            dashboardMessage.id,
          userId:
            interaction.user.id,
          updatedAt:
            Date.now(),
        },
      );

      return dashboardMessage;
    } catch (error) {
      return replyCommandError(
        interaction,
        error,
      );
    }
  },
};
