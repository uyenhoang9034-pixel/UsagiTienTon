import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import {
  executePrefixCommand,
  supportsPrefixExecution,
} from '../utils/messageAdapter.js';
import { resolveCommandAlias } from '../config/commands/commandAliases.js';
import { getCommandPrefix } from '../config/bot.js';

const MUSIC_PREFIX_SHORTCUTS = new Set([
  'leave',
  'pause',
  'resume',
  'skip',
  'stop',
  'volume',
]);

export default {
  name: Events.MessageCreate,

  async execute(message, client) {
    if (message.author?.bot || !message.guild) {
      return;
    }

    await handlePrefixCommand(message, client);
  },
};

async function handlePrefixCommand(message, client) {
  try {
    const prefix = getCommandPrefix();
    const parsed = parsePrefixCommand(message.content, prefix);

    if (!parsed) {
      return;
    }

    let { commandName, args } = parsed;
    const normalizedCommandName = commandName.toLowerCase();

    if (MUSIC_PREFIX_SHORTCUTS.has(normalizedCommandName)) {
      commandName = 'music';
      args = [normalizedCommandName, ...args];
    }

    const resolvedCommandName = resolveCommandAlias(commandName);
    const command = client.commands.get(resolvedCommandName);

    if (!command) {
      logger.warn(`Prefix command not found: ${resolvedCommandName}`);
      return;
    }

    if (!supportsPrefixExecution(command)) {
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
