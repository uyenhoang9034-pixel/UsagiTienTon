import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  getActiveTalisman,
  getCultivationTalisman,
} from '../../services/cultivationTreasure.js';

import {
  buildTalismanConfirmEmbed,
  buildTalismanConfirmRows,
} from '../../services/cultivationTreasureUI.js';

/**
 * =========================================================
 * VALIDATE
 * =========================================================
 */

async function validateInteraction(
  interaction,
  ownerId,
) {
  /**
   * Không có owner.
   */

  if (!ownerId) {
    return false;
  }

  /**
   * Chỉ chủ dashboard thao tác.
   */

  if (
    interaction.user.id !==
    ownerId
  ) {
    await interaction.reply({
      content:
        'Đây là Bí Bảo của một đạo hữu khác.',

      flags:
        MessageFlags.Ephemeral,
    });

    return false;
  }

  /**
   * Chỉ dùng trong channel Tu Tiên.
   */

  if (
    CULTIVATION_CONFIG
      .channelId &&
    interaction.channelId !==
      CULTIVATION_CONFIG
        .channelId
  ) {
    await interaction.reply({
      content:
        `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,

      flags:
        MessageFlags.Ephemeral,
    });

    return false;
  }

  return true;
}

/**
 * =========================================================
 * TALISMAN SELECT
 * =========================================================
 */

export const talismanSelectHandler = {
  name:
    'tutien_talisman_select',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
    ] = args;

    /**
     * =====================================================
     * VALIDATE
     * =====================================================
     */

    if (
      !(await validateInteraction(
        interaction,
        ownerId,
      ))
    ) {
      return;
    }

    /**
     * =====================================================
     * GET SELECTED TALISMAN
     * =====================================================
     */

    const talismanId =
      interaction.values?.[
        0
      ];

    if (!talismanId) {
      return interaction.reply({
        content:
          'Không xác định được Phù Hiệu.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * VALIDATE TALISMAN
     * =====================================================
     */

    const talisman =
      getCultivationTalisman(
        talismanId,
      );

    if (!talisman) {
      return interaction.reply({
        content:
          'Không tìm thấy Phù Hiệu này.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * LOAD PROFILE
     * =====================================================
     */

    const profile =
      await getCultivationProfile(
        client,
        interaction.guildId,
        interaction.user.id,
      );

    /**
     * =====================================================
     * ACTIVE TALISMAN CHECK
     * =====================================================
     */

    const active =
      getActiveTalisman(
        profile,
      );

    if (active) {
      return interaction.reply({
        content:
          `Đạo hữu hiện đang kích hoạt **${active.name}**. Hãy chờ phù lực hiện tại tiêu hao trước.`,

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * OPEN CONFIRM SCREEN
     * =====================================================
     */

    return interaction.update({
      embeds: [
        buildTalismanConfirmEmbed(
          interaction.user,
          profile,
          talismanId,
        ),
      ],

      components:
        buildTalismanConfirmRows(
          ownerId,
          talismanId,
        ),
    });
  },
};

/**
 * =========================================================
 * EXPORT
 * =========================================================
 */

export default [
  talismanSelectHandler,
];
