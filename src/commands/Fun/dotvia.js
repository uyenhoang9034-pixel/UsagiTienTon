import { SlashCommandBuilder } from 'discord.js';
import {
  THAN_VAN_CHANNEL_ID,
  THAN_VAN_EMOJIS,
  isThanVanChannel,
  buildDotViaPayloadV2,
  buildThanVanNoticePayloadV2,
} from '../../services/thanVanTuBanService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('dot-via')
    .setDescription('Đốt vía / Thắp hương xua đuổi Bug & Deadline nơi công sở')
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('doi-tuong')
        .setDescription('Chọn đối tượng cần đốt vía')
        .setRequired(false)
        .addChoices(
          { name: 'Sếp khó tính', value: 'sếp' },
          { name: 'Bug quái ác', value: 'bug' },
          { name: 'Deadline dí', value: 'deadline' },
          { name: 'Đồng nghiệp rắn', value: 'đồng nghiệp rắn' },
          { name: 'OT đêm muộn', value: 'ot' },
          { name: 'Khách hàng hành', value: 'khách hàng' },
        ),
    ),

  async execute(interaction, guildConfig, client) {
    const isEphemeral = !interaction?._isPrefixCommand;

    try {
      if (!isThanVanChannel(interaction)) {
        return interaction.reply(
          buildThanVanNoticePayloadV2({
            title: 'SAI KÊNH SỬ DỤNG',
            message: `Lệnh này chỉ được sử dụng cố định tại kênh Than Vãn Tư Bản (<#${THAN_VAN_CHANNEL_ID}>) thôi nha! Mau qua đó thắp nhang đốt vía phong thủy nhé! ${THAN_VAN_EMOJIS.CANDLE}`,
            ephemeral: isEphemeral,
          }),
        );
      }

      const target = interaction.options.getString('doi-tuong') || null;
      return interaction.reply(buildDotViaPayloadV2(interaction.user, target));
    } catch (error) {
      logger.error('Error executing /dot-via command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildThanVanNoticePayloadV2({
              title: 'THÔNG BÁO LỖI',
              message:
                'Đã có lỗi xảy ra khi đốt vía phong thủy. Vui lòng thử lại sau!',
              ephemeral: isEphemeral,
            }),
          )
          .catch(() => {});
      }
    }
  },
};
