import {
  getRandomExcuse,
  buildExcusePayloadV2,
  buildExcuseEmbed,
  buildExcuseActionRow,
  isComponentsV2Message,
  buildThanVanNoticePayloadV2,
} from '../../services/thanVanTuBanService.js';
import { logger } from '../../utils/logger.js';

export default {
  name: 'excuse_reroll',

  async execute(interaction, client, args) {
    try {
      const styleKey = args?.[0] || 'luon_leo';
      const excuseData = getRandomExcuse(styleKey);

      if (isComponentsV2Message(interaction.message)) {
        await interaction.update(buildExcusePayloadV2(excuseData));
      } else {
        // Fallback tương thích cho tin nhắn Embed cũ trước khi nâng cấp V2
        const embed = buildExcuseEmbed(excuseData);
        const row = buildExcuseActionRow(excuseData.styleKey);
        await interaction.update({
          embeds: [embed],
          components: [row],
        });
      }

      logger.debug(
        `[ExcuseReroll] ${interaction.user.tag} đã random lại lý do xin nghỉ style ${styleKey}`,
      );
    } catch (error) {
      logger.error('Error executing excuse_reroll button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildThanVanNoticePayloadV2({
              title: 'THÔNG BÁO LỖI',
              message: 'Đã có lỗi xảy ra khi đổi lý do xin nghỉ phép.',
              ephemeral: true,
            }),
          )
          .catch(() => {});
      }
    }
  },
};
