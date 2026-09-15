import { MessageFlags } from 'discord.js';
import { CULTIVATION_CONFIG } from '../../config/cultivationGame.js';
import {
  faceNextTribulationBolt,
  getHeavenlyTribulationPreview,
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

export default {
  name: 'tutien_tribulation',

  async execute(interaction, client, args = []) {
    const [ownerId, action] = args;
    if (!ownerId || !action) return;

    if (interaction.user.id !== ownerId) {
      return ephemeral(interaction, 'Đây là Thiên Kiếp của một đạo hữu khác.');
    }
    if (CULTIVATION_CONFIG.channelId && interaction.channelId !== CULTIVATION_CONFIG.channelId) {
      return ephemeral(interaction, `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`);
    }

    try {
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
