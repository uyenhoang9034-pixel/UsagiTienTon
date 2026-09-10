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

function hasCultivationAdminRole(interaction) {
  const adminRoleId = CULTIVATION_CONFIG.adminRoleId;

  if (!adminRoleId) {
    return false;
  }

  return Boolean(
    interaction.member?.roles?.cache?.has?.(adminRoleId),
  );
}

/**
 * Compatibility adapter cho code Tu Tiên cũ.
 *
 * Nhiều button/select/GM command cũ vẫn kiểm tra:
 * interaction.channelId === CULTIVATION_CONFIG.channelId
 *
 * Quy tắc mới:
 * - Người chơi: chỉ tương thích khi đang ở thread cá nhân thuộc #tu-tiên.
 * - Admin Tiên Lộ: các lệnh/interaction quản trị như /tutienitem,
 *   /tutientest và UI sinh ra từ các lệnh test được phép dùng ở MỌI kênh.
 *
 * Adapter chỉ thay giá trị khi code cũ ĐỌC channelId. interaction.channel vẫn
 * là channel/thread thật, nên reply/update luôn xuất hiện đúng nơi admin hoặc
 * người chơi đang thao tác.
 */
function createCultivationCompatInteraction(interaction) {
  const shouldAdapt =
    isInsideCultivationThread(interaction) ||
    hasCultivationAdminRole(interaction);

  if (!shouldAdapt) {
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

        /**
         * /tutien là lệnh mở dashboard cá nhân nên PHẢI nhận interaction thật
         * để kiểm tra đúng threadId của người chơi.
         *
         * Các lệnh Tu Tiên phụ/GM như /tutienitem và /tutientest đi qua
         * compatibility adapter. Nhờ đó admin Tiên Lộ có thể chạy chúng ở
         * bất kỳ kênh nào, còn người chơi thường vẫn bị giới hạn đúng nơi.
         */
        const routedCommandInteraction =
          interaction.commandName !== 'tutien' &&
          interaction.commandName.startsWith('tutien')
            ? createCultivationCompatInteraction(interaction)
            : interaction;

        await command.execute(routedCommandInteraction, null, client);
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
        ? createCultivationCompatInteraction(interaction)
        : interaction;

      await handler.execute(routedInteraction, client, args);
    } catch (error) {
      logger.error('InteractionCreate error:', error);
      await sendInteractionError(interaction, error);
    }
  },
};
