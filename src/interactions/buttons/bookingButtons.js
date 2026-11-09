import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';
import {
  getProfileData,
  loadProfileData,
  addProfileLike,
  addProfileRating,
  buildProfilePayloadV2,
  buildRatingPayloadV2,
  buildRefusalPayloadV2,
  extractProfileImageIndex,
  isBookingAdmin,
  closeBookingTicket,
  findRenterIdFromChannel,
} from '../../services/bookingService.js';
import { BOOKING_EMOJIS } from '../../config/bookingConfig.js';
import { logger } from '../../utils/logger.js';

export default [
  // 1a. Lướt ảnh trước (❮❮)
  {
    name: 'hw_prev',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const profile = await loadProfileData(client, profileId);
        const totalImages = Math.max(1, profile?.images?.length || 2);
        const currentIdx = Number.parseInt(args?.[1] ?? '0', 10);
        const safeCurrentIdx = Number.isInteger(currentIdx) && currentIdx >= 0 ? currentIdx % totalImages : 0;
        const nextIdx = (safeCurrentIdx - 1 + totalImages) % totalImages;

        const payload = buildProfilePayloadV2(profile, nextIdx);

        await interaction.update(payload);
      } catch (err) {
        logger.error('[BookingButtons] Lỗi lật ảnh hw_prev:', err);
      }
    },
  },

  // 1b. Lướt ảnh sau (❯❯)
  {
    name: 'hw_next',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const profile = await loadProfileData(client, profileId);
        const totalImages = Math.max(1, profile?.images?.length || 2);
        const currentIdx = Number.parseInt(args?.[1] ?? '0', 10);
        const safeCurrentIdx = Number.isInteger(currentIdx) && currentIdx >= 0 ? currentIdx % totalImages : 0;
        const nextIdx = (safeCurrentIdx + 1) % totalImages;

        const payload = buildProfilePayloadV2(profile, nextIdx);

        await interaction.update(payload);
      } catch (err) {
        logger.error('[BookingButtons] Lỗi lật ảnh hw_next:', err);
      }
    },
  },

  // 1c. Dự phòng hw_flip
  {
    name: 'hw_flip',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const profile = await loadProfileData(client, profileId);
        const totalImages = Math.max(1, profile?.images?.length || 2);
        const currentIdx = Number.parseInt(args?.[1] ?? '0', 10);
        const safeCurrentIdx = Number.isInteger(currentIdx) && currentIdx >= 0 ? currentIdx % totalImages : 0;
        const nextIdx = (safeCurrentIdx + 1) % totalImages;

        const payload = buildProfilePayloadV2(profile, nextIdx);

        await interaction.update(payload);
      } catch (err) {
        logger.error('[BookingButtons] Lỗi lật ảnh hw_flip:', err);
      }
    },
  },

  // 2. Thả tim tích lũy (tối đa 10 lần/user vĩnh viễn)
  {
    name: 'hw_heart',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const result = await addProfileLike(profileId, interaction.user.id, client);
        const profile = result.profile || (await loadProfileData(client, profileId));

        if (!result.success) {
          return interaction.reply({
            content: `💖 Bạn đã thả tim tối đa **10/10 lần** cho **Healing Whisper - ${profile.id}** rồi nha! Cảm ơn tình cảm to bự của bạn! 🥰`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const currentIdx = extractProfileImageIndex(interaction.message, profile?.images?.length);
        const payload = buildProfilePayloadV2(profile, currentIdx);
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
        if (!(await isBookingAdmin(interaction.member, interaction.user.id, client))) {
          return interaction.reply({
            content: '❌ Chỉ Admin mới có quyền mở bảng đánh giá!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const profileId = args?.[0] || '1';
        const profile = getProfileData(profileId);
        const renterId =
          (await findRenterIdFromChannel(interaction.channel, client, profile, interaction.user.id)) ||
          args?.[1] ||
          interaction.user.id;

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

  // 5. Từ chối khách (Idol hoặc Admin) -> Bảng đánh giá giống khi end ticket
  {
    name: 'hw_refuse',
    async execute(interaction, client, args) {
      try {
        const profileId = args?.[0] || '1';
        const profile = getProfileData(profileId);
        const renterId =
          (await findRenterIdFromChannel(interaction.channel, client, profile, interaction.user.id)) ||
          args?.[1] ||
          interaction.user.id;

        const isIdol = interaction.user.id === profile.userId;
        const hasAdmin = await isBookingAdmin(interaction.member, interaction.user.id, client);

        if (!isIdol && !hasAdmin) {
          return interaction.reply({
            content: '❌ Chỉ Healing Whisper hoặc Admin mới có quyền từ chối khách!',
            flags: MessageFlags.Ephemeral,
          });
        }

        // Bảng đánh giá khi từ chối nhận booking giống bảng đánh giá khi xong trò chuyện muốn end ticket
        const ratePayload = buildRatingPayloadV2(profile, renterId);
        await interaction.channel.send(ratePayload);

        await interaction.reply({
          content: '✅ Đã kích hoạt trạng thái từ chối phiên kết nối và mở bảng đánh giá dịch vụ!',
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

        if (renterId && interaction.user.id !== renterId && !(await isBookingAdmin(interaction.member, interaction.user.id, client))) {
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

        // Cập nhật dữ liệu profile khi được 5 sao và lưu trữ bền vững vào DB
        await addProfileRating(profileId, 5, client);

        return interaction.reply({
          content: `${BOOKING_EMOJIS.ROLEICON_SUCCESS} Cảm ơn đánh giá 5 sao của bạn nhé, chúc bạn một ngày tốt lành ạ!`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        logger.error('[BookingButtons] Lỗi hw_star:', err);
      }
    },
  },

  // 7. Đóng ticket (chỉ Admin, không gửi transcript)
  {
    name: 'hw_close_ticket',
    async execute(interaction, client, args) {
      try {
        if (!(await isBookingAdmin(interaction.member, interaction.user.id, client))) {
          return interaction.reply({
            content: '❌ Chỉ Admin mới có quyền đóng ticket!',
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
          reason: 'Đóng bằng nút bấm trong ticket',
          sendTranscript: false,
        });

        const msg = '🔒 Ticket đã được đóng thành công (chỉ ẩn kênh với khách, không gửi transcript).';
        if (interaction.deferred && typeof interaction.editReply === 'function') {
          await interaction.editReply({ content: msg });
        } else {
          await interaction.reply({
            content: msg,
            flags: MessageFlags.Ephemeral,
          });
        }
      } catch (err) {
        logger.error('[BookingButtons] Lỗi hw_close_ticket:', err);
      }
    },
  },

  // 8. Trạng thái phòng voice &taokenhvoice
  {
    name: 'hw_voice_ready',
    async execute(interaction) {
      try {
        const channelId = interaction.customId.split(':')[1];
        await interaction.reply({
          content: channelId && channelId !== 'voice'
            ? `<a:trangtrig6:1546043036390260756> Kênh voice <#${channelId}> đã sẵn sàng! Chúc hai bạn tâm sự thật vui vẻ và ngọt ngào nha! <a:heartg1:1545307544808071258>`
            : `<a:trangtrig6:1546043036390260756> Kênh voice đã sẵn sàng! Chúc hai bạn tâm sự thật ngọt ngào nha! <a:heartg1:1545307544808071258>`,
          flags: MessageFlags.Ephemeral,
        });
      } catch (err) {
        logger.error('[BookingButtons] Lỗi hw_voice_ready:', err);
      }
    },
  },
];

