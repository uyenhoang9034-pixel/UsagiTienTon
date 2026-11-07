import {
  BOOKING_EMOJIS,
  HEALING_WHISPER_PROFILES,
} from '../config/bookingConfig.js';
import { isBotOwner } from '../config/bot.js';
import { logger } from '../utils/logger.js';

export const IS_COMPONENTS_V2 = 1 << 15; // 32768

/**
 * Cache lưu trạng thái runtime của các profile (lượt tim, ảnh hiện tại, điểm sao)
 */
const profileState = new Map();

export function getProfileData(profileId = '1') {
  const base = HEALING_WHISPER_PROFILES[String(profileId)] || HEALING_WHISPER_PROFILES['1'];
  if (!profileState.has(base.id)) {
    profileState.set(base.id, {
      ...base,
      likes: base.likes || 12,
      rating: base.rating || '5/5',
      fiveStarCount: 48,
    });
  }
  return profileState.get(base.id);
}

export function findProfileByQuery(query) {
  if (!query) return getProfileData('1');
  const clean = String(query).replace(/[<@!>]/g, '').trim().toLowerCase();

  for (const prof of Object.values(HEALING_WHISPER_PROFILES)) {
    if (
      prof.id.toLowerCase() === clean ||
      prof.userId.toLowerCase() === clean ||
      prof.nickname.toLowerCase().includes(clean)
    ) {
      return getProfileData(prof.id);
    }
  }
  return getProfileData('1');
}

/**
 * Build payload V2 cho Profile Card
 */
