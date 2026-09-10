import { Events, MessageFlags } from 'discord.js';
import { logger } from '../utils/logger.js';

async function safeReply(interaction, content) {
  try {
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content, flags: MessageFlags.Ephemeral });
    } else {
      await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    }
  } catch {}
}

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        await command.execute(interaction, client);
        return;
      }
      if (interaction.isButton()) {
        const handler = client.buttons.get(interaction.customId);
        if (handler) await handler.execute(interaction, client);
        return;
      }
      if (interaction.isStringSelectMenu()) {
        const handler = client.selectMenus.get(interaction.customId);
        if (handler) await handler.execute(interaction, client);
        return;
      }
      if (interaction.isModalSubmit()) {
        const handler = client.modals.get(interaction.customId);
        if (handler) await handler.execute(interaction, client);
      }
    } catch (error) {
      logger.error('Interaction error:', error);
      await safeReply(interaction, '❌ Đã xảy ra lỗi khi xử lý thao tác này.');
    }
  },
};
