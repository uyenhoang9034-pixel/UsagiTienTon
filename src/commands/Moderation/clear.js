import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  isBookingAdmin,
  isBookingTicketChannel,
  deleteBookingTicket,
} from '../../services/bookingService.js';
import {
  isServiceTicketStaff,
  isServiceTicketChannel,
  getServiceTicketRecord,
  deleteServiceTicket,
} from '../../services/serviceTicketService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Lưu transcript và xóa vĩnh viễn kênh ticket (chỉ dành cho Admin/Staff).'),
  category: 'Moderation',

  async execute(interaction, config, client) {
    try {
      const serviceRecord = await getServiceTicketRecord(
        client,
        interaction.guildId,
        interaction.channel?.id,
      );

      if (isServiceTicketChannel(interaction.channel, serviceRecord)) {
        if (!isServiceTicketStaff(interaction.member, interaction.user.id, client)) {
          return interaction.reply({
            content: '❌ Chỉ `@SP Ticket` hoặc Admin mới có quyền xóa ticket dịch vụ!',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (typeof interaction.deferReply === 'function' && !interaction.deferred && !interaction.replied) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        }

        await deleteServiceTicket({
          channel: interaction.channel,
          executor: interaction.user,
          client,
          sendDmTranscript: false,
          reason: 'Xóa ticket bằng lệnh /clear',
        });

        const serviceSuccessText = '🗑️ Đã lưu transcript vào kênh log và đang xóa kênh ticket trong giây lát...';
        if (interaction.deferred && typeof interaction.editReply === 'function') {
          await interaction.editReply({ content: serviceSuccessText }).catch(() => {});
        } else if (typeof interaction.reply === 'function') {
          await interaction.reply({
            content: serviceSuccessText,
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
        return;
      }

      if (!(await isBookingAdmin(interaction.member, interaction.user.id, client))) {
        return interaction.reply({
          content: '❌ Chỉ Admin / Staff mới có quyền xóa ticket!',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!isBookingTicketChannel(interaction.channel)) {
        return interaction.reply({
          content: '❌ Lệnh **/clear** chỉ có thể sử dụng bên trong các kênh ticket!',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (typeof interaction.deferReply === 'function' && !interaction.deferred && !interaction.replied) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      }

      await deleteBookingTicket({
        channel: interaction.channel,
        executor: interaction.user,
        client,
        reason: 'Xóa ticket bằng lệnh /clear',
      });

      const successText = '🗑️ Đã lưu transcript vào kênh log và đang xóa kênh ticket trong giây lát...';
      if (interaction.deferred && typeof interaction.editReply === 'function') {
        await interaction.editReply({ content: successText }).catch(() => {});
      } else if (typeof interaction.reply === 'function') {
        await interaction.reply({
          content: successText,
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    } catch (err) {
      logger.error('[Command:Clear] Lỗi xóa ticket:', err);
      const errText = '❌ Đã xảy ra lỗi khi xóa ticket.';
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
