import test from 'node:test';
import assert from 'node:assert/strict';
import { ButtonStyle, Collection } from 'discord.js';
import {
  SERVICE_TICKET_IDS,
  SERVICE_TICKET_EMOJIS,
  SERVICE_DM_FOOTER,
  parseBuyServiceKeyword,
  buildServiceTicketChannelName,
} from '../src/config/serviceTicketConfig.js';
import {
  IS_COMPONENTS_V2,
  SERVICE_TOS_CHANNEL_IDS,
  INVALID_FEEDBACK_REPLY_TEXT,
  INVALID_FEEDBACK_SYNTAX_REPLY_TEXT,
  classifyFeedbackLegitMessage,
  buildServiceTosPayloadsV2,
  buildServicePanelPayloadV2,
  buildServiceWelcomePayloadV2,
  buildAssignedStaffMessage,
  buildFeedbackReminderPayloadV2,
  buildFeedbackReceivedPayloadV2,
  buildFeedbackStickyPayloadV2,
  buildFeedbackReactionSequence,
  resolveGuildDigitEmojiMap,
  buildServiceClosedPayloadV2,
  buildDeliveryDmPayloadV2,
  buildDmTranscriptPayloadV2,
  buildServiceLogTranscriptPayload,
  createServiceTicketFromModal,
  closeServiceTicket,
  reassignServiceTicketStaff,
  sendServiceDeliveryNotice,
  deleteServiceTicket,
  handleServiceTicketFeedbackMessage,
  handleServiceTicketMessage,
} from '../src/services/serviceTicketService.js';

function getContainerTextLength(payload) {
  const container = payload?.components?.[0];
  if (!container || !Array.isArray(container.components)) return 0;
  return container.components
    .filter((c) => c.type === 10 && typeof c.content === 'string')
    .reduce((sum, c) => sum + c.content.length, 0);
}

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

function createMockGuild({ client, guildId = 'guild_1', staffIds = ['staff_1', 'staff_2'] } = {}) {
  const channels = new Collection();
  const deletedChannels = [];
  const logMessages = [];
  const logChannel = {
    id: SERVICE_TICKET_IDS.LOG_CHANNEL_ID,
    name: 'log-ticket',
    send: async (payload) => {
      logMessages.push(payload);
      return payload;
    },
    messages: { fetch: async () => new Collection() },
  };
  channels.set(logChannel.id, logChannel);

  const staffRoleMembers = new Collection();
  for (const sid of staffIds) {
    staffRoleMembers.set(sid, {
      id: sid,
      user: { id: sid, bot: false },
      roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
    });
  }

  let nextChanSeq = 100;
  const guild = {
    id: guildId,
    ownerId: 'owner_0',
    client,
    roles: {
      cache: new Collection([
        [SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, { id: SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, members: staffRoleMembers }],
      ]),
    },
    members: {
      cache: staffRoleMembers,
    },
    channels: {
      cache: channels,
      fetch: async (id) => channels.get(id) || null,
      create: async (opts) => {
        nextChanSeq += 1;
        const chId = `chan_${nextChanSeq}`;
        const sentMessages = [];
        const permissionEdits = [];
        const parentMoves = [];
        const ch = {
          id: chId,
          name: opts.name,
          parentId: opts.parent || SERVICE_TICKET_IDS.CATEGORY_ID,
          topic: opts.topic || '',
          guild,
          client,
          createdTimestamp: Date.now(),
          sentMessages,
          permissionEdits,
          parentMoves,
          send: async (payload) => {
            sentMessages.push(payload);
            return payload;
          },
          setParent: async (parentId, setOpts = {}) => {
            ch.parentId = parentId;
            parentMoves.push({ parentId, options: setOpts });
            return ch;
          },
          permissionOverwrites: {
            edit: async (targetId, perms) => {
              permissionEdits.push({ targetId, perms });
            },
          },
          messages: {
            fetch: async () => new Collection(),
          },
          delete: async () => {
            deletedChannels.push(chId);
            channels.delete(chId);
          },
        };
        channels.set(chId, ch);
        return ch;
      },
    },
  };

  return { guild, channels, logMessages, deletedChannels };
}

test('&dichvu: buildServiceTosPayloadsV2 tạo đúng 3 card Components V2 hợp lệ và dưới giới hạn 4000 ký tự', () => {
  const payloads = buildServiceTosPayloadsV2();
  assert.equal(payloads.length, 3);

  for (const payload of payloads) {
    assert.equal(payload.flags, IS_COMPONENTS_V2);
    assert.equal(payload.components.length, 1);
    assert.equal(payload.components[0].type, 17);
    assert.ok(payload.components[0].components.length <= 10);
    assert.ok(getContainerTextLength(payload) < 4000);
    assert.deepEqual(payload.allowedMentions, { parse: [] });
  }

  const card1Text = getAllText(payloads[0]);
  assert.ok(card1Text.includes('ĐIỀU KHOẢN DỊCH VỤ (TOS) & QUY ĐỊNH GIAO DỊCH'));
  assert.ok(card1Text.includes(`<#${SERVICE_TOS_CHANNEL_IDS.TICKET_CHANNEL_ID}>`));
  assert.ok(card1Text.includes('1. Dịch vụ Vibe Code Bot Discord theo yêu cầu'));

  const card2Text = getAllText(payloads[1]);
  assert.ok(card2Text.includes('2. Dịch vụ Mua hộ Discord Nitro & Decoration (Cozy Store)'));

  const card3Text = getAllText(payloads[2]);
  assert.ok(card3Text.includes('3. Dịch vụ Dạy kèm Tiếng Trung 1:1'));
  assert.ok(card3Text.includes('# III. LƯU Ý KHÁC'));
});

