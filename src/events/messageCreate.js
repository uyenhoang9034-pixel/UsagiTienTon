import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import {
  executePrefixCommand,
  supportsPrefixExecution,
} from '../utils/messageAdapter.js';
import { resolveCommandAlias } from '../config/commands/commandAliases.js';
import { getCommandPrefix } from '../config/bot.js';
import { isTTSEnabledByEnv } from '../config/ttsConfig.js';
import { handleAIChatMessage } from '../services/ai/aiChatManager.js';
import { handleThanVanTuBan } from '../services/thanVanTuBanService.js';
import { handleQuoteTrigger } from '../services/quotes/quoteService.js';
import { handleRandomMessage } from '../services/randomService.js';
import { handleBookingMessage } from '../services/bookingService.js';
import { handleForumStoreMessage } from '../services/forumStoreService.js';
import { handleServiceTicketMessage } from '../services/serviceTicketService.js';
import { handleCustomerSpendingMessage } from '../services/customerSpendingService.js';
import { handleWordGuessMessage } from '../services/wordGuessService.js';

let cachedHandleTTSMessage = null;

export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    if (message.author?.bot || !message.guild) {
      return;
    }

    try {
      const handledByAI = await handleAIChatMessage(message, client);
      if (handledByAI) {
        return;
      }
    } catch (aiError) {
      logger.error('Error handling AI chat message:', aiError);
    }

    if (isTTSEnabledByEnv()) {
      try {
        cachedHandleTTSMessage ??= (await import('../services/tts/ttsManager.js')).handleTTSMessage;
        const handledByTTS = await cachedHandleTTSMessage(message, client);
        if (handledByTTS) {
          return;
        }
      } catch (ttsError) {
        logger.error('Error handling TTS message:', ttsError);
      }
    }

    try {
      const thanVanProcessed = await handleThanVanTuBan(message);
      if (thanVanProcessed) {
        return;
      }
    } catch (thanVanError) {
      logger.error('Error handling Than Van Tu Ban:', thanVanError);
    }

    try {
      const quoteProcessed = await handleQuoteTrigger(message, client);
      if (quoteProcessed) {
        return;
      }
    } catch (quoteError) {
      logger.error('Error handling Quote trigger:', quoteError);
    }

    try {
      const randomProcessed = await handleRandomMessage(message, client);
      if (randomProcessed) {
        return;
      }
    } catch (randomError) {
      logger.error('Error handling Random trigger:', randomError);
    }

    try {
      const spendingProcessed = await handleCustomerSpendingMessage(message, client);
      if (spendingProcessed) return;
    } catch (spendingError) {
      logger.error('Error handling Customer Spending message:', spendingError);
    }

    try {
      const serviceTicketProcessed = await handleServiceTicketMessage(message, client);
      if (serviceTicketProcessed) {
        return;
      }
    } catch (serviceTicketError) {
      logger.error('Error handling Service Ticket trigger:', serviceTicketError);
    }

    try {
      const forumStoreProcessed = await handleForumStoreMessage(message, client);
      if (forumStoreProcessed) {
        return;
      }
    } catch (forumStoreError) {
      logger.error('Error handling Forum Store trigger:', forumStoreError);
    }

    try {
      const bookingProcessed = await handleBookingMessage(message, client);
      if (bookingProcessed) {
        return;
      }
    } catch (bookingError) {
      logger.error('Error handling Booking trigger:', bookingError);
    }

    try {
      const wordGuessProcessed = await handleWordGuessMessage(message, client);
      if (wordGuessProcessed) {
        return;
      }
    } catch (wordGuessError) {
      logger.error('Error handling Word Guess message:', wordGuessError);
    }

    await handlePrefixCommand(message, client);
  },
};

async function handlePrefixCommand(message, client) {
  try {
    if (typeof message.content !== 'string' || !message.content) {
      return;
    }

    const prefix = getCommandPrefix();
    const parsed = parsePrefixCommand(message.content, prefix);

    if (!parsed) {
      return;
    }

    const { commandName, args } = parsed;
    const resolvedCommandName = resolveCommandAlias(commandName);

    const command = client.commands.get(resolvedCommandName);
    if (!command || !supportsPrefixExecution(command)) {
      return;
    }

    await executePrefixCommand(
      command,
      message,
      args,
      client,
      prefix,
      null,
    );
  } catch (error) {
    logger.error('Error handling prefix command:', error);
  }
}
