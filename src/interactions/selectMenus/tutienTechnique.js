import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  activateCultivationTechnique,
  getTechnique,
} from '../../services/cultivationTechnique.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildTechniqueActivateResultEmbed,
  buildTechniqueConfirmEmbed,
  buildTechniqueConfirmRows,
  buildTechniqueResultRows,
} from '../../services/cultivationTechniqueUI.js';

/**
 * =========================================================
 * COMMON VALIDATION
 * =========================================================
 */

async function validateInteraction(
  interaction,
  ownerId,
) {
  if (!ownerId) {
    return false;
  }

  /**
   * Chỉ chủ Tiên Lộ được thao tác.
   */

  if (
    interaction.user.id !==
    ownerId
  ) {
    await interaction.reply({
      content:
        'Đây là Công Pháp của một đạo hữu khác.',

      flags:
        MessageFlags.Ephemeral,
    });

    return false;
  }

  /**
   * Chỉ dùng trong channel Tiên Lộ.
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
 * CHỌN CÔNG PHÁP ĐỂ LĨNH NGỘ
 * =========================================================
 */

export const techniqueLearnSelectHandler = {
  name:
    'tutien_technique_learn_select',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
    ] = args;

    if (
      !(await validateInteraction(
        interaction,
        ownerId,
      ))
    ) {
      return;
    }

    const techniqueId =
      interaction.values?.[
        0
      ];

    if (!techniqueId) {
      return interaction.reply({
        content:
          'Không xác định được Công Pháp.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const technique =
      getTechnique(
        techniqueId,
      );

    if (!technique) {
      return interaction.reply({
        content:
          'Không tìm thấy Công Pháp này.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const profile =
      await getCultivationProfile(
        client,
        interaction.guildId,
        interaction.user.id,
      );

    /**
     * Nếu đã học rồi thì không cho
     * đi vào màn Lĩnh Ngộ lần nữa.
     */

    if (
      profile.techniques
        ?.learned?.[
          techniqueId
        ] === true
    ) {
      return interaction.reply({
        content:
          `Đạo hữu đã lĩnh ngộ **${technique.name}**.`,

        flags:
          MessageFlags.Ephemeral,
      });
    }

    return interaction.update({
      embeds: [
        buildTechniqueConfirmEmbed(
          interaction.user,
          profile,
          techniqueId,
        ),
      ],

      components:
        buildTechniqueConfirmRows(
          ownerId,
          techniqueId,
        ),
    });
  },
};

/**
 * =========================================================
 * CHỌN CÔNG PHÁP ĐANG TU
 * =========================================================
 */

export const techniqueActivateSelectHandler = {
  name:
    'tutien_technique_activate_select',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
    ] = args;

    if (
      !(await validateInteraction(
        interaction,
        ownerId,
      ))
    ) {
      return;
    }

    const techniqueId =
      interaction.values?.[
        0
      ];

    if (!techniqueId) {
      return interaction.reply({
        content:
          'Không xác định được Công Pháp.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const technique =
      getTechnique(
        techniqueId,
      );

    if (!technique) {
      return interaction.reply({
        content:
          'Không tìm thấy Công Pháp này.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const profile =
      await getCultivationProfile(
        client,
        interaction.guildId,
        interaction.user.id,
      );

    /**
     * Nếu đang active đúng Công Pháp này
     * thì không cần save lại.
     */

    if (
      profile.techniques
        ?.active ===
      techniqueId
    ) {
      return interaction.reply({
        content:
          `Đạo hữu hiện đang tu luyện **${technique.name}**.`,

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const result =
      await activateCultivationTechnique(
        client,
        interaction.guildId,
        interaction.user.id,
        techniqueId,
      );

    return interaction.update({
      embeds: [
        buildTechniqueActivateResultEmbed(
          result,
        ),
      ],

      components:
        buildTechniqueResultRows(
          ownerId,
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
  techniqueLearnSelectHandler,
  techniqueActivateSelectHandler,
];
