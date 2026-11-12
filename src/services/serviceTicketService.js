import fs from 'node:fs';
import path from 'node:path';
import {
  AttachmentBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  OverwriteType,
  PermissionFlagsBits,
  Routes,
} from 'discord.js';
import { isBotOwner } from '../config/bot.js';
import {
  SERVICE_TICKET_IDS,
  SERVICE_TICKET_EMOJIS,
  SERVICE_CATALOG,
  MAX_OPEN_SERVICE_TICKETS_PER_USER,
  SERVICE_TICKET_CHANNEL_PREFIX,
  SERVICE_TICKET_BANNER_FILENAME,
  SERVICE_TICKET_BANNER_REL_PATH,
  SERVICE_TICKET_BANNER_FALLBACK_URL,
  SERVICE_DM_FOOTER,
  parseBuyServiceKeyword,
  buildServiceTicketChannelName,
  getServiceTicketCounterStorageKey,
  getServiceTicketStaffCacheKey,
  getFeedbackStickyStorageKey,
} from '../config/serviceTicketConfig.js';
import {
  getDatabaseValue,
  setDatabaseValue,
  deleteDatabaseValue,
  listDatabaseKeys,
} from '../utils/database.js';
import { generateTranscriptFiles } from '../utils/ticket/ticketTranscript.js';
import { logger } from '../utils/logger.js';

export const IS_COMPONENTS_V2 = 1 << 15; // 32768

export const SERVICE_TOS_CHANNEL_IDS = {
  TICKET_CHANNEL_ID: SERVICE_TICKET_IDS.PANEL_CHANNEL_ID,
  FEEDBACK_CHANNEL_ID: SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID,
};

export const SERVICE_TOS_EMOJIS = {
  HEADER_L: SERVICE_TICKET_EMOJIS.HEADER_L,
  HEADER_R: SERVICE_TICKET_EMOJIS.HEADER_R,
  BULLET_SERVICE: SERVICE_TICKET_EMOJIS.BULLET_SERVICE,
  SUB_SECTION: SERVICE_TICKET_EMOJIS.SUB_SECTION,
  HEART: SERVICE_TICKET_EMOJIS.HEART,
};

const serviceCounterQueues = new Map();
const userTicketCreationQueues = new Map();
const deletingServiceTickets = new Set();
const feedbackStickyQueues = new Map();
const feedbackStickyMessageIds = new Map();

function withUserCreationLock(userId, task) {
  const key = String(userId || 'unknown');
  const prev = userTicketCreationQueues.get(key) || Promise.resolve();
  const next = prev.then(task);
  userTicketCreationQueues.set(
    key,
    next.catch(() => {}).finally(() => {
      if (userTicketCreationQueues.get(key) === next) {
        userTicketCreationQueues.delete(key);
      }
    }),
  );
  return next;
}

export function getServiceTicketBannerPath() {
  return path.resolve(process.cwd(), SERVICE_TICKET_BANNER_REL_PATH);
}

export function getServiceTicketImageAttachment() {
  try {
    const filePath = getServiceTicketBannerPath();
    if (fs.existsSync(filePath)) {
      return new AttachmentBuilder(filePath, { name: SERVICE_TICKET_BANNER_FILENAME });
    }
  } catch (err) {
    logger.warn('[ServiceTicket] Không thể đọc ảnh banner ticket:', err);
  }
  return null;
}

export function memberHasRole(member, roleId) {
  if (!member || !roleId) return false;
  return Boolean(
    member.roles?.cache?.has?.(roleId) ||
    (Array.isArray(member._roles) && member._roles.includes(roleId)) ||
    (Array.isArray(member.roles) && member.roles.includes(roleId)),
  );
}

/**
 * Quyền nhân viên / quản lý cho hệ thống Ticket Dịch Vụ:
 * - Bot Owner hoặc Server Owner
 * - Role @SP Ticket (1545295139390619768)
 * - Quản trị viên (Administrator)
 */
export function isServiceTicketStaff(member, userId, client = null) {
  if (isBotOwner(userId) || (member?.guild?.ownerId && member.guild.ownerId === String(userId))) {
    return true;
  }
  if (!member) return false;
  if (memberHasRole(member, SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID)) {
    return true;
  }
  return Boolean(member.permissions?.has?.(PermissionFlagsBits.Administrator));
}

export function isServiceTicketChannelName(name) {
  return String(name || '').startsWith(`${SERVICE_TICKET_CHANNEL_PREFIX}ticket-`);
}

export function isServiceTicketChannel(channel, ticketData = null) {
  if (ticketData?.ticketSystem === 'service') {
    return true;
  }
  if (!channel) return false;
  if (channel.parentId === SERVICE_TICKET_IDS.CATEGORY_ID && isServiceTicketChannelName(channel.name)) {
    return true;
  }
  return isServiceTicketChannelName(channel.name);
}

export function getTicketStorageKey(guildId, channelId) {
  return `guild:${guildId}:ticket:${channelId}`;
}

export async function getServiceTicketRecord(client, guildId, channelId) {
  if (!guildId || !channelId) return null;
  const record = await getDatabaseValue(client, getTicketStorageKey(guildId, channelId), null);
  if (record && record.ticketSystem === 'service') {
    return record;
  }
  return null;
}

export async function saveServiceTicketRecord(client, guildId, channelId, data) {
  if (!guildId || !channelId || !data) return false;
  return setDatabaseValue(client, getTicketStorageKey(guildId, channelId), {
    ...data,
    ticketSystem: 'service',
    guildId: String(guildId),
    channelId: String(channelId),
  });
}

export async function rememberServiceStaffId(client, guildId, userId) {
  if (!guildId || !userId) return;
  try {
    const key = getServiceTicketStaffCacheKey(guildId);
    const existing = await getDatabaseValue(client, key, []);
    const list = Array.isArray(existing) ? existing.map(String) : [];
    const uid = String(userId);
    if (!list.includes(uid)) {
      const updated = [uid, ...list].slice(0, 50);
      await setDatabaseValue(client, key, updated);
    }
  } catch {
    // Non-critical cache update
  }
}

/**
 * Lấy danh sách thành viên có role @SP Ticket (không tính bot) và chọn ngẫu nhiên 1 người.
 */
export async function pickRandomServiceStaff(guild, client = null) {
  if (!guild) return null;
  const roleId = SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID;
  const candidateIds = new Set();

  // 1. Lấy từ role cache / GuildMemberManager cache
  const cachedRole =
    guild.roles?.cache?.get?.(roleId) ||
    (typeof guild.roles?.fetch === 'function' ? await guild.roles.fetch(roleId).catch(() => null) : null);

  if (cachedRole?.members?.values) {
    for (const member of cachedRole.members.values()) {
      if (member?.id && !member.user?.bot) {
        candidateIds.add(String(member.id));
      }
    }
  }

  if (guild.members?.cache?.values) {
    for (const member of guild.members.cache.values()) {
      if (member?.id && !member.user?.bot && memberHasRole(member, roleId)) {
        candidateIds.add(String(member.id));
      }
    }
  }

  // 2. Lấy qua REST GET /guilds/{id}/members để tránh lệ thuộc MemberCache limit 10 (không phình RAM)
  const activeRest = client?.rest || guild.client?.rest;
  if (activeRest && typeof activeRest.get === 'function') {
    try {
      let after = '0';
      for (let page = 0; page < 3; page += 1) {
        const query = new URLSearchParams({ limit: '1000', after });
        const rawMembers = await activeRest.get(Routes.guildMembers(guild.id), { query });
        if (!Array.isArray(rawMembers) || rawMembers.length === 0) {
          break;
        }
        for (const raw of rawMembers) {
          const uid = raw?.user?.id;
          if (uid && !raw.user?.bot && Array.isArray(raw.roles) && raw.roles.includes(roleId)) {
            candidateIds.add(String(uid));
          }
        }
        if (rawMembers.length < 1000) {
          break;
        }
        const lastId = rawMembers[rawMembers.length - 1]?.user?.id;
        if (!lastId || lastId === after) break;
        after = lastId;
      }
    } catch (err) {
      logger.debug('[ServiceTicket] Không thể tải member qua REST (dùng cache fallback):', err?.message || err);
    }
  }

  // 3. Fallback từ DB cache các staff đã tương tác trước đó
  if (candidateIds.size === 0) {
    const storedIds = await getDatabaseValue(client || guild.client, getServiceTicketStaffCacheKey(guild.id), []);
    if (Array.isArray(storedIds)) {
      for (const uid of storedIds) {
        if (!uid) continue;
        if (typeof guild.members?.fetch === 'function') {
          const fetched = await guild.members.fetch(uid).catch(() => null);
          if (fetched && !fetched.user?.bot && memberHasRole(fetched, roleId)) {
            candidateIds.add(String(fetched.id));
          }
        } else {
          candidateIds.add(String(uid));
        }
      }
    }
  } else {
    // Cập nhật lại cache staff id vào DB
    const snapshot = [...candidateIds].slice(0, 50);
    await setDatabaseValue(client || guild.client, getServiceTicketStaffCacheKey(guild.id), snapshot).catch(() => {});
  }

  const list = [...candidateIds];
  if (list.length === 0) {
    return null;
  }

  const pickedId = list[Math.floor(Math.random() * list.length)];
  return pickedId;
}

