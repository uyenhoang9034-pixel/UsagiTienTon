import { MessageFlags } from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  arrangeActiveFormation,
  comprehendFormation,
  cycleActiveFormation,
  getFormationState,
  refineFormationEye,
  refineFormationSlot,
  saveFormationState,
  upgradeActiveFormation,
} from '../../services/cultivationFormation.js';

import {
  getFormationGameplayBonus,
} from '../../services/cultivationFormationGameplay.js';

import {
  appendFormationButton,
  buildFormationArrangeEmbed,
  buildFormationBackRows,
  buildFormationDiagramsEmbed,
  buildFormationDiagramsRows,
  buildFormationElementsEmbed,
  buildFormationMainRows,
  buildFormationResonanceEmbed,
  buildFormationSlotsEmbed,
  buildFormationStorageEmbed,
  buildFormationUpgradeEmbed,
} from '../../services/cultivationFormationUI.js';

import {
  buildFormationComprehendEmbed,
  buildFormationMainEmbed,
} from '../../services/cultivationFormationSpiritUI.js';

import {
  buildFormationEyeEmbed,
  buildFormationEyeRows,
  buildFormationSlotDetailEmbed,
  buildFormationSlotDetailRows,
  buildFormationSlotSelectRows,
} from '../../services/cultivationFormationV2UI.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildDashboardEmbed,
  buildDashboardRows,
} from '../../services/cultivationUI.js';

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

async function rejectWrongPlayer(interaction, ownerId) {
  if (interaction.user.id === ownerId) return false;

  await replyEphemeral(
    interaction,
    'Đây là Trận Đạo của một đạo hữu khác.',
  );

  return true;
}

async function showMain(interaction, client, ownerId) {
  const [state, profile] = await Promise.all([
    getFormationState(
      client,
      interaction.guildId,
      interaction.user.id,
    ),
    getCultivationProfile(
      client,
      interaction.guildId,
      interaction.user.id,
    ),
  ]);

  return interaction.update({
    embeds: [buildFormationMainEmbed(interaction.user, state, profile)],
    components: buildFormationMainRows(ownerId),
  });
}

