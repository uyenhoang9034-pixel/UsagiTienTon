import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';
import { isTTSEnabledByEnv } from '../config/ttsConfig.js';

let cachedHandleTTSVoiceState = null;

export default {
  name: Events.VoiceStateUpdate,

  async execute(oldState, newState, client) {
    if (!isTTSEnabledByEnv()) {
      return;
    }

    try {
      cachedHandleTTSVoiceState ??= (await import('../services/tts/ttsManager.js')).handleTTSVoiceState;
      await cachedHandleTTSVoiceState(client, oldState, newState);
    } catch (error) {
      logger.error('VoiceStateUpdate error:', error);
    }
  },
};