/**
 * Đếm số ticket dịch vụ đang mở của 1 user trong server (tối đa 2).
 */
export async function listAllServiceTicketsInGuild(client, guildId) {
  if (!guildId) return [];
  const prefix = `guild:${guildId}:ticket:`;
  const keys = await listDatabaseKeys(client, prefix);
  const tickets = [];

  for (const key of keys) {
    const data = await getDatabaseValue(client, key, null);
    if (data && data.ticketSystem === 'service') {
      tickets.push({
        key,
        ...data,
      });
    }
  }

  return tickets;
}

async function resolveExistingGuildChannel(guild, channelId) {
  if (!guild || !channelId) return null;
  const cached = guild.channels?.cache?.get?.(channelId);
  if (cached) return cached;
  if (typeof guild.channels?.fetch === 'function') {
    return await guild.channels.fetch(channelId).catch(() => null);
  }
  return null;
}

export async function countOpenServiceTicketsForUser(client, guild, userId) {
  if (!guild || !userId) return 0;
  const uid = String(userId);
  const allTickets = await listAllServiceTicketsInGuild(client, guild.id);
  const openChannelIds = new Set();

  for (const ticket of allTickets) {
    if (!ticket?.channelId) continue;
    const ch = await resolveExistingGuildChannel(guild, ticket.channelId);
    if (!ch) {
      // Dọn record mồ côi nếu kênh đã bị xóa tay trên Discord
      await deleteDatabaseValue(client, getTicketStorageKey(guild.id, ticket.channelId)).catch(() => {});
      continue;
    }
    if (String(ticket.userId) === uid && ticket.status !== 'closed') {
      openChannelIds.add(String(ticket.channelId));
    }
  }

  // Kiểm tra thêm cache kênh live trong danh mục đề phòng DB chưa kịp ghi
  if (guild.channels?.cache?.values) {
    for (const ch of guild.channels.cache.values()) {
      if (
        ch?.parentId === SERVICE_TICKET_IDS.CATEGORY_ID &&
        isServiceTicketChannelName(ch.name) &&
        String(ch.topic || '').includes(`CustomerID:${uid}`)
      ) {
        const record = allTickets.find((t) => String(t.channelId) === String(ch.id));
        if (!record || record.status !== 'closed') {
          openChannelIds.add(String(ch.id));
        }
      }
    }
  }

  return openChannelIds.size;
}

/**
 * Lấy ticket dịch vụ phù hợp nhất cho user (ưu tiên kênh hiện tại nếu đang ở trong ticket của user).
 */
export async function findLatestServiceTicketForUser(client, guild, userId, preferredChannel = null, { requireAwaitingFeedback = false } = {}) {
  if (!guild || !userId) return null;
  const uid = String(userId);

  if (preferredChannel && isServiceTicketChannel(preferredChannel)) {
    const currentRecord = await getServiceTicketRecord(client, guild.id, preferredChannel.id);
    if (currentRecord && String(currentRecord.userId) === uid) {
      if (!requireAwaitingFeedback || currentRecord.awaitingFeedback || currentRecord.status === 'awaiting_feedback') {
        return { channel: preferredChannel, record: currentRecord };
      }
    }
  }

  const allTickets = await listAllServiceTicketsInGuild(client, guild.id);
  const candidates = allTickets
    .filter((t) => {
      if (String(t.userId) !== uid || t.status === 'closed') return false;
      if (requireAwaitingFeedback) {
        return Boolean(t.awaitingFeedback || t.status === 'awaiting_feedback');
      }
      return true;
    })
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

  for (const candidate of candidates) {
    const ch = await resolveExistingGuildChannel(guild, candidate.channelId);
    if (ch) {
      return { channel: ch, record: candidate };
    }
    await deleteDatabaseValue(client, getTicketStorageKey(guild.id, candidate.channelId)).catch(() => {});
  }

  return null;
}

/**
 * Tăng số thứ tự ticket ĐẾM RIÊNG cho từng dịch vụ (codebot / nitrodecor / chinese / khac / hotro).
 */
export async function nextServiceTicketNumber(client, guild, serviceKey) {
  const safeKey = String(serviceKey || 'khac').toLowerCase();
  const guildId = guild?.id;
  if (!guildId) {
    throw new Error('Không xác định được server để cấp số thứ tự ticket.');
  }

  const lockKey = `${guildId}:${safeKey}`;
  const prev = serviceCounterQueues.get(lockKey) || Promise.resolve();

  const task = prev.then(async () => {
    const storageKey = getServiceTicketCounterStorageKey(guildId);
    const counters = { ...(await getDatabaseValue(client, storageKey, {}) || {}) };
    let maxExisting = Number(counters[safeKey]) || 0;

    // Đối chiếu với các kênh hiện có để không bao giờ bị trùng số nếu DB mới khôi phục
    const pattern = new RegExp(`^${SERVICE_TICKET_CHANNEL_PREFIX}ticket-${safeKey}-(\\d+)$`, 'i');
    if (guild.channels?.cache?.values) {
      for (const ch of guild.channels.cache.values()) {
        const match = String(ch?.name || '').match(pattern);
        if (match) {
          maxExisting = Math.max(maxExisting, Number.parseInt(match[1], 10) || 0);
        }
      }
    }

    const allTickets = await listAllServiceTicketsInGuild(client, guildId);
    for (const t of allTickets) {
      if (String(t.serviceKey || '').toLowerCase() === safeKey && Number.isFinite(Number(t.number))) {
        maxExisting = Math.max(maxExisting, Number(t.number));
      }
    }

    const nextNumber = maxExisting + 1;
    counters[safeKey] = nextNumber;
    const saved = await setDatabaseValue(client, storageKey, counters);
    if (!saved) {
      throw new Error('Không thể lưu số thứ tự ticket dịch vụ vào database.');
    }
    return nextNumber;
  });

  serviceCounterQueues.set(lockKey, task.catch(() => {}));
  return task;
}

/**
 * =========================================================
 * BUILDERS — GIAO DIỆN COMPONENTS V2 & EMBED LOG
 * =========================================================
 */

/**
 * Build 3 payload Components V2 cho lệnh &dichvu (TOS & Quy định giao dịch)
 */