export function buildProfilePayloadV2(profile, currentIdx = 0) {
  const imgUrl = profile.images[currentIdx] || profile.images[0];
  const pageStr = `${currentIdx + 1}/2`;

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17, // Container (màu gốc, không có accent_color)
        components: [
          {
            type: 10, // Text Display 1: Header
            content: `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2} **HEALING WHISPER - ${profile.id}** ${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`,
          },
          {
            type: 14, // Separator
            divider: true,
            spacing: 1,
          },
          {
            type: 10, // Text Display 2: Thông tin profile
            content: `${BOOKING_EMOJIS.BULLET} <@${profile.userId}>\n${BOOKING_EMOJIS.BULLET} ${profile.nickname}\n${BOOKING_EMOJIS.BULLET} Game: ${profile.game}\n${BOOKING_EMOJIS.BULLET} Giá: ${profile.price}`,
          },
          {
            type: 14, // Separator
            divider: true,
            spacing: 1,
          },
          {
            type: 12, // Media Gallery V2
            items: [
              {
                media: {
                  url: imgUrl,
                },
                description: `Ảnh profile ${profile.nickname} (${pageStr})`,
              },
            ],
          },
          {
            type: 1, // Action Row 1: Lướt ảnh và Rating
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: '❮❮',
                custom_id: `hw_flip:${profile.id}:${currentIdx}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: pageStr,
                disabled: true,
                custom_id: `hw_page:${profile.id}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: '❯❯',
                custom_id: `hw_flip:${profile.id}:${currentIdx}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: profile.rating || '5/5',
                emoji: BOOKING_EMOJIS.HEART_BUTTON,
                disabled: true,
                custom_id: `hw_badge_rate:${profile.id}`,
              },
            ],
          },
          {
            type: 1, // Action Row 2: Book & Tim
            components: [
              {
                type: 2,
                style: 2, // Xám
                label: 'Book',
                emoji: BOOKING_EMOJIS.HEART_BUTTON,
                custom_id: `hw_book:${profile.id}`,
              },
              {
                type: 2,
                style: 2, // Xám
                label: String(profile.likes || 12),
                emoji: BOOKING_EMOJIS.HEART_BUTTON,
                custom_id: `hw_heart:${profile.id}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho Booking Thành Công (gửi vào kênh ticket mới tạo)
 */
export function buildTicketWelcomePayloadV2(profile, renterId, purpose) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17, // Container (màu gốc)
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2} **BOOKING THÀNH CÔNG** ${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.BULLET} <@${renterId}> | ID: ${renterId}\n${BOOKING_EMOJIS.BULLET} Healing Whisper: ${profile.id} - <@${profile.userId}>\n${BOOKING_EMOJIS.BULLET} Mục đích: ${purpose || 'Trò chuyện / Chơi game cùng'}\n${BOOKING_EMOJIS.STATUS_CONNECTING} Trạng thái: Đang trong phiên kết nối`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.WARNING} Hai bạn hãy kết nối tại đây nhé! Nếu cần mở phòng voice riêng, xin hãy tag <@872792190651334707>!`,
          },
          {
            type: 1, // Action Row điều khiển
            components: [
              {
                type: 2,
                style: 2,
                label: 'Mở đánh giá',
                emoji: BOOKING_EMOJIS.ACTION_BUTTON,
                custom_id: `hw_open_rate:${profile.id}:${renterId}`,
              },
              {
                type: 2,
                style: 2,
                label: 'Từ chối khách',
                emoji: BOOKING_EMOJIS.ACTION_BUTTON,
                custom_id: `hw_refuse:${profile.id}:${renterId}`,
              },
              {
                type: 2,
                style: 2,
                label: 'Đóng ticket',
                emoji: BOOKING_EMOJIS.ACTION_BUTTON,
                custom_id: `hw_close_ticket:${profile.id}:${renterId}`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho thông báo Từ Chối Khách
 */
export function buildRefusalPayloadV2() {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2} **TRÔN TRÔN VIỆT NAM HIHI** ${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.STATUS_DISCONNECTED} Trạng thái: Đã ngắt phiên kết nối\n${BOOKING_EMOJIS.STATUS_DISCONNECTED} Healing Whisper hiện tại không thể tiếp nhận phiên kết nối này vì bạn đã bị trôn. =)))) Không có booking gì ở đây hết nha hehee.\n\n${BOOKING_EMOJIS.HIT_JOKE} Dù bị trôn cũng không được cay nha ní, nhớ để lại đánh giá trước khi ticket được đóng lại nha hì hì.`,
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho Bảng Đánh Giá (bắt buộc đánh giá 5 sao)
 */
export function buildRatingPayloadV2(profile, renterId) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2} **ĐÁNH GIÁ** ${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `Cảm ơn bạn đã sử dụng dịch vụ, xin mời <@${renterId}> feedback cho Healing Whisper - ${profile.id} <@${profile.userId}> nhé!\n> - Ấn nút để chọn mức độ hài lòng của bạn đối với dịch vụ.\n> - Nếu không đánh giá bạn sẽ bị vào blacklist và bị ban khỏi server!`,
          },
          {
            type: 1, // Action row 5 sao xám
            components: [
              {
                type: 2,
                style: 2,
                label: '1 ⭐',
                custom_id: `hw_star:${profile.id}:${renterId}:1`,
              },
              {
                type: 2,
                style: 2,
                label: '2 ⭐',
                custom_id: `hw_star:${profile.id}:${renterId}:2`,
              },
              {
                type: 2,
                style: 2,
                label: '3 ⭐',
                custom_id: `hw_star:${profile.id}:${renterId}:3`,
              },
              {
                type: 2,
                style: 2,
                label: '4 ⭐',
                custom_id: `hw_star:${profile.id}:${renterId}:4`,
              },
              {
                type: 2,
                style: 2,
                label: '5 ⭐',
                custom_id: `hw_star:${profile.id}:${renterId}:5`,
              },
            ],
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho thông báo Đóng Ticket
 */
export function buildClosedTicketPayloadV2(profile, adminId) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2} **TICKET ĐÃ ĐƯỢC ĐÓNG** ${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.BULLET} Đóng bởi: <@${adminId}>\n${BOOKING_EMOJIS.BULLET} Phiên booking: Healing Whisper - ${profile.id} (<@${profile.userId}>)\n${BOOKING_EMOJIS.STATUS_DISCONNECTED} Trạng thái: Đã ngắt phiên kết nối`,
          },
        ],
      },
    ],
  };
}

/**
 * Sinh file HTML Transcript từ tin nhắn trong kênh
 */
