import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProfileData,
  findProfileByQuery,
  buildProfilePayloadV2,
  buildTicketWelcomePayloadV2,
  buildRefusalPayloadV2,
  buildRatingPayloadV2,
  buildClosedTicketPayloadV2,
  handleBookingMessage,
  IS_COMPONENTS_V2,
} from '../src/services/bookingService.js';
import { BOOKING_EMOJIS } from '../src/config/bookingConfig.js';

test('Booking Config: Profile 1 khởi tạo chính xác theo yêu cầu', () => {
  const profile = getProfileData('1');
  assert.equal(profile.id, '1');
  assert.equal(profile.userId, '852947314481299516');
  assert.equal(profile.nickname, 'Công Chúa Sắc Nâu');
  assert.ok(profile.game.includes('Kéo rank thua có quạu'));
  assert.equal(profile.price, 'Deal');
  assert.equal(profile.images.length, 2);

  // Tìm kiếm theo query linh hoạt
  const byMention = findProfileByQuery('<@852947314481299516>');
  assert.equal(byMention.id, '1');

  const byName = findProfileByQuery('Công Chúa Sắc Nâu');
  assert.equal(byName.id, '1');
});

test('Booking Config: Profile 2 (Ăn Thịt Bé Trai) khởi tạo chính xác theo yêu cầu', () => {
  const profile = getProfileData('2');
  assert.equal(profile.id, '2');
  assert.equal(profile.userId, '1212972766752542753');
  assert.equal(profile.nickname, 'Ăn Thịt Bé Trai');
  assert.ok(profile.game.includes('Only LOL/TFT, mãi mãi FAN T1'));
  assert.equal(profile.price, 'Deal');
  assert.equal(profile.images.length, 2);
  assert.ok(profile.images[0].includes('hw2anh1.jpg'));
  assert.ok(profile.images[1].includes('hw2anh2.jpg'));

  // Tìm kiếm theo query linh hoạt
  const byMention = findProfileByQuery('<@1212972766752542753>');
  assert.equal(byMention.id, '2');

  const byName = findProfileByQuery('Ăn Thịt Bé Trai');
  assert.equal(byName.id, '2');

  const byId = findProfileByQuery('2');
  assert.equal(byId.id, '2');
});

test('Giao diện V2 Profile Card: màu gốc, không title, không footer, đúng emoji', () => {
  const profile = getProfileData('1');
  const payload = buildProfilePayloadV2(profile, 0);

  assert.equal(payload.flags, IS_COMPONENTS_V2);
  const container = payload.components[0];
  assert.equal(container.type, 17);
  assert.equal(container.accent_color, undefined); // Màu gốc mặc định

  // Text 1: Header
  const text1 = container.components[0];
  assert.ok(text1.content.includes(BOOKING_EMOJIS.HEADER_L1));
  assert.ok(text1.content.includes('**HEALING WHISPER - 1**'));
  assert.ok(text1.content.includes(BOOKING_EMOJIS.HEADER_R1));

  // Text 2: Info
  const text2 = container.components[2];
  assert.ok(text2.content.includes('<@852947314481299516>'));
  assert.ok(text2.content.includes('Công Chúa Sắc Nâu'));
  assert.ok(text2.content.includes('Game: Nhận mọi game'));
  assert.ok(text2.content.includes('Giá: Deal'));

  // Media Gallery: 2 ảnh
  const gallery = container.components[4];
  assert.equal(gallery.type, 12);
  assert.ok(gallery.items[0].media.url.includes('hw1anh1.jpg'));

  // Action Row 1: Lướt ảnh và 5/5
  const row1 = container.components[5];
  assert.equal(row1.components[0].label, '❮❮');
  assert.ok(row1.components[0].custom_id.startsWith('hw_prev:'));
  assert.equal(row1.components[1].label, '1/2');
  assert.equal(row1.components[2].label, '❯❯');
  assert.ok(row1.components[2].custom_id.startsWith('hw_next:'));
  assert.notEqual(row1.components[0].custom_id, row1.components[2].custom_id, 'Custom ID phải khác nhau không bị trùng');
  assert.equal(row1.components[3].label, '5/5');
  assert.deepEqual(row1.components[3].emoji, BOOKING_EMOJIS.HEART_BUTTON);

  // Action Row 2: Book và Tim
  const row2 = container.components[6];
  assert.equal(row2.components[0].label, 'Book');
  assert.deepEqual(row2.components[0].emoji, BOOKING_EMOJIS.HEART_BUTTON);
  assert.deepEqual(row2.components[1].emoji, BOOKING_EMOJIS.HEART_BUTTON);

  // Kiểm tra tính duy nhất tuyệt đối của tất cả custom_id
  const allCustomIds = [
    ...row1.components.map((c) => c.custom_id),
    ...row2.components.map((c) => c.custom_id),
  ];
  const uniqueIds = new Set(allCustomIds);
  assert.equal(uniqueIds.size, allCustomIds.length, 'Tất cả custom_id trong component phải là duy nhất');
});

