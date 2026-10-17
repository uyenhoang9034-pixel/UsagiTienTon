import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { handleTTSVoiceState } from '../services/tts/ttsManager.js';

export default {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState, client) {
    try {
      await handleTTSVoiceState(client, oldState, newState);
    } catch (error) {
      logger.error('VoiceStateUpdate error:', error);
    }
  },
};
