import {
  ButtonStyle,
  ChannelFlags,
  ChannelType,
  Routes,
} from 'discord.js';
import {
  SERVICE_TICKET_EMOJIS,
  SERVICE_TICKET_IDS,
} from '../config/serviceTicketConfig.js';
import {
  IS_COMPONENTS_V2,
  isServiceTicketStaff,
} from './serviceTicketService.js';
import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';
import { logger } from '../utils/logger.js';

export const FORUM_STORE_EMOJIS = Object.freeze({
  CHINESE_TITLE_L: '<a:trangtrig50:1567818385306165301>',
  CHINESE_TITLE_R: '<a:trangtrig51:1567818549794439229>',
  SECTION: SERVICE_TICKET_EMOJIS.SUB_SECTION, // <a:trangtrig61:1569559986550612051>
});

export const FORUM_STORE_TICKET_URL =
  `https://discord.com/channels/1541279801183178754/${SERVICE_TICKET_IDS.PANEL_CHANNEL_ID}`;

export const FORUM_STORE_ORDER = Object.freeze([
  'codebot',
  'nitrodecor',
  'chinese',
  'khac',
]);

export const FORUM_STORE_CATEGORIES = Object.freeze({
  codebot: {
    key: 'codebot',
    threadTitle: '01 • Vibe Code Bot Discord',
    defaultTagName: 'Vibe Code Bot',
    tagHints: ['vibe code', 'codebot', 'code bot', 'bot', 'dịch vụ', 'dich vu'],
    ready: false,
  },
  nitrodecor: {
    key: 'nitrodecor',
    threadTitle: '02 • Nitro Decor',
    defaultTagName: 'Nitro Decor',
    tagHints: ['nitro', 'decor', 'dịch vụ', 'dich vu'],
    ready: false,
  },
  chinese: {
    key: 'chinese',
    threadTitle: '03 • Chinese',
    defaultTagName: 'Chinese',
    tagHints: ['chinese', 'tiếng trung', 'tieng trung', 'khóa học', 'khoa hoc', 'dịch vụ', 'dich vu'],
    ready: true,
  },
  khac: {
    key: 'khac',
    threadTitle: '04 • Khác',
    defaultTagName: 'Khác',
    tagHints: ['khác', 'khac', 'theo yêu cầu', 'dịch vụ', 'dich vu'],
    ready: false,
  },
});

export function getForumStoreStorageKey(guildId, forumChannelId) {
  return `guild:${guildId}:forum_store:${forumChannelId}`;
}

function buildOpenTicketButtonRow() {
  return {
    type: 1,
    components: [
      {
        type: 2,
        style: ButtonStyle.Link,
        label: 'Mở Ticket',
        url: FORUM_STORE_TICKET_URL,
      },
    ],
  };
}

/**
 * Build payload Components V2 mặc định (không accent_color) cho từng bài đăng diễn đàn
 */
