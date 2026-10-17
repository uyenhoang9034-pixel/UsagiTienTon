import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';

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

    logger.info('Usagi ready: Kết Hôn + Voice TTS + AI.');
  },
};
