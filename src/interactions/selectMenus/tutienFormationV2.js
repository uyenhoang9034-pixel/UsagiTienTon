import { MessageFlags } from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getFormationState,
  saveFormationState,
  setFormationEyeElement,
  setFormationSlotElement,
} from '../../services/cultivationFormation.js';

import {
  buildFormationEyeEmbed,
  buildFormationEyeRows,
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

function hasFormationAdminRole(interaction) {
  const roleId = CULTIVATION_CONFIG.adminRoleId;
  return Boolean(
    roleId &&
    interaction.member?.roles?.cache?.has?.(roleId),
  );
}

async function runElementChange(
  interaction,
  client,
  guildId,
  userId,
  slotIndex,
  elementId,
) {
  let result = await setFormationSlotElement(
    client,
    guildId,
    userId,
    slotIndex,
    elementId,
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
    state.elementCrystals[elementId] = Math.max(
      Number(state.elementCrystals?.[elementId]) || 0,
      Number(result.crystalCost) || 0,
    );

    await saveFormationState(
      client,
      guildId,
      userId,
      state,
    );

    result = await setFormationSlotElement(
      client,
      guildId,
      userId,
      slotIndex,
      elementId,
    );
  }

  return result;
}

async function runEyeChange(
  interaction,
  client,
  guildId,
  userId,
  elementId,
) {
  let result = await setFormationEyeElement(
    client,
    guildId,
    userId,
    elementId,
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
    state.elementCrystals[elementId] = Math.max(
      Number(state.elementCrystals?.[elementId]) || 0,
      Number(result.crystalCost) || 0,
    );

    await saveFormationState(
      client,
      guildId,
      userId,
      state,
    );

    result = await setFormationEyeElement(
      client,
      guildId,
      userId,
      elementId,
    );
  }

  return result;
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

      const result = await runElementChange(
        interaction,
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

    if (action === 'eye') {
      const elementId = interaction.values?.[0];

      if (!elementId) {
        return replyEphemeral(interaction, 'Không xác định được hệ Mắt Trận mới.');
      }

      const result = await runEyeChange(
        interaction,
        client,
        guildId,
        userId,
        elementId,
      );

      return interaction.update({
        embeds: [buildFormationEyeEmbed(result.state, result)],
        components: buildFormationEyeRows(ownerId, result.state),
      });
    }

    return replyEphemeral(
      interaction,
      'Không tìm thấy thao tác Trận Vị tương ứng.',
    );
  },
};
