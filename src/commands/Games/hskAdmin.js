import { ChannelType, SlashCommandBuilder } from 'discord.js';
import {
  HSK_ADMIN_ROLE_ID,
  HSK_ARENA_LEVEL_CHOICES,
  HSK_DEFAULTS,
  HSK_EMOJIS,
  HSK_STUDY_TIERS,
  getStudyTierMeta,
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
  publishStudyRoomLobbyCard,
  resetHskGuildLeaderboard,
  saveHskGuildConfig,
  startHskArenaRound,
  withHskGuildLock,
} from '../../services/hskService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hsk-admin')
    .setDescription('Quản trị Đấu trường & Phòng Ôn Luyện HSK 3.0 (riêng tư cho Admin)')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Mở bảng điều khiển Đấu trường & Phòng Ôn Luyện HSK 3.0 (chỉ mình bạn thấy)'),
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
        .setName('setup-onluyen')
        .setDescription('Đặt bảng Phòng Ôn Luyện HSK 3.0 cố định (Sơ cấp HSK 1–3 hoặc Trung – Cao cấp HSK 4–9)')
        .addStringOption((opt) =>
          opt
            .setName('phanhe')
            .setDescription('Chọn phân hệ cấp độ cho kênh ôn luyện này')
            .addChoices(
              { name: HSK_STUDY_TIERS.elementary.name, value: 'elementary' },
              { name: HSK_STUDY_TIERS.advanced.name, value: 'advanced' },
            )
            .setRequired(true),
        )
        .addChannelOption((opt) =>
          opt
            .setName('kenh')
            .setDescription('Kênh văn bản đặt bảng Phòng Ôn Luyện (mặc định: kênh hiện tại)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
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

        const targetId = String(targetChannel.id);
        const customLevel = interaction.options?.getString?.('capdo');
        const customDuration = interaction.options?.getInteger?.('thoigian');
        const autoStartOpt = interaction.options?.getBoolean?.('tudong');
        const nowMs = getHskNow(botClient);
        const nightStatus = isHskNightLock(nowMs);

        const setupResult = await withHskGuildLock(interaction.guildId, async () => {
          const config = await getHskGuildConfig(botClient, interaction.guildId);
          if (config.studyChannels?.elementary === targetId || config.studyChannels?.advanced === targetId) {
            const matchedTier =
              config.studyChannels.elementary === targetId ? 'elementary' : 'advanced';
            return { conflict: matchedTier, config };
          }

          config.channelId = targetId;
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
          const saved = await saveHskGuildConfig(botClient, interaction.guildId, config);
          return { conflict: null, config: saved };
        });

        if (setupResult.conflict) {
          const matchedMeta = getStudyTierMeta(setupResult.conflict);
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'KÊNH ĐANG DÙNG CHO ÔN LUYỆN',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Kênh <#${targetId}> hiện đang được gắn làm **Phòng Ôn Luyện ${matchedMeta.name}**.\nHãy chọn một kênh khác làm **Đấu trường HSK 3.0** (hoặc chuyển phòng ôn luyện sang kênh mới bằng \`/hsk-admin setup-onluyen\`) nha!`,
              ephemeral: true,
            }),
          );
        }

        const savedConfig = setupResult.config;
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

      if (subcommand === 'setup-onluyen') {
        const tierKey = interaction.options?.getString?.('phanhe') === 'advanced' ? 'advanced' : 'elementary';
        const tierMeta = getStudyTierMeta(tierKey);
        const otherTierKey = tierKey === 'elementary' ? 'advanced' : 'elementary';
        const otherTierMeta = getStudyTierMeta(otherTierKey);
        const targetChannel = interaction.options?.getChannel?.('kenh') || interaction.channel;

        if (!targetChannel || typeof targetChannel.send !== 'function') {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'KÊNH KHÔNG HỢP LỆ',
              message: `${HSK_EMOJIS.NOTEBOOK} Vui lòng chọn một kênh văn bản hợp lệ để đặt Phòng Ôn Luyện **${tierMeta.name}** nha!`,
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

        const targetId = String(targetChannel.id);
        const nowMs = getHskNow(botClient);
        const lockResult = await withHskGuildLock(interaction.guildId, async () => {
          const config = await getHskGuildConfig(botClient, interaction.guildId);
          if (config.channelId && config.channelId === targetId) {
            return { conflict: 'ARENA', config };
          }
          if (config.studyChannels?.[otherTierKey] === targetId) {
            return { conflict: 'OTHER_STUDY', config };
          }

          try {
            const published = await publishStudyRoomLobbyCard(botClient, targetChannel, tierKey);
            if (!published?.success) {
              return { conflict: 'PUBLISH_FAILED', config };
            }
          } catch (sendErr) {
            logger.warn(`[Command:HskAdmin] Không thể gửi bảng phòng ôn ${tierKey} vào <#${targetId}>:`, sendErr?.message);
            return { conflict: 'PUBLISH_FAILED', config };
          }

          config.studyChannels = {
            ...(config.studyChannels || {}),
            [tierKey]: targetId,
          };
          const saved = await saveHskGuildConfig(botClient, interaction.guildId, config);
          return { conflict: null, config: saved };
        });

        if (lockResult.conflict === 'ARENA') {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'TRÙNG VỚI KÊNH ĐẤU TRƯỜNG',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Kênh <#${targetId}> hiện đang là **Kênh Đấu trường HSK 3.0**.\nHãy chọn một kênh riêng cho **${tierMeta.name}** để người chơi bấm nút ôn không bị trôi ván đấu nha!`,
              ephemeral: true,
            }),
          );
        }

        if (lockResult.conflict === 'OTHER_STUDY') {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'TRÙNG VỚI PHÂN HỆ ÔN LUYỆN KHÁC',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Kênh <#${targetId}> hiện đang đặt làm **Phòng Ôn Luyện ${otherTierMeta.name}**.\nVui lòng tách riêng **2 kênh ôn luyện** (**Sơ cấp HSK 1–3** và **Trung – Cao cấp HSK 4–9**) nha!`,
              ephemeral: true,
            }),
          );
        }

        if (lockResult.conflict === 'PUBLISH_FAILED') {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'KHÔNG THỂ GỬI BẢNG ÔN LUYỆN',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Bot không thể gửi bảng nút vào <#${targetId}> — hãy kiểm tra lại quyền Xem kênh & Gửi tin nhắn của bot nha!`,
              ephemeral: true,
            }),
          );
        }

        return interaction.reply(
          buildHskAdminPanelPayloadV2(
            lockResult.config,
            getActiveHskArenaRound(interaction.guildId),
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

