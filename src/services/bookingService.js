import {
  AttachmentBuilder,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import {
  BOOKING_EMOJIS,
  HEALING_WHISPER_PROFILES,
  BOOKING_ADMIN_ROLE_ID,
  BOOKING_SUPPORT_ROLE_ID,
  BOOKING_CATEGORY_ID,
  BOOKING_LOG_CHANNEL_ID,
} from '../config/bookingConfig.js';
import { isBotOwner } from '../config/bot.js';
import { logger } from '../utils/logger.js';

export const IS_COMPONENTS_V2 = 1 << 15; // 32768

/**
 * Kiểm tra quyền Admin (Owner bot, Role admin 1545295139390619768, Role support 1568554130371383306, hoặc quyền Administrator/ManageChannels)
 */
export function isBookingAdmin(member, userId) {
  if (isBotOwner(userId)) return true;
  if (!member) return false;
  const staffRoleIds = [BOOKING_ADMIN_ROLE_ID, BOOKING_SUPPORT_ROLE_ID];
  for (const roleId of staffRoleIds) {
    if (member.roles?.cache?.has?.(roleId)) return true;
    if (Array.isArray(member._roles) && member._roles.includes(roleId)) return true;
    if (Array.isArray(member.roles) && member.roles.includes(roleId)) return true;
  }
  return Boolean(
    member.permissions?.has?.('Administrator') ||
    member.permissions?.has?.('ManageChannels'),
  );
}

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
                custom_id: `hw_prev:${profile.id}:${currentIdx}`,
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
                custom_id: `hw_next:${profile.id}:${currentIdx}`,
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
            content: `${BOOKING_EMOJIS.WARNING} Hai bạn hãy kết nối tại đây nhé! Để mở phòng voice riêng tư không bị làm phiền, hãy gõ lệnh **&taokenhvoice** nha! 🌸`,
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
 * Build payload V2 cho thông báo Từ Chối Khách (Đồng nhất với Bảng Đánh Giá khi kết thúc ticket)
 */
export function buildRefusalPayloadV2(profile = getProfileData('1'), renterId = '') {
  return buildRatingPayloadV2(profile, renterId);
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
    let rows = '';
    if (channel?.messages?.fetch) {
      const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (messages) {
        const sorted = Array.from(messages.values()).reverse();
        rows = sorted
          .map((m) => {
            const time = new Date(m.createdTimestamp || Date.now()).toLocaleString('vi-VN');
            const author = m.author ? `${m.author.tag} (${m.author.id})` : 'Unknown';
            let content = (m.content || '')
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            if (m.embeds && m.embeds.length > 0) {
              const embedInfo = m.embeds
                .map((e) => [e.title, e.description].filter(Boolean).join(' - '))
                .filter(Boolean)
                .join(' | ');
              if (embedInfo) {
                content += content ? `<br><em>[Embed: ${embedInfo}]</em>` : `<em>[Embed: ${embedInfo}]</em>`;
              }
            }
            if (m.attachments && m.attachments.size > 0) {
              const attList = Array.from(m.attachments.values()).map((a) => a.name || a.url).join(', ');
              content += content ? `<br><em>[Tệp: ${attList}]</em>` : `<em>[Tệp: ${attList}]</em>`;
            }
            return `<div style="margin-bottom:10px;padding:8px;border-bottom:1px solid #333;"><strong style="color:#5865F2;">${author}</strong> <span style="font-size:11px;color:#888;">${time}</span><div style="margin-top:4px;">${content}</div></div>`;
          })
          .join('\n');
      }
    }

    const cName = channel?.name || 'ticket';
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Transcript - ${cName}</title></head><body style="background:#1e1f22;color:#dbdee1;font-family:sans-serif;padding:20px;"><h2>Transcript: #${cName}</h2><hr style="border-color:#444;"/><div style="margin-top:15px;">${rows || '<p>Không có tin nhắn nào.</p>'}</div></body></html>`;
  } catch (err) {
    logger.error('[BookingService] Lỗi tạo transcript HTML:', err);
    return `<!DOCTYPE html><html><body><h2>Không thể tạo transcript: ${err.message}</h2></body></html>`;
  }
}

