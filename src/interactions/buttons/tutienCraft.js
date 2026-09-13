import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  brewCultivationPill,
} from '../../services/cultivationAlchemy.js';

import {
  buildAlchemyResultEmbed,
  buildAlchemyResultRows,
} from '../../services/cultivationAlchemyUI.js';

import {
  forgeEquipment,
} from '../../services/cultivationEquipment.js';

import {
  buildForgeResultEmbed,
  buildForgeResultRows,
} from '../../services/cultivationEquipmentUI.js';

async function replyEphemeral(interaction, content) {
  const payload = {
    content,
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

async function validate(interaction, ownerId) {
  if (!ownerId) return false;

  if (interaction.user.id !== ownerId) {
    await replyEphemeral(
      interaction,
      'Đây là lò luyện của một đạo hữu khác.',
    );
    return false;
  }

  const isMainChannel =
    interaction.channelId === CULTIVATION_CONFIG.channelId;
  const isCultivationThread =
    interaction.channel?.isThread?.() &&
    interaction.channel.parentId === CULTIVATION_CONFIG.channelId;

  if (!isMainChannel && !isCultivationThread) {
    await replyEphemeral(
      interaction,
      `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,
    );
    return false;
  }

  return true;
}

export default {
  name: 'tutien_craft',

  async execute(interaction, client, args = []) {
    const [ownerId, craftType, targetId, quantity] = args;

    if (!(await validate(interaction, ownerId))) {
      return;
    }

    try {
      if (craftType === 'alchemy') {
        const result = await brewCultivationPill(
          client,
          interaction.guildId,
          interaction.user.id,
          targetId,
          quantity,
        );

        return interaction.update({
          embeds: [buildAlchemyResultEmbed(result)],
          components: buildAlchemyResultRows(ownerId),
        });
      }

      if (craftType === 'forge') {
        const result = await forgeEquipment(
          client,
          interaction.guildId,
          interaction.user.id,
          targetId,
          quantity,
        );

        return interaction.update({
          embeds: [buildForgeResultEmbed(result)],
          components: buildForgeResultRows(ownerId),
        });
      }

      return replyEphemeral(
        interaction,
        'Không xác định được loại luyện chế.',
      );
    } catch (error) {
      console.error('[TU TIEN CRAFT ERROR]', error);
      return replyEphemeral(
        interaction,
        'Lò luyện xuất hiện dị tượng, tạm thời chưa thể luyện chế.',
      );
    }
  },
};