test('Giao diện V2 Booking Thành Công: chuẩn emoji và 3 nút xám', () => {
  const profile = getProfileData('1');
  const payload = buildTicketWelcomePayloadV2(profile, '999888', 'Kéo rank FF');

  assert.equal(payload.flags, IS_COMPONENTS_V2);
  const container = payload.components[0];
  assert.equal(container.type, 17);
  assert.equal(container.accent_color, undefined);

  const text1 = container.components[0];
  assert.ok(text1.content.includes('**BOOKING THÀNH CÔNG**'));

  const text2 = container.components[2];
  assert.ok(text2.content.includes('<@999888> | ID: 999888'));
  assert.ok(text2.content.includes('Healing Whisper: 1 - <@852947314481299516>'));
  assert.ok(text2.content.includes('Mục đích: Kéo rank FF'));
  assert.ok(text2.content.includes('Trạng thái: Đang trong phiên kết nối'));

  const text3 = container.components[4];
  assert.ok(text3.content.includes('&taokenhvoice'));

  const row = container.components[5];
  assert.equal(row.components.length, 3);
  assert.equal(row.components[0].label, 'Mở đánh giá');
  assert.deepEqual(row.components[0].emoji, BOOKING_EMOJIS.ACTION_BUTTON);
  assert.equal(row.components[1].label, 'Từ chối khách');
  assert.deepEqual(row.components[1].emoji, BOOKING_EMOJIS.ACTION_BUTTON);
  assert.equal(row.components[2].label, 'Đóng ticket');
  assert.deepEqual(row.components[2].emoji, BOOKING_EMOJIS.ACTION_BUTTON);
});

test('Giao diện V2 Từ Chối Khách: Giống bảng đánh giá khi kết thúc ticket', () => {
  const profile = getProfileData('1');
  const payload = buildRefusalPayloadV2(profile, '999888');
  assert.equal(payload.flags, IS_COMPONENTS_V2);

  const container = payload.components[0];
  const text1 = container.components[0];
  assert.ok(text1.content.includes('**ĐÁNH GIÁ**'));

  const text2 = container.components[2];
  assert.ok(text2.content.includes('xin mời <@999888> feedback cho Healing Whisper - 1'));
  assert.ok(text2.content.includes('Nếu không đánh giá bạn sẽ bị vào blacklist và bị ban khỏi server!'));

  const row = container.components[3];
  assert.equal(row.components.length, 5);
  assert.equal(row.components[0].label, '1 ⭐');
  assert.equal(row.components[4].label, '5 ⭐');
});

test('Giao diện V2 Bảng Đánh Giá: lời nhắn cảnh báo blacklist & 5 nút sao xám', () => {
  const profile = getProfileData('1');
  const payload = buildRatingPayloadV2(profile, '999888');

  assert.equal(payload.flags, IS_COMPONENTS_V2);
  const container = payload.components[0];
  const text1 = container.components[0];
  assert.ok(text1.content.includes('**ĐÁNH GIÁ**'));

  const text2 = container.components[2];
  assert.ok(text2.content.includes('xin mời <@999888> feedback cho Healing Whisper - 1'));
  assert.ok(text2.content.includes('Nếu không đánh giá bạn sẽ bị vào blacklist và bị ban khỏi server!'));

  const row = container.components[3];
  assert.equal(row.components.length, 5);
  assert.equal(row.components[0].label, '1 ⭐');
  assert.equal(row.components[4].label, '5 ⭐');
});

test('MessageCreate Trigger: &pro5 xóa tin nhắn lệnh và gửi card profile', async () => {
  let deleted = false;
  let sentPayload = null;

  const mockMessage = {
    content: '&pro5 <@852947314481299516>',
    author: { id: 'admin123' },
    delete: async () => {
      deleted = true;
    },
    channel: {
      send: async (p) => {
        sentPayload = p;
        return p;
      },
    },
  };

  const handled = await handleBookingMessage(mockMessage, {});
  assert.equal(handled, true);
  assert.equal(deleted, true);
  assert.ok(sentPayload);
  assert.equal(sentPayload.flags, IS_COMPONENTS_V2);
});