/**
 * Build payload V2 cho log mở ticket (gửi vào kênh lưu trữ log 1568555066976116827)
 */
export function buildTicketOpenLogV2({ channel, channelId, channelName, profile, renterId, purpose }) {
  const cId = channelId || channel?.id;
  const cName = channelName || channel?.name || 'ticket';
  const channelDisplay = cId ? `<#${cId}>` : `#${cName}`;
  const ticketRef = `#${cName}`;
  const nowTs = Math.floor(Date.now() / 1000);

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17, // Container màu gốc
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_HEADER_L} **TICKET CREATED** ${BOOKING_EMOJIS.LOG_HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_BULLET} Ticket: ${ticketRef}\n${BOOKING_EMOJIS.LOG_BULLET} Người tạo: <@${renterId}> | ID: ${renterId}\n${BOOKING_EMOJIS.LOG_BULLET} Healing Whisper: ${profile?.id || '1'} - <@${profile?.userId || '852947314481299516'}>\n${BOOKING_EMOJIS.LOG_BULLET} Kênh: ${channelDisplay}\n${BOOKING_EMOJIS.LOG_BULLET} Thời gian tạo: <t:${nowTs}:F>`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_EXTRA} Lý do / Mục đích: "${purpose || 'Chơi game / Trò chuyện J4F'}"`,
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho log đóng ticket (gửi vào kênh lưu trữ log 1568555066976116827)
 */
export function buildTicketCloseLogV2({ channel, channelName, profile, renterId, closerId, reason }) {
  const cName = channelName || channel?.name || 'ticket';
  const ticketRef = `#${cName}`;
  const closerMention = closerId ? `<@${closerId}>` : 'Admin';
  const renterDisplay = renterId ? `<@${renterId}> | ID: ${renterId}` : 'Chưa rõ';
  const channelDisplay = channel?.id ? `<#${channel.id}>` : ticketRef;
  const nowTs = Math.floor(Date.now() / 1000);

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17, // Container màu gốc
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_HEADER_L} **TICKET CLOSED** ${BOOKING_EMOJIS.LOG_HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_BULLET} Ticket: ${ticketRef}\n${BOOKING_EMOJIS.LOG_BULLET} Chủ ticket: ${renterDisplay}\n${BOOKING_EMOJIS.LOG_BULLET} Healing Whisper: ${profile?.id || '1'} - <@${profile?.userId || '852947314481299516'}>\n${BOOKING_EMOJIS.LOG_BULLET} Đóng bởi: ${closerMention}\n${BOOKING_EMOJIS.LOG_BULLET} Kênh: ${channelDisplay}\n${BOOKING_EMOJIS.LOG_BULLET} Thời gian đóng: <t:${nowTs}:F>`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_EXTRA} Lý do đóng: "${reason || 'Đóng qua lệnh / nút quản trị'}"`,
          },
        ],
      },
    ],
  };
}

/**
 * Tìm ID của người mở ticket (renter) thông qua Topic, PermissionOverwrites, Lịch sử tin nhắn hoặc Tên kênh
 */
