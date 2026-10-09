import { MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import {
  ttsManager,
  hasTTSManagePermission,
  TTS_MANAGER_ROLE_ID,
} from '../../services/tts/ttsManager.js';
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

    // 1. Nút dừng và rời phòng (chỉ Quản lý mới được bấm)
    if (action === 'stop') {
      if (!session) {
        return interaction.reply({
          content: '🐰 Phiên nói thay này đã kết thúc trước đó rồi ạ!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const isManager = hasTTSManagePermission(interaction.member);
      if (!isManager) {
        return interaction.reply({
          content: `❌ Dạ chỉ Quản lý (có role <@&${TTS_MANAGER_ROLE_ID}>) mới có quyền yêu cầu em rời phòng voice thôi ạ! Mọi người chỉ có thể gọi em vào chứ không được đuổi em ra đâu nè 🐰💕`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await ttsManager.stopSession(guildId, 'Bấm nút dừng điều khiển');

      return interaction.update({
        content: '💤 Em bot Usagi múp rụp đã rời phòng voice theo lệnh của Quản lý rồi nha 💕',
        embeds: [],
        components: [],
      });
    }

    // 2. Nút chuyển đổi chế độ đọc (chỉ Quản lý mới được bật "Chỉ mình tôi")
    if (action === 'toggle_mode') {
      if (!session) {
        return interaction.reply({
          content: '🐰 Phiên nói thay này không còn hoạt động nữa rồi ạ!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const isManager = hasTTSManagePermission(interaction.member);
      const nextMode = session.mode === 'owner_only' ? 'all' : 'owner_only';

      if (nextMode === 'owner_only' && !isManager) {
        return interaction.reply({
          content: `❌ Dạ chỉ Quản lý (có role <@&${TTS_MANAGER_ROLE_ID}>) mới có quyền chuyển sang chế độ "Chỉ mình tôi" thôi nha! Mọi người dùng chế độ nói thay chung cho cả kênh nha 💕`,
          flags: MessageFlags.Ephemeral,
        });
      }

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
