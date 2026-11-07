import {
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import {
  getProfileData,
  buildTicketWelcomePayloadV2,
} from '../../services/bookingService.js';
import { logger } from '../../utils/logger.js';

export default [
  {
    name: 'hw_modal_book',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const profile = getProfileData(profileId);
        const purpose = interaction.fields.getTextInputValue('purpose') || 'Chơi game / Trò chuyện J4F';

        const guild = interaction.guild;
        if (!guild) {
          return interaction.reply({
            content: '❌ Lệnh chỉ có thể thực hiện trong server!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const safeUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'user';
        const channelName = `ticket-hw${profile.id}-${safeUsername}`;

        // Thiết lập quyền: chỉ Khách, Idol, Admin và Bot mới thấy kênh
        const permissionOverwrites = [
          {
            id: guild.id, // @everyone
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id, // Người thuê
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },
          {
            id: client.user.id, // Bot
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          },
        ];

        // Cấp quyền cho Idol nếu Idol là thành viên trong server
        if (profile.userId && profile.userId !== interaction.user.id) {
          permissionOverwrites.push({
            id: profile.userId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          });
        }

        // Tạo kênh ticket
        const ticketChannel = await guild.channels.create({
          name: channelName,
          type: ChannelType.GuildText,
          parent: interaction.channel?.parentId || null,
          permissionOverwrites,
        });

        // Gửi tin nhắn chào mừng và hướng dẫn vào kênh ticket mới
        const welcomePayload = buildTicketWelcomePayloadV2(
          profile,
          interaction.user.id,
          purpose,
        );
        await ticketChannel.send(welcomePayload);

        // Phản hồi cho người dùng
        await interaction.reply({
          content: `✅ Đã tạo ticket thành công tại <#${ticketChannel.id}>! Mời bạn qua đó kết nối cùng idol nhé! 🌸`,
          flags: MessageFlags.Ephemeral,
        });

        logger.info(
          `[Booking] Tạo ticket thành công: ${ticketChannel.name} (${ticketChannel.id}) cho user ${interaction.user.tag}`,
        );
      } catch (err) {
        logger.error('[BookingModals] Lỗi tạo ticket từ modal:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Đã có lỗi xảy ra khi tạo ticket. Vui lòng thử lại sau!',
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
      }
    },
  },
];

