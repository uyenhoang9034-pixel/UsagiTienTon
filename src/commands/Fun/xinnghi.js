import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  THAN_VAN_CHANNEL_ID,
  getRandomExcuse,
  buildExcuseEmbed,
  buildExcuseActionRow,
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
    try {
      const isTargetChannel =
        interaction.channelId === THAN_VAN_CHANNEL_ID ||
        interaction.channel?.parentId === THAN_VAN_CHANNEL_ID;

      if (!isTargetChannel) {
        return interaction.reply({
          content: `❌ Lệnh này chỉ được sử dụng cố định tại kênh Than Vãn Tư Bản (<#${THAN_VAN_CHANNEL_ID}>) thôi nha! Hãy qua đó để tạo đơn xin nghỉ bao duyệt nhé! 🌸`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const style = interaction.options.getString('style') || 'luon_leo';
      const excuseData = getRandomExcuse(style);
      const embed = buildExcuseEmbed(excuseData);
      const row = buildExcuseActionRow(excuseData.styleKey);

      return interaction.reply({
        embeds: [embed],
        components: [row],
      });
    } catch (error) {
      logger.error('Error executing /xin-nghi command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content:
              '❌ Đã có lỗi xảy ra khi tạo đơn xin nghỉ phép. Vui lòng thử lại sau!',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  },
};