export function buildForumStorePostPayload(categoryKey) {
  const E = FORUM_STORE_EMOJIS;

  if (categoryKey === 'chinese') {
    return {
      flags: IS_COMPONENTS_V2,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: `# ${E.CHINESE_TITLE_L} **KHÓA HỌC & KÈM TIẾNG TRUNG 1:1** ${E.CHINESE_TITLE_R}`,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content:
                'Server nhận dạy tiếng Trung 1 kèm 1 trực tiếp từ con số 0 đến trình độ HSK 3. Lộ trình cá nhân hóa hoàn toàn theo tốc độ tiếp thu của từng bạn với mức học phí siêu mềm cho học sinh – sinh viên và người đi làm bận rộn.',
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: [
                `${E.SECTION} 1. Các chương trình nhận kèm 1:1:`,
                '- Người mới bắt đầu (Nền tảng): Làm quen phát âm chuẩn (Pinyin), quy tắc viết chữ Hán, thanh điệu và từ vựng cơ bản.',
                '- Luyện thi & Ôn tập HSK 1 – HSK 3: Bám sát giáo trình chuẩn HSK 1, HSK 2, HSK 3; hướng dẫn mẹo làm bài, luyện đủ 4 kỹ năng (Nghe – Nói – Đọc – Viết) và chữa đề trực tiếp 1:1.',
                '- Kèm theo yêu cầu riêng: Ôn tập kiến thức trên trường, chỉnh sửa phát âm chi tiết hoặc củng cố lại ngữ pháp cơ bản còn hổng.',
                '',
                `${E.SECTION} 2. Đặc quyền khi học kèm 1:1:`,
                '- Theo sát 100%: Giáo viên chỉ tập trung hướng dẫn duy nhất một mình bạn trong suốt buổi học, chỉnh phát âm và sửa lỗi ngay lập tức, không lo ngại ngùng hay theo không kịp tiến độ.',
                '- Học phí "giá deal": Mức giá ưu đãi đặc biệt dành riêng cho thành viên trong server, có gói đăng ký theo buổi lẻ hoặc theo tháng linh hoạt.',
                '- Tài liệu miễn phí: Tặng kèm file giáo trình, bài tập và hỗ trợ giải đáp thắc mắc ngoài giờ học.',
                '',
                `${E.SECTION} 3. Khung giờ trống hiện tại:`,
                '- Lịch nhận lớp: Thứ 3 & Thứ 5 hằng tuần',
                '- Khung giờ: 20:00 – 21:00 (hoặc 20:00 – 21:30) (Học trực tuyến qua nền tảng trực tuyến tiện lợi).',
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
                `${E.SECTION} 4. Cách thức đăng ký & Tư vấn lộ trình:`,
                '- Bạn vui lòng mở ticket (ấn nút để mở), khi hiện bảng chọn vui lòng điền "chinese" để bot tạo ticket tự động cho bạn nhé.',
                '- Khi tạo ticket thành công, vui lòng nói sơ qua về Trình độ hiện tại + Mục tiêu (HSK 1 / HSK 2 / HSK 3) + Khung giờ chọn (8h–9h hoặc 8h–9h30 tối T3-T5) để được test nhanh, tư vấn lộ trình và nhận bảng học phí ưu đãi nhé!',
                '',
                '*Học 1 kèm 1 siêu sát sao – hiểu bài ngay tại lớp – chi phí cực hạt dẻ!*',
              ].join('\n'),
            },
            buildOpenTicketButtonRow(),
          ],
        },
      ],
      allowedMentions: { parse: [] },
    };
  }

  const placeholderTitles = {
    codebot: 'VIBE CODE BOT DISCORD',
    nitrodecor: 'NITRO DECOR',
    khac: 'DỊCH VỤ KHÁC',
  };

  const titleText = placeholderTitles[categoryKey] || 'DỊCH VỤ SERVER';

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# **${titleText}**`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              'Nội dung chi tiết dịch vụ đang được cập nhật. Bạn vẫn có thể bấm nút bên dưới để mở ticket trao đổi trực tiếp với tụi mình nhé!',
          },
          buildOpenTicketButtonRow(),
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };
}

/**
 * Đảm bảo kênh diễn đàn có sẵn tag cho từng danh mục (giữ nguyên các tag đã có, chỉ thêm tag còn thiếu).
 */
export async function ensureForumStoreTags(forumChannel) {
  if (!forumChannel) return forumChannel;
  const existingTags = Array.isArray(forumChannel.availableTags)
    ? forumChannel.availableTags.map((t) => ({
        ...(t.id ? { id: t.id } : {}),
        name: t.name,
        ...(typeof t.moderated === 'boolean' ? { moderated: t.moderated } : {}),
        ...(t.emoji ? { emoji: t.emoji } : {}),
      }))
    : [];

  const tagsToAdd = [];
  for (const key of FORUM_STORE_ORDER) {
    const matched = pickForumAppliedTags(forumChannel, key);
    if (matched.length > 0) continue;

    const defaultName = FORUM_STORE_CATEGORIES[key]?.defaultTagName;
    if (!defaultName) continue;

    const alreadyPending = tagsToAdd.some(
      (t) => t.name.toLowerCase() === defaultName.toLowerCase(),
    );
    const alreadyExists = existingTags.some(
      (t) => String(t.name || '').toLowerCase() === defaultName.toLowerCase(),
    );
    if (!alreadyPending && !alreadyExists && existingTags.length + tagsToAdd.length < 20) {
      tagsToAdd.push({ name: defaultName });
    }
  }

  if (tagsToAdd.length > 0 && typeof forumChannel.setAvailableTags === 'function') {
    try {
      const updated = await forumChannel.setAvailableTags(
        [...existingTags, ...tagsToAdd],
        'Usagi Forum Store: tự động tạo tag cho các danh mục dịch vụ',
      );
      if (updated && Array.isArray(updated.availableTags)) {
        return updated;
      }
    } catch (err) {
      logger.warn('[ForumStore] Không thể tự tạo tag diễn đàn (thiếu quyền Quản lý kênh?):', err?.message || err);
    }
  }

  return forumChannel;
}

/**
 * Chọn Forum Tag phù hợp từ availableTags của kênh diễn đàn (nếu có).
 */
