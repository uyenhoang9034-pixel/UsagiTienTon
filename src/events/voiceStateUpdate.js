import { Events } from 'discord.js';
import { handleMusicVoiceState } from '../services/music/musicVoiceState.js';
export default { name: Events.VoiceStateUpdate, async execute(oldState, newState, client) {
  await handleMusicVoiceState(client, oldState, newState);
} };
