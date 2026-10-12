import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { handleMusicVoiceState } from '../services/music/musicVoiceState.js';
import { handleTTSVoiceState } from '../services/tts/ttsManager.js';
import { handleMarriageVoiceState } from '../services/marriageVoiceTracker.js';

export default {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState, client) {
    try {
      await handleMusicVoiceState(client, oldState, newState);
      await handleTTSVoiceState(client, oldState, newState);
      await handleMarriageVoiceState(oldState, newState);
    } catch (error) {
      logger.error('VoiceStateUpdate error:', error);
    }
  },
};
