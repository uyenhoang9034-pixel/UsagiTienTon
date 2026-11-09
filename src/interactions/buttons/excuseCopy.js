import {
  extractExcuseTextFromMessage,
  buildExcuseCopyPayloadV2,
  buildThanVanNoticePayloadV2,
} from '../../services/thanVanTuBanService.js';
import { logger } from '../../utils/logger.js';

export default {
  name: 'excuse_copy',

  async execute(interaction, client, args) {
    try {
      const cleanText = extractExcuseTextFromMessage(interaction.message);

      if (!cleanText) {
        return await interaction.reply(
          buildThanVanNoticePayloadV2({
            title: 'THÔNG BÁO LỖI',
            message: 'Không tìm thấy nội dung đơn xin nghỉ để trích xuất.',
            ephemeral: true,
          }),
        );
      }

      await interaction.reply(
        buildExcuseCopyPayloadV2(cleanText, { ephemeral: true }),
      );

      logger.debug(
        `[ExcuseCopy] ${interaction.user.tag} đã copy nội dung đơn xin nghỉ phép.`,
      );
    } catch (error) {
      logger.error('Error executing excuse_copy button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildThanVanNoticePayloadV2({
              title: 'THÔNG BÁO LỖI',
              message: 'Đã có lỗi xảy ra khi trích xuất đơn xin nghỉ.',
              ephemeral: true,
            }),
          )
          .catch(() => {});
      }
    }
  },
};
