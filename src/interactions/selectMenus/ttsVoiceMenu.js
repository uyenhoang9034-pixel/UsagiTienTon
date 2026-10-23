import { MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import {
  ttsManager,
  hasTTSManagePermission,
} from '../../services/tts/ttsManager.js';
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
      const isManager = hasTTSManagePermission(interaction.member);

      // Nếu không phải role Quản lý/Admin, chỉ được đổi giọng 1 lần duy nhất trong phòng voice này
      if (!isManager && ttsManager.hasUserChangedVoice(guildId, interaction.user.id)) {
        return interaction.reply({
          content:
            '❌ Dạ trong phòng voice này bạn đã đổi giọng 1 lần rồi nha! Để tránh spam làm lag em bot Usagi, chỉ có role Quản lý/Admin mới được đổi giọng liên tục thôi ạ 🐰💕',
          flags: MessageFlags.Ephemeral,
        });
      }

      ttsManager.setVoice(guildId, voice.id);
      if (!isManager) {
        ttsManager.recordUserVoiceChange(guildId, interaction.user.id);
      }

      // Thử phát thử 1 câu ngắn bằng giọng mới để người dùng nghe thử
      const sampleText = `Em bot Usagi múp rụp đã đổi sang giọng ${voice.name} cho vợ của Kim Nong rồi nha!`;

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
