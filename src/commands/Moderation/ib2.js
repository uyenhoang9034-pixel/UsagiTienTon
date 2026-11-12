import { SlashCommandBuilder } from 'discord.js';
import { sendServiceDeliveryNotice } from '../../services/serviceTicketService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ib2')
    .setDescription('Gửi DM thông báo hoàn thành đơn hàng Nitro / Decor cho khách.')
    .addStringOption((option) =>
      option
        .setName('san_pham')
        .setDescription('Chọn loại sản phẩm giao hàng')
        .setRequired(true)
        .addChoices(
          { name: 'Nitro', value: 'nitro' },
          { name: 'Decor', value: 'decor' },
        ),
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Khách hàng nhận đơn hàng Nitro / Decor')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('link')
        .setDescription('Link nhận quà Decor (bắt buộc nếu chọn Decor)')
        .setRequired(false),
    ),
  category: 'Moderation',

  async execute(interaction, config, client) {
    const variant = interaction.options.getString('san_pham');
    const targetUser = interaction.options.getUser('user');
    const link = interaction.options.getString('link');

    return sendServiceDeliveryNotice({
      interaction,
      client,
      targetUser,
      variant,
      link,
    });
  },
};
