import { EmbedBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { isTTSEnabledByEnv } from '../../config/ttsConfig.js';
import {
  TTS_MANAGER_ROLE_ID,
  getProcessMemoryStats,
  getTTSGuildConfig,
  hasTTSManagePermission,
  setTTSGuildEnabled,
} from '../../services/tts/ttsStateService.js';
import { logger } from '../../utils/logger.js';

const USAGI_COLOR = 0xF3AFC8;
const DISABLED_COLOR = 0xED4245;
const ENABLED_COLOR = 0x57F287;

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
    .setName('tts-admin')
    .setDescription('Quản trị bật/tắt tính năng nói thay (TTS) để tiết kiệm RAM (Quản lý)')
    .addSubcommand((sub) =>
      sub
        .setName('tat')
        .setDescription('Tắt hẳn tính năng TTS trong máy chủ (ngắt voice, xóa hàng đợi và dọn RAM)')
        .addStringOption((opt) =>
          opt
            .setName('ly_do')
            .setDescription('Lý do tắt tính năng TTS (tùy chọn)')
            .setMaxLength(200)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('bat')
        .setDescription('Bật lại tính năng nói thay (TTS) cho máy chủ'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('trangthai')
        .setDescription('Xem trạng thái bật/tắt TTS và mức RAM hiện tại của em Usagi'),
    ),

  category: 'Voice',

  async execute(interaction, _guildConfig, client) {
    const botClient = client || interaction.client;

    if (!interaction.guildId || !interaction.guild) {
      return interaction.reply(
        withEphemeralIfSlash(
          {
            content: '🐰 Lệnh `/tts-admin` chỉ dùng được trong máy chủ thôi nha vợ của Kim Nong ơi!',
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
            content: `❌ Dạ chỉ Quản lý (có role <@&${TTS_MANAGER_ROLE_ID}>), Quản trị viên hoặc Chủ máy chủ mới dùng được lệnh \`/tts-admin\` thôi nha vợ của Kim Nong ơi! 🐰💕`,
          },
          interaction,
        ),
      );
    }

    try {
      const subcommand = interaction.options?.getSubcommand?.(false) || 'trangthai';

      if (!isTTSEnabledByEnv()) {
        return interaction.reply(
          withEphemeralIfSlash(
            {
              content:
                '💤 Dạ vợ của Kim Nong ơi, tính năng TTS hiện đang **TẮT TRIỆT ĐỂ** ở cấp hệ thống (`ENABLE_TTS=false`) nên không tốn RAM chút nào luôn ạ!\n• Khi nào cần dùng lại, chỉ cần đổi `ENABLE_TTS=true` rồi khởi động lại bot nha 💕',
            },
            interaction,
          ),
        );
      }

      if (subcommand === 'tat') {
        const reason = interaction.options?.getString?.('ly_do')?.trim() || null;

        const saved = await setTTSGuildEnabled(botClient, interaction.guildId, false, {
          updatedBy: interaction.user?.id,
          reason,
        });

        const { ttsManager } = await import('../../services/tts/ttsManager.js');
        const cleanup = await ttsManager.disableGuildTTS(
          interaction.guildId,
          reason || 'Quản lý đã tắt tính năng TTS bằng /tts-admin tat',
        );

        const mem = getProcessMemoryStats();
        const embed = new EmbedBuilder()
          .setColor(DISABLED_COLOR)
          .setTitle('💤 Đã TẮT Tính Năng Nói Thay (TTS)')
          .setDescription(
            'Dạ vâng vợ của Kim Nong ơi! Em bot Usagi múp rụp đã **tắt toàn bộ tính năng nói thay (TTS)** trong máy chủ này và dọn sạch phiên voice đang chạy (nếu có) rồi ạ 💕',
          )
          .addFields(
            {
              name: '📡 Trạng thái máy chủ',
              value: '🔴 **Đang TẮT** (chặn `/tts`, nút điều khiển và đọc chat)',
              inline: true,
            },
            {
              name: '🔊 Phiên Voice',
              value: cleanup.stoppedSession
                ? '⏹️ Đã ngắt kết nối voice & xóa hàng đợi'
                : '✅ Không có phiên nào đang mở',
              inline: true,
            },
            {
              name: '🧠 RAM Hiện Tại',
              value: `Heap: \`${mem.heapUsedMB} MB\` • RSS: \`${mem.rssMB} MB\``,
              inline: false,
            },
            ...(reason
              ? [
                  {
                    name: '📝 Lý do',
                    value: reason,
                    inline: false,
                  },
                ]
              : []),
            {
              name: '💡 Mẹo tiết kiệm 100% RAM',
              value:
                '• Bật lại nhanh trong Discord: dùng `/tts-admin bat`.\n' +
                (cleanup.voiceModuleLoaded
                  ? '• Thư viện `@discordjs/voice` đã từng được nạp trong phiên chạy này — để xả triệt để cả vùng nhớ native/WASM và ngắt hẳn `GuildVoiceStates`, vợ của Kim Nong đặt `ENABLE_TTS=false` (mặc định) rồi restart bot nha!'
                  : '• Nếu lâu không dùng, giữ `ENABLE_TTS=false` (mặc định) khi chạy bot sẽ giúp tiết kiệm 100% RAM phần TTS luôn ạ!'),
              inline: false,
            },
          )
          .setFooter({
            text: saved.persisted
              ? 'Usagi Tiên Tôn • Đã lưu cấu hình tắt TTS vào cơ sở dữ liệu'
              : 'Usagi Tiên Tôn • Đã tắt TTS trong RAM (chưa ghi được DB)',
          })
          .setTimestamp();

        return interaction.reply(withEphemeralIfSlash({ embeds: [embed] }, interaction));
      }

      if (subcommand === 'bat') {
        const saved = await setTTSGuildEnabled(botClient, interaction.guildId, true, {
          updatedBy: interaction.user?.id,
          reason: null,
        });

        const embed = new EmbedBuilder()
          .setColor(ENABLED_COLOR)
          .setTitle('🎙️ Đã BẬT Lại Tính Năng Nói Thay (TTS)')
          .setDescription(
            'Dạ vâng vợ của Kim Nong ơi! Em bot Usagi múp rụp đã **mở lại tính năng nói thay (TTS)** cho máy chủ này rồi nha! Mọi người có thể dùng `/tts vao` hoặc `/tts noi` bình thường ạ 💕',
          )
          .addFields(
            {
              name: '📡 Trạng thái máy chủ',
              value: '🟢 **Đang BẬT**',
              inline: true,
            },
            {
              name: '⚙️ Hệ thống (`ENABLE_TTS`)',
              value: '🟢 **Đang BẬT**',
              inline: true,
            },
          )
          .setFooter({
            text: saved.persisted
              ? 'Usagi Tiên Tôn • Đã lưu cấu hình bật TTS vào cơ sở dữ liệu'
              : 'Usagi Tiên Tôn • Đã bật TTS trong RAM (chưa ghi được DB)',
          })
          .setTimestamp();

        return interaction.reply(withEphemeralIfSlash({ embeds: [embed] }, interaction));
      }

      // subcommand === 'trangthai'
      const config = await getTTSGuildConfig(botClient, interaction.guildId);
      const { ttsManager } = await import('../../services/tts/ttsManager.js');
      const session = ttsManager.getSession(interaction.guildId);
      const mem = getProcessMemoryStats();

      const embed = new EmbedBuilder()
        .setColor(config.enabled ? USAGI_COLOR : DISABLED_COLOR)
        .setTitle('📊 Trạng Thái Tính Năng TTS & RAM')
        .setDescription(
          config.enabled
            ? 'Tính năng nói thay (TTS) hiện đang **sẵn sàng** phục vụ vợ của Kim Nong nha 💕'
            : 'Tính năng nói thay (TTS) hiện đang **TẮT** trong máy chủ này để tiết kiệm RAM ạ 💤',
        )
        .addFields(
          {
            name: '⚙️ Cấp hệ thống (`ENABLE_TTS`)',
            value: '🟢 Đang BẬT (`true`)',
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
      logger.error('[Command:TtsAdmin] Lỗi thực thi /tts-admin:', error);
      const errorPayload = withEphemeralIfSlash(
        {
          content: `❌ Ui vợ của Kim Nong ơi, có lỗi khi xử lý \`/tts-admin\`: ${error?.message || 'Lỗi không xác định'}`,
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

