import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  equipCultivationEquipment,
  getEquipment,
} from '../../services/cultivationEquipment.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildEquipResultEmbed,
  buildEquipmentRows,
  buildForgeConfirmEmbed,
  buildForgeConfirmRows,
} from '../../services/cultivationEquipmentUI.js';

/**
 * =========================================================
 * COMMON CHECK
 * =========================================================
 */

async function validate(
  interaction,
  ownerId,
) {
  if (
    !ownerId
  ) {
    return false;
  }

  if (
    interaction.user.id !==
    ownerId
  ) {
    await interaction.reply({
      content:
        'Đây là Tiên Lộ của một đạo hữu khác.',

      flags:
        MessageFlags.Ephemeral,
    });

    return false;
  }

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
 * CHỌN PHÁP KHÍ ĐỂ LUYỆN
 * =========================================================
 */

export const forgeSelectHandler = {
  name:
    'tutien_equipment_select',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
    ] = args;

    if (
      !(await validate(
        interaction,
        ownerId,
      ))
    ) {
      return;
    }

    const equipmentId =
      interaction.values?.[
        0
      ];

    const equipment =
      getEquipment(
        equipmentId,
      );

    if (!equipment) {
      return interaction.reply({
        content:
          'Không tìm thấy Pháp Khí này.',

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

    return interaction.update({
      embeds: [
        buildForgeConfirmEmbed(
          interaction.user,
          profile,
          equipmentId,
        ),
      ],

      components:
        buildForgeConfirmRows(
          ownerId,
          equipmentId,
        ),
    });
  },
};

/**
 * =========================================================
 * CHỌN PHÁP KHÍ ĐỂ TRANG BỊ
 * =========================================================
 */

export const equipSelectHandler = {
  name:
    'tutien_equip_select',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
    ] = args;

    if (
      !(await validate(
        interaction,
        ownerId,
      ))
    ) {
      return;
    }

    const equipmentId =
      interaction.values?.[
        0
      ];

    if (
      !getEquipment(
        equipmentId,
      )
    ) {
      return interaction.reply({
        content:
          'Không tìm thấy Pháp Khí này.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const result =
      await equipCultivationEquipment(
        client,
        interaction.guildId,
        interaction.user.id,
        equipmentId,
      );

    return interaction.update({
      embeds: [
        buildEquipResultEmbed(
          result,
        ),
      ],

      components:
        buildEquipmentRows(
          ownerId,
          result.profile,
        ),
    });
  },
};

export default [
  forgeSelectHandler,
  equipSelectHandler,
];