test('MessageCreate Trigger: &dichvu chỉ SP Ticket / Admin / Owner dùng được, gửi 3 card Components V2 rồi tự xóa', async () => {
  const guild = { id: 'g1', ownerId: 'owner_1' };

  // Member thường không có quyền -> bị xóa lệnh, không gửi card
  const memberEvents = [];
  const memberHandled = await handleServiceTicketMessage({
    content: '&dichvu',
    guild,
    author: { id: 'normal_1', bot: false },
    member: {
      guild,
      roles: { cache: new Collection() },
      permissions: { has: () => false },
    },
    channel: {
      id: 'channel_tos_1',
      send: async () => assert.fail('Member thường không được gửi &dichvu'),
    },
    delete: async () => {
      memberEvents.push('delete');
    },
  });
  assert.equal(memberHandled, true);
  assert.deepEqual(memberEvents, ['delete']);

  // SP Ticket / Admin / Owner -> gửi 3 card rồi tự xóa
  const staffEvents = [];
  const handled = await handleServiceTicketMessage({
    content: '&dichvu',
    guild,
    author: { id: 'staff_1', bot: false },
    member: {
      guild,
      roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
      permissions: { has: () => false },
    },
    channel: {
      id: 'channel_tos_1',
      send: async (payload) => {
        staffEvents.push({ type: 'send', payload });
        return payload;
      },
    },
    delete: async () => {
      staffEvents.push({ type: 'delete' });
    },
  });

  assert.equal(handled, true);
  assert.equal(staffEvents.length, 4);
  assert.equal(staffEvents[3].type, 'delete');

  const ignored = await handleServiceTicketMessage({
    content: '&dichvu test',
    guild,
    author: { id: 'staff_1', bot: false },
    member: {
      guild,
      roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
    },
    channel: { send: async () => assert.fail('Should not send') },
    delete: async () => assert.fail('Should not delete'),
  });
  assert.equal(ignored, false);
});

test('parseBuyServiceKeyword & buildServiceTicketChannelName nhận diện chuẩn 4 keyword mua hàng + hotro', () => {
  assert.equal(parseBuyServiceKeyword('codebot')?.key, 'codebot');
  assert.equal(parseBuyServiceKeyword('nitrodecor')?.key, 'nitrodecor');
  assert.equal(parseBuyServiceKeyword('chinese - học HSK 1')?.key, 'chinese');
  assert.equal(parseBuyServiceKeyword('khác')?.key, 'khac');
  assert.equal(parseBuyServiceKeyword('khac')?.key, 'khac');
  assert.equal(parseBuyServiceKeyword('xin chao admin'), null);

  assert.equal(buildServiceTicketChannelName('codebot', 1), '𓂃⋆ticket-codebot-1');
  assert.equal(buildServiceTicketChannelName('nitrodecor', 3), '𓂃⋆ticket-nitrodecor-3');
  assert.equal(buildServiceTicketChannelName('hotro', 5), '𓂃⋆ticket-hotro-5');
});

