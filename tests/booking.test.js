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
  assert.ok(text3.content.includes('<@872792190651334707>'));

  const row = container.components[5];
  assert.equal(row.components.length, 3);
  assert.equal(row.components[0].label, 'Mở đánh giá');
  assert.deepEqual(row.components[0].emoji, BOOKING_EMOJIS.ACTION_BUTTON);
  assert.equal(row.components[1].label, 'Từ chối khách');
  assert.deepEqual(row.components[1].emoji, BOOKING_EMOJIS.ACTION_BUTTON);
  assert.equal(row.components[2].label, 'Đóng ticket');
  assert.deepEqual(row.components[2].emoji, BOOKING_EMOJIS.ACTION_BUTTON);
});

test('Giao diện V2 Từ Chối Khách: Trôn Trôn Việt Nam Hihi', () => {
  const payload = buildRefusalPayloadV2();
  assert.equal(payload.flags, IS_COMPONENTS_V2);

  const container = payload.components[0];
  const text1 = container.components[0];
  assert.ok(text1.content.includes('**TRÔN TRÔN VIỆT NAM HIHI**'));

  const text2 = container.components[2];
  assert.ok(text2.content.includes('Trạng thái: Đã ngắt phiên kết nối'));
  assert.ok(text2.content.includes('vì bạn đã bị trôn. =))))'));
  assert.ok(text2.content.includes('Dù bị trôn cũng không được cay nha ní'));
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

test('Quyền Admin Booking: nhận diện chuẩn role 1545295139390619768, 1568554130371383306 và Bot Owner', async () => {
  const { isBookingAdmin } = await import('../src/services/bookingService.js');
  const { BOOKING_ADMIN_ROLE_ID, BOOKING_SUPPORT_ROLE_ID, BOOKING_CATEGORY_ID, BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  assert.equal(BOOKING_ADMIN_ROLE_ID, '1545295139390619768');
  assert.equal(BOOKING_SUPPORT_ROLE_ID, '1568554130371383306');
  assert.equal(BOOKING_CATEGORY_ID, '1568554690923331695');
  assert.equal(BOOKING_LOG_CHANNEL_ID, '1568555066976116827');

  // Member có role admin trong cache
  const memberWithAdminRole = {
    roles: {
      cache: new Set([BOOKING_ADMIN_ROLE_ID]),
    },
  };
  assert.equal(isBookingAdmin(memberWithAdminRole, 'normalUser'), true);

  // Member có role support trong cache
  const memberWithSupportRole = {
    roles: {
      cache: new Set([BOOKING_SUPPORT_ROLE_ID]),
    },
  };
  assert.equal(isBookingAdmin(memberWithSupportRole, 'normalUser'), true);

  // Member có role support trong mảng _roles
  const memberWithRawRoles = {
    _roles: [BOOKING_SUPPORT_ROLE_ID],
  };
  assert.equal(isBookingAdmin(memberWithRawRoles, 'normalUser'), true);

  // User không có quyền
  const normalMember = {
    roles: {
      cache: new Set(['otherRole']),
    },
    permissions: {
      has: () => false,
    },
  };
  assert.equal(isBookingAdmin(normalMember, 'normalUser'), false);
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

test('closeBookingTicket: ẩn quyền xem của khách, giữ quyền 2 role, gửi transcript vào kênh log', async () => {
  const { closeBookingTicket } = await import('../src/services/bookingService.js');
  const { BOOKING_LOG_CHANNEL_ID } = await import('../src/config/bookingConfig.js');

  const overwrittenPerms = new Map();
  let ticketSentMessage = null;
  let logSentMessage = null;

  const mockChannel = {
    name: 'ticket-hw1-alice',
    id: 'ticket_channel_123',
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
      fetch: async () => new Map(),
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

  // Khách bị ẩn quyền xem và gửi tin
  assert.deepEqual(overwrittenPerms.get('renter_user_id'), {
    ViewChannel: false,
    SendMessages: false,
  });

  // 2 role 1568554130371383306 & 1545295139390619768 vẫn có quyền xem
  assert.equal(overwrittenPerms.get('1545295139390619768').ViewChannel, true);
  assert.equal(overwrittenPerms.get('1568554130371383306').ViewChannel, true);

  // Kênh ticket nhận được thông báo đóng kèm file transcript
  assert.ok(ticketSentMessage);
  assert.equal(ticketSentMessage.files?.length, 1);
  assert.ok(ticketSentMessage.files[0].name.includes('transcript-ticket-hw1-alice.html'));

  // Kênh log nhận được log V2 kèm file transcript
  assert.ok(logSentMessage);
  assert.equal(logSentMessage.flags, IS_COMPONENTS_V2);
  assert.equal(logSentMessage.files?.length, 1);
  assert.ok(logSentMessage.files[0].name.includes('transcript-ticket-hw1-alice.html'));
});



