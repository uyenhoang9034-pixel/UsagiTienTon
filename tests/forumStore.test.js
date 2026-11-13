import test from 'node:test';
import assert from 'node:assert/strict';
import { ButtonStyle, ChannelFlags, ChannelType, Collection } from 'discord.js';
import {
  FORUM_STORE_ORDER,
  FORUM_STORE_TICKET_URL,
  buildForumStorePostPayload,
  ensureForumStoreTags,
  pickForumAppliedTags,
  syncForumStorePosts,
  initForumStoreSync,
  handleForumStoreMessage,
} from '../src/services/forumStoreService.js';
import { SERVICE_TICKET_IDS } from '../src/config/serviceTicketConfig.js';
import { IS_COMPONENTS_V2 } from '../src/services/serviceTicketService.js';

function getAllText(payload) {
  return (payload?.components?.[0]?.components || [])
    .filter((c) => c.type === 10 && typeof c.content === 'string')
    .map((c) => c.content)
    .join('\n');
}

function createMemoryDbClient() {
  const store = new Map();
  return {
    store,
    user: { id: 'bot_999', tag: 'Usagi#0001' },
    db: {
      get: async (key, fallback = null) => (store.has(key) ? structuredClone(store.get(key)) : fallback),
      set: async (key, value) => {
        store.set(key, structuredClone(value));
        return true;
      },
      delete: async (key) => store.delete(key),
      list: async (prefix) => [...store.keys()].filter((k) => k.startsWith(prefix)),
    },
  };
}

test('Forum Store Builders: 4 danh mục chuẩn Components V2 mặc định không màu, mục Chinese & Nitro Decor đủ nội dung + nút Mở Ticket', () => {
  for (const key of FORUM_STORE_ORDER) {
    const payloads = buildForumStorePostPayloads(key);
    assert.ok(payloads.length >= 1);
    for (const payload of payloads) {
      assert.equal(payload.flags, IS_COMPONENTS_V2);
      assert.equal(payload.components.length, 1);

      const container = payload.components[0];
      assert.equal(container.type, 17);
      assert.equal(container.accent_color, undefined);
      assert.ok(container.components.length <= 10);

      const text = getAllText(payload);
      assert.ok(text.length < 4000);
    }

    const lastPayload = payloads.at(-1);
    const lastContainer = lastPayload.components[0];
    const actionRow = lastContainer.components.find((c) => c.type === 1);
    assert.ok(actionRow);
    const btn = actionRow.components[0];
    assert.equal(btn.style, ButtonStyle.Link);
    assert.equal(btn.label, 'Mở Ticket');
    assert.equal(btn.emoji, undefined);
    assert.equal(btn.url, FORUM_STORE_TICKET_URL);
  }

  const nitroPayloads = buildForumStorePostPayloads('nitrodecor');
  assert.equal(nitroPayloads.length, 3);
  const nitroText = nitroPayloads.map(getAllText).join('\n');
  assert.ok(nitroText.includes('<a:trangtrig50:1567818385306165301> **DỊCH VỤ MUA HỘ DISCORD NITRO & DECORATION** <a:trangtrig51:1567818549794439229>'));
  assert.ok(nitroText.includes('Nitro Boost gói 1 tháng: 90.000 VNĐ'));
  assert.ok(nitroText.includes('Nitro Boost gói 1 năm: 810.000 VNĐ'));
  assert.ok(nitroText.includes('Bảng giá lẻ như sau:'));
  assert.ok(nitroText.includes('Bảng giá combo như sau:'));
  assert.ok(nitroText.includes('CAM KẾT & QUY ĐỊNH DỊCH VỤ (TRUNG GIAN ORDER)'));
  assert.ok(nitroText.includes('Role Super Donate'));
  assert.ok(nitroText.includes('<a:catg2:1541439091365773362>'));

  const chineseText = getAllText(buildForumStorePostPayload('chinese'));
  assert.ok(chineseText.includes('<a:trangtrig50:1567818385306165301> **KHÓA HỌC & KÈM TIẾNG TRUNG 1:1** <a:trangtrig51:1567818549794439229>'));
  assert.ok(chineseText.includes('<a:trangtrig61:1569559986550612051> 1. Các chương trình nhận kèm 1:1:'));
  assert.ok(chineseText.includes('<a:trangtrig61:1569559986550612051> 2. Đặc quyền khi học kèm 1:1:'));
  assert.ok(chineseText.includes('Tài liệu miễn phí: Tặng kèm file giáo trình, bài tập và hỗ trợ giải đáp thắc mắc ngoài giờ học.'));
  assert.ok(chineseText.includes('Giáo viên có kinh nghiệm, đã từng du học Trung Quốc, trình độ giảng dạy đủ để đảm nhiệm lớp học.'));
  assert.ok(chineseText.includes('<a:trangtrig61:1569559986550612051> 3. Khung giờ trống hiện tại:'));
  assert.ok(chineseText.includes('<a:trangtrig61:1569559986550612051> 4. Cách thức đăng ký & Tư vấn lộ trình:'));
  assert.ok(chineseText.includes('*Học 1 kèm 1 siêu sát sao – hiểu bài ngay tại lớp – chi phí cực hạt dẻ!*'));
});

