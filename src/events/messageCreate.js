import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import {
  executePrefixCommand,
  supportsPrefixExecution,
} from '../utils/messageAdapter.js';
import { resolveCommandAlias } from '../config/commands/commandAliases.js';
import { getCommandPrefix } from '../config/bot.js';

const MUSIC_PREFIX_SHORTCUTS = new Map([
  ['leave', 'leave'],
  ['disconnect', 'leave'],
  ['dc', 'leave'],
  ['pause', 'pause'],
  ['resume', 'resume'],
  ['skip', 'skip'],
  ['s', 'skip'],
  ['stop', 'stop'],
  ['volume', 'volume'],
  ['vol', 'volume'],
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
    if (typeof message.content !== 'string' || !message.content) {
      return;
    }

    const prefix = getCommandPrefix();
    const parsed = parsePrefixCommand(message.content, prefix);

    if (!parsed) {
      return;
    }

    let { commandName, args } = parsed;
    const normalizedCommandName = String(commandName || '').toLowerCase();
    const musicShortcut = MUSIC_PREFIX_SHORTCUTS.get(normalizedCommandName);

    if (musicShortcut) {
      commandName = 'music';
      args = [musicShortcut, ...args];
    }

    const resolvedCommandName = resolveCommandAlias(commandName);

    /**
     * Repo Usagi Tiên Tôn chỉ giữ prefix cho music controls.
     * Tu Tiên và GM command dùng slash command để tránh cấp nhầm item/test event.
     */
    if (resolvedCommandName !== 'music') {
      return;
    }

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