export function buildServiceTosPayloadsV2() {
  const card1 = {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# ${SERVICE_TOS_EMOJIS.HEADER_L} **ĐIỀU KHOẢN DỊCH VỤ (TOS) & QUY ĐỊNH GIAO DỊCH** ${SERVICE_TOS_EMOJIS.HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              'Vui lòng đọc kỹ toàn bộ quy định dưới đây trước khi mở ticket đặt hàng hoặc đăng ký dịch vụ. Khi bạn tiến hành thanh toán, điều đó đồng nghĩa với việc bạn đã đọc, hiểu và đồng ý với tất cả các điều khoản này.',
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '# I. QUY ĐỊNH CHUNG & THANH TOÁN',
              `- Giao dịch chính thức: Mọi trao đổi, báo giá và thanh toán chỉ thực hiện duy nhất qua hệ thống ticket tại <#${SERVICE_TOS_CHANNEL_IDS.TICKET_CHANNEL_ID}>. Không bảo hộ các giao dịch tự ý thực hiện qua tin nhắn riêng (DMs) hoặc bên ngoài server.`,
              '- Hình thức thanh toán: Chuyển khoản ngân hàng / Ví điện tử theo đúng thông tin được cung cấp trong ticket. Server không nhận thanh toán bằng card hoặc các hình thức thanh toán khác.',
              '- Chính sách hoàn tiền chung: Không hỗ trợ hoàn tiền (refund) dưới mọi hình thức nếu khách hàng tự ý hủy ngang sau khi đơn hàng đã được xử lý, bot đã bắt đầu được code hoặc lớp học đã chốt và chuyển khoản (trừ các trường hợp có quy định riêng ở từng dịch vụ bên dưới).',
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '# II. ĐIỀU KHOẢN CHI TIẾT TỪNG DỊCH VỤ',
              `${SERVICE_TOS_EMOJIS.BULLET_SERVICE} **1. Dịch vụ Vibe Code Bot Discord theo yêu cầu**`,
              '- Đặt cọc & Thanh toán: Thanh toán trước 50% giá trị đơn hàng để bắt đầu tiến hành code; thanh toán 50% còn lại sau khi test tính năng hoàn tất và trước khi bàn giao chính thức.',
              '- Phạm vi tính năng: Chỉ thực hiện đúng danh sách tính năng đã chốt ban đầu trong ticket (không nhận lập trình các tính năng phát nhạc / music). Mọi yêu cầu phát sinh thêm ngoài thỏa thuận ban đầu sẽ được tính phụ phí tùy mức độ (tối thiểu 50k/tính năng).',
              '- Bản quyền sở hữu: Toàn bộ mã nguồn (source code) và thiết kế giao diện thuộc bản quyền độc quyền của dev. Khách hàng không được tự ý sao chép, chỉnh sửa để thương mại hóa hoặc bán lại cho bên thứ ba khi chưa có sự đồng ý.',
              '- Bảo hành kỹ thuật: Hỗ trợ sửa lỗi (bug) phát sinh từ phía code trong quá trình vận hành, hỗ trợ fix khi khách hàng thay đổi cấu trúc quyền/kênh trên server dẫn đến lỗi. Không chịu trách nhiệm bảo hành nếu khách hàng tự ý can thiệp sửa code.',
            ].join('\n'),
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };

  const card2 = {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `## ${SERVICE_TOS_EMOJIS.BULLET_SERVICE} **2. Dịch vụ Mua hộ Discord Nitro & Decoration (Cozy Store)**`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '> Lưu ý vai trò trung gian: Mình chỉ đóng vai trò mua hộ trung gian, do đó, mọi quy định về thời gian, bảo hành và chính sách refund đều được thực hiện theo điều khoản của bên Store bán gốc. Chi tiết xem ở đây:',
              '',
              `${SERVICE_TOS_EMOJIS.SUB_SECTION} **Quy định Mua hàng**`,
              '- Thanh toán: Thanh toán 100% giá trị đơn hàng trước khi mình tiến hành đặt đơn với Store.',
              '- Thời gian xử lý: Tất cả đơn hàng cam kết hoàn thành trong vòng 48 giờ. Đối với đơn preorder như decor gift, thời gian có thể lâu hơn (tối đa 7 ngày). Vui lòng hạn chế hối/giục đơn, mình sẽ báo ngay cho bạn khi Store báo hoàn tất (done).',
              '- Bảo mật tài khoản (Đối với gói cần Login - Nitro): Khách hàng vui lòng đổi **mật khẩu và mã dự phòng** ngay lập tức sau khi mình báo done đơn (kỹ thuật viên bên Store sẽ Logout ngay khi xong). Bên Store và mình không chịu trách nhiệm tranh chấp sau khi done đơn nếu bạn không đổi thông tin.',
              '- Đối với dạng Decor Gift Link: Link sẽ được gửi trực tiếp qua dm của bạn. Bạn cần bấm nhận ngay khi được giao link. Store KHÔNG BẢO HÀNH LINK sau khi đã gửi đi (vì toàn bộ link đều đã được kiểm tra hoạt động 100% trước khi bàn giao).',
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${SERVICE_TOS_EMOJIS.SUB_SECTION} **Chính sách Refund**`,
              '- Nếu yêu cầu hủy và hoàn tiền trước 48 giờ (khi đơn chưa hoàn tất), mức hoàn tiền tối đa chỉ là 50% giá trị đơn hàng.',
              '- Hàng đặt trước: Không hỗ trợ hoàn tiền trong thời gian chờ (chỉ hoàn tiền 100% nếu thời gian pre-order kéo dài quá lâu theo xác nhận của Store).',
              '- Sản phẩm gặp lỗi: Nếu sản phẩm phát sinh lỗi kỹ thuật hoặc không đúng mô tả, Store sẽ ưu tiên đổi mới (không hoàn tiền).',
              '- Từ chối hoàn tiền: Không hoàn tiền nếu lỗi không xuất phát từ phía mình hoặc Store gốc (tài khoản tự vi phạm chính sách Discord, chuyển khoản nhầm người nhận...)',
              '- Quy trình & Thời gian xử lý: Cần gửi bằng chứng giao dịch để đối soát. Store gốc xử lý hoàn tiền cố định 1 lần/tuần (Thứ 7 hoặc Chủ Nhật).',
            ].join('\n'),
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };

  const card3 = {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `## ${SERVICE_TOS_EMOJIS.BULLET_SERVICE} **3. Dịch vụ Dạy kèm Tiếng Trung 1:1**`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '- Hình thức & Học phí: Lớp học áp dụng hình thức 1 kèm 1. Học viên thanh toán 100% học phí của khóa/gói buổi học đã đăng ký trước khi bắt đầu buổi học đầu tiên.',
              '- Dời lịch & Học bù: Vì là lịch dạy riêng 1:1, nếu có việc bận đột xuất, học viên vui lòng báo trước ít nhất 3–4 tiếng để được sắp xếp lịch học bù. Trường hợp báo sát giờ hoặc tự ý vắng mặt không lý do sẽ tính là đã hoàn thành buổi học đó (trừ trường hợp bất khả kháng).',
              '- Bảo lưu & Hủy khóa: Hỗ trợ bảo lưu lịch học nếu có lý do chính đáng và báo trước; không hoàn lại học phí nếu học viên tự ý bỏ ngang giữa chừng sau khi khóa học đã bắt đầu.',
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '# III. LƯU Ý KHÁC',
              `- **KHÔNG XỬ LÝ / HỖ TRỢ CHO BẤT KÌ TRƯỜNG HỢP NÀO KHÔNG FEEDBACK TRONG 24 GIỜ SAU KHI MUA HÀNG TẠI <#${SERVICE_TOS_CHANNEL_IDS.FEEDBACK_CHANNEL_ID}>!**`,
              '- Server có quyền từ chối phục vụ đối với những trường hợp thiếu tôn trọng, có hành vi gian lận hoặc cố tình gây rối trong quá trình giao dịch.',
              '- Các điều khoản dịch vụ (TOS) có thể được cập nhật, bổ sung bất kỳ lúc nào để phù hợp với tình hình vận hành mà không cần thông báo trước.',
              '',
              `Cảm ơn bạn đã tôn trọng quy định và ủng hộ dịch vụ của mình! ${SERVICE_TOS_EMOJIS.HEART}`,
            ].join('\n'),
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };

  return [card1, card2, card3];
}

/**
 * 1. Giao diện Panel mở ticket tại <#1570346905928474624>
 */
export function buildServicePanelPayloadV2() {
  const E = SERVICE_TICKET_EMOJIS;
  const attachment = getServiceTicketImageAttachment();
  const imageUrl = attachment
    ? `attachment://${SERVICE_TICKET_BANNER_FILENAME}`
    : SERVICE_TICKET_BANNER_FALLBACK_URL;

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# ${E.HEADER_L} **TICKET ĐẶT HÀNG & DỊCH VỤ** ${E.HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${E.BULLET_SERVICE} **Các dịch vụ hiện có tại server:**`,
              `${E.NUM_1} Code Bot Discord (codebot) — Vibe code bot theo yêu cầu.`,
              `${E.NUM_2} Discord Nitro & Decor (nitrodecor) — Mua hộ trung gian uy tín.`,
              `${E.NUM_3} Lớp học Tiếng Trung 1:1 (chinese) — Học từ con số 0 tới giao tiếp / HSK.`,
              `${E.NUM_4} Dịch vụ khác (khac) — Trao đổi & báo giá theo nhu cầu riêng (sẽ update thêm sau).`,
              '',
              `${E.BANG} **Lưu ý trước khi mở ticket:**`,
              '- Vui lòng đọc kỹ Điều khoản dịch vụ (TOS) trước khi tạo đơn hàng.',
              `- Mỗi thành viên chỉ mở tối đa ${MAX_OPEN_SERVICE_TICKETS_PER_USER} ticket / lần.`,
              `- Khi bấm mở ticket, vui lòng chọn đúng nút **Mua Hàng** và nhập đúng từ khóa dịch vụ để bot phân loại và kết nối <@&${SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID}> hỗ trợ nhanh nhất ạ!`,
              '- Trong trường hợp cần giải đáp thắc mắc / hỗ trợ / bảo hành, vui lòng chọn nút "Hỗ Trợ".',
            ].join('\n'),
          },
          {
            type: 12,
            items: [
              {
                media: {
                  url: imageUrl,
                },
                description: 'Usagi Ticket Banner',
              },
            ],
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: ButtonStyle.Link,
                label: 'Điều Khoản Dịch Vụ',
                url: SERVICE_TICKET_IDS.TOS_MESSAGE_URL,
              },
              {
                type: 2,
                style: ButtonStyle.Secondary,
                custom_id: 'st_open_buy',
                label: 'Mua Hàng',
                emoji: E.BUTTON_BUY,
              },
              {
                type: 2,
                style: ButtonStyle.Secondary,
                custom_id: 'st_open_support',
                label: 'Hỗ Trợ',
                emoji: E.BUTTON_SUPPORT,
              },
            ],
          },
        ],
      },
    ],
    ...(attachment ? { files: [attachment] } : {}),
    allowedMentions: { parse: [] },
  };
}

