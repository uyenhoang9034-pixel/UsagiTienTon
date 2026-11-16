import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { getSparkConfig } from '../../services/sparkMatchingService.js';
import { buildSparkStartPayload } from '../../services/sparkMatchingUI.js';

export default {
  data: new SlashCommandBuilder()
    .setName('spark')
    .setDescription('Mở bảng đăng ký SPARK MATCHING'),
  category: 'Games',
  async execute(interaction) {
    if (!interaction.guildId) {
      return interaction.reply({ content: 'SPARK MATCHING chỉ hoạt động trong máy chủ đã thiết lập.', flags: MessageFlags.Ephemeral });
    }
    const config = await getSparkConfig(interaction.guildId);
    if (!config.enabled || !config.registrationEnabled) {
      return interaction.reply({
        content: 'SPARK MATCHING hiện chưa mở đăng ký. Cupid sẽ thông báo khi tính năng sẵn sàng nhé!',
        flags: MessageFlags.Ephemeral,
      });
    }
    return interaction.reply(buildSparkStartPayload(interaction.client));
  },
};
