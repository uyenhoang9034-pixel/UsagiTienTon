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

export default {
  data:
    new SlashCommandBuilder()
      .setName(
        'tutien',
      )
      .setDescription(
        'Mở Tiên Lộ và bắt đầu hành trình tu tiên cùng Usagi.',
      ),

  category: 'Games',

  async execute(
    interaction,
  ) {
    /**
     * =====================================================
     * SERVER ONLY
     * =====================================================
     */

    if (
      !interaction.guildId
    ) {
      return interaction.reply({
        content:
          'Tiên Lộ chỉ có thể được sử dụng trong server.',

        flags:
          MessageFlags.Ephemeral,
      });
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
      return interaction.reply({
        content:
          'Tiên Lộ hiện đang tạm đóng.',

        flags:
          MessageFlags.Ephemeral,
      });
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
      return interaction.reply({
        content:
          `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * CHECK EXISTING PROFILE
     * =====================================================
     */

    const existing =
      await getCultivationProfile(
        interaction.client,

        interaction.guildId,

        interaction.user.id,

        {
          create: false,
        },
      );

    /**
     * =====================================================
     * CREATE PROFILE IF NEEDED
     * =====================================================
     */

    const profile =
      existing ||
      (await getCultivationProfile(
        interaction.client,

        interaction.guildId,

        interaction.user.id,

        {
          create: true,
        },
      ));

    /**
     * =====================================================
     * DASHBOARD
     * =====================================================
     */

    return interaction.reply({
      embeds: [
        buildDashboardEmbed(
          interaction.user,

          profile,

          {
            isNew:
              !existing,
          },
        ),
      ],

      components:
        buildDashboardRows(
          interaction.user.id,
        ),
    });
  },
};