export async function generateTranscriptHtml(channel) {
  try {
    const messages = await channel.messages.fetch({ limit: 100 });
    const sorted = Array.from(messages.values()).reverse();
    const rows = sorted
      .map((m) => {
        const time = new Date(m.createdTimestamp).toLocaleString('vi-VN');
        const author = m.author ? `${m.author.tag} (${m.author.id})` : 'Unknown';
        const content = (m.content || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return `<div style="margin-bottom:10px;padding:8px;border-bottom:1px solid #333;"><strong style="color:#5865F2;">${author}</strong> <span style="font-size:11px;color:#888;">${time}</span><div style="margin-top:4px;">${content}</div></div>`;
      })
      .join('\n');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transcript - ${channel.name}</title></head><body style="background:#1e1f22;color:#dbdee1;font-family:sans-serif;padding:20px;"><h2>Transcript: #${channel.name}</h2><hr style="border-color:#444;"/><div style="margin-top:15px;">${rows}</div></body></html>`;
  } catch (err) {
    logger.error('[BookingService] Lỗi tạo transcript HTML:', err);
    return `<!DOCTYPE html><html><body><h2>Không thể tạo transcript: ${err.message}</h2></body></html>`;
  }
}

/**
 * Xử lý các lệnh text prefix cho Booking: &pro5, &danhgia, &close
 */
export async function handleBookingMessage(message, client) {
  if (typeof message.content !== 'string' || !message.content) {
    return false;
  }

  const trimmed = message.content.trim();

  // 1. Lệnh trưng bày profile: &pro5 @User hoặc &profile @User
  const pro5Match = trimmed.match(/^[&!](?:pro5|profile)(?:\s+([\s\S]*))?$/i);
  if (pro5Match) {
    // Tự động xóa tin nhắn lệnh theo yêu cầu của vợ Kim Nong
    await message.delete().catch(() => {});

    const query = pro5Match[1] || '';
    const profile = findProfileByQuery(query);
    const payload = buildProfilePayloadV2(profile, 0);

    await message.channel.send(payload);
    return true;
  }

  // 2. Lệnh mở đánh giá trực tiếp trong ticket: &danhgia hoặc &feedback
  const rateMatch = trimmed.match(/^[&!](?:danhgia|feedback)\b/i);
  if (rateMatch) {
    if (!message.channel.name?.startsWith('ticket-')) {
      return false;
    }

    const hasAdmin =
      message.member?.permissions?.has('Administrator') ||
      message.member?.permissions?.has('ManageChannels') ||
      isBotOwner(message.author.id);

    if (!hasAdmin) {
      await message.delete().catch(() => {});
      return true;
    }

    await message.delete().catch(() => {});

    const hwMatch = message.channel.name.match(/ticket-hw(\d+)/i);
    const profileId = hwMatch ? hwMatch[1] : '1';
    const profile = getProfileData(profileId);

    const renterOverwrite = message.channel.permissionOverwrites?.cache?.find(
      (po) => po.type === 1 && po.id !== client?.user?.id && po.id !== profile.userId,
    );
    const renterId = renterOverwrite ? renterOverwrite.id : message.author.id;

    const payload = buildRatingPayloadV2(profile, renterId);
    await message.channel.send(payload);
    return true;
  }

  // 3. Lệnh đóng ticket: &close hoặc &dongticket
  const closeMatch = trimmed.match(/^[&!](?:close|dongticket)\b/i);
  if (closeMatch) {
    if (!message.channel.name?.startsWith('ticket-')) {
      return false;
    }

    const hasAdmin =
      message.member?.permissions?.has('Administrator') ||
      message.member?.permissions?.has('ManageChannels') ||
      isBotOwner(message.author.id);

    if (!hasAdmin) {
      return true;
    }

    await message.delete().catch(() => {});

    const hwMatch = message.channel.name.match(/ticket-hw(\d+)/i);
    const profileId = hwMatch ? hwMatch[1] : '1';
    const profile = getProfileData(profileId);

    const renterOverwrite = message.channel.permissionOverwrites?.cache?.find(
      (po) => po.type === 1 && po.id !== client?.user?.id && po.id !== profile.userId,
    );
    if (renterOverwrite) {
      await message.channel.permissionOverwrites.edit(renterOverwrite.id, {
        SendMessages: false,
      }).catch(() => {});
    }

    const html = await generateTranscriptHtml(message.channel);
    const closedPayload = buildClosedTicketPayloadV2(profile, message.author.id);
    closedPayload.files = [
      {
        attachment: Buffer.from(html, 'utf-8'),
        name: `transcript-${message.channel.name}.html`,
      },
    ];

    await message.channel.send(closedPayload);
    return true;
  }

  return false;
}
