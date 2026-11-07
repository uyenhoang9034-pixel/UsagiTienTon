import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { isBookingAdmin, deleteBookingTicket } from '../../services/bookingService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Xóa vĩnh viễn kênh ticket (chỉ dành cho Admin/Staff trong ticket).'),
  category: 'Moderation',

  async execute(interaction, config, client) {
    try {
      if (!isBookingAdmin(interaction.member, interaction.user.id)) {
        return interaction.reply({
          content: '❌ Chỉ Admin / Staff mới có quyền xóa ticket!',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!interaction.channel?.name?.startsWith('ticket-')) {
        return interaction.reply({
          content: '❌ Lệnh **/clear** chỉ có thể sử dụng bên trong các kênh ticket!',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.reply({
        content: '🗑️ Đang tiến hành lưu transcript và xóa kênh ticket trong giây lát...',
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});

      await deleteBookingTicket({
        channel: interaction.channel,
        executor: interaction.user,
        client,
        reason: 'Xóa ticket bằng lệnh /clear',
      });
    } catch (err) {
      logger.error('[Command:Clear] Lỗi xóa ticket:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Đã xảy ra lỗi khi xóa ticket.',
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  },
};