export function pickForumAppliedTags(forumChannel, categoryKey) {
  const availableTags = Array.isArray(forumChannel?.availableTags)
    ? forumChannel.availableTags
    : [];

  if (availableTags.length === 0) {
    return [];
  }

  const hints = FORUM_STORE_CATEGORIES[categoryKey]?.tagHints || [];
  for (const hint of hints) {
    const found = availableTags.find((tag) =>
      String(tag?.name || '').toLowerCase().includes(hint.toLowerCase()),
    );
    if (found?.id) {
      return [found.id];
    }
  }

  const requiresTag = Boolean(forumChannel?.flags?.has?.(ChannelFlags?.RequireTag));
  if (requiresTag && availableTags[0]?.id) {
    return [availableTags[0].id];
  }

  return [];
}

async function editForumStarterMessage(thread, client, messageId, payload) {
  const targetMsgId = messageId || thread.id;
  if (typeof thread.messages?.edit === 'function') {
    await thread.messages.edit(targetMsgId, payload);
    return targetMsgId;
  }

  const rest = client?.rest || thread.client?.rest;
  if (rest && typeof rest.patch === 'function') {
    await rest.patch(Routes.channelMessage(thread.id, targetMsgId), {
      body: payload,
    });
    return targetMsgId;
  }

  throw new Error('Không thể chỉnh sửa bài đăng diễn đàn hiện có.');
}

async function listForumThreadsByName(forumChannel) {
  const byName = new Map();
  if (!forumChannel?.threads) return byName;

  if (typeof forumChannel.threads.fetchActive === 'function') {
    const active = await forumChannel.threads.fetchActive().catch(() => null);
    if (active?.threads?.values) {
      for (const th of active.threads.values()) {
        if (th?.name) byName.set(String(th.name).trim().toLowerCase(), th);
      }
    }
  }

  if (typeof forumChannel.threads.fetchArchived === 'function') {
    const archived = await forumChannel.threads.fetchArchived({ type: 'public', limit: 50 }).catch(() => null);
    if (archived?.threads?.values) {
      for (const th of archived.threads.values()) {
        const key = String(th?.name || '').trim().toLowerCase();
        if (key && !byName.has(key)) {
          byName.set(key, th);
        }
      }
    }
  }

  return byName;
}

/**
 * Tạo mới hoặc cập nhật (edit in-place) cả 4 bài đăng diễn đàn trong kênh Forum chỉ định.
 */