export async function findRenterIdFromChannel(channel, client, profile, closerId) {
  if (!channel) return null;

  // 1. Kiểm tra topic của kênh (cách chính xác và bền vững nhất)
  if (channel.topic) {
    const topicMatch = channel.topic.match(/RenterID:\s*(\d+)/i) || channel.topic.match(/<@!?(\d+)>/);
    if (topicMatch) {
      return topicMatch[1];
    }
  }

  // 2. Kiểm tra cache permission overwrites (chỉ loại trừ Role Admin/Support, Bot và Idol; KHÔNG loại trừ closerId)
  if (channel.permissionOverwrites?.cache) {
    const excludedIds = new Set([
      BOOKING_ADMIN_ROLE_ID,
      BOOKING_SUPPORT_ROLE_ID,
      client?.user?.id,
      profile?.userId,
    ]);

    const renterOverwrite = channel.permissionOverwrites.cache.find(
      (po) => (po.type === 1 || po.type === 'member') && !excludedIds.has(po.id),
    );
    if (renterOverwrite) {
      return renterOverwrite.id;
    }
  }

  // 3. Quét lịch sử tin nhắn của kênh để trích xuất renterId từ custom_id hoặc welcome card
  try {
    if (channel.messages?.fetch) {
      const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
      if (messages) {
        for (const msg of messages.values()) {
          // Trích xuất từ custom_id trong action rows (vd: hw_open_rate:1:872792190651334707)
          if (msg.components) {
            for (const row of msg.components) {
              const compList = row.components || [row];
              for (const comp of compList) {
                const cId = comp.customId || comp.custom_id;
                if (cId) {
                  const m = cId.match(/^hw_(?:open_rate|refuse|close_ticket|star):\d+:(\d+)/);
                  if (m) return m[1];
                }
              }
            }
          }

          // Trích xuất từ nội dung tin nhắn welcome (vd: <@872792190651334707> | ID: 872792190651334707)
          if (msg.content) {
            const m = msg.content.match(/ID:\s*(\d{16,21})/i);
            if (m) return m[1];
          }
        }
      }
    }
  } catch (err) {
    logger.warn('[Booking] Lỗi quét tin nhắn để tìm renterId:', err);
  }

  // 4. Nếu kênh có tên chứa username: vd: ticket-hw1-emchanh9
  if (channel.name && channel.guild?.members?.cache) {
    const parts = channel.name.split('-');
    if (parts.length >= 3) {
      const usernameHint = parts.slice(2).join('');
      const member = channel.guild.members.cache.find(
        (m) => m.user?.username?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) === usernameHint,
      );
      if (member) return member.id;
    }
  }

  return null;
}

/**
 * Build payload V2 cho thông báo mở lại ticket (gửi vào kênh ticket)
 */
export function buildTicketReopenPayloadV2(profile, executorId, renterId) {
  const renterMention = renterId ? `<@${renterId}> | ID: ${renterId}` : 'Chưa rõ';
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17, // Container màu gốc
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2} **TICKET ĐÃ ĐƯỢC MỞ LẠI** ${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.BULLET} Mở lại bởi: <@${executorId}>\n${BOOKING_EMOJIS.BULLET} Chủ ticket: ${renterMention}\n${BOOKING_EMOJIS.BULLET} Healing Whisper: ${profile.id} - <@${profile.userId}>\n${BOOKING_EMOJIS.STATUS_CONNECTING} Trạng thái: Đang trong phiên kết nối`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.WARNING} Phiên kết nối đã được mở lại thành công! Hai bạn hãy tiếp tục kết nối tại đây nhé! 🌸`,
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho log mở lại ticket (gửi vào kênh lưu trữ 1568555066976116827)
 */
export function buildTicketReopenLogV2({ channel, channelName, profile, renterId, executorId }) {
  const cName = channelName || channel?.name || 'ticket';
  const ticketRef = `#${cName}`;
  const executorMention = executorId ? `<@${executorId}>` : 'Admin';
  const renterDisplay = renterId ? `<@${renterId}> | ID: ${renterId}` : 'Chưa rõ';
  const channelDisplay = channel?.id ? `<#${channel.id}>` : ticketRef;
  const nowTs = Math.floor(Date.now() / 1000);

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_HEADER_L} **TICKET REOPENED** ${BOOKING_EMOJIS.LOG_HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_BULLET} Ticket: ${ticketRef}\n${BOOKING_EMOJIS.LOG_BULLET} Mở lại bởi: ${executorMention}\n${BOOKING_EMOJIS.LOG_BULLET} Chủ ticket: ${renterDisplay}\n${BOOKING_EMOJIS.LOG_BULLET} Healing Whisper: ${profile?.id || '1'} - <@${profile?.userId || '852947314481299516'}>\n${BOOKING_EMOJIS.LOG_BULLET} Kênh: ${channelDisplay}\n${BOOKING_EMOJIS.LOG_BULLET} Thời gian mở lại: <t:${nowTs}:F>`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_EXTRA} Trạng thái: Phiên kết nối đã được kích hoạt lại`,
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho log xóa ticket (gửi vào kênh lưu trữ 1568555066976116827)
 */