test('UI Builders: Panel, Welcome, Staff notice, &nhacfb, Feedback nhận, &close, /ib1-/ib3 DM, DM Transcript & Log Transcript đúng yêu cầu', () => {
  const panel = buildServicePanelPayloadV2();
  const panelText = getAllText(panel);
  assert.ok(panelText.includes('TICKET ĐẶT HÀNG & DỊCH VỤ'));
  assert.ok(panelText.includes('Trong trường hợp cần giải đáp thắc mắc / hỗ trợ / bảo hành, vui lòng chọn nút "Hỗ Trợ"'));
  assert.ok(!panelText.includes(SERVICE_DM_FOOTER));
  const panelButtons = panel.components[0].components.find((c) => c.type === 1).components;
  assert.equal(panelButtons.length, 3);
  assert.equal(panelButtons[0].label, 'Điều Khoản Dịch Vụ');
  assert.equal(panelButtons[0].style, ButtonStyle.Link);
  assert.equal(panelButtons[0].url, SERVICE_TICKET_IDS.TOS_MESSAGE_URL);
  assert.equal(panelButtons[0].emoji, undefined);
  assert.equal(panelButtons[1].label, 'Mua Hàng');
  assert.equal(panelButtons[1].style, ButtonStyle.Secondary);
  assert.deepEqual(panelButtons[1].emoji, SERVICE_TICKET_EMOJIS.BUTTON_BUY);
  assert.equal(panelButtons[2].label, 'Hỗ Trợ');
  assert.equal(panelButtons[2].style, ButtonStyle.Secondary);
  assert.deepEqual(panelButtons[2].emoji, SERVICE_TICKET_EMOJIS.BUTTON_SUPPORT);

  const welcomeBuy = buildServiceWelcomePayloadV2({ userId: 'u1', ticketType: 'buy', serviceInput: 'chinese' });
  const welcomeBuyText = getAllText(welcomeBuy);
  assert.ok(welcomeBuyText.includes('- Dịch vụ đã chọn: chinese'));
  assert.ok(
    welcomeBuyText.includes(
      `${SERVICE_TICKET_EMOJIS.BANG} Bạn vui lòng mô tả chi tiết yêu cầu / nhu cầu của mình tại đây để bên mình báo giá và tư vấn cụ thể nhé. Khi chốt đơn và thanh toán tức là bạn đã đồng ý với toàn bộ TOS của server!`,
    ),
  );
  assert.equal(welcomeBuy.components[0].components.some((c) => c.type === 1), false);

  const welcomeSupport = buildServiceWelcomePayloadV2({ userId: 'u1', ticketType: 'support', serviceInput: 'Bị lỗi bot' });
  const welcomeSupportText = getAllText(welcomeSupport);
  assert.ok(welcomeSupportText.includes('- Hỗ trợ: Bị lỗi bot'));
  assert.ok(
    welcomeSupportText.includes(
      `${SERVICE_TICKET_EMOJIS.BANG} Bạn vui lòng mô tả chi tiết vấn đề cần hỗ trợ của mình tại đây để bên mình hỗ trợ kịp thời nhé.`,
    ),
  );
  assert.ok(!welcomeSupportText.includes('báo giá và tư vấn cụ thể'));

  const staffMsg = buildAssignedStaffMessage({ staffId: 'staff_77' });
  assert.equal(staffMsg.flags, undefined);
  assert.ok(staffMsg.content.includes('<@staff_77> sẽ là hỗ trợ chính cho ticket này'));

  const nhacfb = buildFeedbackReminderPayloadV2({ guildId: 'g1', userId: 'u1' });
  assert.ok(getAllText(nhacfb).includes('+1 legit'));
  assert.ok(getAllText(nhacfb).includes(SERVICE_TICKET_EMOJIS.FEEDBACK_REACT));
  const fbBtn = nhacfb.components[0].components.find((c) => c.type === 1).components[0];
  assert.equal(fbBtn.style, ButtonStyle.Link);
  assert.equal(fbBtn.emoji, undefined);

  const fbReceived = buildFeedbackReceivedPayloadV2({ userId: 'u1' });
  assert.ok(getAllText(fbReceived).includes('> Khi bấm xóa, bot sẽ gửi bản lưu lịch sử trò chuyện'));
  const delFbBtn = fbReceived.components[0].components.find((c) => c.type === 1).components[0];
  assert.equal(delFbBtn.style, ButtonStyle.Secondary);
  assert.equal(delFbBtn.emoji, undefined);

  const stickyFb = buildFeedbackStickyPayloadV2();
  assert.equal(stickyFb.flags, IS_COMPONENTS_V2);
  assert.equal(stickyFb.components[0].type, 17);
  assert.equal(stickyFb.components[0].components.length, 1);
  const stickyText = getAllText(stickyFb);
  assert.ok(!stickyText.includes('# '));
  assert.ok(stickyText.includes('<a:heartg8:1567818755793358928> Chân thành cảm ơn bạn đã sử dụng dịch vụ ở Serendipity!'));
  assert.ok(stickyText.includes('<a:heartg8:1567818755793358928> Xin vui lòng gửi tin nhắn check legit theo cú pháp: +1 legit + tên sản phẩm'));
  assert.ok(stickyText.includes('> Ví dụ: +1 legit bot discord / +1 legit decor'));

  const closedPayload = buildServiceClosedPayloadV2({ executorId: 'staff_1', closedTs: 1700000000 });
  const closedText = getAllText(closedPayload);
  assert.ok(closedText.includes('Đã đóng (không phát sinh đơn hàng).'));
  assert.ok(!closedText.includes('Ghi chú:'));
  assert.equal(closedPayload.components[0].components.find((c) => c.type === 1).components[0].label, 'Xóa ticket');

  const dmBot = buildDeliveryDmPayloadV2({
    variant: 'bot',
    guildId: 'g1',
    userId: 'u1',
    ticketChannelId: 'ch_1',
    assignedStaffId: 'staff_2',
    timestamp: 1700000000,
  });
  const dmBotText = getAllText(dmBot);
  assert.ok(dmBotText.includes('Xin chào <@u1>, đơn hàng Vibe Code Bot Discord của bạn đã hoàn tất!'));
  assert.ok(dmBotText.includes('<@staff_2>'));

  const dmNitro = buildDeliveryDmPayloadV2({
    variant: 'nitro',
    guildId: 'g1',
    userId: 'u1',
    ticketChannelId: 'ch_1',
    assignedStaffId: 'staff_2',
    timestamp: 1700000000,
  });
  const dmNitroText = getAllText(dmNitro);
  assert.ok(dmNitroText.includes('Xin chào <@u1>, đơn hàng Discord Nitro của bạn đã hoàn tất!'));
  assert.ok(dmNitroText.includes('<@staff_2>'));
  assert.ok(dmNitroText.includes(SERVICE_DM_FOOTER));

  const dmChinese = buildDeliveryDmPayloadV2({
    variant: 'chinese',
    guildId: 'g1',
    userId: 'u1',
    ticketChannelId: 'ch_1',
    assignedStaffId: 'staff_2',
    timestamp: 1700000000,
  });
  const dmChineseText = getAllText(dmChinese);
  assert.ok(dmChineseText.includes(SERVICE_TICKET_IDS.CHINESE_TEACHER_ZALO));
  assert.ok(dmChineseText.includes(`<@${SERVICE_TICKET_IDS.CHINESE_SUPPORT_USER_ID}>`));
  assert.ok(!dmChineseText.includes('<@staff_2>'));
  assert.ok(dmChineseText.includes(SERVICE_DM_FOOTER));

  const dmTranscript = buildDmTranscriptPayloadV2({
    userId: 'u1',
    channelName: '𓂃⋆ticket-codebot-1',
    serviceLabel: 'Vibe Code Bot Discord',
    assignedStaffId: 'staff_2',
    files: [{ name: 'transcript-ticket-codebot-1.html' }],
  });
  assert.ok(getAllText(dmTranscript).includes('LỊCH SỬ GIAO DỊCH (TRANSCRIPT)'));
  assert.ok(getAllText(dmTranscript).includes('<@staff_2>'));
  assert.ok(
    getAllText(dmTranscript).includes(
      '<a:trangtrig49:1567818140375851018> Vui lòng "tải xuống - download" file transcript để lưu bản đầy đủ nhất.',
    ),
  );
  assert.equal(
    dmTranscript.components[0].components.some(
      (c) => c.type === 13 && c.file?.url === 'attachment://transcript-ticket-codebot-1.html',
    ),
    true,
  );

  const logTranscript = buildServiceLogTranscriptPayload({
    channelName: '𓂃⋆ticket-codebot-1',
    userId: 'u1',
    executorId: 'staff_1',
    ticketId: 'ch_1',
    exportedTs: 1700000000,
  });
  assert.equal(logTranscript.embeds[0].data.title, 'TICKET TRANSCRIPT');
  assert.equal(logTranscript.embeds[0].data.color, 0xe9b5ce);
});

