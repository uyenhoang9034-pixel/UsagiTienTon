import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  isBookingAdmin,
  isBookingTicketChannel,
  closeBookingTicket,
} from '../../services/bookingService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Đóng kênh ticket (ẩn với khách, không xóa kênh và không gửi transcript).'),
  category: 'Moderation',

  async execute(interaction, config, client) {
    try {
      if (!(await isBookingAdmin(interaction.member, interaction.user.id, client))) {
        return interaction.reply({
          content: '❌ Chỉ Admin / Staff mới có quyền đóng ticket!',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!isBookingTicketChannel(interaction.channel)) {
        return interaction.reply({
          content: '❌ Lệnh **/close** chỉ có thể sử dụng bên trong các kênh ticket!',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (typeof interaction.deferReply === 'function' && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      await closeBookingTicket({
        channel: interaction.channel,
        closer: interaction.user,
        client,
        reason: 'Đóng ticket bằng lệnh /close',
        sendTranscript: false,
      });

      const successText =
        '🔒 Ticket đã được đóng thành công (chỉ ẩn kênh với khách, không xóa kênh và không gửi transcript).';

      if (interaction.deferred && typeof interaction.editReply === 'function') {
        await interaction.editReply({ content: successText });
      } else if (typeof interaction.reply === 'function') {
        await interaction.reply({
          content: successText,
          flags: MessageFlags.Ephemeral,
        });
      }
    } catch (err) {
      logger.error('[Command:Close] Lỗi đóng ticket:', err);
      const errText = '❌ Đã xảy ra lỗi khi đóng ticket.';
      if (interaction.deferred && typeof interaction.editReply === 'function') {
        await interaction.editReply({ content: errText }).catch(() => {});
      } else if (!interaction.replied && typeof interaction.reply === 'function') {
        await interaction.reply({
          content: errText,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  },
};
