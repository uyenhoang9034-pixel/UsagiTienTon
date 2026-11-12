import { SlashCommandBuilder } from 'discord.js';
import { sendServiceDeliveryNotice } from '../../services/serviceTicketService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ib1')
    .setDescription('Gửi DM thông báo hoàn thành đơn hàng Bot Discord cho khách.')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Khách hàng nhận đơn hàng Bot Discord')
        .setRequired(true),
    ),
  category: 'Moderation',

  async execute(interaction, config, client) {
    const targetUser = interaction.options.getUser('user');
    return sendServiceDeliveryNotice({
      interaction,
      client,
      targetUser,
      variant: 'bot',
    });
  },
};
