import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { processRandomInput } from '../../services/randomService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('random')
    .setDescription('Random số trong khoảng hoặc ngẫu nhiên danh sách lựa chọn (Giao diện V2)')
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName('input')
        .setDescription('Khoảng số (ví dụ: 1-10000) hoặc danh sách lựa chọn (A - B - C)')
        .setRequired(false),
    ),

  async execute(interaction, guildConfig, client) {
    try {
      const input = interaction.options.getString('input') || '';
      const payload = processRandomInput(input, interaction.user.id);

      return interaction.reply(payload);
    } catch (error) {
      logger.error('Error executing /random command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: '❌ Đã có lỗi xảy ra khi thực hiện lệnh random.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  },
};
