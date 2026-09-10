import { Events, MessageFlags } from 'discord.js';

import { logger } from '../utils/logger.js';
import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';

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

function isCultivationComponent(handlerId) {
  return (
    handlerId === 'tutien_action' ||
    handlerId.startsWith('tutien_')
  );
}

function isInsideCultivationThread(interaction) {
  const channel = interaction.channel;

  return Boolean(
    channel?.isThread?.() &&
    channel.parentId === CULTIVATION_CONFIG.channelId,
  );
}

/**
 * Compatibility adapter cho các interaction Tu Tiên cũ.
 *
 * Một số handler cũ vẫn kiểm tra:
 * interaction.channelId === CULTIVATION_CONFIG.channelId
 *
 * Sau khi chuyển sang mô hình mỗi người một thread, channelId thật là ID thread.
 * Adapter này chỉ làm cho các handler cũ "nhìn thấy" parent channel ID khi đọc
 * channelId, còn interaction.channel vẫn là thread thật nên update/reply vẫn diễn
 * ra đúng trong chủ đề cá nhân.
 */
function createCultivationThreadInteraction(interaction) {
  if (!isInsideCultivationThread(interaction)) {
    return interaction;
  }

  return new Proxy(interaction, {
    get(target, property) {
      if (property === 'channelId') {
        return CULTIVATION_CONFIG.channelId;
      }

      const value = Reflect.get(target, property, target);

      if (typeof value === 'function') {
        return value.bind(target);
      }

      return value;
    },
  });
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

      const routedInteraction = isCultivationComponent(handlerId)
        ? createCultivationThreadInteraction(interaction)
        : interaction;

      await handler.execute(routedInteraction, client, args);
    } catch (error) {
      logger.error('InteractionCreate error:', error);
      await sendInteractionError(interaction, error);
    }
  },
};
