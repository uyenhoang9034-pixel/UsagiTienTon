import { WORD_GUESS_ADMIN_ROLE_ID, WORD_GUESS_DEFAULTS, WORD_GUESS_EMOJIS } from '../../config/wordGuessConfig.js';
import {
  buildAdminPanelPayloadV2,
  buildWordGuessNoticePayloadV2,
  getActiveRound,
  getWordGuessGuildConfig,
  getWordGuessNow,
  isWordGuessAdmin,
  saveWordGuessGuildConfig,
  withGuildLock,
} from '../../services/wordGuessService.js';
import { logger } from '../../utils/logger.js';

export default [
  {
    name: 'doantu_modal_time',
    async execute(interaction, client) {
      try {
        if (!interaction.guildId) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'CHỈ DÙNG TRONG SERVER',
              message: `${WORD_GUESS_EMOJIS.TIME} Cấu hình chỉ áp dụng trong server nha!`,
              ephemeral: true,
            }),
          );
        }

        if (!isWordGuessAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'KHÔNG CÓ QUYỀN QUẢN TRỊ',
              message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Chỉ thành viên có role <@&${WORD_GUESS_ADMIN_ROLE_ID}> hoặc Admin server mới chỉnh được cấu hình nha!`,
              ephemeral: true,
            }),
          );
        }

        const rawValue = interaction.fields?.getTextInputValue('duration_seconds')?.trim() || '';
        const seconds = Number.parseInt(rawValue, 10);

        if (
          !/^\d+$/.test(rawValue) ||
          !Number.isInteger(seconds) ||
          seconds < WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS ||
          seconds > WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS
        ) {
          return interaction.reply(
            buildWordGuessNoticePayloadV2({
              title: 'THỜI GIAN KHÔNG HỢP LỆ',
              message: `${WORD_GUESS_EMOJIS.TIME} Vui lòng nhập số nguyên từ **${WORD_GUESS_DEFAULTS.MIN_DURATION_SECONDS}** đến **${WORD_GUESS_DEFAULTS.MAX_DURATION_SECONDS} giây** nha!`,
              ephemeral: true,
            }),
          );
        }

        const updatedConfig = await withGuildLock(interaction.guildId, async () => {
          const config = await getWordGuessGuildConfig(client, interaction.guildId);
          config.durationSeconds = seconds;
          return saveWordGuessGuildConfig(client, interaction.guildId, config);
        });

        const panelPayload = buildAdminPanelPayloadV2(
          updatedConfig,
          getActiveRound(interaction.guildId),
          getWordGuessNow(client),
        );

        if (typeof interaction.isFromMessage === 'function' && interaction.isFromMessage() && typeof interaction.update === 'function') {
          try {
            await interaction.update(panelPayload);
            return;
          } catch (updateError) {
            logger.debug('[DoanTuModals] Fallback từ update sang reply Ephemeral:', updateError?.message);
          }
        }

        await interaction.reply(panelPayload);
      } catch (error) {
        logger.error('[DoanTuModals] Lỗi xử lý modal doantu_modal_time:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply(
              buildWordGuessNoticePayloadV2({
                title: 'LỖI CẬP NHẬT THỜI GIAN',
                message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Đã có lỗi xảy ra khi lưu thời gian mới. Vui lòng thử lại!`,
                ephemeral: true,
              }),
            )
            .catch(() => {});
        }
      }
    },
  },
];