test('End-to-End Flow: Đếm số riêng từng dịch vụ, giới hạn 2 ticket/người, Hỗ Trợ + feedback + close không mua', async () => {
  const client = createMemoryDbClient();
  const { guild, logMessages, deletedChannels } = createMockGuild({ client });
  const dmMessages = [];
  client.users = {
    fetch: async (id) => ({
      id,
      send: async (payload) => {
        dmMessages.push({ id, payload });
        return payload;
      },
    }),
  };

  // 1. User mở ticket Mua Hàng #1: codebot -> 𓂃⋆ticket-codebot-1
  const buyRes = await createServiceTicketFromModal(
    { guild, user: { id: 'cust_1', username: 'kimnong' } },
    client,
    { mode: 'buy', rawInput: 'codebot - bot nhac lich' },
  );
  assert.equal(buyRes.ok, true);
  assert.equal(buyRes.channel.name, '𓂃⋆ticket-codebot-1');
  assert.equal(buyRes.channel.sentMessages.length, 2);

  // 2. User mở ticket Hỗ Trợ #1 -> 𓂃⋆ticket-hotro-1 (đếm riêng, không cần keyword)
  const supportRes = await createServiceTicketFromModal(
    { guild, user: { id: 'cust_1', username: 'kimnong' } },
    client,
    { mode: 'support', rawInput: 'Mình cần hỏi bảo hành bot' },
  );
  assert.equal(supportRes.ok, true);
  assert.equal(supportRes.channel.name, '𓂃⋆ticket-hotro-1');

  // 3. Thử mở ticket thứ 3 cùng lúc -> bị chặn bởi giới hạn 2 ticket / lần
  const thirdRes = await createServiceTicketFromModal(
    { guild, user: { id: 'cust_1', username: 'kimnong' } },
    client,
    { mode: 'buy', rawInput: 'chinese' },
  );
  assert.equal(thirdRes.ok, false);
  assert.ok(thirdRes.errorMessage.includes('2/2'));

  // 4. SP chạy &nhacfb trong ticket Hỗ Trợ, sau đó khách nhắn +1 legit ở kênh feedback
  const feedbackReactions1 = [];
  await handleServiceTicketMessage(
    {
      content: '&nhacfb',
      guild,
      author: { id: 'staff_1', bot: false },
      member: {
        guild,
        roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
      },
      channel: supportRes.channel,
      delete: async () => {},
    },
    client,
  );

  let fbMsgSeq = 0;
  const feedbackChannelLog = [
    {
      id: 'old_sticky_0',
      author: { id: client.user.id },
      content: '',
      components: buildFeedbackStickyPayloadV2().components,
    },
  ];
  const deletedFeedbackIds = [];
  const mockFeedbackChannel = {
    id: SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID,
    guild,
    client,
    send: async (payload) => {
      fbMsgSeq += 1;
      const msg = {
        id: `sticky_${fbMsgSeq}`,
        author: { id: client.user.id },
        ...payload,
      };
      feedbackChannelLog.push(msg);
      return msg;
    },
    messages: {
      fetch: async () => new Collection(feedbackChannelLog.map((m) => [m.id, m])),
      delete: async (id) => {
        deletedFeedbackIds.push(id);
        const idx = feedbackChannelLog.findIndex((m) => m.id === id);
        if (idx !== -1) feedbackChannelLog.splice(idx, 1);
      },
    },
  };

  let memberMsgDeleted = false;
  await handleServiceTicketMessage(
    {
      id: 'fb_msg_1',
      content: '+1 legit shop siêu dễ thương',
      guild,
      author: { id: 'cust_1', bot: false },
      channel: mockFeedbackChannel,
      delete: async () => {
        memberMsgDeleted = true;
      },
      react: async (emoji) => {
        feedbackReactions1.push(emoji);
      },
    },
    client,
  );
  assert.deepEqual(feedbackReactions1, [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_1,
  ]);
  assert.equal(memberMsgDeleted, false); // Không xóa tin nhắn +1 legit của member
  assert.ok(deletedFeedbackIds.includes('old_sticky_0')); // Xóa sticky cũ bị trùng lặp của bot
  assert.equal(feedbackChannelLog.at(-1).id, 'sticky_1'); // Tin nhắn cuối kênh là sticky mới nhất

  // Thêm 1 feedback thứ 2 hợp lệ từ cust_other -> sticky_1 bị xóa, sticky_2 trở thành tin nhắn cuối kênh
  const otherBuyRes = await createServiceTicketFromModal(
    { guild, user: { id: 'cust_other', username: 'other' } },
    client,
    { mode: 'buy', rawInput: 'nitrodecor' },
  );
  await handleServiceTicketMessage(
    {
      content: '&nhacfb',
      guild,
      author: { id: 'staff_1', bot: false },
      member: {
        guild,
        roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
      },
      channel: otherBuyRes.channel,
      delete: async () => {},
    },
    client,
  );
  const feedbackReactions2 = [];
  await handleServiceTicketMessage(
    {
      id: 'fb_msg_2',
      content: '+1 legit đã mua nitro lần 2!',
      guild,
      author: { id: 'cust_other', bot: false },
      channel: mockFeedbackChannel,
      delete: async () => assert.fail('Should never delete member feedback'),
      react: async (emoji) => {
        feedbackReactions2.push(emoji);
      },
    },
    client,
  );
  assert.deepEqual(feedbackReactions2, [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_2,
  ]);
  assert.ok(deletedFeedbackIds.includes('sticky_1'));
  assert.equal(feedbackChannelLog.length, 1);
  assert.equal(feedbackChannelLog[0].id, 'sticky_2');
  assert.ok(
    supportRes.channel.sentMessages.some((m) =>
      getAllText(m).includes('ĐÃ NHẬN FEEDBACK THÀNH CÔNG'),
    ),
  );

  // 5. Xóa ticket sau feedback -> gửi DM Transcript + Log Transcript
  const delFeedbackRes = await deleteServiceTicket({
    channel: supportRes.channel,
    executor: { id: 'cust_1', tag: 'cust#1' },
    client,
    sendDmTranscript: true,
    deleteDelayMs: 0,
  });
  assert.equal(delFeedbackRes.ok, true);
  assert.equal(delFeedbackRes.dmSent, true);
  assert.equal(dmMessages.length, 1);
  assert.ok(
    getAllText(dmMessages[0].payload).includes(
      '<a:trangtrig49:1567818140375851018> Vui lòng "tải xuống - download" file transcript để lưu bản đầy đủ nhất.',
    ),
  );
  assert.equal(logMessages.length, 1);
  assert.ok(deletedChannels.includes(supportRes.channel.id));

  // 6. Nhánh không mua: &close trên buyRes.channel -> ẩn quyền, chuyển sang danh mục 1570408912480510073, không DM, xóa chỉ đẩy Log Transcript
  await closeServiceTicket({
    channel: buyRes.channel,
    executor: { id: 'staff_1' },
    client,
  });
  assert.equal(buyRes.channel.permissionEdits[0].targetId, 'cust_1');
  assert.equal(buyRes.channel.permissionEdits[0].perms.ViewChannel, false);
  assert.equal(buyRes.channel.parentId, SERVICE_TICKET_IDS.CLOSED_CATEGORY_ID);
  assert.deepEqual(buyRes.channel.parentMoves[0], {
    parentId: SERVICE_TICKET_IDS.CLOSED_CATEGORY_ID,
    options: { lockPermissions: false },
  });
  assert.equal(dmMessages.length, 1);

  const delNoBuyRes = await deleteServiceTicket({
    channel: buyRes.channel,
    executor: { id: 'staff_1', tag: 'staff#1' },
    client,
    sendDmTranscript: false,
    deleteDelayMs: 0,
  });
  assert.equal(delNoBuyRes.ok, true);
  assert.equal(delNoBuyRes.dmSent, false);
  assert.equal(dmMessages.length, 1); // Tuyệt đối không gửi DM khi đóng không mua
  assert.equal(logMessages.length, 2); // Log vẫn được gửi vào 1570357576770654289
});

