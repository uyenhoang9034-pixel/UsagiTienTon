import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { initWordGuessAutoResume } from '../services/wordGuessService.js';

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    try {
      if (client.config?.bot?.presence) {
        await client.user.setPresence(client.config.bot.presence);
      }
    } catch (error) {
      logger.warn('Could not set bot presence:', error);
    }

    try {
      await initWordGuessAutoResume(client);
    } catch (error) {
      logger.warn('Could not initialize WordGuess auto-resume:', error);
    }

    logger.info('Usagi ready: Kết Hôn + Voice TTS + AI.');
  },
};
