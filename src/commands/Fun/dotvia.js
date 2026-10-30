import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  THAN_VAN_CHANNEL_ID,
  buildDotViaEmbed,
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
    try {
      const isTargetChannel =
        interaction.channelId === THAN_VAN_CHANNEL_ID ||
        interaction.channel?.parentId === THAN_VAN_CHANNEL_ID;

      if (!isTargetChannel) {
        return interaction.reply({
          content: `❌ Lệnh này chỉ được sử dụng cố định tại kênh Than Vãn Tư Bản (<#${THAN_VAN_CHANNEL_ID}>) thôi nha! Mau qua đó thắp nhang đốt vía phong thủy nhé! 🕯️`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const target = interaction.options.getString('doi-tuong') || null;
      const embed = buildDotViaEmbed(interaction.user, target);

      return interaction.reply({
        embeds: [embed],
      });
    } catch (error) {
      logger.error('Error executing /dot-via command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content:
              '❌ Đã có lỗi xảy ra khi đốt vía phong thủy. Vui lòng thử lại sau!',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  },
};
