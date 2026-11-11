import { ChannelType, SlashCommandBuilder } from 'discord.js';
import {
  HSK_ADMIN_ROLE_ID,
  HSK_ARENA_LEVEL_CHOICES,
  HSK_DEFAULTS,
  HSK_EMOJIS,
} from '../../config/hskConfig.js';
import {
  buildHskAdminPanelPayloadV2,
  buildHskNightLockPayloadV2,
  buildHskNoticePayloadV2,
  getActiveHskArenaRound,
  getHskGuildConfig,
  getHskNow,
  hasBotSendPermission,
  isHskAdmin,
  isHskNightLock,
  resetHskGuildLeaderboard,
  saveHskGuildConfig,
  startHskArenaRound,
  withHskGuildLock,
} from '../../services/hskService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hsk-admin')
    .setDescription('Quản trị Đấu trường HSK 3.0 kênh chung (riêng tư cho Admin)')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Mở bảng điều khiển Đấu trường HSK 3.0 (chỉ mình bạn thấy)'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Chọn kênh Đấu trường HSK 3.0, cấp độ và mở ván đầu tiên')
        .addChannelOption((opt) =>
          opt
            .setName('kenh')
            .setDescription('Kênh văn bản đặt Đấu trường HSK 3.0 (mặc định: kênh hiện tại)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName('capdo')
            .setDescription('Cấp độ HSK 3.0 dùng cho đấu trường kênh chung')
            .addChoices(
              ...HSK_ARENA_LEVEL_CHOICES.map((lvl) => ({
                name: lvl.label,
                value: lvl.key,
              })),
            )
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('thoigian')
            .setDescription('Thời gian mỗi ván (15 - 300 giây, mặc định: 45)')
            .setMinValue(HSK_DEFAULTS.MIN_DURATION_SECONDS)
            .setMaxValue(HSK_DEFAULTS.MAX_DURATION_SECONDS)
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
        .setName('capdo')
        .setDescription('Đổi nhanh cấp độ từ vựng HSK 3.0 cho Đấu trường kênh chung')
        .addStringOption((opt) =>
          opt
            .setName('muc')
            .setDescription('Chọn cấp độ HSK 3.0 mới')
            .addChoices(
              ...HSK_ARENA_LEVEL_CHOICES.map((lvl) => ({
                name: lvl.label,
                value: lvl.key,
              })),
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('thoigian')
        .setDescription('Chỉnh thời gian suy nghĩ cho mỗi ván Đấu trường HSK 3.0')
        .addIntegerOption((opt) =>
          opt
            .setName('giay')
            .setDescription('Số giây mỗi ván (15 - 300 giây)')
            .setMinValue(HSK_DEFAULTS.MIN_DURATION_SECONDS)
            .setMaxValue(HSK_DEFAULTS.MAX_DURATION_SECONDS)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reset-bxh')
        .setDescription('Đặt lại BXH và chuỗi Streak Đấu trường HSK 3.0 của server về 0'),
    ),

  category: 'Games',
  slashOnly: true,

  async execute(interaction, _guildConfig, client) {
    const botClient = client || interaction.client;

    try {
      if (!interaction.guildId) {
        return interaction.reply(
          buildHskNoticePayloadV2({
            title: 'CHỈ DÙNG TRONG SERVER',
            message: `${HSK_EMOJIS.ADMIN_DISABLE} Lệnh quản trị Đấu trường HSK 3.0 chỉ dùng trong server nha!`,
            ephemeral: true,
          }),
        );
      }

      if (!isHskAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
        return interaction.reply(
          buildHskNoticePayloadV2({
            title: 'KHÔNG CÓ QUYỀN QUẢN TRỊ',
            message: `${HSK_EMOJIS.ADMIN_DISABLE} Chỉ thành viên có role <@&${HSK_ADMIN_ROLE_ID}> hoặc Admin server mới dùng được lệnh này nha!`,
            ephemeral: true,
          }),
        );
      }

      const subcommand = interaction.options?.getSubcommand?.(false) || 'panel';

      if (subcommand === 'panel') {
        const config = await getHskGuildConfig(botClient, interaction.guildId);
        return interaction.reply(
          buildHskAdminPanelPayloadV2(
            config,
            getActiveHskArenaRound(interaction.guildId),
            getHskNow(botClient),
          ),
        );
      }

      if (subcommand === 'setup') {
        const targetChannel = interaction.options?.getChannel?.('kenh') || interaction.channel;
        if (!targetChannel || typeof targetChannel.send !== 'function') {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'KÊNH KHÔNG HỢP LỆ',
              message: `${HSK_EMOJIS.ARENA} Vui lòng chọn một kênh văn bản hợp lệ để đặt Đấu trường HSK 3.0 nha!`,
              ephemeral: true,
            }),
          );
        }

        if (!hasBotSendPermission(targetChannel)) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'BOT THIẾU QUYỀN TRONG KÊNH',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Bot cần quyền **Xem kênh (View Channel)** và **Gửi tin nhắn (Send Messages)** tại <#${targetChannel.id}> nha!`,
              ephemeral: true,
            }),
          );
        }

        const customLevel = interaction.options?.getString?.('capdo');
        const customDuration = interaction.options?.getInteger?.('thoigian');
        const autoStartOpt = interaction.options?.getBoolean?.('tudong');
        const nowMs = getHskNow(botClient);
        const nightStatus = isHskNightLock(nowMs);

        const savedConfig = await withHskGuildLock(interaction.guildId, async () => {
          const config = await getHskGuildConfig(botClient, interaction.guildId);
          config.channelId = String(targetChannel.id);
          config.enabled = true;
          config.idlePaused = nightStatus.locked;
          if (customLevel) {
            config.arenaLevelKey = customLevel;
          }
          if (Number.isInteger(customDuration)) {
            config.durationSeconds = Math.max(
              HSK_DEFAULTS.MIN_DURATION_SECONDS,
              Math.min(HSK_DEFAULTS.MAX_DURATION_SECONDS, customDuration),
            );
          }
          if (typeof autoStartOpt === 'boolean') {
            config.autoStart = autoStartOpt;
          } else if (config.autoStart == null) {
            config.autoStart = true;
          }
          return saveHskGuildConfig(botClient, interaction.guildId, config);
        });

        if (nightStatus.locked) {
          return interaction.reply(
            buildHskNightLockPayloadV2({
              currentTimeText: nightStatus.currentTimeText,
              startHour: nightStatus.startHour,
              endHour: nightStatus.endHour,
              includeResumeButton: false,
              ephemeral: true,
              configSavedNotice: true,
            }),
          );
        }

        const started = await startHskArenaRound(botClient, interaction.guildId);
        return interaction.reply(
          buildHskAdminPanelPayloadV2(
            started?.config || savedConfig,
            started?.round || getActiveHskArenaRound(interaction.guildId),
            nowMs,
          ),
        );
      }

      if (subcommand === 'capdo') {
        const levelKey = interaction.options?.getString?.('muc') || '1';
        const updated = await withHskGuildLock(interaction.guildId, async () => {
          const config = await getHskGuildConfig(botClient, interaction.guildId);
          config.arenaLevelKey = levelKey;
          return saveHskGuildConfig(botClient, interaction.guildId, config);
        });

        return interaction.reply(
          buildHskAdminPanelPayloadV2(
            updated,
            getActiveHskArenaRound(interaction.guildId),
            getHskNow(botClient),
          ),
        );
      }

      if (subcommand === 'thoigian') {
        const seconds = interaction.options?.getInteger?.('giay');
        if (
          !Number.isInteger(seconds) ||
          seconds < HSK_DEFAULTS.MIN_DURATION_SECONDS ||
          seconds > HSK_DEFAULTS.MAX_DURATION_SECONDS
        ) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'THỜI GIAN KHÔNG HỢP LỆ',
              message: `${HSK_EMOJIS.TIME} Thời gian suy nghĩ phải từ **${HSK_DEFAULTS.MIN_DURATION_SECONDS}** đến **${HSK_DEFAULTS.MAX_DURATION_SECONDS} giây** nha!`,
              ephemeral: true,
            }),
          );
        }

        const updatedConfig = await withHskGuildLock(interaction.guildId, async () => {
          const config = await getHskGuildConfig(botClient, interaction.guildId);
          config.durationSeconds = seconds;
          return saveHskGuildConfig(botClient, interaction.guildId, config);
        });

        return interaction.reply(
          buildHskAdminPanelPayloadV2(
            updatedConfig,
            getActiveHskArenaRound(interaction.guildId),
            getHskNow(botClient),
          ),
        );
      }

      if (subcommand === 'reset-bxh') {
        await resetHskGuildLeaderboard(botClient, interaction.guildId);
        return interaction.reply(
          buildHskNoticePayloadV2({
            title: 'ĐÃ LÀM MỚI BXH ĐẤU TRƯỜNG HSK',
            message: `${HSK_EMOJIS.STREAK} Toàn bộ chuỗi Streak và BXH Đấu trường HSK 3.0 của server đã được đặt lại về **0**!`,
            footer: 'Sổ tay từ sai & lịch ôn SRS cá nhân của thành viên vẫn được giữ nguyên',
            ephemeral: true,
          }),
        );
      }
    } catch (error) {
      logger.error('[Command:HskAdmin] Lỗi thực thi /hsk-admin:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildHskNoticePayloadV2({
              title: 'LỖI LỆNH QUẢN TRỊ HSK 3.0',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Đã có lỗi xảy ra khi thực hiện lệnh quản trị Đấu trường HSK 3.0!`,
              ephemeral: true,
            }),
          )
          .catch(() => {});
      }
    }
  },
};