test('syncForumStorePosts & &postforum: tạo đủ 4 bài lần đầu, cập nhật in-place lần sau và chỉ SP/Admin/Owner dùng được', async () => {
  const client = createMemoryDbClient();
  const createdThreads = new Collection();
  const editedCalls = [];
  let seq = 0;

  const forumChannel = {
    id: 'forum_123456789012345678',
    type: ChannelType.GuildForum,
    flags: { has: (flag) => flag === ChannelFlags.RequireTag },
    availableTags: [
      { id: 'tag_dv', name: 'Dịch vụ' },
      { id: 'tag_kh', name: 'Khóa học' },
    ],
    threads: {
      create: async ({ name, appliedTags, message }) => {
        seq += 1;
        const threadId = `thread_${seq}`;
        const thread = {
          id: threadId,
          name,
          appliedTags,
          starterMessage: message,
          archived: false,
          messages: {
            edit: async (msgId, newPayload) => {
              editedCalls.push({ threadId, msgId, newPayload });
              thread.starterMessage = newPayload;
            },
            send: async (payload) => ({ id: `msg_${++seq}`, ...payload }),
            fetch: async () => null,
          },
          setLocked: async () => {},
          delete: async () => {
            createdThreads.delete(threadId);
          },
        };
        createdThreads.set(threadId, thread);
        return thread;
      },
    },
  };

  assert.deepEqual(pickForumAppliedTags(forumChannel, 'chinese'), ['tag_kh']);
  assert.deepEqual(pickForumAppliedTags(forumChannel, 'codebot'), ['tag_dv']);

  const channels = new Collection([[forumChannel.id, forumChannel]]);
  const guild = {
    id: 'guild_1',
    ownerId: 'owner_1',
    channels: {
      cache: channels,
      fetch: async (id) => channels.get(id) || createdThreads.get(id) || null,
    },
  };

  // Member thường gọi &postforum -> bị xóa lệnh, không tạo bài
  let memberDeleted = false;
  const blocked = await handleForumStoreMessage(
    {
      content: `&postforum ${forumChannel.id}`,
      guild,
      author: { id: 'member_1', bot: false },
      member: {
        guild,
        roles: { cache: new Collection() },
        permissions: { has: () => false },
      },
      channel: { id: 'cmd_chan', send: async () => assert.fail('Should not send') },
      delete: async () => {
        memberDeleted = true;
      },
    },
    client,
  );
  assert.equal(blocked, true);
  assert.equal(memberDeleted, true);
  assert.equal(createdThreads.size, 0);

  // SP Ticket chạy &postforum lần 1 -> tạo đủ 4 bài
  const replies = [];
  await handleForumStoreMessage(
    {
      content: `&postforum <#${forumChannel.id}>`,
      guild,
      author: { id: 'staff_1', bot: false },
      member: {
        guild,
        roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
      },
      channel: {
        id: 'cmd_chan',
        send: async (msg) => {
          replies.push(msg);
          return msg;
        },
      },
      delete: async () => {},
    },
    client,
  );

  assert.equal(createdThreads.size, 4);
  assert.ok(replies[0].includes('Tạo mới: **4**, Cập nhật: **0**'));

  // Chạy syncForumStorePosts lần 2 -> cập nhật in-place cả 4 bài, không tạo trùng
  const res2 = await syncForumStorePosts({ guild, forumChannel, client });
  assert.equal(res2.ok, true);
  assert.equal(res2.created.length, 0);
  assert.equal(res2.updated.length, 4);
  assert.equal(editedCalls.length, 4);

  // Chạy &postforum reset -> xóa các bài cũ mục 2, 3, 4 và tạo lại
  const resetReplies = [];
  await handleForumStoreMessage(
    {
      content: `&postforum reset <#${forumChannel.id}>`,
      guild,
      author: { id: 'staff_1', bot: false },
      member: {
        guild,
        roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
      },
      channel: {
        id: 'cmd_chan',
        send: async (msg) => {
          resetReplies.push(msg);
          return msg;
        },
      },
      delete: async () => {},
    },
    client,
  );
  assert.ok(resetReplies[0].includes('Tạo mới: **3**, Cập nhật: **1**'));
});