export async function syncForumStorePosts({
  guild,
  forumChannel,
  client,
}) {
  if (!guild || !forumChannel) {
    return { ok: false, errorMessage: '❌ Không xác định được server hoặc kênh diễn đàn.' };
  }

  if (
    forumChannel.type !== undefined &&
    forumChannel.type !== ChannelType.GuildForum
  ) {
    return { ok: false, errorMessage: '❌ Kênh được chọn không phải là kênh Diễn đàn (Forum).' };
  }

  const resolvedForum = await ensureForumStoreTags(forumChannel);
  const storageKey = getForumStoreStorageKey(guild.id, resolvedForum.id);
  const existingState = (await getDatabaseValue(client, storageKey, null)) || {};
  const savedPosts = { ...(existingState.posts || {}) };
  const liveThreadsByName = await listForumThreadsByName(resolvedForum);

  const created = [];
  const updated = [];

  for (const key of FORUM_STORE_ORDER) {
    const entry = FORUM_STORE_CATEGORIES[key];
    const payload = buildForumStorePostPayload(key);
    const appliedTags = pickForumAppliedTags(resolvedForum, key);
    const prev = savedPosts[key];

    let existingThread = null;
    if (prev?.threadId) {
      existingThread =
        guild.channels?.cache?.get?.(prev.threadId) ||
        (typeof guild.channels?.fetch === 'function'
          ? await guild.channels.fetch(prev.threadId).catch(() => null)
          : null) ||
        (typeof client?.channels?.fetch === 'function'
          ? await client.channels.fetch(prev.threadId).catch(() => null)
          : null);
    }

    if (!existingThread) {
      existingThread = liveThreadsByName.get(entry.threadTitle.toLowerCase()) || null;
    }

    if (existingThread) {
      if (existingThread.archived && typeof existingThread.setArchived === 'function') {
        await existingThread.setArchived(false).catch(() => {});
      }

      if (appliedTags.length > 0) {
        const currentTags = Array.isArray(existingThread.appliedTags) ? existingThread.appliedTags : [];
        if (currentTags.length === 0 && typeof existingThread.setAppliedTags === 'function') {
          await existingThread.setAppliedTags(appliedTags).catch(() => {});
        }
      }

      const editedMsgId = await editForumStarterMessage(
        existingThread,
        client,
        prev?.messageId || existingThread.id,
        payload,
      );

      savedPosts[key] = {
        threadId: existingThread.id,
        messageId: editedMsgId,
        appliedTags,
        updatedAt: Date.now(),
      };
      updated.push({ key, threadId: existingThread.id, title: entry.threadTitle });
      continue;
    }

    const thread = await resolvedForum.threads.create({
      name: entry.threadTitle,
      ...(appliedTags.length > 0 ? { appliedTags } : {}),
      message: payload,
    });

    const threadId = thread?.id || null;
    savedPosts[key] = {
      threadId,
      messageId: threadId,
      appliedTags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    created.push({ key, threadId, title: entry.threadTitle });
  }

  await setDatabaseValue(client, storageKey, {
    forumChannelId: resolvedForum.id,
    posts: savedPosts,
    updatedAt: Date.now(),
  });

  logger.info('[ForumStore] Đã đồng bộ bài đăng diễn đàn', {
    guildId: guild.id,
    forumChannelId: resolvedForum.id,
    created: created.length,
    updated: updated.length,
  });

  return {
    ok: true,
    created,
    updated,
    posts: savedPosts,
  };
}

/**
 * Tự động đồng bộ bài đăng vào kênh diễn đàn mặc định (1570392561200398407) khi bot khởi động.
 */
export async function initForumStoreSync(client) {
  const forumChannelId = SERVICE_TICKET_IDS.FORUM_CHANNEL_ID;
  if (!client || !forumChannelId) {
    return null;
  }

  const forumChannel =
    client.channels?.cache?.get?.(forumChannelId) ||
    (typeof client.channels?.fetch === 'function'
      ? await client.channels.fetch(forumChannelId).catch(() => null)
      : null);

  if (!forumChannel || !forumChannel.guild || forumChannel.type !== ChannelType.GuildForum) {
    logger.warn('[ForumStore] Không tìm thấy kênh diễn đàn mặc định để đồng bộ:', { forumChannelId });
    return null;
  }

  return syncForumStorePosts({
    guild: forumChannel.guild,
    forumChannel,
    client,
  });
}

/**
 * Lệnh prefix &postforum [ID hoặc #kênh_diễn_đàn] (mặc định kênh 1570392561200398407, chỉ SP Ticket / Admin / Owner)
 */
export async function handleForumStoreMessage(message, client) {
  if (!message || message.author?.bot || !message.guild || typeof message.content !== 'string') {
    return false;
  }

  const trimmed = message.content.trim();
  const match = trimmed.match(/^[&!](?:postforum|upforum)(?:\s+(.+))?$/i);
  if (!match) {
    return false;
  }

  if (!isServiceTicketStaff(message.member, message.author?.id, client)) {
    await message.delete().catch(() => {});
    return true;
  }

  const arg = String(match[1] || '').trim();
  const channelIdMatch = arg.match(/(?:<#)?(\d{15,22})>?/);
  const targetChannelId = channelIdMatch
    ? channelIdMatch[1]
    : SERVICE_TICKET_IDS.FORUM_CHANNEL_ID || message.channel?.parentId || message.channel?.id;

  await message.delete().catch(() => {});

  const forumChannel =
    message.guild.channels?.cache?.get?.(targetChannelId) ||
    (typeof message.guild.channels?.fetch === 'function'
      ? await message.guild.channels.fetch(targetChannelId).catch(() => null)
      : null);

  if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
    await message.channel
      .send('❌ Vui lòng nhập đúng ID hoặc tag `#kênh-diễn-đàn` (Ví dụ: `&postforum #bảng-giá`).')
      .catch(() => {});
    return true;
  }

  try {
    const result = await syncForumStorePosts({
      guild: message.guild,
      forumChannel,
      client,
    });

    if (!result.ok) {
      await message.channel.send(result.errorMessage).catch(() => {});
      return true;
    }

    await message.channel
      .send(
        `✅ Đã đồng bộ bài đăng diễn đàn tại <#${forumChannel.id}> (Tạo mới: **${result.created.length}**, Cập nhật: **${result.updated.length}**).`,
      )
      .catch(() => {});
  } catch (err) {
    logger.error('[ForumStore] Lỗi đồng bộ bài đăng diễn đàn:', err);
    await message.channel
      .send('❌ Không thể đăng bài vào kênh diễn đàn. Vui lòng kiểm tra quyền của bot trong kênh diễn đàn đó.')
      .catch(() => {});
  }

  return true;
}