export function buildTicketDeleteLogV2({ channel, channelName, profile, renterId, executorId, reason }) {
  const cName = channelName || channel?.name || 'ticket';
  const ticketRef = `#${cName}`;
  const executorMention = executorId ? `<@${executorId}>` : 'Admin';
  const renterDisplay = renterId ? `<@${renterId}> | ID: ${renterId}` : 'Chưa rõ';
  const nowTs = Math.floor(Date.now() / 1000);

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_HEADER_L} **TICKET DELETED** ${BOOKING_EMOJIS.LOG_HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_BULLET} Ticket: ${ticketRef}\n${BOOKING_EMOJIS.LOG_BULLET} Xóa bởi: ${executorMention}\n${BOOKING_EMOJIS.LOG_BULLET} Chủ ticket: ${renterDisplay}\n${BOOKING_EMOJIS.LOG_BULLET} Healing Whisper: ${profile?.id || '1'} - <@${profile?.userId || '852947314481299516'}>\n${BOOKING_EMOJIS.LOG_BULLET} Thời gian xóa: <t:${nowTs}:F>`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_EXTRA} Lý do: "${reason || 'Hoàn tất và xóa kênh ticket'}"`,
          },
        ],
      },
    ],
  };
}

/**
 * Build payload V2 cho log xuất transcript dự phòng (gửi vào kênh lưu trữ 1568555066976116827)
 */
export function buildTicketTranscriptLogV2({ channel, channelName, profile, renterId, executorId }) {
  const cName = channelName || channel?.name || 'ticket';
  const ticketRef = `#${cName}`;
  const executorMention = executorId ? `<@${executorId}>` : 'Admin';
  const renterDisplay = renterId ? `<@${renterId}> | ID: ${renterId}` : 'Chưa rõ';
  const channelDisplay = channel?.id ? `<#${channel.id}>` : ticketRef;
  const nowTs = Math.floor(Date.now() / 1000);

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_HEADER_L} **TICKET TRANSCRIPT BACKUP** ${BOOKING_EMOJIS.LOG_HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_BULLET} Ticket: ${ticketRef}\n${BOOKING_EMOJIS.LOG_BULLET} Xuất bởi: ${executorMention}\n${BOOKING_EMOJIS.LOG_BULLET} Chủ ticket: ${renterDisplay}\n${BOOKING_EMOJIS.LOG_BULLET} Healing Whisper: ${profile?.id || '1'} - <@${profile?.userId || '852947314481299516'}>\n${BOOKING_EMOJIS.LOG_BULLET} Kênh: ${channelDisplay}\n${BOOKING_EMOJIS.LOG_BULLET} Thời gian xuất: <t:${nowTs}:F>`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.LOG_EXTRA} Chi tiết: Đã sao lưu toàn bộ lịch sử trò chuyện của kênh ticket`,
          },
        ],
      },
    ],
  };
}

/**
 * Gửi log ticket vào kênh lưu trữ 1568555066976116827
 */
