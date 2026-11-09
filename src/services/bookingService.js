import {
  ChannelType,
  PermissionFlagsBits,
  OverwriteType,
} from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BOOKING_EMOJIS,
  HEALING_WHISPER_PROFILES,
  BOOKING_ADMIN_ROLE_ID,
  BOOKING_CATEGORY_ID,
  BOOKING_LOG_CHANNEL_ID,
} from '../config/bookingConfig.js';
import { isBotOwner } from '../config/bot.js';
import { getDatabaseValue, setDatabaseValue, getGuildConfigKey } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import { generateTranscriptFiles } from '../utils/ticket/ticketTranscript.js';

export const IS_COMPONENTS_V2 = 1 << 15; // 32768

const bookingTicketSequenceQueues = new Map();

export function isBookingTicketChannelName(name) {
  return /^(?:mw\d+-hw\d+|ticket-hw\d+)-/i.test(String(name || ''));
}

export function isBookingTicketChannel(channel) {
  return (
    isBookingTicketChannelName(channel?.name) ||
    /RenterID:\s*\d+/i.test(String(channel?.topic || ''))
  );
}

export function getBookingProfileIdFromChannelName(name) {
  const match = String(name || '').match(/^(?:mw\d+-hw|ticket-hw)(\d+)-/i);
  return match ? match[1] : '1';
}

export function getBookingProfileIdFromChannel(channel) {
  const nameMatch = String(channel?.name || '').match(/^(?:mw\d+-hw|ticket-hw)(\d+)-/i);
  if (nameMatch) return nameMatch[1];
  const topicMatch = String(channel?.topic || '').match(/\bHW:\s*(\d+)/i);
  return topicMatch ? topicMatch[1] : '1';
}

export async function nextBookingTicketNumber(client, guildId) {
  if (!guildId) throw new Error('Không xác định được server để cấp số ticket.');
  const key = `booking:ticket-sequence:${guildId}`;
  const previous = bookingTicketSequenceQueues.get(key) || Promise.resolve();
  const task = previous.then(async () => {
    const current = Number(await getDatabaseValue(client, key, 0)) || 0;
    const next = current + 1;
    const saved = await setDatabaseValue(client, key, next);
    if (!saved) throw new Error('Không thể lưu số thứ tự ticket Booking vào database.');
    return next;
  });
  bookingTicketSequenceQueues.set(key, task.catch(() => {}));
  return task;
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE_PATH = path.resolve(__dirname, '../data/bookingData.json');

/**
 * Đọc dữ liệu profile lưu trữ bền vững từ bookingData.json
 */
export function loadStoredBookingData() {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    logger.warn('[Booking] Không thể đọc bookingData.json:', err);
  }
  return { profiles: {} };
}

/**
 * Ghi dữ liệu profile lưu trữ bền vững vào bookingData.json
 */