/**
 * 2a. Bảng chào mừng bên trong ticket lúc mới mở (không có nút đóng hay ghim)
 */
export function buildServiceWelcomePayloadV2({
  userId,
  ticketType = 'buy',
  serviceInput = '',
  createdTs = Math.floor(Date.now() / 1000),
}) {
  const E = SERVICE_TICKET_EMOJIS;
  const infoLine =
    ticketType === 'support'
      ? `- Hỗ trợ: ${serviceInput}`
      : `- Dịch vụ đã chọn: ${serviceInput}`;

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# ${E.HEADER_L} **CHÀO MỪNG ĐẾN VỚI TICKET DỊCH VỤ** ${E.HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `Xin chào <@${userId}>, cảm ơn bạn đã lựa chọn dịch vụ của server! ${E.HEART}`,
              '',
              `${E.BULLET_SERVICE} **Thông tin ticket:**`,
              `- Khách hàng: <@${userId}>`,
              infoLine,
              '- Trạng thái: Đang chờ Support Ticket phản hồi.',
              `- Thời gian tạo: <t:${createdTs}:F> (<t:${createdTs}:R>)`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              `${E.BANG} Bạn vui lòng mô tả chi tiết yêu cầu / nhu cầu của mình tại đây để bên mình báo giá và tư vấn cụ thể nhé. Khi chốt đơn và thanh toán tức là bạn đã đồng ý với toàn bộ TOS của server!`,
          },
        ],
      },
    ],
    allowedMentions: { users: [String(userId)] },
  };
}

/**
 * 2b. Tin nhắn thường tag random 1 @SP Ticket ngay sau bảng chào mừng
 */
export function buildAssignedStaffMessage({ staffId = null }) {
  const E = SERVICE_TICKET_EMOJIS;
  if (staffId) {
    return {
      content: `${E.BULLET_SERVICE} <@${staffId}> sẽ là hỗ trợ chính cho ticket này. Xin bạn vui lòng chờ trong giây lát, <@${staffId}> sẽ phản hồi ngay ạ!`,
      allowedMentions: { users: [String(staffId)] },
    };
  }

  return {
    content: `${E.BULLET_SERVICE} <@&${SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID}> sẽ là hỗ trợ chính cho ticket này. Xin bạn vui lòng chờ trong giây lát, <@&${SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID}> sẽ phản hồi ngay ạ!`,
    allowedMentions: { roles: [SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID] },
  };
}

/**
 * 3. Bảng &nhacfb nhắc member gửi feedback
 */
export function buildFeedbackReminderPayloadV2({ guildId, userId }) {
  const E = SERVICE_TICKET_EMOJIS;
  const feedbackUrl = `https://discord.com/channels/${guildId}/${SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID}`;

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# ${E.HEADER_L} **NHẮC NHỞ GỬI FEEDBACK ĐƠN HÀNG** ${E.HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `Xin chào <@${userId}>, đơn hàng của bạn đã được bàn giao hoàn tất! ${E.HEART}`,
              '',
              `${E.BULLET_SERVICE} **Hướng dẫn xác nhận & kích hoạt bảo hành:**`,
              `- Vui lòng truy cập kênh <#${SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID}> và gửi tin nhắn feedback theo đúng cú pháp: **+1 legit** (có thể kèm cảm nhận/ảnh của bạn tùy ý).`,
              `- Sau khi bot thả react ${E.FEEDBACK_REACT} xác nhận ở kênh feedback, hệ thống sẽ tự động mở nút Xóa ticket ngay tại đây cho bạn!`,
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${E.BANG} **Lưu ý:**`,
              '**KHÔNG FEEDBACK = KHÔNG BẢO HÀNH** theo quy định của server. Xin cảm ơn bạn đã tin tưởng và ủng hộ!',
            ].join('\n'),
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: ButtonStyle.Link,
                label: 'Đi Tới Kênh Feedback',
                url: feedbackUrl,
              },
            ],
          },
        ],
      },
    ],
    allowedMentions: { users: [String(userId)] },
  };
}

/**
 * 4. Thông báo đã nhận feedback + nút Xóa ticket
 */
export function buildFeedbackReceivedPayloadV2({ userId }) {
  const E = SERVICE_TICKET_EMOJIS;

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# ${E.HEADER_L} **ĐÃ NHẬN FEEDBACK THÀNH CÔNG** ${E.HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${E.BULLET_SERVICE} Cảm ơn <@${userId}> đã feedback cho dịch vụ mua hàng của server! ${E.HEART}`,
              '- Feedback của bạn đã được hệ thống ghi nhận đầy đủ để áp dụng quyền lợi bảo hành.',
              '- Bạn có thể xóa ticket ngay bây giờ, bên dưới là nút xóa ticket.',
              '> Khi bấm xóa, bot sẽ gửi bản lưu lịch sử trò chuyện (Transcript) vào DM cho bạn để tiện đối chiếu về sau!',
            ].join('\n'),
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: ButtonStyle.Secondary,
                custom_id: 'st_delete:feedback',
                label: 'Xóa ticket',
              },
            ],
          },
        ],
      },
    ],
    allowedMentions: { users: [String(userId)] },
  };
}

export const FEEDBACK_STICKY_MARKER = 'Chân thành cảm ơn bạn đã sử dụng dịch vụ ở Serendipity!';

/**
 * Sticky Components V2 (không title) luôn nằm cuối kênh feedback 1570348805155594290
 */
export function buildFeedbackStickyPayloadV2() {
  const heart = SERVICE_TICKET_EMOJIS.STICKY_HEART;

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: [
              `${heart} Chân thành cảm ơn bạn đã sử dụng dịch vụ ở Serendipity!`,
              `${heart} Xin vui lòng gửi tin nhắn check legit theo cú pháp: +1 legit ...`,
              '> ... là thông tin thêm như món hàng / ảnh sản phẩm / .. có thể gửi hoặc không tùy ý bạn.',
            ].join('\n'),
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };
}

/**
 * 5. Giao diện đóng ticket (&close khi không mua)
 */
export function buildServiceClosedPayloadV2({
  executorId,
  closedTs = Math.floor(Date.now() / 1000),
}) {
  const E = SERVICE_TICKET_EMOJIS;

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# ${E.HEADER_L} **TICKET ĐÃ ĐƯỢC ĐÓNG** ${E.HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '- Trạng thái: Đã đóng (không phát sinh đơn hàng).',
              `- Người đóng: <@${executorId}>`,
              `- Thời gian đóng: <t:${closedTs}:F>`,
            ].join('\n'),
          },
          {
            type: 1,
            components: [
              {
                type: 2,
                style: ButtonStyle.Secondary,
                custom_id: 'st_delete:close',
                label: 'Xóa ticket',
              },
            ],
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };
}

/**
 * Giao diện DM giao hàng (/ib1, /ib2 Nitro/Decor, /ib3)
 */