export async function sendBookingTicketLog(guild, payload, files = []) {
  try {
    if (!guild) return null;
    const logChannel =
      guild.channels?.cache?.get(BOOKING_LOG_CHANNEL_ID) ||
      (await guild.channels?.fetch?.(BOOKING_LOG_CHANNEL_ID).catch(() => null));

    if (!logChannel || typeof logChannel.send !== 'function') {
      logger.warn(`[Booking] Không tìm thấy kênh log ticket: ${BOOKING_LOG_CHANNEL_ID}`);
      return null;
    }

    const options = { ...payload };
    if (files && files.length > 0) {
      options.files = files;
    }

    const logMsg = await logChannel.send(options);

    // Gửi file transcript riêng biệt để Discord mobile & desktop hiển thị box tải file chuẩn
    if (files && files.length > 0) {
      await logChannel.send({
        content: `📁 **File transcript lưu trữ:**`,
        files: files,
      }).catch((err) => logger.error('[Booking] Lỗi gửi file transcript vào kênh log:', err));
    }

    return logMsg;
  } catch (err) {
    logger.error('[Booking] Lỗi gửi log ticket vào kênh log:', err);
    return null;
  }
}

/**
 * Thực hiện quy trình đóng ticket hoàn chỉnh:
 * 1. Ẩn kênh với khách (ViewChannel: false, SendMessages: false)
 * 2. Giữ quyền xem cho 2 role 1568554130371383306 & 1545295139390619768 và quản lý server
 * 3. Kênh vẫn nằm trong danh mục 1568554690923331695
 * 4. Sinh transcript HTML
 * 5. Gửi thông báo đóng + đính kèm transcript vào kênh ticket
 * 6. Gửi log ticket V2 + đính kèm transcript vào kênh 1568555066976116827
 * 7. Tuyệt đối KHÔNG DM khách
 */
export async function closeBookingTicket({ channel, closer, client, reason = 'Đóng qua lệnh / nút quản trị' }) {
  const hwMatch = channel.name?.match(/ticket-hw(\d+)/i);
  const profileId = hwMatch ? hwMatch[1] : '1';
  const profile = getProfileData(profileId);

  // 1. Tìm ID của người mở ticket (renter)
  const renterId = await findRenterIdFromChannel(channel, client, profile, closer?.id);

  // 2. Chỉnh permission: Khách không còn thấy kênh nữa
  if (renterId && channel.permissionOverwrites?.edit) {
    await channel.permissionOverwrites.edit(renterId, {
      ViewChannel: false,
      SendMessages: false,
    }).catch((err) => logger.warn('[Booking] Lỗi ẩn quyền xem của khách:', err));
  }

  // Đảm bảo 2 role 1568554130371383306 & 1545295139390619768 vẫn xem được
  const staffRoleIds = [BOOKING_ADMIN_ROLE_ID, BOOKING_SUPPORT_ROLE_ID];
  for (const roleId of staffRoleIds) {
    if (channel.permissionOverwrites?.edit) {
      await channel.permissionOverwrites.edit(roleId, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
      }).catch(() => {});
    }
  }

  // 3. Sinh transcript HTML
  const html = await generateTranscriptHtml(channel);
  const transcriptAttachment = new AttachmentBuilder(Buffer.from(html, 'utf-8'), {
    name: `transcript-${channel.name}.html`,
  });

  // 4. Gửi thông báo đóng vào chính kênh ticket kèm file transcript
  const closedPayload = buildClosedTicketPayloadV2(profile, closer.id);
  closedPayload.files = [transcriptAttachment];
  if (channel.send) {
    await channel.send(closedPayload).catch((err) => logger.error('[Booking] Lỗi gửi thông báo đóng ticket:', err));
    await channel.send({
      content: `📁 **File transcript lưu trữ của ticket \`#${channel.name}\`:**`,
      files: [transcriptAttachment],
    }).catch((err) => logger.error('[Booking] Lỗi gửi file transcript vào kênh ticket:', err));
  }

  // 5. Gửi log ticket V2 + transcript vào kênh lưu trữ 1568555066976116827
  const logPayload = buildTicketCloseLogV2({
    channel,
    channelName: channel.name,
    profile,
    renterId,
    closerId: closer.id,
    reason,
  });
  await sendBookingTicketLog(channel.guild, logPayload, [transcriptAttachment]);

  return {
    success: true,
    profile,
    renterId,
    html,
  };
}

/**
 * Xóa vĩnh viễn kênh ticket sau khi đã sao lưu transcript vào kênh log
 */
