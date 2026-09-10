import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildDashboardEmbed,
  buildDashboardRows,
} from '../../services/cultivationUI.js';

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

      /**
       * =====================================================
       * CHANNEL LOCK
       * =====================================================
       */

      if (
        CULTIVATION_CONFIG
          .channelId &&
        interaction.channelId !==
          CULTIVATION_CONFIG
            .channelId
      ) {
        return replyEphemeral(
          interaction,
          `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,
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

      return interaction.editReply({
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
    } catch (error) {
      return replyCommandError(
        interaction,
        error,
      );
    }
  },
};
