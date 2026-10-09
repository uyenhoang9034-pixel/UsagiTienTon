import { MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { ttsManager } from '../../services/tts/ttsManager.js';
import {
  buildTTSStatusEmbed,
  buildTTSControlButtons,
  buildVoiceSelectMenu,
} from '../../commands/Voice/tts.js';

export default {
  name: 'tts_button',

  async execute(interaction, client, args = []) {
    const [action, guildId] = args;
    const guild = interaction.guild;

    if (!guild || guild.id !== guildId) {
      return interaction.reply({
        content: 'Nút này không thuộc về máy chủ này rồi nè vợ của Kim Nong ơi!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const session = ttsManager.getSession(guildId);

    // 1. Nút dừng và rời phòng
    if (action === 'stop') {
      if (!session) {
        return interaction.reply({
          content: '🐰 Phiên nói thay này đã kết thúc trước đó rồi ạ!',
          flags: MessageFlags.Ephemeral,
        });
      }

      await ttsManager.stopSession(guildId, 'Bấm nút dừng điều khiển');

      return interaction.update({
        content: '💤 Em bot Usagi múp rụp đã rời phòng voice theo lệnh của vợ của Kim Nong rồi nha 💕',
        embeds: [],
        components: [],
      });
    }

    // 2. Nút chuyển đổi chế độ đọc
    if (action === 'toggle_mode') {
      if (!session) {
        return interaction.reply({
          content: '🐰 Phiên nói thay này không còn hoạt động nữa rồi ạ!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const nextMode = session.mode === 'owner_only' ? 'all' : 'owner_only';
      ttsManager.setMode(guildId, nextMode);

      const embed = buildTTSStatusEmbed(session, guild);
      const components = buildTTSControlButtons(guildId, session);

      return interaction.update({
        embeds: [embed],
        components,
      });
    }

    // 3. Nút mở bảng chọn giọng
    if (action === 'open_voices') {
      const currentVoiceId = session ? session.voiceId : null;
      const selectMenuRow = buildVoiceSelectMenu(guildId, currentVoiceId);

      return interaction.reply({
        content: '🗣️ Vợ của Kim Nong hãy chọn giọng đọc em sẽ dùng ở menu bên dưới nha:',
        components: [selectMenuRow],
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content: 'Thao tác không hợp lệ.',
      flags: MessageFlags.Ephemeral,
    });
  },
};
