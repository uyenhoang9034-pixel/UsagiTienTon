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
      let sampleText = `Em đã đổi sang giọng ${voice.name} rồi nha!`;
      if (voice.id === 'ja-JP-AoiNeural') {
        sampleText = 'Ara ara~ Em đã đổi sang giọng Aoi quyến rũ cho vợ của Kim Nong rồi nha~';
      } else if (voice.id === 'ja-JP-MayuNeural') {
        sampleText = 'Ah... Em đã đổi sang giọng Mayu nũng nịu ướt át cho vợ của Kim Nong rồi nè...';
      } else if (voice.id === 'vi-VN-AnimeWaifu') {
        sampleText = 'Onii-chan~ Em đã đổi sang giọng Anime Waifu siêu cấp dễ thương rồi nè!';
      } else if (voice.id === 'de-DE-KatjaNeural') {
        sampleText = 'Guten Tag! Em đã đổi sang giọng nữ tiếng Đức Katja cho vợ của Kim Nong rồi nha!';
      } else if (voice.id === 'de-DE-ConradNeural') {
        sampleText = 'Hallo! Em đã đổi sang giọng nam tiếng Đức Conrad cho vợ của Kim Nong rồi nha!';
      }

      ttsManager
        .speakNow(guildId, sampleText, {
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
