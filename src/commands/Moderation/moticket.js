import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { isBookingAdmin, isBookingTicketChannelName, reopenBookingTicket } from '../../services/bookingService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('moticket')
    .setDescription('Mở lại kênh ticket khi lỡ đóng nhầm (cấp lại quyền cho khách).')
    .addBooleanOption((option) =>
      option
        .setName('gui_transcript')
        .setDescription('Gửi lại file transcript dự phòng vào kênh log lưu trữ hay không?')
        .setRequired(false),
    ),
  category: 'Moderation',

  async execute(interaction, config, client) {
    try {
      if (!(await isBookingAdmin(interaction.member, interaction.user.id, client))) {
        return interaction.reply({
          content: '❌ Chỉ Admin / Staff mới có quyền mở lại ticket!',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!isBookingTicketChannelName(interaction.channel?.name)) {
        return interaction.reply({
          content: '❌ Lệnh **/moticket** chỉ có thể sử dụng bên trong các kênh ticket!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const sendTranscript = interaction.options?.getBoolean('gui_transcript') ?? true;

      const result = await reopenBookingTicket({
        channel: interaction.channel,
        executor: interaction.user,
        client,
        sendTranscriptBackup: sendTranscript,
      });

      if (!result.success) {
        return interaction.reply({
          content: '❌ Không thể mở lại ticket này. Vui lòng kiểm tra lại quyền của bot!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const renterNotice = result.renterId ? `<@${result.renterId}>` : 'khách';
      await interaction.reply({
        content: `✅ Đã mở lại ticket thành công cho ${renterNotice}! Khách đã có thể tiếp tục trò chuyện.${sendTranscript ? ' Đã lưu transcript dự phòng vào kênh log.' : ''}`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      logger.error('[Command:MoTicket] Lỗi mở lại ticket:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Đã xảy ra lỗi khi mở lại ticket.',
          flags: MessageFlags.Ephemeral,
        }).catch(() => {});
      }
    }
  },
};