export function buildDeliveryDmPayloadV2({
  variant,
  guildId,
  userId,
  ticketChannelId = null,
  assignedStaffId = null,
  link = null,
  timestamp = Math.floor(Date.now() / 1000),
}) {
  const E = SERVICE_TICKET_EMOJIS;
  const staffMention = assignedStaffId
    ? `<@${assignedStaffId}>`
    : `<@&${SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID}>`;

  let title = '';
  let bodyIntro = '';
  let notes = [];

  if (variant === 'bot') {
    title = `# ${E.HEADER_L} **ĐƠN HÀNG BOT DISCORD ĐÃ HOÀN THÀNH** ${E.HEADER_R}`;
    bodyIntro = [
      `Xin chào <@${userId}>, đơn hàng Vibe Code Bot Discord của bạn đã hoàn tất! ${E.HEART}`,
      '',
      `${E.BULLET_SERVICE} **Thông tin đơn hàng:**`,
      '- Dịch vụ: Vibe Code Bot Discord theo yêu cầu.',
      '- Trạng thái: Đã hoàn tất.',
      `- Thời gian: <t:${timestamp}:F>`,
    ].join('\n');
    notes = [
      `${E.BANG} **Lưu ý quan trọng:**`,
      `- Xin hãy kiểm tra kĩ và nếu có thắc mắc xin hãy đề cập <@${SERVICE_TICKET_IDS.DEV_BOT_SUPPORT_USER_ID}> kịp thời để bọn mình hỗ trợ nhanh nhất có thể nhé!`,
      '- Hỗ trợ bảo hành kỹ thuật & sửa bug trong quá trình vận hành theo quy định đã đề cập ở **tos**.',
      `- Vui lòng vào kênh <#${SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID}> gửi feedback theo cú pháp **+1 legit** trong vòng 24 giờ để được hỗ trợ bảo hành đầy đủ.`,
      '- **KHÔNG FEEDBACK = KHÔNG BẢO HÀNH!**',
    ];
  } else if (variant === 'nitro') {
    title = `# ${E.HEADER_L} **ĐƠN HÀNG NITRO ĐÃ HOÀN THÀNH** ${E.HEADER_R}`;
    bodyIntro = [
      `Xin chào <@${userId}>, đơn hàng Discord Nitro của bạn đã hoàn tất! ${E.HEART}`,
      '',
      `${E.BULLET_SERVICE} **Thông tin đơn hàng:**`,
      '- Dịch vụ: Mua hộ Discord Nitro.',
      '- Trạng thái: Đã hoàn tất.',
      `- Thời gian: <t:${timestamp}:F>`,
    ].join('\n');
    notes = [
      `${E.BANG} **Lưu ý quan trọng:**`,
      '- Bạn vui lòng đổi **mật khẩu và mã dự phòng** ngay lập tức sau khi nhận thông báo này. Server sẽ không giải quyết bất kì vấn đề nào nếu bạn không đổi thông tin sớm!',
      `- Mọi thắc mắc hoặc bảo hành xin hãy kiểm tra kĩ và đề cập kịp thời ${staffMention} tại ticket.`,
      `- Vui lòng vào kênh <#${SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID}> gửi feedback theo cú pháp **+1 legit** trong vòng 24 giờ để được hỗ trợ bảo hành đầy đủ.`,
      '- **KHÔNG FEEDBACK = KHÔNG BẢO HÀNH!**',
    ];
  } else if (variant === 'decor') {
    title = `# ${E.HEADER_L} **ĐƠN HÀNG DECOR ĐÃ HOÀN THÀNH** ${E.HEADER_R}`;
    bodyIntro = [
      `Xin chào <@${userId}>, đơn hàng Discord Decoration của bạn đã hoàn tất! ${E.HEART}`,
      '',
      `${E.BULLET_SERVICE} **Thông tin đơn hàng:**`,
      '- Dịch vụ: Mua hộ Discord Decor.',
      `- Link decor: ${link || 'Đang cập nhật'}`,
      '- Trạng thái: Đã hoàn tất và gửi link.',
      `- Thời gian: <t:${timestamp}:F>`,
    ].join('\n');
    notes = [
      `${E.BANG} **Lưu ý quan trọng:**`,
      '- Bạn vui lòng bấm nhận link ngay khi nhận được tin nhắn này.',
      '- Quá thời gian nhận link bạn không bấm nhận, bọn mình sẽ không hỗ trợ mua lại.',
      `- Mọi thắc mắc hoặc bảo hành xin hãy kiểm tra kĩ và đề cập kịp thời ${staffMention} tại ticket.`,
      `- Vui lòng vào kênh <#${SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID}> gửi feedback theo cú pháp **+1 legit** trong vòng 24 giờ để được hỗ trợ bảo hành đầy đủ.`,
      '- **KHÔNG FEEDBACK = KHÔNG BẢO HÀNH!**',
    ];
  } else if (variant === 'chinese') {
    title = `# ${E.HEADER_L} **ĐĂNG KÝ KHÓA HỌC TIẾNG TRUNG THÀNH CÔNG** ${E.HEADER_R}`;
    bodyIntro = [
      `Xin chào <@${userId}>, đơn đăng ký khóa học Tiếng Trung 1:1 của bạn đã hoàn tất! ${E.HEART}`,
      '',
      `${E.BULLET_SERVICE} **Thông tin đơn hàng:**`,
      '- Dịch vụ: Lớp học Tiếng Trung 1:1.',
      '- Trạng thái: Đã xác nhận thanh toán & chốt lịch học.',
      `- Thời gian: <t:${timestamp}:F>`,
    ].join('\n');
    notes = [
      `${E.BANG} **Lưu ý quan trọng:**`,
      `- Bạn vui lòng kết bạn Zalo **${SERVICE_TICKET_IDS.CHINESE_TEACHER_ZALO}** để giáo viên trực tiếp trao đổi, gửi tài liệu và sắp xếp lịch học nhé!`,
      `- Nếu có thắc mắc hay cần hỗ trợ thêm, bạn vui lòng đề cập kịp thời ${staffMention} tại ticket.`,
      `- Vui lòng vào kênh <#${SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID}> gửi feedback theo cú pháp **+1 legit** trong vòng 24 giờ để được hỗ trợ đầy đủ nhé!`,
      '- **KHÔNG FEEDBACK = KHÔNG BẢO HÀNH!**',
    ];
  } else {
    throw new Error(`Unsupported delivery DM variant: ${variant}`);
  }

  const linkButtons = [
    {
      type: 2,
      style: ButtonStyle.Link,
      label: 'Kênh Feedback',
      url: `https://discord.com/channels/${guildId}/${SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID}`,
    },
  ];

  if (ticketChannelId) {
    linkButtons.push({
      type: 2,
      style: ButtonStyle.Link,
      label: 'Kênh Ticket',
      url: `https://discord.com/channels/${guildId}/${ticketChannelId}`,
    });
  }

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: title,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: bodyIntro,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: notes.join('\n'),
          },
          {
            type: 1,
            components: linkButtons,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: SERVICE_DM_FOOTER,
          },
        ],
      },
    ],
    allowedMentions: {
      users: [String(userId)],
    },
  };
}

/**
 * 6. Mẫu DM Transcript (gửi vào DM khách kèm file .html khi khách bấm Xóa ticket sau feedback)
 */
export function buildDmTranscriptPayloadV2({
  userId,
  channelName,
  serviceLabel,
  assignedStaffId = null,
  exportedTs = Math.floor(Date.now() / 1000),
  files = [],
}) {
  const E = SERVICE_TICKET_EMOJIS;
  const staffText = assignedStaffId ? `<@${assignedStaffId}>` : 'Support Ticket';

  const containerComponents = [
    {
      type: 10,
      content: `# ${E.HEADER_L} **LỊCH SỬ GIAO DỊCH (TRANSCRIPT)** ${E.HEADER_R}`,
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: [
        `Xin chào <@${userId}>, cảm ơn bạn đã hoàn tất giao dịch và gửi feedback cho server! ${E.HEART}`,
        '',
        `${E.BULLET_SERVICE} **Thông tin bản lưu ticket:**`,
        `- Ticket: #${channelName}`,
        `- Dịch vụ: ${serviceLabel}`,
        `- Hỗ trợ chính: ${staffText}`,
        `- Thời gian xuất transcript: <t:${exportedTs}:F>`,
      ].join('\n'),
    },
  ];

  for (const file of files) {
    const fileName = file?.name || file?.attachment?.name;
    if (fileName && containerComponents.length < 10) {
      containerComponents.push({
        type: 13,
        file: {
          url: `attachment://${fileName}`,
        },
      });
    }
  }

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: containerComponents,
      },
    ],
    ...(files.length > 0 ? { files } : {}),
    allowedMentions: { parse: [] },
  };
}

/**
 * Log Transcript vào kênh log admin <#1570357576770654289> theo mẫu repo -
 */
