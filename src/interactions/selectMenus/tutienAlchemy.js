import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getAlchemyRecipe,
} from '../../services/cultivationAlchemy.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildAlchemyConfirmEmbed,
  buildAlchemyConfirmRows,
} from '../../services/cultivationAlchemyUI.js';

/**
 * =========================================================
 * TIÊN LỘ — ALCHEMY SELECT MENU
 * =========================================================
 */

export default {
  name:
    'tutien_alchemy_select',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
    ] = args;

    /**
     * Không xác định owner.
     */

    if (!ownerId) {
      return;
    }

    /**
     * Chỉ chủ dashboard được thao tác.
     */

    if (
      interaction.user.id !==
      ownerId
    ) {
      return interaction.reply({
        content:
          'Đây là Đan Lô của một đạo hữu khác.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * Channel restriction.
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
     * Selected recipe.
     */

    const recipeId =
      interaction.values?.[
        0
      ];

    if (!recipeId) {
      return interaction.reply({
        content:
          'Không xác định được Đan Phương.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const recipe =
      getAlchemyRecipe(
        recipeId,
      );

    if (!recipe) {
      return interaction.reply({
        content:
          'Không tìm thấy Đan Phương này.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * Load profile mới nhất.
     */

    const profile =
      await getCultivationProfile(
        client,
        interaction.guildId,
        interaction.user.id,
      );

    /**
     * Hiển thị màn xác nhận.
     */

    return interaction.update({
      embeds: [
        buildAlchemyConfirmEmbed(
          interaction.user,
          profile,
          recipeId,
        ),
      ],

      components:
        buildAlchemyConfirmRows(
          ownerId,
          recipeId,
        ),
    });
  },
};
