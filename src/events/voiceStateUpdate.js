import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { handleMusicVoiceState } from '../services/music/musicVoiceState.js';

export default {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState, client) {
    try {
      await handleMusicVoiceState(client, oldState, newState);
    } catch (error) {
      logger.error('VoiceStateUpdate error:', error);
    }
  },
};