test('Auto-tag khi kênh chưa có tag & initForumStoreSync tự đăng lên kênh mặc định 1570392561200398407', async () => {
  const client = createMemoryDbClient();
  const createdThreads = new Collection();
  let tagSeq = 0;

  const defaultForumChannel = {
    id: SERVICE_TICKET_IDS.FORUM_CHANNEL_ID,
    type: ChannelType.GuildForum,
    availableTags: [],
    setAvailableTags: async (nextTags) => {
      defaultForumChannel.availableTags = nextTags.map((t) => ({
        id: t.id || `auto_tag_${++tagSeq}`,
        name: t.name,
      }));
      return defaultForumChannel;
    },
    threads: {
      fetchActive: async () => ({ threads: createdThreads }),
      fetchArchived: async () => ({ threads: new Collection() }),
      create: async ({ name, appliedTags, message }) => {
        const threadId = `def_thread_${createdThreads.size + 1}`;
        const th = {
          id: threadId,
          name,
          appliedTags,
          starterMessage: message,
          messages: {
            edit: async () => {},
            send: async (payload) => ({ id: `def_msg_${++tagSeq}`, ...payload }),
            fetch: async () => null,
          },
          setLocked: async () => {},
          delete: async () => {
            createdThreads.delete(threadId);
          },
        };
        createdThreads.set(threadId, th);
        return th;
      },
    },
  };

  const guild = {
    id: 'guild_default',
    ownerId: 'owner_1',
    channels: {
      cache: new Collection([[defaultForumChannel.id, defaultForumChannel]]),
      fetch: async (id) => (id === defaultForumChannel.id ? defaultForumChannel : createdThreads.get(id) || null),
    },
  };
  defaultForumChannel.guild = guild;

  client.channels = {
    cache: new Collection([[defaultForumChannel.id, defaultForumChannel]]),
    fetch: async (id) => (id === defaultForumChannel.id ? defaultForumChannel : createdThreads.get(id) || null),
  };

  const ensured = await ensureForumStoreTags(defaultForumChannel);
  assert.equal(ensured.availableTags.length, 4);

  const syncRes = await initForumStoreSync(client);
  assert.equal(syncRes.ok, true);
  assert.equal(syncRes.created.length, 4);
  for (const th of createdThreads.values()) {
    assert.equal(th.appliedTags.length, 1);
  }
});