test('Chinese ticket cố định SP 1212972766752542753 & lệnh &doisp đổi SP cho /ib1, /ib2', async () => {
  const client = createMemoryDbClient();
  const { guild } = createMockGuild({ client, staffIds: ['staff_1', 'staff_2'] });
  const dmSentPayloads = [];
  const targetUser = {
    id: 'cust_cn_1',
    send: async (payload) => {
      dmSentPayloads.push(payload);
      return payload;
    },
  };

  // 1. Tạo ticket dịch vụ chinese -> luôn tag 1212972766752542753
  const cnRes = await createServiceTicketFromModal(
    { guild, user: { id: 'cust_cn_1', username: 'hocvien' } },
    client,
    { mode: 'buy', rawInput: 'chinese - học giao tiếp' },
  );
  assert.equal(cnRes.ok, true);
  assert.equal(cnRes.ticketRecord.assignedStaffId, SERVICE_TICKET_IDS.CHINESE_SUPPORT_USER_ID);
  assert.ok(
    cnRes.channel.sentMessages[1].content.includes(
      `<@${SERVICE_TICKET_IDS.CHINESE_SUPPORT_USER_ID}> sẽ là hỗ trợ chính cho ticket này`,
    ),
  );

  // 2. Tạo ticket codebot -> ban đầu random 1 trong staff_1 / staff_2, sau đó dùng &doisp đổi sang người còn lại
  const botRes = await createServiceTicketFromModal(
    { guild, user: { id: 'cust_cn_1', username: 'hocvien' } },
    client,
    { mode: 'buy', rawInput: 'codebot - bot ticket' },
  );
  assert.equal(botRes.ok, true);
  const initialStaff = botRes.ticketRecord.assignedStaffId;
  assert.ok(['staff_1', 'staff_2'].includes(initialStaff));

  let doispDeleted = false;
  const doispHandled = await handleServiceTicketMessage(
    {
      content: '&doisp',
      guild,
      author: { id: 'staff_1', bot: false },
      member: {
        guild,
        roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
      },
      channel: botRes.channel,
      delete: async () => {
        doispDeleted = true;
      },
    },
    client,
  );
  assert.equal(doispHandled, true);
  assert.equal(doispDeleted, true);

  const expectedNewStaff = initialStaff === 'staff_1' ? 'staff_2' : 'staff_1';
  const latestStaffMsg = botRes.channel.sentMessages.at(-1);
  assert.equal(
    latestStaffMsg.content,
    buildAssignedStaffMessage({ staffId: expectedNewStaff }).content,
  );

  // 3. /ib1 và /ib2 khi gửi DM sẽ dùng SP mới vừa đổi từ &doisp
  const makeInteraction = (channel) => ({
    guild,
    guildId: guild.id,
    channel,
    user: { id: 'staff_1' },
    member: {
      guild,
      roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
    },
    deferReply: async () => {},
    editReply: async () => {},
    reply: async () => {},
  });

  await sendServiceDeliveryNotice({
    interaction: makeInteraction(botRes.channel),
    client,
    targetUser,
    variant: 'bot',
  });
  assert.ok(getAllText(dmSentPayloads[0]).includes(`<@${expectedNewStaff}>`));

  await sendServiceDeliveryNotice({
    interaction: makeInteraction(botRes.channel),
    client,
    targetUser,
    variant: 'nitro',
  });
  assert.ok(getAllText(dmSentPayloads[1]).includes(`<@${expectedNewStaff}>`));

  // 4. /ib3 luôn nhắc cố định 1212972766752542753
  await sendServiceDeliveryNotice({
    interaction: makeInteraction(cnRes.channel),
    client,
    targetUser,
    variant: 'chinese',
  });
  assert.ok(getAllText(dmSentPayloads[2]).includes(`<@${SERVICE_TICKET_IDS.CHINESE_SUPPORT_USER_ID}>`));
});

