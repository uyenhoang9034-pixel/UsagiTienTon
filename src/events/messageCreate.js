import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import {
  executePrefixCommand,
  supportsPrefixExecution,
} from '../utils/messageAdapter.js';
import { resolveCommandAlias } from '../config/commands/commandAliases.js';
import { getCommandPrefix } from '../config/bot.js';
import { handleTTSMessage } from '../services/tts/ttsManager.js';
import { handleAIChatMessage } from '../services/ai/aiChatManager.js';
import { handleThanVanTuBan } from '../services/thanVanTuBanService.js';
import { handleQuoteTrigger } from '../services/quotes/quoteService.js';

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

    try {
      const handledByTTS = await handleTTSMessage(message, client);
      if (handledByTTS) {
        return;
      }
    } catch (ttsError) {
      logger.error('Error handling TTS message:', ttsError);
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
