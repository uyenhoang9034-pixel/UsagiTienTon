import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { initRiffyAfterReady } from '../services/music/riffySetup.js';

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
      await initRiffyAfterReady(client);
    } catch (error) {
      logger.error('Could not initialize Riffy/Lavalink after ready:', error);
    }

    logger.info('UsagiTienTon ready: Music + Tiên Lộ.');
  },
};