export function saveStoredBookingData(data) {
  try {
    const dir = path.dirname(DATA_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    logger.error('[Booking] Không thể ghi bookingData.json:', err);
    return false;
  }
}

/**
 * Quyền sử dụng lệnh Booking:
 * - Bot owner hoặc chủ server
 * - Role admin Booking mới
 * - Role quản lý (modRole) đã cấu hình trong phần cài đặt server
 *
 * Không tự động cấp quyền theo Administrator/ManageChannels hoặc role support cũ.
 */
export async function getConfiguredBookingManagerRoleId(client, guildId) {
  if (!guildId) return null;
  const guildConfig = await getDatabaseValue(client, getGuildConfigKey(guildId), {});
  const role = guildConfig?.modRole;
  return typeof role === 'string' ? role : (role?.id || null);
}

export async function isBookingAdmin(member, userId, client = null) {
  if (isBotOwner(userId) || (member?.guild?.ownerId && member.guild.ownerId === String(userId))) return true;
  if (!member) return false;
  const hasRole = (roleId) => Boolean(roleId && (
    member.roles?.cache?.has?.(roleId) ||
    (Array.isArray(member._roles) && member._roles.includes(roleId)) ||
    (Array.isArray(member.roles) && member.roles.includes(roleId))
  ));
  if (hasRole(BOOKING_ADMIN_ROLE_ID)) return true;
  return hasRole(await getConfiguredBookingManagerRoleId(client, member.guild?.id));
}
/**
 * Cache lưu trạng thái runtime của các profile (lượt tim, ảnh hiện tại, điểm sao)
 */
const profileState = new Map();

export function getProfileData(profileId = '1') {
  const base = HEALING_WHISPER_PROFILES[String(profileId)] || HEALING_WHISPER_PROFILES['1'];
  if (!profileState.has(base.id)) {
    const stored = loadStoredBookingData();
    const profData = stored?.profiles?.[String(base.id)] || {};
    profileState.set(base.id, {
      ...base,
      likes: typeof profData.likes === 'number' ? profData.likes : (typeof base.likes === 'number' ? base.likes : 0),
      rating: profData.rating || base.rating || '5/5',
      fiveStarCount: typeof profData.fiveStarCount === 'number' ? profData.fiveStarCount : 0,
      userLikes: profData.userLikes || {},
    });
  }
  return profileState.get(base.id);
}

/**
 * Thả tim tích lũy cho profile (giới hạn tối đa 10 lần/user vĩnh viễn)
 */
export function addProfileLike(profileId = '1', userId) {
  const profile = getProfileData(profileId);
  if (!profile) return { success: false, reason: 'NOT_FOUND' };

  if (!profile.userLikes || typeof profile.userLikes !== 'object') {
    profile.userLikes = {};
  }

  const currentCount = Number(profile.userLikes[userId]) || 0;
  if (currentCount >= 10) {
    return {
      success: false,
      reason: 'MAX_REACHED',
      currentLikes: typeof profile.likes === 'number' ? profile.likes : 0,
      userLikes: currentCount,
      max: 10,
    };
  }

  const nextCount = currentCount + 1;
  profile.userLikes[userId] = nextCount;
  profile.likes = (typeof profile.likes === 'number' ? profile.likes : 0) + 1;

  // Cập nhật và lưu vào file bookingData.json ngay lập tức
  const stored = loadStoredBookingData();
  stored.profiles = stored.profiles || {};
  stored.profiles[String(profile.id)] = {
    likes: profile.likes,
    rating: profile.rating || '5/5',
    fiveStarCount: profile.fiveStarCount || 0,
    userLikes: profile.userLikes,
  };
  saveStoredBookingData(stored);

  return {
    success: true,
    currentLikes: profile.likes,
    userLikes: nextCount,
    max: 10,
  };
}

/**
 * Thêm đánh giá 5 sao cho profile và lưu trữ bền vững
 */
export function addProfileRating(profileId = '1', stars = 5) {
  const profile = getProfileData(profileId);
  if (!profile) return { success: false, reason: 'NOT_FOUND' };

  if (stars === 5) {
    profile.fiveStarCount = (typeof profile.fiveStarCount === 'number' ? profile.fiveStarCount : 0) + 1;
    profile.rating = '5/5';
  }

  const stored = loadStoredBookingData();
  stored.profiles = stored.profiles || {};
  stored.profiles[String(profile.id)] = {
    likes: typeof profile.likes === 'number' ? profile.likes : 0,
    rating: profile.rating || '5/5',
    fiveStarCount: profile.fiveStarCount || 0,
    userLikes: profile.userLikes || {},
  };
  saveStoredBookingData(stored);

  return {
    success: true,
    rating: profile.rating,
    fiveStarCount: profile.fiveStarCount,
  };
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
                label: String(typeof profile.likes === 'number' ? profile.likes : (profile.likes ?? 0)),
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
 * Build payload V2 cho thông báo Tạo Kênh Voice Tâm Sự Thân Mật
 */
export function buildVoiceReadyPayloadV2({ profile, renterId, voiceChannelId }) {
  const channelMention = voiceChannelId ? `<#${voiceChannelId}>` : '#phòng-voice';
  const renterMention = renterId ? `<@${renterId}>` : 'Khách';
  const idolMention = profile?.userId ? `<@${profile.userId}>` : 'Healing Whisper';

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2} **KÊNH VOICE TÂM SỰ ĐÃ SẴN SÀNG** ${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: `${BOOKING_EMOJIS.STATUS_CONNECTING} **Phòng voice:** ${channelMention}\n${BOOKING_EMOJIS.BULLET} **Quyền riêng tư:** Kênh chỉ hiển thị cho ${renterMention} và Healing Whisper ${idolMention} để đảm bảo không bị người khác làm phiền.\n\n<a:heartg1:1545307544808071258> Chúc hai bạn có những giây phút kết nối thật ngọt ngào và riêng tư nha! <a:ilyg1:1546041656648929380>`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 1, // Action row
            components: [
              {
                type: 2,
                style: 2, // Secondary
                label: 'Đã kết nối phòng',
                emoji: {
                  name: 'trangtrig6',
                  id: '1546043036390260756',
                  animated: true,
                },
                custom_id: `hw_voice_ready:${voiceChannelId || 'voice'}`,
              },
            ],
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

function extractRenterIdFromComponents(components = []) {
  if (!Array.isArray(components)) return null;
  for (const comp of components) {
    const data = comp?.toJSON?.() || comp?.data || comp || {};
    const cId = data.customId || data.custom_id || comp?.customId || comp?.custom_id;
    if (cId) {
      const m = String(cId).match(/^hw_(?:open_rate|refuse|close_ticket|star):\d+:(\d+)/);
      if (m) return m[1];
    }
    if (typeof data.content === 'string') {
      const m = data.content.match(/ID:\s*(\d{16,21})/i);
      if (m) return m[1];
    }
    if (Array.isArray(data.components)) {
      const nested = extractRenterIdFromComponents(data.components);
      if (nested) return nested;
    }
    if (Array.isArray(comp?.components)) {
      const nested = extractRenterIdFromComponents(comp.components);
      if (nested) return nested;
    }
  }
  return null;
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

  // 2. Kiểm tra cache permission overwrites (loại trừ role Admin, Bot và Idol)
  if (channel.permissionOverwrites?.cache) {
    const excludedIds = new Set([
      BOOKING_ADMIN_ROLE_ID,
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
          // Trích xuất từ custom_id trong action rows hoặc Components V2 container (vd: hw_open_rate:1:872792190651334707)
          if (msg.components) {
            const foundFromComponents = extractRenterIdFromComponents(msg.components);
            if (foundFromComponents) return foundFromComponents;
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

  // 4. Hỗ trợ cả tên kênh cũ và mới, ví dụ: mw9-hw1-emchanh.9
  if (channel.name && channel.guild?.members?.cache) {
    const parts = channel.name.split('-');
    if (parts.length >= 3) {
      const usernameHint = parts.slice(2).join('-');
      const member = channel.guild.members.cache.find(
        (m) => m.user?.username?.toLowerCase().replace(/[^a-z0-9.-]/g, '').slice(0, 32) === usernameHint,
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
 * Đảm bảo mọi file đính kèm trên payload Components V2 đều được tham chiếu qua FileComponent (type: 13).
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
    if (Array.isArray(payload?.components)) {
      options.components = payload.components.map((comp) => {
        if (comp && Array.isArray(comp.components)) {
          return { ...comp, components: [...comp.components] };
        }
        return comp && typeof comp === 'object' ? { ...comp } : comp;
      });
    }

    if (files && files.length > 0) {
      options.files = files;

      if ((options.flags & IS_COMPONENTS_V2) && Array.isArray(options.components)) {
        const serializedComponents = JSON.stringify(options.components);
        for (const file of files) {
          const fileName = file?.name || file?.attachment?.name;
          if (!fileName) continue;
          const attachmentUrl = `attachment://${fileName}`;
          if (serializedComponents.includes(attachmentUrl)) continue;

          const fileComponent = {
            type: 13, // ComponentType.File
            file: {
              url: attachmentUrl,
            },
          };

          const container = options.components.find((c) => c?.type === 17 && Array.isArray(c.components));
          if (container && container.components.length < 10) {
            container.components.push(fileComponent);
          } else {
            options.components.push(fileComponent);
          }
        }
      }
    }

    try {
      return await logChannel.send(options);
    } catch (sendErr) {
      logger.error('[Booking] Lỗi gửi log ticket vào kênh log:', sendErr);
      if (files && files.length > 0) {
        const logMsg = await logChannel.send(payload).catch(() => null);
        await logChannel.send({
          content: '📄 **File transcript lưu trữ:**',
          files,
        }).catch((fileErr) => logger.error('[Booking] Lỗi gửi fallback transcript vào kênh log:', fileErr));
        return logMsg;
      }
      return null;
    }
  } catch (err) {
    logger.error('[Booking] Lỗi gửi log ticket vào kênh log:', err);
    return null;
  }
}

/**
 * Thực hiện quy trình đóng ticket:
 * 1. Ẩn kênh với khách (ViewChannel: false, SendMessages: false)
 * 2. Chỉ giữ quyền cho role Admin Booking mới và role quản lý đã cấu hình
 * 3. Kênh vẫn nằm trong danh mục 1568554690923331695
 * 4. Gửi thông báo đóng vào kênh ticket
 * 5. Ghi log đóng vào kênh lưu trữ 1568555066976116827 (mặc định KHÔNG gửi transcript)
 * 6. Tuyệt đối KHÔNG DM khách
 */
export async function closeBookingTicket({
  channel,
  closer,
  client,
  reason = 'Đóng qua lệnh / nút quản trị',
  sendTranscript = false,
}) {
  const profileId = getBookingProfileIdFromChannel(channel);

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

  // Chỉ giữ quyền cho role Admin Booking mới và role quản lý đã cấu hình
  const managerRoleId = await getConfiguredBookingManagerRoleId(client, channel.guild?.id);
  const staffRoleIds = [BOOKING_ADMIN_ROLE_ID, managerRoleId].filter(Boolean);
  for (const roleId of staffRoleIds) {
    if (channel.permissionOverwrites?.edit) {
      await channel.permissionOverwrites.edit(roleId, {
        ViewChannel: true,
        ReadMessageHistory: true,
        SendMessages: true,
      }).catch(() => {});
    }
  }

  // 3. Chỉ tạo transcript nếu được yêu cầu tường minh (mặc định đóng ticket KHÔNG gửi transcript)
  const transcriptFiles = sendTranscript
    ? await generateTranscriptFiles(channel, {
        number: channel.name,
        userId: renterId,
        createdAt: channel.createdAt,
        closedAt: Date.now(),
        closeReason: reason,
      })
    : [];

  // 4. Gửi thông báo đóng vào kênh ticket
  const closerId = closer?.id || client?.user?.id || '';
  const closedPayload = buildClosedTicketPayloadV2(profile, closerId);
  if (channel.send) {
    await channel.send(closedPayload).catch((err) => logger.error('[Booking] Lỗi gửi thông báo đóng ticket:', err));
  }

  // 5. Gửi log đóng ticket vào kênh lưu trữ (không đính kèm transcript khi đóng)
  const logPayload = buildTicketCloseLogV2({
    channel,
    channelName: channel.name,
    profile,
    renterId,
    closerId,
    reason,
  });
  await sendBookingTicketLog(channel.guild, logPayload, transcriptFiles);

  return {
    success: true,
    profile,
    renterId,
    transcriptFiles,
  };
}

/**
 * Xóa vĩnh viễn kênh ticket sau khi đã tạo và gửi transcript HTML vào kênh log
 */
export async function deleteBookingTicket({ channel, executor, client, reason = 'Hoàn tất và xóa kênh ticket' }) {
  const profileId = getBookingProfileIdFromChannel(channel);

  const profile = getProfileData(profileId);
  const renterId = await findRenterIdFromChannel(channel, client, profile, executor?.id);

  // 1. Tạo transcript HTML trước khi xóa kênh để không mất dữ liệu
  const transcriptFiles = await generateTranscriptFiles(channel, {
    number: channel.name,
    userId: renterId,
    createdAt: channel.createdAt,
    closedAt: Date.now(),
    closeReason: reason,
  });

  // 2. Ghi log xóa ticket kèm file transcript vào kênh lưu trữ 1568555066976116827
  const deleteLog = buildTicketDeleteLogV2({
    channel,
    channelName: channel.name,
    profile,
    renterId,
    executorId: executor?.id,
    reason,
  });
  await sendBookingTicketLog(channel.guild, deleteLog, transcriptFiles);

  // 3. Dọn dẹp kênh voice đi kèm (nếu có)
  const safeName = channel.name?.replace(/^(?:mw\d+-|ticket-)/i, '');
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

  return { success: true, profile, renterId, transcriptFiles };
}

/**
 * Mở lại kênh ticket khi lỡ đóng nhầm (cấp lại quyền xem/gửi cho khách)
 */
export async function reopenBookingTicket({ channel, executor, client, sendTranscriptBackup = false }) {
  const profileId = getBookingProfileIdFromChannel(channel);

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

  // Chỉ giữ quyền cho role Admin Booking mới và role quản lý đã cấu hình
  const managerRoleId = await getConfiguredBookingManagerRoleId(client, channel.guild?.id);
  const staffRoleIds = [BOOKING_ADMIN_ROLE_ID, managerRoleId].filter(Boolean);
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
  const profileId = getBookingProfileIdFromChannel(channel);

  const profile = getProfileData(profileId);
  const renterId = await findRenterIdFromChannel(channel, client, profile, executor?.id);

  const transcriptFiles = await generateTranscriptFiles(channel, {
    number: channel.name,
    userId: renterId,
    createdAt: channel.createdAt,
    closedAt: Date.now(),
  });

  const backupLog = buildTicketTranscriptLogV2({
    channel,
    channelName: channel.name,
    profile,
    renterId,
    executorId: executor?.id,
  });

  // Gửi vào kênh log 1568555066976116827
  await sendBookingTicketLog(channel.guild, backupLog, transcriptFiles);

  // Gửi thông báo vào kênh hiện tại
  if (channel.send) {
    await channel.send({
      content: `📄 **Transcript dự phòng** đã được xuất và lưu trữ vào <#${BOOKING_LOG_CHANNEL_ID}> bởi <@${executor?.id}>!`,
      files: transcriptFiles,
    }).catch(() => {});
  }

  return { success: true, transcriptFiles };
}

/**
 * Xử lý các lệnh text prefix cho Booking: &pro5, &danhgia, &close, &clear, &moticket, &transcript
 */
export async function handleBookingMessage(message, client) {
  if (typeof message.content !== 'string' || !message.content) {
    return false;
  }

  const trimmed = message.content.trim();

  // &giabk — công khai bảng giá Booking bằng một tin nhắn Components V2.
  // Ba Container được xếp nối tiếp: giới thiệu, ảnh bảng giá, ảnh quy định.
  const bookingPriceMatch = trimmed.match(/^[&!]giabk$/i);
  if (bookingPriceMatch) {
    const page1Url = 'https://raw.githubusercontent.com/uyenhoang9034-pixel/UsagiTienTon/main/assets/booking/Healing_Whisper_Booking_Page_1.png';
    const page2Url = 'https://raw.githubusercontent.com/uyenhoang9034-pixel/UsagiTienTon/main/assets/booking/Healing_Whisper_Booking_Page_2.png';

    try {
      await message.channel.send({
        flags: IS_COMPONENTS_V2,
        components: [
          {
            type: 17,
            components: [
              {
                type: 10,
                content: `${BOOKING_EMOJIS.LOG_HEADER_L} **BOOKING PRICE LIST** ${BOOKING_EMOJIS.LOG_HEADER_R}`,
              },
              {
                type: 14,
                divider: true,
                spacing: 1,
              },
              {
                type: 10,
                content: 'Chào bạn, đây là bảng giá Booking Healing Whisper của server.\n\n> - Mong bạn check kĩ giá và đọc kĩ rules trước khi book! Nếu cần đọc lại rules, xin hãy ấn vào nút bên dưới.\n> - Mọi thắc mắc vui lòng liên hệ trực tiếp <@&1568554130371383306> ngay tại ticket này. Xin cảm ơn!',
              },
            ],
          },
          {
            type: 17,
            components: [
              {
                type: 12,
                items: [
                  {
                    media: { url: page1Url },
                    description: 'Bảng giá Booking Healing Whisper — trang 1',
                  },
                ],
              },
            ],
          },
          {
            type: 17,
            components: [
              {
                type: 12,
                items: [
                  {
                    media: { url: page2Url },
                    description: 'Quy định Booking Healing Whisper — trang 2',
                  },
                ],
              },
            ],
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: 5,
                label: 'Đọc Rules',
                url: 'https://discord.com/channels/1541279801183178754/1568549463109148743',
              },
            ],
          },
        ],
        allowedMentions: {
          parse: [],
          roles: ['1568554130371383306'],
        },
      });

      await message.delete().catch(() => {});
    } catch (err) {
      logger.error('[Booking] Không thể gửi bảng giá Booking:', err);
      await message.delete().catch(() => {});
      await message.channel.send('❌ Không thể hiển thị bảng giá Booking lúc này. Vui lòng thử lại sau.').catch(() => {});
    }

    return true;
  }

  // Tất cả lệnh prefix thuộc hệ thống Booking đều chỉ dành cho Owner,
  // role quản lý đã cấu hình hoặc role Admin Booking mới.
  const bookingCommandMatch = trimmed.match(/^[&!](?:tip(?:\s|$)|pro5(?:\s|$)|profile(?:\s|$)|danhgia\b|feedback\b|close\b|dongticket\b|clear\b|xoaticket\b|deleteticket\b|moticket\b|reopen\b|transcripts?\b|taokenhvoice\b|createvoice\b|voice\b|taovoice\b)/i);
  if (bookingCommandMatch && !(await isBookingAdmin(message.member, message.author.id, client))) {
    await message.delete().catch(() => {});
    return true;
  }

  // &tip @Staff — hiển thị ảnh QR tip đã được gắn sẵn theo Discord ID.
  const tipMatch = trimmed.match(/^[&!]tip\s+<@!?(\d+)>$/i);
  if (tipMatch) {
    await message.delete().catch(() => {});

    if (!isBookingTicketChannel(message.channel)) {
      await message.channel.send('ℹ️ Lệnh `&tip` chỉ sử dụng được trong ticket Booking.').catch(() => {});
      return true;
    }

    const targetId = tipMatch[1];
    const staffQrImages = {
      '852947314481299516': 'https://raw.githubusercontent.com/uyenhoang9034-pixel/UsagiTienTon/main/assets/booking/EB13C13B-C9DE-4769-B213-6318731AD070.jpg',
      '1212972766752542753': 'https://raw.githubusercontent.com/uyenhoang9034-pixel/UsagiTienTon/main/assets/booking/1794070432158.png',
    };
    const qrImageUrl = staffQrImages[targetId];

    if (!qrImageUrl) {
      await message.channel.send('ℹ️ Nhân viên này chưa có ảnh QR nhận tip.').catch(() => {});
      return true;
    }

    const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) {
      await message.channel.send('❌ Không tìm thấy nhân viên được chọn trong máy chủ.').catch(() => {});
      return true;
    }

    const avatarUrl = targetMember.displayAvatarURL({ extension: 'png', size: 256 });
    const heartEmoji = BOOKING_EMOJIS.HEART_BUTTON;
    const heartTag = `<a:${heartEmoji.name}:${heartEmoji.id}>`;

    await message.channel.send({
      flags: IS_COMPONENTS_V2,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `${BOOKING_EMOJIS.LOG_HEADER_L} **STAFF TIPPING** ${BOOKING_EMOJIS.LOG_HEADER_R}`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: 'Bạn muốn gửi một chút yêu thương đến:',
            },
            {
              type: 9,
              components: [
                {
                  type: 10,
                  content: `<@!${targetId}>`,
                },
              ],
              accessory: {
                type: 11,
                media: {
                  url: avatarUrl,
                },
                description: `Avatar của ${targetMember.user.username}`,
              },
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: 'Quét mã QR để gửi tip',
            },
            {
              type: 12,
              items: [
                {
                  media: {
                    url: qrImageUrl,
                  },
                  description: 'Ảnh QR tip đầy đủ của nhân viên',
                },
              ],
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: `${heartTag} Cảm ơn bạn đã tip cho Healing Whisper! Chúc bạn một ngày an lành!`,
            },
          ],
        },
      ],
      allowedMentions: { parse: [] },
    }).catch((err) => logger.error('[Booking] Không thể gửi giao diện tip:', err));

    return true;
  }

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
    if (!isBookingTicketChannel(message.channel)) {
      return false;
    }

    const hasAdmin = await isBookingAdmin(message.member, message.author.id, client);

    if (!hasAdmin) {
      await message.delete().catch(() => {});
      return true;
    }

    await message.delete().catch(() => {});

    const profileId = getBookingProfileIdFromChannel(message.channel);

    const profile = getProfileData(profileId);

    const renterId = (await findRenterIdFromChannel(message.channel, client, profile, message.author.id)) || message.author.id;

    const payload = buildRatingPayloadV2(profile, renterId);
    await message.channel.send(payload);
    return true;
  }

  // 3. Lệnh đóng ticket: &close hoặc &dongticket
  const closeMatch = trimmed.match(/^[&!](?:close|dongticket)\b/i);
  if (closeMatch) {
    if (!isBookingTicketChannel(message.channel)) {
      return false;
    }

    const hasAdmin = await isBookingAdmin(message.member, message.author.id, client);

    if (!hasAdmin) {
      return true;
    }

    await message.delete().catch(() => {});

    await closeBookingTicket({
      channel: message.channel,
      closer: message.author,
      client,
      reason: 'Đóng bằng lệnh prefix &close',
      sendTranscript: false,
    });

    return true;
  }

  // 4. Lệnh xóa ticket: &clear, &xoaticket, &deleteticket
  const clearMatch = trimmed.match(/^[&!](?:clear|xoaticket|deleteticket)\b/i);
  if (clearMatch) {
    if (!isBookingTicketChannel(message.channel)) {
      return false;
    }

    const hasAdmin = await isBookingAdmin(message.member, message.author.id, client);

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
    if (!isBookingTicketChannel(message.channel)) {
      return false;
    }

    const hasAdmin = await isBookingAdmin(message.member, message.author.id, client);

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
    if (!isBookingTicketChannel(message.channel)) {
      return false;
    }

    const hasAdmin = await isBookingAdmin(message.member, message.author.id, client);

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
    if (!isBookingTicketChannel(message.channel)) {
      return false;
    }

    const profileId = getBookingProfileIdFromChannel(message.channel);

    const profile = getProfileData(profileId);
    const renterId = (await findRenterIdFromChannel(message.channel, client, profile, message.author.id)) || message.author.id;

    const hasAdmin = await isBookingAdmin(message.member, message.author.id, client);
    const isIdol = message.author.id === profile?.userId;
    const isRenter = message.author.id === renterId;

    if (!hasAdmin && !isIdol && !isRenter) {
      await message.delete().catch(() => {});
      return true;
    }

    await message.delete().catch(() => {});

    const safeName = message.channel.name.replace(/^(?:mw\d+-|ticket-)/i, '');
    const voiceChannelName = `🔊・voice-${safeName}`;

    // Kiểm tra xem kênh voice đã tồn tại trong danh mục chưa
    const existingVoice = message.guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildVoice &&
        c.name === voiceChannelName,
    );

    if (existingVoice) {
      const payload = buildVoiceReadyPayloadV2({
        profile,
        renterId,
        voiceChannelId: existingVoice.id,
      });
      await message.channel.send(payload);
      return true;
    }

    const voiceOverwrites = [
      {
        id: message.guild.id, // @everyone ẩn hoàn toàn không cho người ngoài thấy
        type: OverwriteType?.Role ?? 0,
        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
      },
      {
        id: BOOKING_ADMIN_ROLE_ID,
        type: OverwriteType?.Role ?? 0,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
      },
      {
        id: client.user.id,
        type: OverwriteType?.Member ?? 1,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ];

    const managerRoleId = await getConfiguredBookingManagerRoleId(client, message.guild.id);
    if (managerRoleId && managerRoleId !== BOOKING_ADMIN_ROLE_ID) {
      voiceOverwrites.splice(1, 0, {
        id: managerRoleId,
        type: OverwriteType?.Role ?? 0,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
        ],
      });
    }

    if (renterId && typeof renterId === 'string' && /^\d{16,21}$/.test(renterId)) {
      voiceOverwrites.push({
        id: renterId,
        type: OverwriteType?.Member ?? 1,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.UseVAD,
        ],
      });
    }

    if (profile?.userId && profile.userId !== renterId && /^\d{16,21}$/.test(profile.userId)) {
      voiceOverwrites.push({
        id: profile.userId,
        type: OverwriteType?.Member ?? 1,
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

    const payload = buildVoiceReadyPayloadV2({
      profile,
      renterId,
      voiceChannelId: voiceChannel.id,
    });
    await message.channel.send(payload);

    return true;
  }

  return false;
}
