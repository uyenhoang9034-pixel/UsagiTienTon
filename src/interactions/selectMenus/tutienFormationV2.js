import { MessageFlags } from 'discord.js';

import {
  getFormationState,
  setFormationSlotElement,
} from '../../services/cultivationFormation.js';

import {
  buildFormationSlotDetailEmbed,
  buildFormationSlotDetailRows,
} from '../../services/cultivationFormationV2UI.js';

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

export default {
  name: 'tutien_formation_v2',

  async execute(interaction, client, args = []) {
    const [ownerId, action = 'slot', rawSlotIndex] = args;

    if (!ownerId || interaction.user.id !== ownerId) {
      return replyEphemeral(
        interaction,
        'Đây là Trận Đạo của một đạo hữu khác.',
      );
    }

    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (action === 'slot') {
      const slotIndex = Number(interaction.values?.[0]);
      const state = await getFormationState(client, guildId, userId);

      return interaction.update({
        embeds: [buildFormationSlotDetailEmbed(state, slotIndex)],
        components: buildFormationSlotDetailRows(ownerId, state, slotIndex),
      });
    }

    if (action === 'element') {
      const slotIndex = Number(rawSlotIndex);
      const elementId = interaction.values?.[0];

      if (!elementId) {
        return replyEphemeral(interaction, 'Không xác định được hệ thuộc tính mới.');
      }

      const result = await setFormationSlotElement(
        client,
        guildId,
        userId,
        slotIndex,
        elementId,
      );

      return interaction.update({
        embeds: [buildFormationSlotDetailEmbed(result.state, slotIndex, result)],
        components: buildFormationSlotDetailRows(ownerId, result.state, slotIndex),
      });
    }

    return replyEphemeral(
      interaction,
      'Không tìm thấy thao tác Trận Vị tương ứng.',
    );
  },
};
