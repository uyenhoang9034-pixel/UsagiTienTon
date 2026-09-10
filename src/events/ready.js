import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { initRiffyAfterReady } from '../services/music/riffySetup.js';

export default {
  name: Events.ClientReady,
  once: true,

  async execute(client) {
    client.user.setPresence(client.config.bot.presence);

    initRiffyAfterReady(client);

    logger.info('UsagiTienTon ready: music and cultivation.');
  },
};
