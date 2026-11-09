import { SlashCommandBuilder } from 'discord.js';
import {
  THAN_VAN_CHANNEL_ID,
  THAN_VAN_EMOJIS,
  isThanVanChannel,
  getRandomExcuse,
  buildExcusePayloadV2,
  buildThanVanNoticePayloadV2,
} from '../../services/thanVanTuBanService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('xin-nghi')
    .setDescription(
      'Máy tạo đơn xin nghỉ phép "bao duyệt" - Phục vụ những sáng không muốn đi làm',
    )
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('style')
        .setDescription('Lựa chọn phong cách / tone xin nghỉ phép')
        .setRequired(false)
        .addChoices(
          { name: 'Lươn lẹo nhưng khoa học', value: 'luon_leo' },
          { name: 'Bi tráng cảm động', value: 'bi_trang' },
          { name: 'Tâm linh khó giải', value: 'tam_linh' },
          { name: 'Thẳng thắn bất cần', value: 'thang_than' },
          { name: 'Hài hước khó đỡ', value: 'hai_huoc' },
        ),
    ),

  async execute(interaction, guildConfig, client) {
    const isEphemeral = !interaction?._isPrefixCommand;

    try {
      if (!isThanVanChannel(interaction)) {
        return interaction.reply(
          buildThanVanNoticePayloadV2({
            title: 'SAI KÊNH SỬ DỤNG',
            message: `Lệnh này chỉ được sử dụng cố định tại kênh Than Vãn Tư Bản (<#${THAN_VAN_CHANNEL_ID}>) thôi nha! Hãy qua đó để tạo đơn xin nghỉ bao duyệt nhé! ${THAN_VAN_EMOJIS.FLOWER}`,
            ephemeral: isEphemeral,
          }),
        );
      }

      const style = interaction.options.getString('style') || 'luon_leo';
      const excuseData = getRandomExcuse(style);

      return interaction.reply(buildExcusePayloadV2(excuseData));
    } catch (error) {
      logger.error('Error executing /xin-nghi command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildThanVanNoticePayloadV2({
              title: 'THÔNG BÁO LỖI',
              message:
                'Đã có lỗi xảy ra khi tạo đơn xin nghỉ phép. Vui lòng thử lại sau!',
              ephemeral: isEphemeral,
            }),
          )
          .catch(() => {});
      }
    }
  },
};
