import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';
import {
  getProfileData,
  buildProfilePayloadV2,
  buildRatingPayloadV2,
  buildRefusalPayloadV2,
  buildClosedTicketPayloadV2,
  generateTranscriptHtml,
} from '../../services/bookingService.js';
import { BOOKING_EMOJIS } from '../../config/bookingConfig.js';
import { isBotOwner } from '../../config/bot.js';
import { logger } from '../../utils/logger.js';

function isAdmin(member, userId) {
  if (isBotOwner(userId)) return true;
  if (!member) return false;
  return member.permissions?.has(PermissionFlagsBits.Administrator) ||
    member.permissions?.has(PermissionFlagsBits.ManageChannels);
}

export default [
  // 1. Lật ảnh qua lại 1/2 <-> 2/2
  {
    name: 'hw_flip',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const currentIdx = parseInt(args?.[1] || '0', 10);
        const nextIdx = currentIdx === 0 ? 1 : 0;

        const profile = getProfileData(profileId);
        const payload = buildProfilePayloadV2(profile, nextIdx);

        await interaction.update(payload);
      } catch (err) {
        logger.error('[BookingButtons] Lỗi lật ảnh hw_flip:', err);
      }
    },
  },

  // 2. Thả tim tích lũy
  {
    name: 'hw_heart',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const profile = getProfileData(profileId);
        profile.likes = (profile.likes || 12) + 1;

        const payload = buildProfilePayloadV2(profile, 0);
        await interaction.update(payload);
      } catch (err) {
        logger.error('[BookingButtons] Lỗi thả tim hw_heart:', err);
      }
    },
  },

  // 3. Bấm nút Book -> Hiện Modal nhập mục đích
  {
    name: 'hw_book',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';

        const modal = new ModalBuilder()
          .setCustomId(`hw_modal_book:${profileId}`)
          .setTitle('Booking Healing Whisper');

        const purposeInput = new TextInputBuilder()
          .setCustomId('purpose')
          .setLabel('Mục đích booking của bạn')
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder('Ví dụ: Kéo rank Free Fire, Gác đêm nói chuyện J4F...')
          .setRequired(true)
          .setMaxLength(200);

        const row = new ActionRowBuilder().addComponents(purposeInput);
        modal.addComponents(row);

        await interaction.showModal(modal);
      } catch (err) {
        logger.error('[BookingButtons] Lỗi mở modal hw_book:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Không thể mở form đặt lịch. Vui lòng thử lại sau!',
            flags: MessageFlags.Ephemeral,
          }).catch(() => {});
        }
      }
    },
  },

  // 4. Mở đánh giá (chỉ Admin)
  {
    name: 'hw_open_rate',
    async execute(interaction, client, args) {
      try {
        if (!isAdmin(interaction.member, interaction.user.id)) {
          return interaction.reply({
            content: '❌ Chỉ Admin mới có quyền mở bảng đánh giá!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const profileId = args?.[0] || '1';
        const renterId = args?.[1] || interaction.user.id;
        const profile = getProfileData(profileId);

        const payload = buildRatingPayloadV2(profile, renterId);
        await interaction.channel.send(payload);

        await interaction.reply({
          content: '✅ Đã mở bảng đánh giá trực tiếp trong ticket!',
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        logger.error('[BookingButtons] Lỗi hw_open_rate:', err);
      }
    },
  },

  // 5. Từ chối khách (Idol hoặc Admin) -> Trôn trôn Việt Nam + hiện đánh giá
  {
    name: 'hw_refuse',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const renterId = args?.[1] || interaction.user.id;
        const profile = getProfileData(profileId);

        const isIdol = interaction.user.id === profile.userId;
        const hasAdmin = isAdmin(interaction.member, interaction.user.id);

        if (!isIdol && !hasAdmin) {
          return interaction.reply({
            content: '❌ Chỉ Healing Whisper hoặc Admin mới có quyền từ chối khách!',
            flags: MessageFlags.Ephemeral,
          });
        }

        // Gửi thông báo Trôn Trôn Việt Nam
        const refusePayload = buildRefusalPayloadV2();
        await interaction.channel.send(refusePayload);

        // Lập tức hiện bảng đánh giá ngay bên dưới
        const ratePayload = buildRatingPayloadV2(profile, renterId);
        await interaction.channel.send(ratePayload);

        await interaction.reply({
          content: '✅ Đã kích hoạt trạng thái từ chối phiên kết nối và mở đánh giá!',
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        logger.error('[BookingButtons] Lỗi hw_refuse:', err);
      }
    },
  },

  // 6. Bấm sao đánh giá (1-4 fail, 5 success)
  {
    name: 'hw_star',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const renterId = args?.[1];
        const stars = parseInt(args?.[2] || '5', 10);

        if (renterId && interaction.user.id !== renterId && !isAdmin(interaction.member, interaction.user.id)) {
          return interaction.reply({
            content: `❌ Chỉ người đặt lịch (<@${renterId}>) mới có quyền chấm điểm đánh giá!`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (stars < 5) {
          return interaction.reply({
            content: `${BOOKING_EMOJIS.ROLEICON_FAIL} Đánh giá không thành công! Không lẽ bọn mình làm chưa đủ tốt hay sao ạ? Xin hãy đánh giá 5 sao, bọn mình cảm ơn!`,
            flags: MessageFlags.Ephemeral,
          });
        }

        // Cập nhật dữ liệu profile khi được 5 sao
        const profile = getProfileData(profileId);
        profile.fiveStarCount = (profile.fiveStarCount || 48) + 1;
        profile.rating = '5/5';

        return interaction.reply({
          content: `${BOOKING_EMOJIS.ROLEICON_SUCCESS} Cảm ơn đánh giá 5 sao của bạn nhé, chúc bạn một ngày tốt lành ạ!`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        logger.error('[BookingButtons] Lỗi hw_star:', err);
      }
    },
  },

  // 7. Đóng ticket (chỉ Admin)
  {
    name: 'hw_close_ticket',
    async execute(interaction, client, args) {
      try {
        if (!isAdmin(interaction.member, interaction.user.id)) {
          return interaction.reply({
            content: '❌ Chỉ Admin mới có quyền đóng ticket!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const profileId = args?.[0] || '1';
        const renterId = args?.[1];
        const profile = getProfileData(profileId);

        // Khóa quyền chat của người thuê
        if (renterId) {
          await interaction.channel.permissionOverwrites.edit(renterId, {
            SendMessages: false,
          }).catch(() => {});
        }

        // Tạo transcript
        const html = await generateTranscriptHtml(interaction.channel);

        // Gửi thông báo đóng và đính kèm file transcript vào kênh (KHÔNG gửi vào DM khách)
        const closedPayload = buildClosedTicketPayloadV2(profile, interaction.user.id);
        closedPayload.files = [
          {
            attachment: Buffer.from(html, 'utf-8'),
            name: `transcript-${interaction.channel.name}.html`,
          },
        ];

        await interaction.channel.send(closedPayload);

        await interaction.reply({
          content: '🔒 Ticket đã được đóng thành công và lưu transcript. Bot không gửi bất kỳ tin nhắn nào vào DM khách.',
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        logger.error('[BookingButtons] Lỗi hw_close_ticket:', err);
      }
    },
  },
];
