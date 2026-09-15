import { MessageFlags } from 'discord.js';
import { CULTIVATION_CONFIG } from '../../config/cultivationGame.js';
import {
  faceNextTribulationBolt,
  getHeavenlyTribulationPreview,
  getHeavenlyTribulationSession,
  requiresHeavenlyTribulation,
  startHeavenlyTribulation,
} from '../../services/cultivationHeavenlyTribulation.js';
import {
  buildTribulationPreviewEmbed,
  buildTribulationPreviewRows,
  buildTribulationResultEmbed,
  buildTribulationResultRows,
} from '../../services/cultivationHeavenlyTribulationUI.js';

async function ephemeral(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
  return interaction.reply(payload);
}

function isCultivationChannel(interaction) {
  if (!CULTIVATION_CONFIG.channelId) return true;
  return interaction.channelId === CULTIVATION_CONFIG.channelId || interaction.channel?.parentId === CULTIVATION_CONFIG.channelId;
}

async function handleSmartBreakthrough(interaction, client, ownerId) {
  const service = await import('../../services/cultivationServiceV2.js');
  const profile = await service.getCultivationProfile(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  const activeSession = await getHeavenlyTribulationSession(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  if (activeSession || requiresHeavenlyTribulation(profile)) {
    const data = await getHeavenlyTribulationPreview(
      client,
      interaction.guildId,
      interaction.user.id,
    );

    return interaction.update({
      embeds: [buildTribulationPreviewEmbed(data)],
      components: buildTribulationPreviewRows(ownerId, data),
    });
  }

  const ui = await import('../../services/cultivationUIV2.js');
  const result = await service.breakthrough(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [ui.buildBreakthroughEmbed(result)],
    components: [ui.buildBackRow(ownerId, 'breakthrough')],
  });
}

export default {
  name: 'tutien_tribulation',

  async execute(interaction, client, args = []) {
    const [ownerId, action] = args;
    if (!ownerId || !action) return;

    if (interaction.user.id !== ownerId) {
      return ephemeral(interaction, 'Đây là Thiên Kiếp của một đạo hữu khác.');
    }
    if (!isCultivationChannel(interaction)) {
      return ephemeral(interaction, `Tiên Lộ chỉ mở bên trong <#${CULTIVATION_CONFIG.channelId}>.`);
    }

    try {
      if (action === 'smart') {
        return handleSmartBreakthrough(interaction, client, ownerId);
      }

      if (action === 'start') {
        const data = await startHeavenlyTribulation(client, interaction.guildId, interaction.user.id);
        return interaction.update({
          embeds: [buildTribulationPreviewEmbed(data)],
          components: buildTribulationPreviewRows(ownerId, data),
        });
      }

      if (action === 'bolt') {
        const result = await faceNextTribulationBolt(client, interaction.guildId, interaction.user.id);
        if (!result.ok && result.reason === 'no_session') {
          const data = await getHeavenlyTribulationPreview(client, interaction.guildId, interaction.user.id);
          return interaction.update({
            embeds: [buildTribulationPreviewEmbed(data)],
            components: buildTribulationPreviewRows(ownerId, data),
          });
        }
        return interaction.update({
          embeds: [buildTribulationResultEmbed(result)],
          components: buildTribulationResultRows(ownerId, result),
        });
      }

      return ephemeral(interaction, 'Không tìm thấy hành động Thiên Kiếp tương ứng.');
    } catch (error) {
      console.error('[THIEN KIEP ERROR]', error);
      return ephemeral(interaction, `❌ **Lỗi Thiên Kiếp:**\n\`\`\`js\n${String(error?.stack || error).slice(0, 1700)}\n\`\`\``);
    }
  },
};