export async function deleteBookingTicket({ channel, executor, client, reason = 'Hoàn tất và xóa kênh ticket' }) {
  const hwMatch = channel.name?.match(/ticket-hw(\d+)/i);
  const profileId = hwMatch ? hwMatch[1] : '1';
  const profile = getProfileData(profileId);
  const renterId = await findRenterIdFromChannel(channel, client, profile, executor?.id);

  // 1. Sinh transcript lưu trữ trước khi xóa kênh để không bao giờ mất dữ liệu
  const html = await generateTranscriptHtml(channel);
  const transcriptAttachment = new AttachmentBuilder(Buffer.from(html, 'utf-8'), {
    name: `transcript-${channel.name}.html`,
  });

  // 2. Gửi log TICKET DELETED + file transcript vào kênh log 1568555066976116827
  const deleteLog = buildTicketDeleteLogV2({
    channel,
    channelName: channel.name,
    profile,
    renterId,
    executorId: executor?.id,
    reason,
  });
  await sendBookingTicketLog(channel.guild, deleteLog, [transcriptAttachment]);

  // 3. Dọn dẹp kênh voice đi kèm (nếu có)
  const safeName = channel.name?.replace(/^ticket-/, '');
  if (safeName && channel.guild?.channels?.cache) {
    const expectedVoiceName = `🔊・voice-${safeName}`;
    const matchedVoice = channel.guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildVoice && c.name === expectedVoiceName,
    );
    if (matchedVoice && typeof matchedVoice.delete === 'function') {
      await matchedVoice.delete('Xóa kênh voice đi kèm ticket').catch(() => {});
    }
  }

  // 4. Xóa kênh (chờ 1.5s để interaction/command hoàn tất mượt mà)
  setTimeout(async () => {
    try {
      if (typeof channel.delete === 'function') {
        await channel.delete(reason).catch((err) => logger.error('[Booking] Lỗi xóa kênh ticket:', err));
      }
    } catch (delErr) {
      logger.error('[Booking] Exception khi xóa kênh ticket:', delErr);
    }
  }, 1500);

  return { success: true, profile, renterId };
}

/**
 * Mở lại kênh ticket khi lỡ đóng nhầm (cấp lại quyền xem/gửi cho khách)
 */
export async function reopenBookingTicket({ channel, executor, client, sendTranscriptBackup = false }) {
  const hwMatch = channel.name?.match(/ticket-hw(\d+)/i);
  const profileId = hwMatch ? hwMatch[1] : '1';
  const profile = getProfileData(profileId);
  const renterId = await findRenterIdFromChannel(channel, client, profile, executor?.id);

  // 1. Khôi phục quyền xem và gửi tin nhắn cho khách (renter)
  if (renterId && channel.permissionOverwrites?.edit) {
    await channel.permissionOverwrites.edit(renterId, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
    }).catch((err) => logger.warn('[Booking] Lỗi khôi phục quyền cho khách:', err));
  }

  // Đảm bảo 2 role 1568554130371383306 & 1545295139390619768 vẫn có quyền
  const staffRoleIds = [BOOKING_ADMIN_ROLE_ID, BOOKING_SUPPORT_ROLE_ID];
  for (const roleId of staffRoleIds) {
    if (channel.permissionOverwrites?.edit) {
      await channel.permissionOverwrites.edit(roleId, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
      }).catch(() => {});
    }
  }

  // 2. Gửi thông báo mở lại ticket vào chính kênh ticket
  const reopenPayload = buildTicketReopenPayloadV2(profile, executor?.id, renterId);
  if (channel.send) {
    await channel.send(reopenPayload).catch((err) => logger.error('[Booking] Lỗi gửi thông báo mở lại ticket:', err));
  }

  // 3. Gửi log TICKET REOPENED vào kênh log 1568555066976116827
  const reopenLog = buildTicketReopenLogV2({
    channel,
    channelName: channel.name,
    profile,
    renterId,
    executorId: executor?.id,
  });
  await sendBookingTicketLog(channel.guild, reopenLog);

  // 4. Nếu có yêu cầu dự phòng transcript
  if (sendTranscriptBackup) {
    await sendTicketTranscriptBackup({ channel, executor, client });
  }

  return { success: true, profile, renterId };
}

