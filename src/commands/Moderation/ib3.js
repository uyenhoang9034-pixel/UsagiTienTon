import { SlashCommandBuilder } from 'discord.js';
import { sendServiceDeliveryNotice } from '../../services/serviceTicketService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ib3')
    .setDescription('Gửi DM thông báo đăng ký khóa học Tiếng Trung 1:1 thành công.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Học viên đã đăng ký khóa học')
        .setRequired(true),
    ),
  category: 'Moderation',

  async execute(interaction, config, client) {
    const targetUser = interaction.options.getUser('user');
    return sendServiceDeliveryNotice({
      interaction,
      client,
      targetUser,
      variant: 'chinese',
    });
  },
};
