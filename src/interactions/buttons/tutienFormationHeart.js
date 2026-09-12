import { MessageFlags } from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getFormationState,
  refineFormationHeart,
  saveFormationState,
} from '../../services/cultivationFormation.js';

import {
  buildFormationHeartEmbed,
  buildFormationHeartRows,
} from '../../services/cultivationFormationHeartUI.js';

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

function hasFormationAdminRole(interaction) {
  const roleId = CULTIVATION_CONFIG.adminRoleId;
  return Boolean(
    roleId &&
    interaction.member?.roles?.cache?.has?.(roleId),
  );
}

async function runRefine(interaction, client, guildId, userId) {
  let result = await refineFormationHeart(
    client,
    guildId,
    userId,
  );

  if (
    hasFormationAdminRole(interaction) &&
    !result.ok &&
    ['not_enough_essence', 'not_enough_crystal'].includes(result.reason)
  ) {
    const state = result.state;
    state.formationEssence = Math.max(
      Number(state.formationEssence) || 0,
      Number(result.essenceCost) || 0,
    );
    state.elementCrystals ||= {};
    state.elementCrystals.yin_yang = Math.max(
      Number(state.elementCrystals.yin_yang) || 0,
      Number(result.crystalCost) || 0,
    );

    await saveFormationState(
      client,
      guildId,
      userId,
      state,
    );

    result = await refineFormationHeart(
      client,
      guildId,
      userId,
    );
  }

  return result;
}

export default {
  name: 'tutien_formation_heart',

  async execute(interaction, client, args = []) {
    const [ownerId, action = 'main'] = args;

    if (!ownerId || interaction.user.id !== ownerId) {
      return replyEphemeral(
        interaction,
        'Đây là Trận Đạo của một đạo hữu khác.',
      );
    }

    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    if (action === 'main') {
      const state = await getFormationState(client, guildId, userId);
      return interaction.update({
        embeds: [buildFormationHeartEmbed(state)],
        components: buildFormationHeartRows(ownerId, state),
      });
    }

    if (action === 'refine') {
      const result = await runRefine(
        interaction,
        client,
        guildId,
        userId,
      );

      return interaction.update({
        embeds: [buildFormationHeartEmbed(result.state, result)],
        components: buildFormationHeartRows(ownerId, result.state),
      });
    }

    return replyEphemeral(
      interaction,
      'Không tìm thấy thao tác Trận Tâm tương ứng.',
    );
  },
};
