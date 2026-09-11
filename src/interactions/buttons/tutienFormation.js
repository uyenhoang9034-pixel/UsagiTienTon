import { MessageFlags } from 'discord.js';

import {
  arrangeActiveFormation,
  comprehendFormation,
  cycleActiveFormation,
  getFormationState,
  upgradeActiveFormation,
} from '../../services/cultivationFormation.js';

import {
  appendFormationButton,
  buildFormationArrangeEmbed,
  buildFormationBackRows,
  buildFormationComprehendEmbed,
  buildFormationDiagramsEmbed,
  buildFormationDiagramsRows,
  buildFormationElementsEmbed,
  buildFormationMainEmbed,
  buildFormationMainRows,
  buildFormationResonanceEmbed,
  buildFormationSlotsEmbed,
  buildFormationStorageEmbed,
  buildFormationUpgradeEmbed,
} from '../../services/cultivationFormationUI.js';

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

async function rejectWrongPlayer(interaction, ownerId) {
  if (interaction.user.id === ownerId) return false;

  await replyEphemeral(
    interaction,
    'Đây là Trận Đạo của một đạo hữu khác.',
  );

  return true;
}

async function showMain(interaction, client, ownerId) {
  const state = await getFormationState(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [buildFormationMainEmbed(interaction.user, state)],
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

export default {
  name: 'tutien_formation',

  async execute(interaction, client, args = []) {
    const [ownerId, action = 'main'] = args;

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
          components: buildFormationBackRows(ownerId),
        });
      }

      case 'comprehend': {
        const result = await comprehendFormation(client, guildId, userId);
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
        const result = await upgradeActiveFormation(client, guildId, userId);
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
