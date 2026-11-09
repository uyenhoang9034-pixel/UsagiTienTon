import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import {
  WORD_GUESS_ADMIN_ROLE_ID,
  WORD_GUESS_DEFAULTS,
  WORD_GUESS_EMOJIS,
} from '../../config/wordGuessConfig.js';
import {
  buildAdminPanelPayloadV2,
  buildWordGuessNoticePayloadV2,
  getActiveRound,
  getWordGuessGuildConfig,
  isWordGuessAdmin,
  resetGuildLeaderboard,
  saveWordGuessGuildConfig,
  startWordGuessRound,
  withGuildLock,
} from '../../services/wordGuessService.js';
import { logger } from '../../utils/logger.js';

function hasBotSendPermission(channel) {
  const botMember = channel?.guild?.members?.me;
  if (!botMember || typeof channel?.permissionsFor !== 'function') {
    return true;
  }
  const perms = channel.permissionsFor(botMember);
  return Boolean(
    perms?.has?.(PermissionFlagsBits.ViewChannel) &&
    perms?.has?.(PermissionFlagsBits.SendMessages),
  );
}

export default {
  data: new SlashCommandBuilder()
    .setName('doantu-admin')
    .setDescription('Quản trị trò chơi Đoán Từ Tiếng Việt (riêng tư cho Admin)')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Mở bảng điều khiển Đoán Từ (chỉ mình bạn thấy)'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Chọn kênh chơi Đoán Từ, bật tự động và bắt đầu ván đầu tiên')
        .addChannelOption((opt) =>
          opt
            .setName('kenh')
            .setDescription('Kênh văn bản dùng để chơi Đoán Từ (mặc định: kênh hiện tại)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('thoigian')
            .setDescription('Thời gian mỗi ván (15 - 300 giây, mặc định: 60)')
            .setMinValue(WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS)
            .setMaxValue(WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS)
            .setRequired(false),
        )
        .addBooleanOption((opt) =>
          opt
            .setName('tudong')
            .setDescription('Tự động mở ván mới sau 5 giây (mặc định: Bật)')
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('thoigian')
        .setDescription('Chỉnh thời gian suy nghĩ cho mỗi ván Đoán Từ')
        .addIntegerOption((opt) =>
          opt
            .setName('giay')
            .setDescription('Số giây mỗi ván (15 - 300 giây)')
            .setMinValue(WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS)
            .setMaxValue(WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset-bxh')
        .setDescription('Đặt lại toàn bộ BXH và chuỗi Streak Đoán Từ của server về 0'),
    ),

  category: 'Games',
  slashOnly: true,

  async execute(interaction, _guildConfig, client) {
    const botClient = client || interaction.client;

    try {
      if (!interaction.guildId) {
        return interaction.reply(
          buildWordGuessNoticePayloadV2({
            title: 'CHỈ DÙNG TRONG SERVER',
            message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Lệnh quản trị Đoán Từ chỉ dùng được trong server nha!`,
            ephemeral: true,
          }),
        );
      }

      if (!isWordGuessAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
        return interaction.reply(
          buildWordGuessNoticePayloadV2({
            title: 'KHÔNG CÓ QUYỀN QUẢN TRỊ',
            message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Chỉ thành viên có role <@&${WORD_GUESS_ADMIN_ROLE_ID}> hoặc Admin server mới dùng được lệnh này nha!`,
            ephemeral: true,
          }),
        );
      }

      const subcommand = interaction.options?.getSubcommand?.(false) || 'panel';

      if (subcommand === 'panel') {
        const config = await getWordGuessGuildConfig(botClient, interaction.guildId);
        const panelPayload = buildAdminPanelPayloadV2(config, getActiveRound(interaction.guildId));
        return interaction.reply(panelPayload);
      }

      if (subcommand === 'setup') {
        const targetChannel = interaction.options?.getChannel?.('kenh') || interaction.channel;
        if (!targetChannel || typeof targetChannel.send !== 'function') {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'KÊNH KHÔNG HỢP LỆ',
              message: `${WORD_GUESS_EMOJIS.CHANNEL} Vui lòng chọn một kênh văn bản hợp lệ để đặt làm kênh Đoán Từ nha!`,
              ephemeral: true,
            }),
          );
        }

        if (!hasBotSendPermission(targetChannel)) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'BOT THIẾU QUYỀN TRONG KÊNH',
              message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Bot cần quyền **Xem kênh (View Channel)** và **Gửi tin nhắn (Send Messages)** tại <#${targetChannel.id}> nha!`,
              ephemeral: true,
            }),
          );
        }

        const customDuration = interaction.options?.getInteger?.('thoigian');
        const autoStartOpt = interaction.options?.getBoolean?.('tudong');

        const savedConfig = await withGuildLock(interaction.guildId, async () => {
          const config = await getWordGuessGuildConfig(botClient, interaction.guildId);
          config.channelId = String(targetChannel.id);
          config.enabled = true;
          config.idlePaused = false;
          if (Number.isInteger(customDuration)) {
            config.durationSeconds = Math.max(
              WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS,
              Math.min(WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS, customDuration),
            );
          }
          if (typeof autoStartOpt === 'boolean') {
            config.autoStart = autoStartOpt;
          } else if (config.autoStart == null) {
            config.autoStart = true;
          }
          return saveWordGuessGuildConfig(botClient, interaction.guildId, config);
        });

        const started = await startWordGuessRound(botClient, interaction.guildId);
        const panelPayload = buildAdminPanelPayloadV2(
          started?.config || savedConfig,
          started?.round || getActiveRound(interaction.guildId),
        );

        return interaction.reply(panelPayload);
      }

      if (subcommand === 'thoigian') {
        const seconds = interaction.options?.getInteger?.('giay');
        if (
          !Number.isInteger(seconds) ||
          seconds < WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS ||
          seconds > WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS
        ) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'THỜI GIAN KHÔNG HỢP LỆ',
              message: `${WORD_GUESS_EMOJIS.TIME} Thời gian suy nghĩ phải từ **${WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS}** đến **${WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS} giây** nha!`,
              ephemeral: true,
            }),
          );
        }

        const updatedConfig = await withGuildLock(interaction.guildId, async () => {
          const config = await getWordGuessGuildConfig(botClient, interaction.guildId);
          config.durationSeconds = seconds;
          return saveWordGuessGuildConfig(botClient, interaction.guildId, config);
        });

        return interaction.reply(
          buildAdminPanelPayloadV2(updatedConfig, getActiveRound(interaction.guildId)),
        );
      }

      if (subcommand === 'reset-bxh') {
        await resetGuildLeaderboard(botClient, interaction.guildId);
        return interaction.reply(
          buildWordGuessNoticePayloadV2({
            title: 'ĐÃ LÀM MỚI BẢNG XẾP HẠNG',
            message: `${WORD_GUESS_EMOJIS.STREAK} Toàn bộ chuỗi streak và điểm BXH Đoán Từ của server đã được đặt lại về **0**!`,
            footer: 'Cấu hình kênh và thời gian ván chơi vẫn được giữ nguyên',
            ephemeral: true,
          }),
        );
      }
    } catch (error) {
      logger.error('[Command:DoanTuAdmin] Lỗi thực thi /doantu-admin:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildWordGuessNoticePayloadV2({
              title: 'LỖI LỆNH QUẢN TRỊ ĐOÁN TỪ',
              message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Đã có lỗi xảy ra khi thực hiện lệnh quản trị Đoán Từ!`,
              ephemeral: true,
            }),
          )
          .catch(() => {});
      }
    }
  },
};