export function buildServiceLogTranscriptPayload({
  channelName,
  userId,
  executorId,
  ticketId,
  reason = null,
  exportedTs = Math.floor(Date.now() / 1000),
  files = [],
}) {
  const E = SERVICE_TICKET_EMOJIS;
  const displayName = String(channelName || ticketId || 'ticket').startsWith('#')
    ? String(channelName || ticketId)
    : `#${channelName || ticketId || 'ticket'}`;

  const lines = [
    `${E.LOG_BULLET} **Ticket:** ${displayName}`,
    `${E.LOG_BULLET} **Chủ ticket:** ${userId ? `<@${userId}>` : 'Unknown'}`,
    `${E.LOG_BULLET} **Thời gian xuất transcript:** <t:${exportedTs}:F>`,
    `${E.LOG_BULLET} **Deleted by:** ${executorId ? `<@${executorId}>` : 'Unknown'}`,
  ];

  if (reason) {
    lines.push(`${E.LOG_BULLET} **Lý do:** ${reason}`);
  }

  const embed = new EmbedBuilder()
    .setTitle('TICKET TRANSCRIPT')
    .setDescription(lines.join('\n'))
    .setColor(0xE9B5CE)
    .setFooter({ text: `Ticket ID: ${ticketId}` });

  return {
    embeds: [embed],
    ...(files.length > 0 ? { files } : {}),
  };
}

/**
 * =========================================================
 * NGHIỆP VỤ TẠO / ĐÓNG / FEEDBACK / XÓA TICKET DỊCH VỤ
 * =========================================================
 */

export async function createServiceTicketFromModal(
  interaction,
  client,
  { mode = 'buy', rawInput = '' } = {},
) {
  const guild = interaction.guild;
  const user = interaction.user;
  if (!guild || !user) {
    return { ok: false, errorMessage: '❌ Tính năng này chỉ hoạt động bên trong máy chủ.' };
  }

  const trimmedInput = String(rawInput || '').trim();
  if (!trimmedInput) {
    return { ok: false, errorMessage: '❌ Bạn chưa nhập nội dung. Vui lòng thử lại nhé!' };
  }

  let serviceKey = 'hotro';
  let serviceLabel = SERVICE_CATALOG.hotro.label;
  let ticketType = 'support';

  if (mode === 'buy') {
    const parsed = parseBuyServiceKeyword(trimmedInput);
    if (!parsed) {
      return {
        ok: false,
        errorMessage:
          '❌ Từ khóa dịch vụ chưa hợp lệ! Vui lòng nhập đúng 1 trong 4 từ khóa: **codebot**, **nitrodecor**, **chinese** hoặc **khác** (ví dụ: `chinese`).',
      };
    }
    serviceKey = parsed.key;
    serviceLabel = parsed.label;
    ticketType = 'buy';
  }

  return withUserCreationLock(user.id, async () => {
    const openCount = await countOpenServiceTicketsForUser(client, guild, user.id);
    if (openCount >= MAX_OPEN_SERVICE_TICKETS_PER_USER) {
      return {
        ok: false,
        errorMessage: `❌ Bạn đang mở **${openCount}/${MAX_OPEN_SERVICE_TICKETS_PER_USER}** ticket dịch vụ rồi ạ! Vui lòng hoàn tất hoặc đóng bớt ticket cũ trước khi mở thêm nhé.`,
      };
    }

    const ticketNumber = await nextServiceTicketNumber(client, guild, serviceKey);
    const channelName = buildServiceTicketChannelName(serviceKey, ticketNumber);
    const createdAt = Date.now();
    const createdTs = Math.floor(createdAt / 1000);

    const permissionOverwrites = [
      {
        id: guild.id,
        type: OverwriteType?.Role ?? 0,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: user.id,
        type: OverwriteType?.Member ?? 1,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
      {
        id: SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID,
        type: OverwriteType?.Role ?? 0,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
          PermissionFlagsBits.ManageMessages,
        ],
      },
      {
        id: client.user.id,
        type: OverwriteType?.Member ?? 1,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ManageChannels,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

    const category =
      guild.channels?.cache?.get?.(SERVICE_TICKET_IDS.CATEGORY_ID) ||
      (typeof guild.channels?.fetch === 'function'
        ? await guild.channels.fetch(SERVICE_TICKET_IDS.CATEGORY_ID).catch(() => null)
        : null);

    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildText,
      ...(category?.id ? { parent: category.id } : {}),
      topic: `ServiceTicket | CustomerID:${user.id} | Service:${serviceKey} | #${ticketNumber}`,
      permissionOverwrites,
    });

    const assignedStaffId = await pickRandomServiceStaff(guild, client);

    const ticketRecord = {
      ticketSystem: 'service',
      id: channel.id,
      channelId: channel.id,
      guildId: guild.id,
      userId: user.id,
      ticketType,
      serviceKey,
      serviceLabel,
      serviceInput: trimmedInput,
      number: ticketNumber,
      assignedStaffId,
      status: 'open',
      awaitingFeedback: false,
      createdAt,
    };

    await saveServiceTicketRecord(client, guild.id, channel.id, ticketRecord);

    // 1. Gửi bảng chào mừng bên trong ticket (không có nút đóng hay ghim)
    const welcomePayload = buildServiceWelcomePayloadV2({
      userId: user.id,
      ticketType,
      serviceInput: trimmedInput,
      createdTs,
    });
    await channel.send(welcomePayload);

    // 2. Gửi tin nhắn thường tag random 1 @SP Ticket hỗ trợ chính
    const staffNoticePayload = buildAssignedStaffMessage({ staffId: assignedStaffId });
    await channel.send(staffNoticePayload);

    logger.info('[ServiceTicket] Đã tạo ticket dịch vụ mới', {
      guildId: guild.id,
      channelId: channel.id,
      channelName: channel.name,
      userId: user.id,
      serviceKey,
      ticketNumber,
      assignedStaffId,
    });

    return {
      ok: true,
      channel,
      ticketRecord,
    };
  });
}

/**
 * Đóng ticket khi KHÔNG MUA (&close):
 * - Ẩn kênh với người mở ticket
 * - Không rating, không transcript khi đóng, tuyệt đối không nhắn DM cho khách
 */
export async function closeServiceTicket({
  channel,
  executor,
  client,
}) {
  if (!channel || !channel.guild) {
    return { ok: false, errorMessage: '❌ Không xác định được kênh ticket.' };
  }

  let ticket = await getServiceTicketRecord(client, channel.guild.id, channel.id);
  if (!ticket) {
    // Fallback parse từ topic nếu DB chưa có record
    const topicMatch = String(channel.topic || '').match(/CustomerID:(\d+)/);
    ticket = {
      ticketSystem: 'service',
      id: channel.id,
      channelId: channel.id,
      guildId: channel.guild.id,
      userId: topicMatch ? topicMatch[1] : null,
      ticketType: String(channel.name || '').includes('-hotro-') ? 'support' : 'buy',
      serviceKey: 'khac',
      serviceLabel: 'Dịch vụ',
      status: 'open',
      createdAt: channel.createdTimestamp || Date.now(),
    };
  }

  if (ticket.userId) {
    await channel.permissionOverwrites
      .edit(ticket.userId, { ViewChannel: false })
      .catch((err) => {
        logger.warn('[ServiceTicket] Không thể ẩn quyền ViewChannel của khách:', err?.message || err);
      });
  }

  const closedAt = Date.now();
  const closedTs = Math.floor(closedAt / 1000);

  await saveServiceTicketRecord(client, channel.guild.id, channel.id, {
    ...ticket,
    status: 'closed',
    closeType: 'no_buy',
    closedAt,
    closedBy: executor?.id || null,
  });

  const closedPayload = buildServiceClosedPayloadV2({
    executorId: executor?.id || client?.user?.id,
    closedTs,
  });
  await channel.send(closedPayload);

  logger.info('[ServiceTicket] Đã đóng ticket không mua (&close)', {
    guildId: channel.guild.id,
    channelId: channel.id,
    executorId: executor?.id,
    userId: ticket.userId,
  });

  return { ok: true, ticket };
}

/**
 * Xóa kênh ticket:
 * - Nhánh feedback (sendDmTranscript = true): gửi DM Transcript cho khách + Log Transcript về kênh log 1570357576770654289
 * - Nhánh đóng không mua / /clear (sendDmTranscript = false): CHỈ gửi Log Transcript về kênh log 1570357576770654289, TUYỆT ĐỐI KHÔNG gửi DM cho khách
 */