async function showDashboard(interaction, client, ownerId) {
  const profile = await getCultivationProfile(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  const rows = appendFormationButton(
    buildDashboardRows(ownerId),
    ownerId,
  );

  return interaction.update({
    embeds: [buildDashboardEmbed(interaction.user, profile)],
    components: rows,
  });
}

async function runRefine(
  interaction,
  client,
  guildId,
  userId,
  slotIndex,
) {
  let result = await refineFormationSlot(
    client,
    guildId,
    userId,
    slotIndex,
  );

  if (
    hasFormationAdminRole(interaction) &&
    !result.ok &&
    ['not_enough_essence', 'not_enough_crystal'].includes(result.reason)
  ) {
    const state = result.state;
    const elementId = result.elementId;

    state.formationEssence = Math.max(
      Number(state.formationEssence) || 0,
      Number(result.essenceCost) || 0,
    );

    if (elementId) {
      state.elementCrystals[elementId] = Math.max(
        Number(state.elementCrystals?.[elementId]) || 0,
        Number(result.crystalCost) || 0,
      );
    }

    await saveFormationState(
      client,
      guildId,
      userId,
      state,
    );

    result = await refineFormationSlot(
      client,
      guildId,
      userId,
      slotIndex,
    );
  }

  return result;
}

async function runEyeRefine(
  interaction,
  client,
  guildId,
  userId,
) {
  let result = await refineFormationEye(
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
    const elementId = result.elementId;

    state.formationEssence = Math.max(
      Number(state.formationEssence) || 0,
      Number(result.essenceCost) || 0,
    );

    if (elementId) {
      state.elementCrystals[elementId] = Math.max(
        Number(state.elementCrystals?.[elementId]) || 0,
        Number(result.crystalCost) || 0,
      );
    }

    await saveFormationState(
      client,
      guildId,
      userId,
      state,
    );

    result = await refineFormationEye(
      client,
      guildId,
      userId,
    );
  }

  return {
    ...result,
    eyeAction: 'refine',
  };
}

async function runUpgrade(
  interaction,
  client,
  guildId,
  userId,
) {
  let result = await upgradeActiveFormation(
    client,
    guildId,
    userId,
  );

  if (
    hasFormationAdminRole(interaction) &&
    !result.ok &&
    ['not_enough_essence', 'not_enough_fragment'].includes(result.reason)
  ) {
    const state = result.state;
    const formationId = state.activeFormationId;

    state.formationEssence = Math.max(
      Number(state.formationEssence) || 0,
      Number(result.essenceCost) || 0,
    );

    state.formationFragments ||= {};
    state.formationFragments[formationId] = Math.max(
      Number(state.formationFragments?.[formationId]) || 0,
      Number(result.fragmentCost) || 0,
    );

    await saveFormationState(
      client,
      guildId,
      userId,
      state,
    );

    result = await upgradeActiveFormation(
      client,
      guildId,
      userId,
    );
  }

  return result;
}

export default {
  name: 'tutien_formation',

  async execute(interaction, client, args = []) {
    const [ownerId, action = 'main', extra] = args;

    if (!ownerId) return;
    if (await rejectWrongPlayer(interaction, ownerId)) return;

    const guildId = interaction.guildId;
    const userId = interaction.user.id;

    switch (action) {
      case 'main':
        return showMain(interaction, client, ownerId);

      case 'dashboard':
        return showDashboard(interaction, client, ownerId);

      case 'diagrams': {
        const state = await getFormationState(client, guildId, userId);
        return interaction.update({
          embeds: [buildFormationDiagramsEmbed(state)],
          components: buildFormationDiagramsRows(ownerId),
        });
      }

      case 'cycle': {
        const state = await cycleActiveFormation(client, guildId, userId);
        return interaction.update({
          embeds: [buildFormationDiagramsEmbed(state)],
          components: buildFormationDiagramsRows(ownerId),
        });
      }

      case 'storage': {
        const state = await getFormationState(client, guildId, userId);
        return interaction.update({
          embeds: [buildFormationStorageEmbed(state)],
          components: buildFormationBackRows(ownerId),
        });
      }

      case 'slots': {
        const state = await getFormationState(client, guildId, userId);
        return interaction.update({
          embeds: [buildFormationSlotsEmbed(state)],
          components: buildFormationSlotSelectRows(ownerId, state),
        });
      }

      case 'refine': {
        const slotIndex = Number(extra);
        const result = await runRefine(
          interaction,
          client,
          guildId,
          userId,
          slotIndex,
        );

        return interaction.update({
          embeds: [buildFormationSlotDetailEmbed(result.state, slotIndex, result)],
          components: buildFormationSlotDetailRows(ownerId, result.state, slotIndex),
        });
      }

      case 'eye': {
        const state = await getFormationState(client, guildId, userId);
        return interaction.update({
          embeds: [buildFormationEyeEmbed(state)],
          components: buildFormationEyeRows(ownerId, state),
        });
      }

      case 'eye_refine': {
        const result = await runEyeRefine(
          interaction,
          client,
          guildId,
          userId,
        );

        return interaction.update({
          embeds: [buildFormationEyeEmbed(result.state, result)],
          components: buildFormationEyeRows(ownerId, result.state),
        });
      }

      case 'comprehend': {
        const formationBonus = await getFormationGameplayBonus(
          client,
          guildId,
          userId,
        );
        const result = await comprehendFormation(
          client,
          guildId,
          userId,
          {
            extraInsightBonus:
              formationBonus?.spiritSynergy?.active
                ? Number(formationBonus.spiritSynergy.effects?.insightBonus) || 0
                : 0,
          },
        );
        return interaction.update({
          embeds: [buildFormationComprehendEmbed(result)],
          components: buildFormationBackRows(ownerId),
        });
      }

      case 'arrange': {
        const state = await arrangeActiveFormation(client, guildId, userId);
        return interaction.update({
          embeds: [buildFormationArrangeEmbed(state)],
          components: buildFormationBackRows(ownerId),
        });
      }

      case 'upgrade': {
        const result = await runUpgrade(
          interaction,
          client,
          guildId,
          userId,
        );
        return interaction.update({
          embeds: [buildFormationUpgradeEmbed(result)],
          components: buildFormationBackRows(ownerId),
        });
      }

      case 'resonance': {
        const state = await getFormationState(client, guildId, userId);
        return interaction.update({
          embeds: [buildFormationResonanceEmbed(state)],
          components: buildFormationBackRows(ownerId),
        });
      }

      case 'elements':
        return interaction.update({
          embeds: [buildFormationElementsEmbed()],
          components: buildFormationBackRows(ownerId),
        });

      default:
        return replyEphemeral(
          interaction,
          'Không tìm thấy hành động Trận Pháp tương ứng.',
        );
    }
  },
};
