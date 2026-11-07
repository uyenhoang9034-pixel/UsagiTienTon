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
  assert.equal(row1.components[1].label, '1/2');
  assert.equal(row1.components[2].label, '❯❯');
  assert.equal(row1.components[3].label, '5/5');
  assert.deepEqual(row1.components[3].emoji, BOOKING_EMOJIS.HEART_BUTTON);

  // Action Row 2: Book và Tim
  const row2 = container.components[6];
  assert.equal(row2.components[0].label, 'Book');
  assert.deepEqual(row2.components[0].emoji, BOOKING_EMOJIS.HEART_BUTTON);
  assert.deepEqual(row2.components[1].emoji, BOOKING_EMOJIS.HEART_BUTTON);
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
