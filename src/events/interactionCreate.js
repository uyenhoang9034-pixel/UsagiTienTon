import { Events, MessageFlags } from 'discord.js';

import { logger } from '../utils/logger.js';
import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';
import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';
import {
  CULTIVATION_MAINTENANCE_MESSAGE,
  isCultivationMaintenance,
} from '../services/cultivationMaintenance.js';
import {
  getDailyQuestCompletedCount,
  syncDailyQuests,
} from '../services/cultivationDailyQuest.js';
import {
  regenerateCultivationStamina,
} from '../services/cultivationStamina.js';

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

async function replyMaintenance(interaction) {
  const payload = {
    content: CULTIVATION_MAINTENANCE_MESSAGE,
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
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

function getCultivationThreadKey(guildId, userId) {
  return `games:cultivation:thread:${guildId}:${userId}`;
}

async function refreshCultivationStamina(interaction, client) {
  if (
    !interaction.guildId ||
    !interaction.user?.id
  ) {
    return;
  }

  try {
    await regenerateCultivationStamina(
      client,
      interaction.guildId,
      interaction.user.id,
    );
  } catch (error) {
    logger.warn(
      'Cultivation stamina regeneration failed:',
      error,
    );
  }
}

async function hideCompletedDailyQuestPanel(
  interaction,
  client,
  state,
) {
  const total = Array.isArray(state?.quests)
    ? state.quests.length
    : 0;

  if (
    !state?.rolled ||
    total <= 0 ||
    getDailyQuestCompletedCount(state) < total
  ) {
    return;
  }

  const threadKey = getCultivationThreadKey(
    interaction.guildId,
    interaction.user.id,
  );

  const threadData = await getDatabaseValue(
    client,
    threadKey,
    null,
  );

  const messageId = threadData?.dailyQuestMessageId;

  if (messageId) {
    try {
      const message = await interaction.channel.messages.fetch(messageId);
      await message.delete();
    } catch (error) {
      logger.warn(
        'Failed to delete completed daily quest panel:',
        error,
      );
    }
  }

  if (threadData) {
    await setDatabaseValue(
      client,
      threadKey,
      {
        ...threadData,
        dailyQuestMessageId: null,
        updatedAt: Date.now(),
      },
    );
  }
}

async function autoSyncDailyQuests(
  interaction,
  client,
  handlerId,
) {
  if (
    !interaction.guildId ||
    !interaction.user?.id ||
    !isInsideCultivationThread(interaction)
  ) {
    return;
  }

  try {
    const state = await syncDailyQuests(
      client,
      interaction.guildId,
      interaction.user.id,
    );

    await hideCompletedDailyQuestPanel(
      interaction,
      client,
      state,
    );
  } catch (error) {
    logger.warn(
      'Daily quest auto-sync failed:',
      error,
    );
  }
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

        if (interaction.commandName === 'tutien') {
          await refreshCultivationStamina(
            interaction,
            client,
          );
        }

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

      if (
        isCultivationComponent(handlerId) &&
        interaction.guildId &&
        !hasCultivationAdminRole(interaction) &&
        await isCultivationMaintenance(
          client,
          interaction.guildId,
        )
      ) {
        await replyMaintenance(interaction);
        return;
      }

      if (isCultivationComponent(handlerId)) {
        await refreshCultivationStamina(
          interaction,
          client,
        );
      }

      const routedInteraction = isCultivationComponent(handlerId)
        ? createCultivationCompatInteraction(interaction)
        : interaction;

      await handler.execute(routedInteraction, client, args);

      if (
        isCultivationComponent(handlerId)
      ) {
        await autoSyncDailyQuests(
          interaction,
          client,
          handlerId,
        );
      }
    } catch (error) {
      logger.error('InteractionCreate error:', error);
      await sendInteractionError(interaction, error);
    }
  },
};