test('Feedback +1 legit không có đơn hàng: reply đúng người đó và tự xóa sau 5s, không xóa nhầm người khác', async () => {
  const client = createMemoryDbClient();
  const { guild } = createMockGuild({ client, staffIds: ['staff_1'] });

  // Tạo 1 ticket hợp lệ cho cust_valid đang chờ feedback
  const validRes = await createServiceTicketFromModal(
    { guild, user: { id: 'cust_valid', username: 'valid' } },
    client,
    { mode: 'buy', rawInput: 'nitrodecor' },
  );
  await handleServiceTicketMessage(
    {
      content: '&nhacfb',
      guild,
      author: { id: 'staff_1', bot: false },
      member: {
        guild,
        roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
      },
      channel: validRes.channel,
      delete: async () => {},
    },
    client,
  );

  const feedbackChannel = {
    id: SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID,
    guild,
    client,
    sentStickies: [],
    send: async (payload) => {
      const msg = { id: `sticky_${feedbackChannel.sentStickies.length + 1}`, author: { id: client.user.id }, ...payload };
      feedbackChannel.sentStickies.push(msg);
      return msg;
    },
    messages: { fetch: async () => new Collection() },
  };

  // Khách A không có đơn hàng gửi +1 legit
  const deletedOrder = [];
  let invalidReacted = false;
  let invalidReplyPayload = null;
  let invalidReplyDeleted = false;
  let invalidMsgDeleted = false;

  await handleServiceTicketFeedbackMessage(
    {
      id: 'fb_invalid_1',
      content: '+1 legit test chui',
      guild,
      author: { id: 'cust_invalid_1', bot: false },
      channel: feedbackChannel,
      react: async () => {
        invalidReacted = true;
      },
      reply: async (payload) => {
        invalidReplyPayload = payload;
        return {
          id: 'bot_reply_invalid_1',
          delete: async () => {
            invalidReplyDeleted = true;
            deletedOrder.push('bot_reply_invalid_1');
          },
        };
      },
      delete: async () => {
        invalidMsgDeleted = true;
        deletedOrder.push('fb_invalid_1');
      },
    },
    client,
    { invalidDeleteDelayMs: 25 },
  );

  assert.equal(invalidReacted, false);
  assert.equal(feedbackChannel.sentStickies.length, 0);
  assert.equal(invalidReplyPayload?.content, INVALID_FEEDBACK_REPLY_TEXT);
  assert.equal(invalidMsgDeleted, false); // Chưa xóa ngay trước khi hết thời gian chờ

  // Trong thời gian chờ, khách B (có đơn hợp lệ) gửi +1 legit -> KHÔNG bao giờ bị xóa nhầm và đếm từ số 1
  const validReactions = [];
  await handleServiceTicketFeedbackMessage(
    {
      id: 'fb_valid_1',
      content: '+1 legit shop uy tin',
      guild,
      author: { id: 'cust_valid', bot: false },
      channel: feedbackChannel,
      react: async (emoji) => {
        validReactions.push(emoji);
      },
      delete: async () => assert.fail('Không được xóa tin nhắn hợp lệ của khách khác'),
    },
    client,
    { invalidDeleteDelayMs: 25 },
  );
  assert.deepEqual(validReactions, [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_1,
  ]);

  assert.deepEqual(buildFeedbackReactionSequence(10), [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_1,
    SERVICE_TICKET_EMOJIS.NUM_0,
  ]);
  assert.deepEqual(buildFeedbackReactionSequence(98), [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_9,
    SERVICE_TICKET_EMOJIS.NUM_8,
  ]);
  assert.deepEqual(buildFeedbackReactionSequence(11), [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_1,
    SERVICE_TICKET_EMOJIS.NUM_1_ALT,
  ]);
  assert.deepEqual(buildFeedbackReactionSequence(100), [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_1,
    SERVICE_TICKET_EMOJIS.NUM_0,
    SERVICE_TICKET_EMOJIS.NUM_0_ALT,
  ]);
  // Nếu server hoặc Application Emojis có thêm bộ thứ 3/4 (vd 1_3, 1_4 hoặc up lại file gốc), resolveGuildDigitEmojiMap tự ghép không dùng Unicode
  const customGuildDigitMap = await resolveGuildDigitEmojiMap(
    {
      id: 'guild_custom_digits',
      emojis: {
        fetch: async () => new Collection([
          ['9001', { id: '9001', name: '1_3', animated: true }],
          ['9002', { id: '9002', name: 'trangtrig60', animated: true }], // không nhận nhầm emoji trang trí
        ]),
      },
    },
    {
      application: {
        emojis: {
          fetch: async () => new Collection([
            ['9003', { id: '9003', name: '1563484001765949550_4', animated: true }],
          ]),
        },
      },
    },
  );
  assert.deepEqual(buildFeedbackReactionSequence(1111, customGuildDigitMap), [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_1,
    SERVICE_TICKET_EMOJIS.NUM_1_ALT,
    '<a:1_3:9001>',
    '<a:1563484001765949550_4:9003>',
  ]);

  // Đợi quá thời gian 25ms để timer dọn đúng tin nhắn của cust_invalid_1
  await new Promise((resolve) => setTimeout(resolve, 60));

  assert.equal(invalidMsgDeleted, true);
  assert.equal(invalidReplyDeleted, true);
  assert.deepEqual(deletedOrder, ['fb_invalid_1', 'bot_reply_invalid_1']);
});

