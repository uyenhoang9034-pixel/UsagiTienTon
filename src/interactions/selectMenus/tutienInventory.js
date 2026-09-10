import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getCultivationProfile,
  isCultivationItemUsable,
} from '../../services/cultivationService.js';

import {
  buildItemDetailEmbed,
  buildItemDetailRows,
} from '../../services/cultivationUI.js';

export default {
  name:
    'tutien_inventory_select',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
    ] = args;

    if (!ownerId) {
      return;
    }

    if (
      interaction.user.id !==
      ownerId
    ) {
      return interaction.reply({
        content:
          'Đây là Túi Đồ của một đạo hữu khác.',

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

    const itemId =
      interaction.values?.[0];

    if (
      !itemId ||
      !isCultivationItemUsable(
        itemId,
      )
    ) {
      return interaction.reply({
        content:
          'Vật phẩm này hiện chưa thể sử dụng.',

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

    const quantity =
      Number(
        profile.inventory?.[
          itemId
        ],
      ) || 0;

    if (
      quantity <= 0
    ) {
      return interaction.reply({
        content:
          'Đạo hữu không còn vật phẩm này trong Túi Đồ.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    return interaction.update({
      embeds: [
        buildItemDetailEmbed(
          interaction.user,
          profile,
          itemId,
        ),
      ],

      components:
        buildItemDetailRows(
          ownerId,
          itemId,
        ),
    });
  },
};
