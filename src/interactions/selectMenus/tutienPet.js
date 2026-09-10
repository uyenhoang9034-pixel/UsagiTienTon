import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  setActiveCultivationPet,
} from '../../services/cultivationPet.js';

import {
  buildPetEmbed,
  buildPetRows,
} from '../../services/cultivationPetUI.js';

export default {
  name:
    'tutien_pet_select',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
    ] = args;

    if (
      !ownerId ||
      interaction.user.id !==
        ownerId
    ) {
      return interaction.reply({
        content:
          'Đây là Linh Thú của một đạo hữu khác.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

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

    const petId =
      interaction.values?.[
        0
      ];

    if (!petId) {
      return interaction.reply({
        content:
          'Không xác định được Linh Thú.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const result =
      await setActiveCultivationPet(
        client,
        interaction.guildId,
        interaction.user.id,
        petId,
      );

    if (!result.ok) {
      return interaction.reply({
        content:
          result.reason ===
          'not_owned'
            ? 'Đạo hữu chưa thu phục Linh Thú này.'
            : 'Không thể thay đổi Linh Thú Đồng Hành.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    return interaction.update({
      embeds: [
        buildPetEmbed(
          interaction.user,
          result.profile,
        ),
      ],

      components:
        buildPetRows(
          ownerId,
          result.profile,
        ),
    });
  },
};