export async function deleteServiceTicket({
  channel,
  executor,
  client,
  sendDmTranscript = false,
  reason = null,
  deleteDelayMs = 2500,
}) {
  if (!channel || !channel.guild) {
    return { ok: false, errorMessage: '❌ Không xác định được kênh ticket.' };
  }

  const channelId = String(channel.id);
  if (deletingServiceTickets.has(channelId)) {
    return { ok: false, alreadyDeleting: true };
  }
  deletingServiceTickets.add(channelId);

  try {
    const guild = channel.guild;
    const stored = await getServiceTicketRecord(client, guild.id, channel.id);
    const topicMatch = String(channel.topic || '').match(/CustomerID:(\d+)/);

    const ticket = stored || {
      ticketSystem: 'service',
      id: channel.id,
      channelId: channel.id,
      guildId: guild.id,
      userId: topicMatch ? topicMatch[1] : null,
      serviceKey: 'khac',
      serviceLabel: 'Dịch vụ',
      assignedStaffId: null,
      createdAt: channel.createdTimestamp || Date.now(),
    };

    const exportedTs = Math.floor(Date.now() / 1000);
    const transcriptFiles = await generateTranscriptFiles(channel, {
      ...ticket,
      closedAt: ticket.closedAt || Date.now(),
      closeReason: reason || ticket.closeReason || 'Hoàn tất ticket dịch vụ',
    });

    // 1. Chỉ gửi DM Transcript nếu là nhánh sau feedback
    let dmSent = false;
    if (sendDmTranscript && ticket.userId) {
      try {
        const targetUser =
          (typeof client?.users?.fetch === 'function'
            ? await client.users.fetch(ticket.userId).catch(() => null)
            : null) ||
          guild.members?.cache?.get?.(ticket.userId)?.user ||
          null;

        if (targetUser && typeof targetUser.send === 'function') {
          const dmFiles = await generateTranscriptFiles(channel, {
            ...ticket,
            closedAt: ticket.closedAt || Date.now(),
            closeReason: reason || 'Khách hàng xóa ticket sau feedback',
          });
          const dmPayload = buildDmTranscriptPayloadV2({
            userId: ticket.userId,
            channelName: channel.name,
            serviceLabel: ticket.serviceLabel || ticket.serviceInput || 'Dịch vụ',
            assignedStaffId: ticket.assignedStaffId,
            exportedTs,
            files: dmFiles,
          });
          await targetUser.send(dmPayload);
          dmSent = true;
        }
      } catch (dmErr) {
        logger.warn('[ServiceTicket] Không thể gửi DM Transcript cho khách:', {
          userId: ticket.userId,
          error: dmErr?.message || dmErr,
        });
      }
    }

    // 2. Luôn gửi Log Transcript theo mẫu repo - vào kênh log admin 1570357576770654289
    let logSent = false;
    try {
      const logChannel =
        guild.channels?.cache?.get?.(SERVICE_TICKET_IDS.LOG_CHANNEL_ID) ||
        (typeof client?.channels?.fetch === 'function'
          ? await client.channels.fetch(SERVICE_TICKET_IDS.LOG_CHANNEL_ID).catch(() => null)
          : null);

      if (logChannel && typeof logChannel.send === 'function') {
        const logPayload = buildServiceLogTranscriptPayload({
          channelName: channel.name,
          userId: ticket.userId,
          executorId: executor?.id,
          ticketId: ticket.id || channel.id,
          reason,
          exportedTs,
          files: transcriptFiles,
        });
        await logChannel.send(logPayload);
        logSent = true;
      }
    } catch (logErr) {
      logger.error('[ServiceTicket] Lỗi gửi Log Transcript:', logErr);
    }

    // 3. Xóa record DB
    await deleteDatabaseValue(client, getTicketStorageKey(guild.id, channel.id)).catch(() => {});

    // 4. Đợi nhẹ rồi xóa kênh
    if (deleteDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, deleteDelayMs));
    }

    await channel.delete(`Service ticket deleted by ${executor?.tag || executor?.id || 'system'}`).catch((delErr) => {
      logger.error('[ServiceTicket] Không thể xóa kênh ticket:', delErr);
    });

    return {
      ok: true,
      dmSent,
      logSent,
    };
  } finally {
    deletingServiceTickets.delete(channelId);
  }
}

/**
 * Gửi thông báo nhắc cú pháp +1 legit dạng Components V2 xuống cuối kênh feedback
 * rồi xóa thông báo sticky cũ bị trùng lặp của bot (không bao giờ xóa tin nhắn member).
 */
export async function refreshFeedbackStickyMessage(channel, client) {
  if (!channel || !channel.guild || typeof channel.send !== 'function') {
    return null;
  }

  const guildId = channel.guild.id;
  const queueKey = `${guildId}:${channel.id}`;
  const prev = feedbackStickyQueues.get(queueKey) || Promise.resolve();

  const task = prev.then(async () => {
    const oldMessageIds = new Set();

    const cachedId = feedbackStickyMessageIds.get(channel.id);
    if (cachedId) {
      oldMessageIds.add(String(cachedId));
    }

    const storageKey = getFeedbackStickyStorageKey(guildId);
    const dbSavedId = await getDatabaseValue(client, storageKey, null).catch(() => null);
    if (dbSavedId) {
      oldMessageIds.add(String(dbSavedId));
    }

    // Quét tối đa 20 tin nhắn gần nhất để dọn sạch sticky cũ của bot kể cả sau khi restart
    if (typeof channel.messages?.fetch === 'function') {
      const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
      if (recent?.values) {
        const botId = client?.user?.id || channel.client?.user?.id;
        for (const msg of recent.values()) {
          if (botId && String(msg.author?.id) !== String(botId)) {
            continue;
          }
          let serialized = '';
          try {
            serialized = `${msg.content || ''}\n${JSON.stringify(msg.components ?? [])}`;
          } catch {
            serialized = String(msg.content || '');
          }
          if (serialized.includes(FEEDBACK_STICKY_MARKER)) {
            oldMessageIds.add(String(msg.id));
          }
        }
      }
    }

    // 1. Gửi thông báo sticky mới ngay sau tin nhắn của member
    const sentMsg = await channel.send(buildFeedbackStickyPayloadV2());

    // 2. Xóa thông báo sticky cũ bị trùng lặp của bot (không động vào tin nhắn mới vừa gửi)
    for (const oldId of oldMessageIds) {
      if (sentMsg?.id && String(oldId) === String(sentMsg.id)) {
        continue;
      }
      if (typeof channel.messages?.delete === 'function') {
        await channel.messages.delete(oldId).catch(() => {});
      } else {
        const oldMsg = channel.messages?.cache?.get?.(oldId);
        if (oldMsg && typeof oldMsg.delete === 'function') {
          await oldMsg.delete().catch(() => {});
        }
      }
    }

    if (sentMsg?.id) {
      feedbackStickyMessageIds.set(channel.id, String(sentMsg.id));
      await setDatabaseValue(client, storageKey, String(sentMsg.id)).catch(() => {});
    }

    return sentMsg || null;
  });

  feedbackStickyQueues.set(
    queueKey,
    task.catch(() => {}).finally(() => {
      if (feedbackStickyQueues.get(queueKey) === task) {
        feedbackStickyQueues.delete(queueKey);
      }
    }),
  );

  return task;
}

/**
 * Lắng nghe tin nhắn chứa "+1 legit" tại kênh feedback 1570348805155594290
 */
export async function handleServiceTicketFeedbackMessage(message, client) {
  if (!message?.guild || message.author?.bot) return false;
  if (String(message.channel?.id) !== SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID) {
    return false;
  }

  const content = String(message.content || '').trim();
  if (!/(?:^|\s)\+1\s*legit(?=$|[\s\W])/i.test(content)) {
    return false;
  }

  // 1. Auto thả react emoji xác nhận lên tin nhắn feedback của member
  await message.react(SERVICE_TICKET_EMOJIS.FEEDBACK_REACT).catch((err) => {
    logger.warn('[ServiceTicket] Không thể auto react feedback:', err?.message || err);
  });

  // 2. Gửi thông báo sticky Components V2 không title ở cuối kênh và xóa thông báo cũ của bot
  await refreshFeedbackStickyMessage(message.channel, client).catch((err) => {
    logger.warn('[ServiceTicket] Không thể làm mới thông báo sticky kênh feedback:', err?.message || err);
  });

  const allTickets = await listAllServiceTicketsInGuild(client, message.guild.id);
  const matchingTickets = allTickets.filter(
    (t) =>
      String(t.userId) === String(message.author.id) &&
      t.status !== 'closed' &&
      (t.awaitingFeedback === true || t.status === 'awaiting_feedback'),
  );

  if (matchingTickets.length === 0) {
    return true;
  }

  for (const ticket of matchingTickets) {
    const ticketChannel = await resolveExistingGuildChannel(message.guild, ticket.channelId);
    if (!ticketChannel) {
      await deleteDatabaseValue(client, getTicketStorageKey(message.guild.id, ticket.channelId)).catch(() => {});
      continue;
    }

    await saveServiceTicketRecord(client, message.guild.id, ticket.channelId, {
      ...ticket,
      status: 'feedback_received',
      awaitingFeedback: false,
      feedbackReceivedAt: Date.now(),
      feedbackMessageId: message.id,
    });

    const payload = buildFeedbackReceivedPayloadV2({ userId: message.author.id });
    await ticketChannel.send(payload).catch((err) => {
      logger.error('[ServiceTicket] Không thể gửi thông báo nhận feedback vào ticket:', err);
    });
  }

  return true;
}

