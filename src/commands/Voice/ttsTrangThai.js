import { EmbedBuilder, MessageFlags, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { isTTSEnabledByEnv } from '../../config/ttsConfig.js';
import {
  TTS_MANAGER_ROLE_ID,
  getProcessMemoryStats,
  getTTSGuildConfig,
  hasTTSManagePermission,
} from '../../services/tts/ttsStateService.js';
import { logger } from '../../utils/logger.js';

const USAGI_COLOR = 0xF3AFC8;
const DISABLED_COLOR = 0xED4245;

function withEphemeralIfSlash(payload, interaction) {
  if (interaction?._isPrefixCommand) {
    return payload;
  }
  return {
    ...payload,
    flags: MessageFlags.Ephemeral,
  };
}

export default {
  data: new SlashCommandBuilder()
    .setName('ttstrangthai')
    .setDescription('Xem trạng thái bật/tắt TTS và mức RAM hiện tại của em Usagi')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  category: 'Voice',

  async execute(interaction, _guildConfig, client) {
    const botClient = client || interaction.client;

    if (!interaction.guildId || !interaction.guild) {
      return interaction.reply(
        withEphemeralIfSlash(
          {
            content: '🐰 Lệnh `/ttstrangthai` chỉ dùng được trong máy chủ thôi nha vợ của Kim Nong ơi!',
          },
          interaction,
        ),
      );
    }

    if (
      !hasTTSManagePermission(
        interaction.member,
        interaction.user?.id,
        interaction.guild,
        interaction.memberPermissions,
      )
    ) {
      return interaction.reply(
        withEphemeralIfSlash(
          {
            content: `❌ Dạ chỉ Quản lý (có role <@&${TTS_MANAGER_ROLE_ID}>), Quản trị viên hoặc Chủ máy chủ mới dùng được lệnh \`/ttstrangthai\` thôi nha vợ của Kim Nong ơi! 🐰💕`,
          },
          interaction,
        ),
      );
    }

    try {
      const config = await getTTSGuildConfig(botClient, interaction.guildId);
      const { ttsManager } = await import('../../services/tts/ttsManager.js');
      const session = ttsManager.getSession(interaction.guildId);
      const mem = getProcessMemoryStats();

      const embed = new EmbedBuilder()
        .setColor(config.enabled && isTTSEnabledByEnv() ? USAGI_COLOR : DISABLED_COLOR)
        .setTitle('📊 Trạng Thái Tính Năng TTS & RAM')
        .setDescription(
          !isTTSEnabledByEnv()
            ? 'Tính năng nói thay (TTS) hiện đang **TẮT TRIỆT ĐỂ** ở cấp hệ thống (`ENABLE_TTS=false`) để tiết kiệm RAM ạ 💤'
            : config.enabled
            ? 'Tính năng nói thay (TTS) hiện đang **sẵn sàng** phục vụ vợ của Kim Nong nha 💕'
            : 'Tính năng nói thay (TTS) hiện đang **TẮT** trong máy chủ này để tiết kiệm RAM ạ 💤',
        )
        .addFields(
          {
            name: '⚙️ Cấp hệ thống (`ENABLE_TTS`)',
            value: isTTSEnabledByEnv() ? '🟢 Đang BẬT (`true`)' : '🔴 Đang TẮT (`false`)',
            inline: true,
          },
          {
            name: '📡 Cấp máy chủ',
            value: config.enabled ? '🟢 Đang BẬT' : '🔴 Đang TẮT',
            inline: true,
          },
          {
            name: '🔊 Phiên Voice hiện tại',
            value: session ? `Đang nói trong <#${session.voiceChannelId}>` : 'Không có phiên nào',
            inline: false,
          },
          {
            name: '🧩 Trạng thái nạp vào RAM',
            value:
              `• \`@discordjs/voice\`: ${ttsManager.isVoiceModuleLoaded() ? '⚡ Đã nạp' : '💤 Chưa nạp (0 MB)'}\n` +
              `• \`ttsAudioEngine / ws\`: ${ttsManager.isAudioEngineLoaded() ? '⚡ Đã nạp' : '💤 Chưa nạp (0 MB)'}`,
            inline: false,
          },
          {
            name: '🧠 RAM Tiến Trình',
            value: `HeapUsed: \`${mem.heapUsedMB} MB\` • HeapTotal: \`${mem.heapTotalMB} MB\` • RSS: \`${mem.rssMB} MB\``,
            inline: false,
          },
        )
        .setFooter({ text: 'Dùng /tts-admin tat hoặc /tts-admin bat để bật tắt nhanh' })
        .setTimestamp();

      return interaction.reply(withEphemeralIfSlash({ embeds: [embed] }, interaction));
    } catch (error) {
      logger.error('[Command:TtsTrangThai] Lỗi thực thi /ttstrangthai:', error);
      const errorPayload = withEphemeralIfSlash(
        {
          content: `❌ Ui vợ của Kim Nong ơi, có lỗi khi xử lý \`/ttstrangthai\`: ${error?.message || 'Lỗi không xác định'}`,
        },
        interaction,
      );

      if (interaction.replied || interaction.deferred) {
        return interaction.editReply(errorPayload).catch(() => {});
      }
      return interaction.reply(errorPayload).catch(() => {});
    }
  },
};