test('Quyền Admin Booking: nhận diện chuẩn role 1568554130371383306, modRole và Bot Owner', async () => {
  const { isBookingAdmin } = await import('../src/services/bookingService.js');
  const { BOOKING_ADMIN_ROLE_ID, BOOKING_SUPPORT_ROLE_ID, BOOKING_CATEGORY_ID, BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  assert.equal(BOOKING_ADMIN_ROLE_ID, '1568554130371383306');
  assert.equal(BOOKING_SUPPORT_ROLE_ID, '1568554130371383306');
  assert.equal(BOOKING_CATEGORY_ID, '1568554690923331695');
  assert.equal(BOOKING_LOG_CHANNEL_ID, '1568555066976116827');

  // Member có role admin trong cache
  const memberWithAdminRole = {
    roles: {
      cache: new Set([BOOKING_ADMIN_ROLE_ID]),
    },
  };
  assert.equal(await isBookingAdmin(memberWithAdminRole, 'normalUser'), true);

  // Member có role support trong cache
  const memberWithSupportRole = {
    roles: {
      cache: new Set([BOOKING_SUPPORT_ROLE_ID]),
    },
  };
  assert.equal(await isBookingAdmin(memberWithSupportRole, 'normalUser'), true);

  // Member có role admin trong mảng _roles
  const memberWithRawRoles = {
    _roles: [BOOKING_ADMIN_ROLE_ID],
  };
  assert.equal(await isBookingAdmin(memberWithRawRoles, 'normalUser'), true);

  // User không có quyền
  const normalMember = {
    roles: {
      cache: new Set(['otherRole']),
    },
    permissions: {
      has: () => false,
    },
  };
  assert.equal(await isBookingAdmin(normalMember, 'normalUser'), false);
});

test('Giao diện V2 Log Ticket Open & Close: đúng chuẩn V2, emoji server, không footer', async () => {
  const { buildTicketOpenLogV2, buildTicketCloseLogV2 } = await import('../src/services/bookingService.js');
  const { BOOKING_EMOJIS } = await import('../src/config/bookingConfig.js');
  const profile = getProfileData('1');

  // 1. Log Open
  const openLog = buildTicketOpenLogV2({
    channelId: '111222333',
    channelName: 'ticket-hw1-customer',
    profile,
    renterId: '999888',
    purpose: 'Kéo rank leo thách đấu',
  });
  assert.equal(openLog.flags, IS_COMPONENTS_V2);
  const openContainer = openLog.components[0];
  assert.equal(openContainer.type, 17);
  assert.equal(openContainer.accent_color, undefined);
  assert.ok(openContainer.components[0].content.includes('TICKET CREATED'));
  assert.ok(openContainer.components[0].content.includes(BOOKING_EMOJIS.LOG_HEADER_L));
  assert.ok(openContainer.components[2].content.includes('<@999888>'));
  assert.ok(openContainer.components[4].content.includes('Kéo rank leo thách đấu'));

  // 2. Log Close
  const closeLog = buildTicketCloseLogV2({
    channelName: 'ticket-hw1-customer',
    profile,
    renterId: '999888',
    closerId: '123456',
    reason: 'Đã hoàn thành phiên giao lưu',
  });
  assert.equal(closeLog.flags, IS_COMPONENTS_V2);
  const closeContainer = closeLog.components[0];
  assert.equal(closeContainer.type, 17);
  assert.equal(closeContainer.accent_color, undefined);
  assert.ok(closeContainer.components[0].content.includes('TICKET CLOSED'));
  assert.ok(closeContainer.components[0].content.includes(BOOKING_EMOJIS.LOG_HEADER_L));
  assert.ok(closeContainer.components[2].content.includes('#ticket-hw1-customer'));
  assert.ok(closeContainer.components[2].content.includes('<@999888>'));
  assert.ok(closeContainer.components[2].content.includes('<@123456>'));
  assert.ok(closeContainer.components[4].content.includes('Đã hoàn thành phiên giao lưu'));
});

test('closeBookingTicket: ẩn quyền xem của khách, giữ quyền role admin và KHÔNG gửi transcript', async () => {
  const { closeBookingTicket } = await import('../src/services/bookingService.js');
  const { BOOKING_ADMIN_ROLE_ID, BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  const overwrittenPerms = new Map();
  let ticketSentMessage = null;
  let logSentMessage = null;
  let fetchCalled = false;

  const mockChannel = {
    name: 'mw1-hw1-alice',
    id: 'ticket_channel_123',
    topic: 'Ticket của <@renter_user_id> | RenterID: renter_user_id | HW: 1',
    guild: {
      id: 'guild123',
      channels: {
        cache: new Map([
          [
            BOOKING_LOG_CHANNEL_ID,
            {
              id: BOOKING_LOG_CHANNEL_ID,
              send: async (msg) => {
                logSentMessage = msg;
                return msg;
              },
            },
          ],
        ]),
      },
    },
    permissionOverwrites: {
      cache: [
        { type: 1, id: 'renter_user_id' }, // Khách thuê
      ],
      edit: async (targetId, perms) => {
        overwrittenPerms.set(targetId, perms);
      },
    },
    messages: {
      fetch: async () => {
        fetchCalled = true;
        return new Map();
      },
    },
    send: async (msg) => {
      ticketSentMessage = msg;
      return msg;
    },
  };

  const closer = { id: 'admin_user_id' };
  const client = { user: { id: 'bot_id' } };

  const result = await closeBookingTicket({
    channel: mockChannel,
    closer,
    client,
    reason: 'Đóng ticket hoàn tất phiên',
  });

  assert.equal(result.success, true);
  assert.equal(result.renterId, 'renter_user_id');
  assert.equal(result.transcriptFiles.length, 0);
  assert.equal(fetchCalled, false, 'Đóng ticket mặc định không được tạo transcript');

  // Khách bị ẩn quyền xem và gửi tin
  assert.deepEqual(overwrittenPerms.get('renter_user_id'), {
    ViewChannel: false,
    SendMessages: false,
  });

  // Role Admin Booking vẫn có quyền xem
  assert.equal(overwrittenPerms.get(BOOKING_ADMIN_ROLE_ID).ViewChannel, true);

  // Kênh ticket nhận được thông báo đóng KHÔNG kèm transcript
  assert.ok(ticketSentMessage);
  assert.equal(ticketSentMessage.flags, IS_COMPONENTS_V2);
  assert.equal(ticketSentMessage.files?.length || 0, 0);

  // Kênh log nhận được log V2 KHÔNG kèm transcript
  assert.ok(logSentMessage);
  assert.equal(logSentMessage.flags, IS_COMPONENTS_V2);
  assert.ok(logSentMessage.components[0].components[0].content.includes('TICKET CLOSED'));
  assert.equal(logSentMessage.files?.length || 0, 0);
});

test('reopenBookingTicket: khôi phục quyền cho khách và gửi log V2', async () => {
  const { reopenBookingTicket } = await import('../src/services/bookingService.js');
  const { BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  const restoredPerms = new Map();
  let ticketSentMessage = null;
  let logSentMessage = null;

  const mockChannel = {
    name: 'ticket-hw2-bob',
    id: 'ticket_channel_456',
    guild: {
      id: 'guild123',
      channels: {
        cache: new Map([
          [
            BOOKING_LOG_CHANNEL_ID,
            {
              id: BOOKING_LOG_CHANNEL_ID,
              send: async (msg) => {
                logSentMessage = msg;
                return msg;
              },
            },
          ],
        ]),
      },
    },
    permissionOverwrites: {
      cache: [
        { type: 1, id: 'renter_bob_id' },
      ],
      edit: async (targetId, perms) => {
        restoredPerms.set(targetId, perms);
      },
    },
    send: async (msg) => {
      ticketSentMessage = msg;
      return msg;
    },
  };

  const executor = { id: 'admin_user_id' };
  const client = { user: { id: 'bot_id' } };

  const result = await reopenBookingTicket({
    channel: mockChannel,
    executor,
    client,
    sendTranscriptBackup: false,
  });

  assert.equal(result.success, true);
  assert.equal(result.renterId, 'renter_bob_id');

  // Khách được cấp lại quyền đầy đủ
  assert.deepEqual(restoredPerms.get('renter_bob_id'), {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
  });

  // Thông báo mở lại gửi vào ticket
  assert.ok(ticketSentMessage);
  assert.equal(ticketSentMessage.flags, IS_COMPONENTS_V2);
  assert.ok(ticketSentMessage.components[0].components[0].content.includes('TICKET ĐÃ ĐƯỢC MỞ LẠI'));

  // Log gửi vào kênh log 1568555066976116827
  assert.ok(logSentMessage);
  assert.equal(logSentMessage.flags, IS_COMPONENTS_V2);
  assert.ok(logSentMessage.components[0].components[0].content.includes('TICKET REOPENED'));
});

test('deleteBookingTicket: lưu transcript V2 kèm File component (type 13) trước khi xóa kênh', async () => {
  const { deleteBookingTicket } = await import('../src/services/bookingService.js');
  const { BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  let logSentMessage = null;

  const mockChannel = {
    name: 'mw1-hw1-delete',
    id: 'ticket_channel_del',
    topic: 'Ticket của <@renter_del_id> | RenterID: renter_del_id | HW: 1',
    guild: {
      id: 'guild123',
      channels: {
        cache: new Map([
          [
            BOOKING_LOG_CHANNEL_ID,
            {
              id: BOOKING_LOG_CHANNEL_ID,
              send: async (msg) => {
                logSentMessage = msg;
                return msg;
              },
            },
          ],
        ]),
      },
    },
    permissionOverwrites: {
      cache: [
        { type: 1, id: 'renter_del_id' },
      ],
    },
    messages: {
      fetch: async () => new Map([
        [
          'msg1',
          {
            id: 'msg1',
            content: 'Tin nhắn test transcript',
            createdTimestamp: Date.now(),
            author: { tag: 'tester#0001', id: 'renter_del_id', bot: false },
            embeds: [],
            attachments: new Map(),
          },
        ],
      ]),
    },
    delete: async () => {},
  };

  const executor = { id: 'admin_user_id' };
  const client = { user: { id: 'bot_id' } };

  const result = await deleteBookingTicket({
    channel: mockChannel,
    executor,
    client,
    reason: 'Đã hoàn tất phiên',
  });

  assert.equal(result.success, true);
  assert.equal(result.transcriptFiles?.length, 1);
  assert.ok(logSentMessage);
  assert.equal(logSentMessage.flags, IS_COMPONENTS_V2);
  assert.ok(logSentMessage.components[0].components[0].content.includes('TICKET DELETED'));
  assert.equal(logSentMessage.files?.length, 1);
  assert.equal(logSentMessage.files[0].name, 'transcript-mw1-hw1-delete.html');

  const fileComponent = logSentMessage.components[0].components.find((c) => c.type === 13);
  assert.ok(fileComponent, 'Payload V2 kèm file bắt buộc phải có ComponentType.File (type: 13)');
  assert.equal(fileComponent.file?.url, 'attachment://transcript-mw1-hw1-delete.html');
});

test('Yêu cầu 1: Thứ tự emoji chuẩn trong tất cả title booking', async () => {
  const { BOOKING_EMOJIS } = await import('../src/config/bookingConfig.js');
  const profile = getProfileData('1');
  const payload = buildProfilePayloadV2(profile, 0);

  const titleContent = payload.components[0].components[0].content;
  const expectedPrefix = `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2}`;
  const expectedSuffix = `${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`;

  assert.ok(titleContent.startsWith(expectedPrefix));
  assert.ok(titleContent.endsWith(expectedSuffix));
  assert.ok(expectedSuffix.includes('<a:trangtrig53:1567819189866201219><a:trangtrig51:1567818549794439229>'));
});

test('Yêu cầu 1 mới: Khoảng cách emoji đối xứng và sát nhau chuẩn xác ở cả 2 phía', () => {
  const profile = getProfileData('1');
  const payload = buildProfilePayloadV2(profile, 0);
  const title = payload.components[0].components[0].content;

  const leftPair = `${BOOKING_EMOJIS.HEADER_L1}${BOOKING_EMOJIS.HEADER_L2}`;
  const rightPair = `${BOOKING_EMOJIS.HEADER_R1}${BOOKING_EMOJIS.HEADER_R2}`;

  assert.ok(title.startsWith(`${leftPair} `));
  assert.ok(title.endsWith(` ${rightPair}`));
  assert.equal(rightPair, '<a:trangtrig53:1567819189866201219><a:trangtrig51:1567818549794439229>');
});

test('Yêu cầu 2 mới: Bắt đầu từ 0 tim, giới hạn 10 tim/user vĩnh viễn và lưu trữ dữ liệu bền vững', async () => {
  const { addProfileLike, addProfileRating } = await import('../src/services/bookingService.js');
  const profile = getProfileData('1');

  // Khởi tạo nhãn nút tim là '0'
  const payload = buildProfilePayloadV2(profile, 0);
  const heartButton = payload.components[0].components[6].components[1];
  assert.equal(heartButton.label, '0');

  // User 1 thả tim 10 lần liên tiếp -> Đều thành công
  const testUserId = 'test_user_999';
  for (let i = 1; i <= 10; i++) {
    const res = addProfileLike('1', testUserId);
    assert.equal(res.success, true);
    assert.equal(res.userLikes, i);
  }

  // Thả lần 11 -> Bị từ chối do đạt giới hạn tối đa
  const res11 = addProfileLike('1', testUserId);
  assert.equal(res11.success, false);
  assert.equal(res11.reason, 'MAX_REACHED');
  assert.equal(res11.userLikes, 10);

  // User khác vẫn có thể thả tim bình thường
  const resOther = addProfileLike('1', 'another_user_888');
  assert.equal(resOther.success, true);
  assert.equal(resOther.userLikes, 1);

  // Thử nghiệm đánh giá 5 sao
  const rateRes = addProfileRating('1', 5);
  assert.equal(rateRes.success, true);
  assert.equal(rateRes.rating, '5/5');
});

test('Yêu cầu 5: findRenterIdFromChannel nhận diện đúng chủ ticket ngay cả khi executor là người tạo', async () => {
  const { findRenterIdFromChannel } = await import('../src/services/bookingService.js');
  const profile = getProfileData('2');
  const client = { user: { id: 'bot_123' } };

  // Trường hợp như trong ảnh: East (872792190651334707) tạo ticket và chính East xóa bằng /clear
  const channelWithTopic = {
    name: 'ticket-hw2-emchanh9',
    topic: 'Ticket của <@872792190651334707> | RenterID: 872792190651334707 | HW: 2',
    permissionOverwrites: {
      cache: [
        { type: 1, id: '872792190651334707' },
      ],
    },
  };

  const renterId1 = await findRenterIdFromChannel(channelWithTopic, client, profile, '872792190651334707');
  assert.equal(renterId1, '872792190651334707');

  // Trường hợp không có topic nhưng có permissionOverwrites và closer trùng renter
  const channelWithoutTopic = {
    name: 'ticket-hw2-emchanh9',
    permissionOverwrites: {
      cache: [
        { type: 1, id: '872792190651334707' },
      ],
    },
  };
  const renterId2 = await findRenterIdFromChannel(channelWithoutTopic, client, profile, '872792190651334707');
  assert.equal(renterId2, '872792190651334707');
});

test('Yêu cầu 4: Lệnh &taokenhvoice tự động tạo kênh voice riêng trong danh mục', async () => {
  const { handleBookingMessage } = await import('../src/services/bookingService.js');
  const { BOOKING_CATEGORY_ID } = await import('../src/config/bookingConfig.js');

  let createdVoiceOptions = null;
  let sentReply = null;

  const mockChannel = {
    name: 'ticket-hw1-customer',
    parentId: BOOKING_CATEGORY_ID,
    topic: 'RenterID: 999888 | HW: 1',
    guild: {
      id: 'guild_test',
      channels: {
        cache: new Map(),
        create: async (opts) => {
          createdVoiceOptions = opts;
          return { id: 'voice_room_123', name: opts.name };
        },
      },
    },
    permissionOverwrites: {
      cache: [{ type: 1, id: '999888' }],
    },
    send: async (msg) => {
      sentReply = msg;
      return msg;
    },
  };

  const mockMessage = {
    content: '&taokenhvoice',
    channel: mockChannel,
    guild: mockChannel.guild,
    author: { id: '999888' }, // Chính người thuê gõ lệnh
    member: {
      roles: { cache: new Set() },
      permissions: { has: () => false },
    },
    delete: async () => {},
  };

  const client = { user: { id: 'bot_123' } };

  const handled = await handleBookingMessage(mockMessage, client);
  assert.equal(handled, true);
  assert.ok(createdVoiceOptions);
  assert.equal(createdVoiceOptions.name, '🔊・voice-hw1-customer');
  assert.equal(createdVoiceOptions.parent, BOOKING_CATEGORY_ID);
  assert.ok(createdVoiceOptions.permissionOverwrites[0].type !== undefined);

  // Kiểm tra giao diện V2, emoji custom và loại bỏ Ban Quản Trị
  assert.equal(sentReply.flags, IS_COMPONENTS_V2);
  const container = sentReply.components[0];
  assert.equal(container.type, 17);
  const textContent = container.components[2].content;
  assert.ok(textContent.includes('voice_room_123'));
  assert.ok(!textContent.includes('Ban Quản Trị'), 'Không được chứa Ban Quản Trị trong thông báo V2');
  assert.ok(textContent.includes(BOOKING_EMOJIS.STATUS_CONNECTING));
  assert.ok(textContent.includes(BOOKING_EMOJIS.BULLET));
  
  // Nút đã kết nối phòng dùng custom emoji của server
  const actionBtn = container.components[4].components[0];
  assert.equal(actionBtn.label, 'Đã kết nối phòng');
  assert.equal(actionBtn.emoji.id, '1546043036390260756');
});

test('Slash Command /close: ẩn khách trên kênh mw...-hw..., không xóa kênh và không gửi transcript', async () => {
  const { default: closeCommand } = await import('../src/commands/Moderation/close.js');
  const { BOOKING_ADMIN_ROLE_ID, BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  let deniedReply = null;
  await closeCommand.execute(
    {
      user: { id: 'normal_user' },
      member: { roles: { cache: new Set() } },
      channel: { name: 'mw5-hw2-khach', topic: 'RenterID: 555666 | HW: 2' },
      reply: async (p) => {
        deniedReply = p;
      },
    },
    null,
    { user: { id: 'bot_123' } },
  );
  assert.ok(deniedReply?.content?.includes('Chỉ Admin'));

  let wrongChannelReply = null;
  await closeCommand.execute(
    {
      user: { id: 'admin_1' },
      member: { roles: { cache: new Set([BOOKING_ADMIN_ROLE_ID]) } },
      channel: { name: 'general-chat', topic: '' },
      reply: async (p) => {
        wrongChannelReply = p;
      },
    },
    null,
    { user: { id: 'bot_123' } },
  );
  assert.ok(wrongChannelReply?.content?.includes('/close'));

  const overwrittenPerms = new Map();
  let channelDeleted = false;
  let messagesFetched = false;
  let ticketNotice = null;
  let logNotice = null;
  let deferred = false;
  let editedReply = null;

  const ticketChannel = {
    name: 'mw5-hw2-khach',
    id: 'chan_mw5',
    topic: 'Ticket của <@555666> | RenterID: 555666 | HW: 2',
    guild: {
      id: 'guild_1',
      channels: {
        cache: new Map([
          [
            BOOKING_LOG_CHANNEL_ID,
            {
              id: BOOKING_LOG_CHANNEL_ID,
              send: async (msg) => {
                logNotice = msg;
                return msg;
              },
            },
          ],
        ]),
      },
    },
    permissionOverwrites: {
      cache: [{ type: 1, id: '555666' }],
      edit: async (targetId, perms) => {
        overwrittenPerms.set(targetId, perms);
      },
    },
    messages: {
      fetch: async () => {
        messagesFetched = true;
        return new Map();
      },
    },
    send: async (msg) => {
      ticketNotice = msg;
      return msg;
    },
    delete: async () => {
      channelDeleted = true;
    },
  };

  await closeCommand.execute(
    {
      user: { id: 'admin_1' },
      member: { roles: { cache: new Set([BOOKING_ADMIN_ROLE_ID]) } },
      channel: ticketChannel,
      get deferred() {
        return deferred;
      },
      replied: false,
      deferReply: async () => {
        deferred = true;
      },
      editReply: async (p) => {
        editedReply = p;
      },
    },
    null,
    { user: { id: 'bot_123' } },
  );

  assert.equal(deferred, true);
  assert.ok(editedReply?.content?.includes('không gửi transcript'));
  assert.equal(channelDeleted, false);
  assert.equal(messagesFetched, false);
  assert.deepEqual(overwrittenPerms.get('555666'), {
    ViewChannel: false,
    SendMessages: false,
  });
  assert.ok(ticketNotice);
  assert.equal(ticketNotice.files?.length || 0, 0);
  assert.ok(logNotice);
  assert.equal(logNotice.files?.length || 0, 0);
});

test('Slash Command /clear: chặn non-admin, hỗ trợ kênh mw...-hw... và gửi transcript vào kênh log', async () => {
  const { default: clearCommand } = await import('../src/commands/Moderation/clear.js');
  const { BOOKING_ADMIN_ROLE_ID, BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  let deniedReply = null;
  await clearCommand.execute(
    {
      user: { id: 'normal_user' },
      member: { roles: { cache: new Set() } },
      channel: { name: 'mw8-hw1-khach', topic: 'RenterID: 777888 | HW: 1' },
      reply: async (p) => {
        deniedReply = p;
      },
    },
    null,
    { user: { id: 'bot_123' } },
  );
  assert.ok(deniedReply?.content?.includes('Chỉ Admin'));

  let logSent = null;
  let deferred = false;
  let editedReply = null;

  const ticketChannel = {
    name: 'mw8-hw1-khach',
    id: 'chan_mw8',
    topic: 'Ticket của <@777888> | RenterID: 777888 | HW: 1',
    guild: {
      id: 'guild_1',
      channels: {
        cache: new Map([
          [
            BOOKING_LOG_CHANNEL_ID,
            {
              id: BOOKING_LOG_CHANNEL_ID,
              send: async (msg) => {
                logSent = msg;
                return msg;
              },
            },
          ],
        ]),
      },
    },
    messages: {
      fetch: async () => new Map([
        [
          'm1',
          {
            id: 'm1',
            content: 'Chào admin',
            createdTimestamp: Date.now(),
            author: { tag: 'khach#0001', id: '777888', bot: false },
            embeds: [],
            attachments: new Map(),
          },
        ],
      ]),
    },
    delete: async () => {},
  };

  await clearCommand.execute(
    {
      user: { id: 'admin_1' },
      member: { roles: { cache: new Set([BOOKING_ADMIN_ROLE_ID]) } },
      channel: ticketChannel,
      get deferred() {
        return deferred;
      },
      replied: false,
      deferReply: async () => {
        deferred = true;
      },
      editReply: async (p) => {
        editedReply = p;
      },
    },
    null,
    { user: { id: 'bot_123' } },
  );

  assert.equal(deferred, true);
  assert.ok(editedReply?.content?.includes('Đã lưu transcript'));
  assert.ok(logSent);
  assert.equal(logSent.files?.length, 1);
  assert.equal(logSent.files[0].name, 'transcript-mw8-hw1-khach.html');
  assert.ok(logSent.components[0].components.some((c) => c.type === 13 && c.file?.url === 'attachment://transcript-mw8-hw1-khach.html'));
});

test('ticketTranscript: generateTranscriptFiles hỗ trợ Map pagination, Components V2 và thiếu guild.members', async () => {
  const { generateTranscriptFiles } = await import('../src/utils/ticket/ticketTranscript.js');

  const mockChannel = {
    name: 'mw7-hw1-tester',
    id: 'chan_mw7',
    guild: {
      id: 'guild_1',
      roles: { cache: new Map([['888', { name: 'Staff' }]]) },
      channels: { cache: new Map([['777', { name: 'booking-log' }]]) },
    },
    messages: {
      fetch: async () => new Map([
        [
          'msg_v2',
          {
            id: 'msg_v2',
            content: '',
            createdTimestamp: 1760000000000,
            author: { username: 'UsagiBot', tag: 'UsagiBot#0000', bot: true },
            guild: {
              roles: { cache: new Map([['888', { name: 'Staff' }]]) },
              channels: { cache: new Map([['777', { name: 'booking-log' }]]) },
            },
            components: [
              {
                type: 17,
                components: [
                  {
                    type: 10,
                    content: '<a:heartg8:999> Xin chào <@111222333444555666> @vai-tro <@&888> tại <#777>',
                  },
                ],
              },
            ],
            embeds: [],
            attachments: new Map(),
          },
        ],
      ]),
    },
  };

  const files = await generateTranscriptFiles(mockChannel, {
    number: 'mw7-hw1-tester',
    userId: 'renter_7',
    createdAt: 'invalid-date-should-not-crash',
    closedAt: Date.now(),
    closeReason: 'Test transcript V2',
  });

  assert.equal(files.length, 1);
  assert.equal(files[0].name, 'transcript-mw7-hw1-tester.html');

  const html = Buffer.from(files[0].attachment).toString('utf8');
  assert.ok(html.includes('Transcript · #mw7-hw1-tester'));
  assert.ok(html.includes('ID renter_7'));
  assert.ok(html.includes(':heartg8:'));
  assert.ok(html.includes('@Staff'));
  assert.ok(html.includes('#booking-log'));
});

test('sendBookingTicketLog: fallback gửi riêng file transcript nếu gửi gộp V2 bị lỗi', async () => {
  const { AttachmentBuilder } = await import('discord.js');
  const { sendBookingTicketLog, buildTicketDeleteLogV2 } = await import('../src/services/bookingService.js');
  const { BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  const sendCalls = [];
  const mockGuild = {
    id: 'guild_fb',
    channels: {
      cache: new Map([
        [
          BOOKING_LOG_CHANNEL_ID,
          {
            id: BOOKING_LOG_CHANNEL_ID,
            send: async (msg) => {
              sendCalls.push(msg);
              if (sendCalls.length === 1) {
                throw new Error('Simulated V2 file reject');
              }
              return msg;
            },
          },
        ],
      ]),
    },
  };

  const payload = buildTicketDeleteLogV2({
    channelName: 'mw9-hw1-fallback',
    profile: getProfileData('1'),
    renterId: '999',
    executorId: '111',
    reason: 'Fallback test',
  });
  const file = new AttachmentBuilder(Buffer.from('<html>ok</html>', 'utf8'), {
    name: 'transcript-mw9-hw1-fallback.html',
  });

  await sendBookingTicketLog(mockGuild, payload, [file]);

  assert.equal(sendCalls.length, 3);
  assert.equal(sendCalls[1].flags, IS_COMPONENTS_V2);
  assert.equal(sendCalls[1].files, undefined);
  assert.equal(sendCalls[2].files?.length, 1);
  assert.equal(sendCalls[2].files[0].name, 'transcript-mw9-hw1-fallback.html');
});





