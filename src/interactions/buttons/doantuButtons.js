import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { WORD_GUESS_ADMIN_ROLE_ID, WORD_GUESS_DEFAULTS, WORD_GUESS_EMOJIS } from '../../config/wordGuessConfig.js';
import {
  buildAdminPanelPayloadV2,
  buildIdlePausedPayloadV2,
  buildLeaderboardPayloadV2,
  buildWordGuessNoticePayloadV2,
  disableWordGuessGuild,
  getActiveRound,
  getPlayerLeaderboardPosition,
  getWordGuessGuildConfig,
  isWordGuessAdmin,
  revealRoundHint,
  saveWordGuessGuildConfig,
  startWordGuessRound,
  withGuildLock,
} from '../../services/wordGuessService.js';
import { logger } from '../../utils/logger.js';

const resumingGuilds = new Set();

function buildPermissionDeniedPayload() {
  return buildWordGuessNoticePayloadV2({
    title: 'KHÔNG CÓ QUYỀN QUẢN TRỊ',
    message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Chỉ thành viên có role <@&${WORD_GUESS_ADMIN_ROLE_ID}> hoặc Admin server mới dùng được thao tác này nha!`,
    ephemeral: true,
  });
}

export default [
  // 1. Nút Mở gợi ý trên ván đoán từ
  {
    name: 'doantu_hint',
    async execute(interaction, client, args) {
      try {
        if (!interaction.guildId) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'CHỈ DÙNG TRONG SERVER',
              message: `${WORD_GUESS_EMOJIS.TIME} Trò chơi Đoán Từ chỉ hoạt động trong kênh của server nha!`,
              ephemeral: true,
            }),
          );
        }

        const roundId = args?.[0] || null;
        const result = await revealRoundHint(client, interaction.guildId, {
          roundId,
          triggeredByUser: true,
          interaction,
        });

        if (!result.success) {
          if (result.reason === 'ALREADY_REVEALED') {
            return interaction.reply(
              buildWordGuessNoticePayloadV2({
                title: 'GỢI Ý ĐÃ ĐƯỢC MỞ',
                message: `${WORD_GUESS_EMOJIS.HINT} Gợi ý chữ cái đầu của ván này đã được mở rồi nè! Nhắn đáp án có dấu để giành **+1 Streak** nha~`,
                ephemeral: true,
              }),
            );
          }

          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'VÁN CHƠI ĐÃ KẾT THÚC',
              message: `${WORD_GUESS_EMOJIS.TIME} Ván đoán từ này đã kết thúc hoặc đã đổi sang từ khóa mới rồi nha!`,
              ephemeral: true,
            }),
          );
        }
      } catch (error) {
        logger.error('[DoanTuButtons] Lỗi nút doantu_hint:', error);
      }
    },
  },

  // 1b. Nút Chơi tiếp sau khi bot tạm kết thúc vì quá 3 phút vắng người chơi
  {
    name: 'doantu_resume',
    async execute(interaction, client) {
      const guildId = String(interaction.guildId || '');
      try {
        if (!guildId) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'CHỈ DÙNG TRONG SERVER',
              message: `${WORD_GUESS_EMOJIS.TIME} Trò chơi Đoán Từ chỉ hoạt động trong server nha!`,
              ephemeral: true,
            }),
          );
        }

        if (resumingGuilds.has(guildId)) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'ĐANG MỞ VÁN MỚI',
              message: `${WORD_GUESS_EMOJIS.HINT} Có người vừa bấm Chơi tiếp rồi, ván mới đang được gửi ngay nè~`,
              ephemeral: true,
            }),
          );
        }

        resumingGuilds.add(guildId);
        try {
          const botClient = client || interaction.client;
          const config = await getWordGuessGuildConfig(botClient, guildId);

          if (!config.enabled || !config.channelId) {
            await interaction
              .update(
                buildIdlePausedPayloadV2({
                  idleMinutes: Math.max(1, Math.round(WORD_GUESS_DEFAULTS.IDLE_TIMEOUT_MS / 60000)),
                  resumeDisabled: true,
                }),
              )
              .catch(() => {});

            return interaction
              .followUp?.(
                buildWordGuessNoticePayloadV2({
                  title: 'TRÒ CHƠI ĐANG TẮT',
                  message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Admin hiện đã tắt kênh Đoán Từ rồi nha!`,
                  ephemeral: true,
                }),
              )
              ?.catch?.(() => {});
          }

          const currentChannelId = String(interaction.channelId || interaction.channel?.id || '');
          if (currentChannelId && currentChannelId !== config.channelId) {
            return interaction.reply(
              buildWordGuessNoticePayloadV2({
                title: 'KÊNH CHƠI ĐÃ THAY ĐỔI',
                message: `${WORD_GUESS_EMOJIS.CHANNEL} Kênh Đoán Từ hiện tại đã chuyển sang <#${config.channelId}> rồi nha!`,
                ephemeral: true,
              }),
            );
          }

          const existing = getActiveRound(guildId);
          if ((existing && !existing.ended) || !config.idlePaused) {
            await interaction
              .update(
                buildIdlePausedPayloadV2({
                  idleMinutes: Math.max(1, Math.round(WORD_GUESS_DEFAULTS.IDLE_TIMEOUT_MS / 60000)),
                  resumeDisabled: true,
                }),
              )
              .catch(() => {});
            return;
          }

          await interaction.update(
            buildIdlePausedPayloadV2({
              idleMinutes: Math.max(1, Math.round(WORD_GUESS_DEFAULTS.IDLE_TIMEOUT_MS / 60000)),
              resumeDisabled: true,
              resumedByUserId: interaction.user.id,
            }),
          );

          const started = await startWordGuessRound(botClient, guildId, { isAutoContinuation: false });
          if (!started?.success) {
            await interaction
              .followUp?.(
                buildWordGuessNoticePayloadV2({
                  title: 'KHÔNG THỂ BẮT ĐẦU VÁN MỚI',
                  message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Bot không tìm thấy hoặc thiếu quyền gửi tin nhắn vào kênh <#${config.channelId}> nha!`,
                  ephemeral: true,
                }),
              )
              ?.catch?.(() => {});
          }
        } finally {
          resumingGuilds.delete(guildId);
        }
      } catch (error) {
        logger.error('[DoanTuButtons] Lỗi nút doantu_resume:', error);
      }
    },
  },

  // 2a. BXH Lùi trang (❮❮) — giống phân trang profile booking
  {
    name: 'doantu_bxh_prev',
    async execute(interaction, client, args) {
      try {
        if (!interaction.guildId) return;
        const config = await getWordGuessGuildConfig(client, interaction.guildId);
        const { entries, rank, stats } = getPlayerLeaderboardPosition(config, interaction.user.id);
        const totalPages = Math.max(1, Math.ceil(entries.length / WORD_GUESS_DEFAULTS.BXH_PAGE_SIZE));
        const currentPage = Number.parseInt(args?.[0] ?? '0', 10);
        const safeCurrentPage = Number.isInteger(currentPage) && currentPage >= 0 ? currentPage % totalPages : 0;
        const targetPage = (safeCurrentPage - 1 + totalPages) % totalPages;

        const payload = buildLeaderboardPayloadV2({
          entries,
          page: targetPage,
          requesterStats: stats,
          requesterRank: rank,
        });

        await interaction.update(payload);
      } catch (error) {
        logger.error('[DoanTuButtons] Lỗi phân trang doantu_bxh_prev:', error);
      }
    },
  },

  // 2b. BXH Tới trang (❯❯) — giống phân trang profile booking
  {
    name: 'doantu_bxh_next',
    async execute(interaction, client, args) {
      try {
        if (!interaction.guildId) return;
        const config = await getWordGuessGuildConfig(client, interaction.guildId);
        const { entries, rank, stats } = getPlayerLeaderboardPosition(config, interaction.user.id);
        const totalPages = Math.max(1, Math.ceil(entries.length / WORD_GUESS_DEFAULTS.BXH_PAGE_SIZE));
        const currentPage = Number.parseInt(args?.[0] ?? '0', 10);
        const safeCurrentPage = Number.isInteger(currentPage) && currentPage >= 0 ? currentPage % totalPages : 0;
        const targetPage = (safeCurrentPage + 1) % totalPages;

        const payload = buildLeaderboardPayloadV2({
          entries,
          page: targetPage,
          requesterStats: stats,
          requesterRank: rank,
        });

        await interaction.update(payload);
      } catch (error) {
        logger.error('[DoanTuButtons] Lỗi phân trang doantu_bxh_next:', error);
      }
    },
  },

  // 2c. Badge trang hiện tại (fallback nếu tương tác)
  {
    name: 'doantu_bxh_page',
    async execute(interaction) {
      await interaction.deferUpdate?.()?.catch?.(() => {});
    },
  },

  // 3a. Admin: Bắt đầu ngay một ván mới
  {
    name: 'doantu_admin_start',
    async execute(interaction, client) {
      try {
        if (!isWordGuessAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildPermissionDeniedPayload());
        }

        const result = await startWordGuessRound(client, interaction.guildId, { forceEnable: true });
        if (!result.success) {
          const reasonMessage =
            result.reason === 'NO_CHANNEL'
              ? `${WORD_GUESS_EMOJIS.CHANNEL} Bạn chưa chọn kênh trò chơi! Hãy chạy \`/doantu-admin setup\` tại kênh mong muốn trước nha.`
              : `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Bot không tìm thấy hoặc thiếu quyền gửi tin nhắn vào kênh <#${result.config?.channelId}>.`;

          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'KHÔNG THỂ BẮT ĐẦU VÁN MỚI',
              message: reasonMessage,
              ephemeral: true,
            }),
          );
        }

        const panelPayload = buildAdminPanelPayloadV2(result.config, result.round);
        await interaction.update(panelPayload);
      } catch (error) {
        logger.error('[DoanTuButtons] Lỗi nút doantu_admin_start:', error);
      }
    },
  },

  // 3b. Admin: Bật / Tắt chế độ tự động bắt đầu ván kế tiếp
  {
    name: 'doantu_admin_toggle',
    async execute(interaction, client) {
      try {
        if (!isWordGuessAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildPermissionDeniedPayload());
        }

        const saved = await withGuildLock(interaction.guildId, async () => {
          const config = await getWordGuessGuildConfig(client, interaction.guildId);
          config.autoStart = !config.autoStart;
          if (!config.autoStart) {
            config.idlePaused = false;
          }
          return saveWordGuessGuildConfig(client, interaction.guildId, config);
        });

        let currentRound = getActiveRound(interaction.guildId);
        if (saved.enabled && saved.autoStart && saved.channelId && !currentRound) {
          const started = await startWordGuessRound(client, interaction.guildId);
          if (started?.success) {
            currentRound = started.round;
          }
        }

        await interaction.update(buildAdminPanelPayloadV2(saved, currentRound));
      } catch (error) {
        logger.error('[DoanTuButtons] Lỗi nút doantu_admin_toggle:', error);
      }
    },
  },

  // 3c. Admin: Mở Modal chỉnh số giây mỗi ván
  {
    name: 'doantu_admin_time',
    async execute(interaction, client) {
      try {
        if (!isWordGuessAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildPermissionDeniedPayload());
        }

        const config = await getWordGuessGuildConfig(client, interaction.guildId);
        const modal = new ModalBuilder()
          .setCustomId('doantu_modal_time')
          .setTitle('Chỉnh Thời Gian Đoán Từ');

        const durationInput = new TextInputBuilder()
          .setCustomId('duration_seconds')
          .setLabel(`Số giây mỗi ván (${WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS} - ${WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS} giây)`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ví dụ: 60')
          .setValue(String(config.durationSeconds || WORD_GUESS_DEFAULTS.ROUND_DURATION_SECONDS))
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(3);

        modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
        await interaction.showModal(modal);
      } catch (error) {
        logger.error('[DoanTuButtons] Lỗi nút doantu_admin_time:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply(
              buildWordGuessNoticePayloadV2({
                title: 'LỖI MỞ KHUNG CHỈNH GIÂY',
                message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Không thể mở khung chỉnh thời gian. Vui lòng thử lại!`,
                ephemeral: true,
              }),
            )
            .catch(() => {});
        }
      }
    },
  },

  // 3d. Admin: Tắt kênh hoặc Bật lại trò chơi
  {
    name: 'doantu_admin_disable',
    async execute(interaction, client) {
      try {
        if (!isWordGuessAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildPermissionDeniedPayload());
        }

        const currentConfig = await getWordGuessGuildConfig(client, interaction.guildId);
        if (currentConfig.enabled) {
          const disabledConfig = await disableWordGuessGuild(client, interaction.guildId);
          return interaction.update(buildAdminPanelPayloadV2(disabledConfig, null));
        }

        if (!currentConfig.channelId) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'CHƯA CÓ KÊNH ĐỂ BẬT',
              message: `${WORD_GUESS_EMOJIS.CHANNEL} Hãy chạy \`/doantu-admin setup\` để chọn kênh trò chơi trước nha!`,
              ephemeral: true,
            }),
          );
        }

        const enabledConfig = await withGuildLock(interaction.guildId, async () => {
          const cfg = await getWordGuessGuildConfig(client, interaction.guildId);
          cfg.enabled = true;
          cfg.idlePaused = false;
          return saveWordGuessGuildConfig(client, interaction.guildId, cfg);
        });

        let activeRound = getActiveRound(interaction.guildId);
        if (enabledConfig.autoStart && !activeRound) {
          const started = await startWordGuessRound(client, interaction.guildId);
          if (started?.success) {
            activeRound = started.round;
          }
        }

        await interaction.update(buildAdminPanelPayloadV2(enabledConfig, activeRound));
      } catch (error) {
        logger.error('[DoanTuButtons] Lỗi nút doantu_admin_disable:', error);
      }
    },
  },
];
