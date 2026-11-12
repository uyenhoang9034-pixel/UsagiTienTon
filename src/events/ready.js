import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { isTTSEnabledByEnv } from '../config/ttsConfig.js';
import { initWordGuessAutoResume } from '../services/wordGuessService.js';
import { initHskAutoResume } from '../services/hskService.js';
import { initForumStoreSync } from '../services/forumStoreService.js';

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

    try {
      await initHskAutoResume(client);
    } catch (error) {
      logger.warn('Could not initialize HSK 3.0 Arena auto-resume:', error);
    }

    try {
      await initForumStoreSync(client);
    } catch (error) {
      logger.warn('Could not initialize Forum Store sync:', error);
    }

    logger.info(
      isTTSEnabledByEnv()
        ? 'Usagi ready: Kết Hôn + Voice TTS + AI.'
        : 'Usagi ready: Kết Hôn + AI (TTS đang tắt để tiết kiệm RAM).',
    );
  },
};