/**
 * Xuất và gửi transcript dự phòng vào kênh log lưu trữ và kênh hiện tại
 */
export async function sendTicketTranscriptBackup({ channel, executor, client }) {
  const hwMatch = channel.name?.match(/ticket-hw(\d+)/i);
  const profileId = hwMatch ? hwMatch[1] : '1';
  const profile = getProfileData(profileId);
  const renterId = await findRenterIdFromChannel(channel, client, profile, executor?.id);

  const html = await generateTranscriptHtml(channel);
  const transcriptAttachment = new AttachmentBuilder(Buffer.from(html, 'utf-8'), {
    name: `transcript-${channel.name}.html`,
  });

  const backupLog = buildTicketTranscriptLogV2({
    channel,
    channelName: channel.name,
    profile,
    renterId,
    executorId: executor?.id,
  });

  // Gửi vào kênh log 1568555066976116827
  await sendBookingTicketLog(channel.guild, backupLog, [transcriptAttachment]);

  // Gửi thông báo vào kênh hiện tại
  if (channel.send) {
    await channel.send({
      content: `📄 **Transcript dự phòng** đã được xuất và lưu trữ vào <#${BOOKING_LOG_CHANNEL_ID}> bởi <@${executor?.id}>!`,
      files: [transcriptAttachment],
    }).catch(() => {});
  }

  return { success: true, html };
}