/**
 * Gửi thông báo giao hàng (/ib1, /ib2, /ib3) qua DM cho khách hàng
 */
export async function sendServiceDeliveryNotice({
  interaction,
  client,
  targetUser,
  variant,
  link = null,
}) {
  if (!isServiceTicketStaff(interaction.member, interaction.user.id, client)) {
    return interaction.reply({
      content: '❌ Chỉ `@SP Ticket` hoặc Admin mới có quyền sử dụng lệnh này!',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (!targetUser) {
    return interaction.reply({
      content: '❌ Vui lòng chọn người dùng cần gửi thông báo giao hàng!',
      flags: MessageFlags.Ephemeral,
    });
  }

  if (variant === 'decor' && !String(link || '').trim()) {
    return interaction.reply({
      content: '❌ Đối với sản phẩm **Decor**, vui lòng nhập kèm ô **link** để gửi cho khách nhé!',
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

  const found = await findLatestServiceTicketForUser(
    client,
    interaction.guild,
    targetUser.id,
    interaction.channel,
  );

  const ticketChannelId = found?.channel?.id || null;
  const assignedStaffId = found?.record?.assignedStaffId || interaction.user.id;

  const dmPayload = buildDeliveryDmPayloadV2({
    variant,
    guildId: interaction.guildId,
    userId: targetUser.id,
    ticketChannelId,
    assignedStaffId,
    link: link ? String(link).trim() : null,
  });

  try {
    await targetUser.send(dmPayload);
  } catch (dmErr) {
    logger.warn('[ServiceTicket] Không thể gửi DM thông báo giao hàng:', {
      variant,
      targetUserId: targetUser.id,
      error: dmErr?.message || dmErr,
    });
    return interaction
      .editReply({
        content: `❌ Không thể gửi DM cho <@${targetUser.id}> (có thể bạn ấy đã khóa nhận tin nhắn từ người lạ).`,
      })
      .catch(() => {});
  }

  // Đánh dấu ticket đang chờ feedback để hỗ trợ nếu khách vào kênh feedback nhắn +1 legit ngay
  if (found?.record && found.record.status !== 'closed' && found.record.status !== 'feedback_received') {
    await saveServiceTicketRecord(client, interaction.guildId, found.channel.id, {
      ...found.record,
      awaitingFeedback: true,
      status: 'awaiting_feedback',
      deliveredAt: Date.now(),
      deliveredBy: interaction.user.id,
      deliveryVariant: variant,
    });
  }

  return interaction
    .editReply({
      content: `✅ Đã gửi thông báo giao hàng qua DM cho <@${targetUser.id}> thành công!${ticketChannelId ? ` (Kênh ticket liên kết: <#${ticketChannelId}>)` : ''}`,
    })
    .catch(() => {});
}

/**
 * Xử lý tất cả trigger messageCreate liên quan đến Ticket Dịch Vụ:
 * - Lắng nghe feedback "+1 legit" ở kênh 1570348805155594290
 * - &dichvu: gửi 3 card TOS & tự xóa lệnh
 * - &panelticket: gửi bảng mở ticket & tự xóa lệnh (SP Ticket / Admin / Owner)
 * - &nhacfb: nhắc khách feedback trong ticket & tự xóa lệnh (SP Ticket / Admin / Owner)
 * - &close: đóng ticket không mua trong ticket dịch vụ & tự xóa lệnh (SP Ticket / Admin / Owner)
 * - &clear: xóa ticket dịch vụ & đẩy log (SP Ticket / Admin / Owner)
 */
export async function handleServiceTicketMessage(message, client) {
  if (!message || message.author?.bot || typeof message.content !== 'string') {
    return false;
  }

  const trimmed = message.content.trim();
  if (!trimmed) {
    return false;
  }

  // 1. &dichvu — gửi 3 embed Components V2 TOS & tự xóa lệnh
  if (/^[&!]dichvu$/i.test(trimmed)) {
    const payloads = buildServiceTosPayloadsV2();

    try {
      for (const payload of payloads) {
        await message.channel.send(payload);
      }
      await message.delete().catch(() => {});
    } catch (err) {
      logger.error('[ServiceTicket] Không thể gửi giao diện &dichvu:', err);
      await message.delete().catch(() => {});
      await message.channel
        .send('❌ Không thể hiển thị bảng Điều Khoản Dịch Vụ lúc này. Vui lòng thử lại sau.')
        .catch(() => {});
    }

    return true;
  }

  if (!message.guild) {
    return false;
  }

  // 2. Kênh feedback (+1 legit)
  if (String(message.channel?.id) === SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID) {
    const handledFeedback = await handleServiceTicketFeedbackMessage(message, client);
    if (handledFeedback) {
      return true;
    }
  }

  // Ghi nhận cache ID nếu người gửi có role @SP Ticket
  if (memberHasRole(message.member, SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID)) {
    rememberServiceStaffId(client, message.guild.id, message.author.id).catch(() => {});
  }

  // 3. &panelticket — gửi Panel mở ticket + ảnh banner & tự xóa lệnh
  if (/^[&!]panelticket(?:\s|$)/i.test(trimmed)) {
    if (!isServiceTicketStaff(message.member, message.author.id, client)) {
      await message.delete().catch(() => {});
      return true;
    }

    try {
      const panelPayload = buildServicePanelPayloadV2();
      await message.channel.send(panelPayload);
      await message.delete().catch(() => {});
    } catch (err) {
      logger.error('[ServiceTicket] Không thể gửi Panel mở ticket:', err);
      await message.delete().catch(() => {});
      await message.channel
        .send('❌ Không thể gửi Panel mở ticket lúc này. Vui lòng kiểm tra quyền gửi tin nhắn / đính kèm file.')
        .catch(() => {});
    }

    return true;
  }

  // Kiểm tra xem có đang đứng trong kênh ticket dịch vụ không cho các lệnh trong ticket
  const ticketRecord = await getServiceTicketRecord(client, message.guild.id, message.channel?.id);
  const inServiceTicket = isServiceTicketChannel(message.channel, ticketRecord);

  if (!inServiceTicket) {
    return false;
  }

  // 4. &nhacfb — SP nhắc member feedback ở trong ticket
  if (/^[&!]nhacfb(?:\s|$)/i.test(trimmed)) {
    if (!isServiceTicketStaff(message.member, message.author.id, client)) {
      await message.delete().catch(() => {});
      return true;
    }

    await message.delete().catch(() => {});

    const targetUserId =
      ticketRecord?.userId ||
      String(message.channel?.topic || '').match(/CustomerID:(\d+)/)?.[1] ||
      message.author.id;

    if (ticketRecord) {
      await saveServiceTicketRecord(client, message.guild.id, message.channel.id, {
        ...ticketRecord,
        awaitingFeedback: true,
        status: ticketRecord.status === 'feedback_received' ? 'feedback_received' : 'awaiting_feedback',
        feedbackRemindedAt: Date.now(),
        feedbackRemindedBy: message.author.id,
      });
    }

    const reminderPayload = buildFeedbackReminderPayloadV2({
      guildId: message.guild.id,
      userId: targetUserId,
    });
    await message.channel.send(reminderPayload);
    return true;
  }

  // 5. &close — SP đóng ticket khi khách không mua
  if (/^[&!](?:close|dongticket)\b/i.test(trimmed)) {
    if (!isServiceTicketStaff(message.member, message.author.id, client)) {
      await message.delete().catch(() => {});
      return true;
    }

    await message.delete().catch(() => {});
    await closeServiceTicket({
      channel: message.channel,
      executor: message.author,
      client,
    });
    return true;
  }

  // 6. &clear — SP xóa kênh ticket dịch vụ (chỉ gửi log, không gửi DM)
  if (/^[&!](?:clear|xoaticket|deleteticket)\b/i.test(trimmed)) {
    if (!isServiceTicketStaff(message.member, message.author.id, client)) {
      await message.delete().catch(() => {});
      return true;
    }

    await message.delete().catch(() => {});
    await message.channel
      .send('🗑️ Đang lưu transcript vào kênh log và xóa kênh ticket trong giây lát...')
      .catch(() => {});

    await deleteServiceTicket({
      channel: message.channel,
      executor: message.author,
      client,
      sendDmTranscript: false,
      reason: 'Xóa ticket bằng lệnh &clear',
    });
    return true;
  }

  return false;
}
