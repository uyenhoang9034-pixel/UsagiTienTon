import { Events, MessageFlags } from 'discord.js';

import { logger } from '../utils/logger.js';

async function sendInteractionError(interaction, error) {
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Có lỗi xảy ra khi xử lý tương tác này.'
      : `Có lỗi xảy ra khi xử lý tương tác này.\n\`\`\`js\n${String(error?.message || error).slice(0, 1500)}\n\`\`\``;

  try {
    if (!interaction.isRepliable?.()) {
      return;
    }

    const payload = {
      content: message,
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload);
      return;
    }

    await interaction.reply(payload);
  } catch (replyError) {
    logger.error('Failed to send interaction error response:', replyError);
  }
}

function getComponentCollection(interaction, client) {
  if (interaction.isButton()) {
    return client.buttons;
  }

  if (interaction.isStringSelectMenu()) {
    return client.selectMenus;
  }

  if (interaction.isModalSubmit()) {
    return client.modals;
  }

  return null;
}

export default {
  name: Events.InteractionCreate,

  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          logger.warn(`Unknown slash command: ${interaction.commandName}`);
          return;
        }

        await command.execute(interaction, null, client);
        return;
      }

      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);

        if (command?.autocomplete) {
          await command.autocomplete(interaction, client);
          return;
        }

        await interaction.respond([]);
        return;
      }

      const collection = getComponentCollection(interaction, client);

      if (!collection) {
        return;
      }

      const [handlerId, ...args] = String(interaction.customId || '').split(':');
      const handler = collection.get(handlerId);

      if (!handler) {
        return;
      }

      await handler.execute(interaction, client, args);
    } catch (error) {
      logger.error('InteractionCreate error:', error);
      await sendInteractionError(interaction, error);
    }
  },
};
