import { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { getSparkConfig } from '../../services/sparkMatchingService.js';
import { buildSparkStartPayload } from '../../services/sparkMatchingUI.js';

export default {
  data: new SlashCommandBuilder()
    .setName('spark')
    .setDescription('Mở bảng đăng ký SPARK MATCHING')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
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
    if (!interaction.channel?.isTextBased?.() || typeof interaction.channel.send !== 'function') {
      return interaction.reply({
        content: '<a:bang2:1546891483250954290> Không thể gửi tin nhắn vào kênh này.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.channel.send(buildSparkStartPayload());
    return interaction.reply({
      content: '✅ Đã gửi bảng đăng ký SPARK MATCHING tách lẻ vào kênh thành công!',
      flags: MessageFlags.Ephemeral,
    });
  },
};
