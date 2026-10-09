import { MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { ttsManager } from '../../services/tts/ttsManager.js';
import { getVoiceById } from '../../services/tts/ttsVoices.js';

export default {
  name: 'tts_select_voice',

  async execute(interaction, client, args = []) {
    const [guildId] = args;
    const selectedVoiceId = interaction.values?.[0];

    if (!selectedVoiceId) {
      return interaction.reply({
        content: 'Chưa chọn giọng nào cả vợ của Kim Nong ơi!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const voice = getVoiceById(selectedVoiceId);
    const session = ttsManager.getSession(guildId);

    if (session) {
      ttsManager.setVoice(guildId, voice.id);

      // Thử phát thử 1 câu ngắn bằng giọng mới để người dùng nghe thử
      ttsManager
        .speakNow(guildId, `Em đã đổi sang giọng ${voice.name} rồi nha!`, {
          voiceId: voice.id,
        })
        .catch((err) => {
          logger.warn('Failed to play sample voice change phrase:', err?.message);
        });
    }

    return interaction.reply({
      content: `✨ Dạ vâng vợ của Kim Nong ơi, em bot Usagi múp rụp đã đổi sang giọng đọc: ${voice.flag} **${voice.name}** (${voice.description}) rồi nha! 💕`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