test('Feedback +1 legit không kèm tên sản phẩm vẫn hợp lệ; gõ sai cú pháp (+1 legt, +1 le, + 1 legit) thì nhắc & xóa sau 5s; +1 trơn thì bỏ qua', async () => {
  // 1. Kiểm tra bộ phân loại cú pháp
  assert.equal(classifyFeedbackLegitMessage('+1 legit'), 'valid');
  assert.equal(classifyFeedbackLegitMessage('+1 legit bot discord'), 'valid');
  assert.equal(classifyFeedbackLegitMessage('+1legit'), 'valid');

  assert.equal(classifyFeedbackLegitMessage('+1 legt'), 'invalid_syntax');
  assert.equal(classifyFeedbackLegitMessage('+1 le'), 'invalid_syntax');
  assert.equal(classifyFeedbackLegitMessage('+1 leg'), 'invalid_syntax');
  assert.equal(classifyFeedbackLegitMessage('+1 lehit'), 'invalid_syntax');
  assert.equal(classifyFeedbackLegitMessage('+ 1 legit'), 'invalid_syntax');
  assert.equal(classifyFeedbackLegitMessage('1 legit'), 'invalid_syntax');
  assert.equal(classifyFeedbackLegitMessage('+legit'), 'invalid_syntax');

  assert.equal(classifyFeedbackLegitMessage('+1'), 'ignore');
  assert.equal(classifyFeedbackLegitMessage('+ 1'), 'ignore');
  assert.equal(classifyFeedbackLegitMessage('+1 cam on shop'), 'ignore');
  assert.equal(classifyFeedbackLegitMessage('shop nay uy tin qua'), 'ignore');

  // 2. Luồng xử lý thực tế tại kênh feedback
  const client = createMemoryDbClient();
  const { guild } = createMockGuild({ client, staffIds: ['staff_1'] });

  const buyRes = await createServiceTicketFromModal(
    { guild, user: { id: 'cust_ok', username: 'khachok' } },
    client,
    { mode: 'buy', rawInput: 'codebot' },
  );
  await handleServiceTicketMessage(
    {
      content: '&nhacfb',
      guild,
      author: { id: 'staff_1', bot: false },
      member: {
        guild,
        roles: { cache: new Collection([[SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID, {}]]) },
      },
      channel: buyRes.channel,
      delete: async () => {},
    },
    client,
  );

  const feedbackChannel = {
    id: SERVICE_TICKET_IDS.FEEDBACK_CHANNEL_ID,
    guild,
    client,
    sentStickies: [],
    send: async (payload) => {
      const msg = { id: `sticky_${feedbackChannel.sentStickies.length + 1}`, author: { id: client.user.id }, ...payload };
      feedbackChannel.sentStickies.push(msg);
      return msg;
    },
    messages: { fetch: async () => new Collection() },
  };

  // +1 trơn -> bỏ qua hoàn toàn (không rep, không xóa)
  const plainHandled = await handleServiceTicketFeedbackMessage(
    {
      id: 'fb_plain',
      content: '+1',
      guild,
      author: { id: 'cust_ok', bot: false },
      channel: feedbackChannel,
      reply: async () => assert.fail('Không được rep khi chỉ ghi +1 trơn'),
      delete: async () => assert.fail('Không được xóa khi chỉ ghi +1 trơn'),
    },
    client,
    { invalidDeleteDelayMs: 25 },
  );
  assert.equal(plainHandled, false);

  // +1 legt -> nhắc sai cú pháp và tự xóa đúng tin nhắn sai đó + reply của bot sau 5s
  let syntaxReplyPayload = null;
  let syntaxMsgDeleted = false;
  let syntaxReplyDeleted = false;
  const syntaxHandled = await handleServiceTicketFeedbackMessage(
    {
      id: 'fb_typo_1',
      content: '+1 legt',
      guild,
      author: { id: 'cust_ok', bot: false },
      channel: feedbackChannel,
      react: async () => assert.fail('Không được react khi sai cú pháp'),
      reply: async (payload) => {
        syntaxReplyPayload = payload;
        return {
          id: 'bot_syntax_reply_1',
          delete: async () => {
            syntaxReplyDeleted = true;
          },
        };
      },
      delete: async () => {
        syntaxMsgDeleted = true;
      },
    },
    client,
    { invalidDeleteDelayMs: 25 },
  );
  assert.equal(syntaxHandled, true);
  assert.equal(syntaxReplyPayload?.content, INVALID_FEEDBACK_SYNTAX_REPLY_TEXT);
  assert.equal(feedbackChannel.sentStickies.length, 0);

  // Ngay trong lúc chờ 5s, khách nhắn lại đúng "+1 legit" (không kèm tên sản phẩm) -> hợp lệ, vẫn nhận diện & react bình thường!
  const okReactions = [];
  const validNoProductHandled = await handleServiceTicketFeedbackMessage(
    {
      id: 'fb_valid_no_prod',
      content: '+1 legit',
      guild,
      author: { id: 'cust_ok', bot: false },
      channel: feedbackChannel,
      react: async (emoji) => {
        okReactions.push(emoji);
      },
      delete: async () => assert.fail('Không được xóa tin nhắn +1 legit hợp lệ'),
    },
    client,
    { invalidDeleteDelayMs: 25 },
  );
  assert.equal(validNoProductHandled, true);
  assert.deepEqual(okReactions, [
    SERVICE_TICKET_EMOJIS.FEEDBACK_REACT,
    SERVICE_TICKET_EMOJIS.NUM_1,
  ]);
  assert.equal(feedbackChannel.sentStickies.length, 1);

  await new Promise((resolve) => setTimeout(resolve, 60));
  assert.equal(syntaxMsgDeleted, true);
  assert.equal(syntaxReplyDeleted, true);
});