/**
 * Xử lý các lệnh text prefix cho Booking: &pro5, &danhgia, &close, &clear, &moticket, &transcript
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

    const hasAdmin = isBookingAdmin(message.member, message.author.id);

    if (!hasAdmin) {
      await message.delete().catch(() => {});
      return true;
    }

    await message.delete().catch(() => {});

    const hwMatch = message.channel.name.match(/ticket-hw(\d+)/i);
    const profileId = hwMatch ? hwMatch[1] : '1';
    const profile = getProfileData(profileId);

    const renterId = (await findRenterIdFromChannel(message.channel, client, profile, message.author.id)) || message.author.id;

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

    const hasAdmin = isBookingAdmin(message.member, message.author.id);

    if (!hasAdmin) {
      return true;
    }

    await message.delete().catch(() => {});

    await closeBookingTicket({
      channel: message.channel,
      closer: message.author,
      client,
      reason: 'Đóng bằng lệnh prefix &close',
    });

    return true;
  }

  // 4. Lệnh xóa ticket: &clear, &xoaticket, &deleteticket
  const clearMatch = trimmed.match(/^[&!](?:clear|xoaticket|deleteticket)\b/i);
  if (clearMatch) {
    if (!message.channel.name?.startsWith('ticket-')) {
      return false;
    }

    const hasAdmin = isBookingAdmin(message.member, message.author.id);

    if (!hasAdmin) {
      return true;
    }

    await message.delete().catch(() => {});

    await message.channel.send('🗑️ Đang tiến hành lưu transcript và xóa kênh ticket trong giây lát...').catch(() => {});

    await deleteBookingTicket({
      channel: message.channel,
      executor: message.author,
      client,
      reason: 'Xóa ticket bằng lệnh prefix &clear',
    });

    return true;
  }

  // 5. Lệnh mở lại ticket: &moticket, &reopen
  const reopenMatch = trimmed.match(/^[&!](?:moticket|reopen)\b/i);
  if (reopenMatch) {
    if (!message.channel.name?.startsWith('ticket-')) {
      return false;
    }

    const hasAdmin = isBookingAdmin(message.member, message.author.id);

    if (!hasAdmin) {
      return true;
    }

    await message.delete().catch(() => {});

    await reopenBookingTicket({
      channel: message.channel,
      executor: message.author,
      client,
      sendTranscriptBackup: true,
    });

    return true;
  }

  // 6. Lệnh xuất transcript dự phòng: &transcript, &transcripts
  const transcriptMatch = trimmed.match(/^[&!](?:transcript|transcripts)\b/i);
  if (transcriptMatch) {
    if (!message.channel.name?.startsWith('ticket-')) {
      return false;
    }

    const hasAdmin = isBookingAdmin(message.member, message.author.id);

    if (!hasAdmin) {
      return true;
    }

    await message.delete().catch(() => {});

    await sendTicketTranscriptBackup({
      channel: message.channel,
      executor: message.author,
      client,
    });

    return true;
  }

  // 7. Lệnh tự động tạo kênh voice tâm sự riêng tư: &taokenhvoice, !taokenhvoice, &voice, &taovoice
  const voiceMatch = trimmed.match(/^[&!](?:taokenhvoice|createvoice|voice|taovoice)\b/i);
  if (voiceMatch) {
    if (!message.channel.name?.startsWith('ticket-')) {
      return false;
    }

    const hwMatch = message.channel.name.match(/ticket-hw(\d+)/i);
    const profileId = hwMatch ? hwMatch[1] : '1';
    const profile = getProfileData(profileId);
    const renterId = (await findRenterIdFromChannel(message.channel, client, profile, message.author.id)) || message.author.id;

    const hasAdmin = isBookingAdmin(message.member, message.author.id);
    const isIdol = message.author.id === profile?.userId;
    const isRenter = message.author.id === renterId;

    if (!hasAdmin && !isIdol && !isRenter) {
      await message.delete().catch(() => {});
      return true;
    }

    await message.delete().catch(() => {});

    const safeName = message.channel.name.replace(/^ticket-/, '');
    const voiceChannelName = `🔊・voice-${safeName}`;

    // Kiểm tra xem kênh voice đã tồn tại trong danh mục chưa
    const existingVoice = message.guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildVoice &&
        c.name === voiceChannelName,
    );

    if (existingVoice) {
      await message.channel.send({
        content: `🔊 **Phòng voice riêng tư đã sẵn sàng tại:** <#${existingVoice.id}>\nHai bạn có thể vào phòng để tâm sự thân mật nhé! 🌸`,
      });
      return true;
    }

    const voiceOverwrites = [
      {
        id: message.guild.id, // @everyone ẩn hoàn toàn không cho người ngoài thấy
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
      {
        id: BOOKING_SUPPORT_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
      },
      {
        id: BOOKING_ADMIN_ROLE_ID,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
      },
      {
        id: client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ];

    if (renterId) {
      voiceOverwrites.push({
        id: renterId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
        ],
      });
    }

    if (profile?.userId && profile.userId !== renterId) {
      voiceOverwrites.push({
        id: profile.userId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
        ],
      });
    }

    let voiceChannel;
    try {
      voiceChannel = await message.guild.channels.create({
        name: voiceChannelName,
        type: ChannelType.GuildVoice,
        parent: message.channel.parentId || BOOKING_CATEGORY_ID,
        permissionOverwrites: voiceOverwrites,
      });
    } catch (createErr) {
      logger.error('[Booking] Lỗi tạo kênh voice tâm sự:', createErr);
      await message.channel.send('❌ Đã xảy ra lỗi khi tạo kênh voice. Vui lòng thử lại sau!').catch(() => {});
      return true;
    }

    await message.channel.send({
      content: `🌸 **Kênh Voice Tâm Sự Thân Mật Đã Được Tạo!**\n> 🔊 Kênh voice riêng: <#${voiceChannel.id}>\n> 🔒 Kênh chỉ hiển thị cho <@${renterId}>, Healing Whisper <@${profile.userId}> và Ban Quản Trị để đảm bảo không bị người khác làm phiền. Chúc hai bạn có những giây phút kết nối thật ngọt ngào! 💕`,
    });

    return true;
  }

  return false;
}
