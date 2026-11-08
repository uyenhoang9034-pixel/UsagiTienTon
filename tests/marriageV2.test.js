import test from 'node:test';
import assert from 'node:assert/strict';

import {
  IS_COMPONENTS_V2,
  buildProposalPayloadV2,
  buildWeddingSuccessPayloadV2,
  buildWeddingDeclinedPayloadV2,
  buildWeddingTimeoutPayloadV2,
  buildHaremPayloadV2,
  buildCertPayloadV2,
  buildSinglePayloadV2,
  buildInteractPayloadV2,
  buildCheckInPayloadV2,
  buildGiftPayloadV2,
  buildVowsPayloadV2,
  buildDivorceConfirmPayloadV2,
  buildDivorceAnnouncementPayloadV2,
  buildLeaderboardPayloadV2,
  LOVE_GIFTS,
  getLoveLevel,
} from '../src/services/marriageService.js';

import { MARRIAGE_CONFIG, MARRY_EMOJIS, MARRY_RANK_EMOJIS } from '../src/config/marriageConfig.js';

test('1. Kiểm tra cấu hình Title toàn bộ hệ thống Marry: (trangtrig2) **TITLE** (trangtrig3)', () => {
  const titles = [
    MARRIAGE_CONFIG.proposal.embedTitle,
    MARRIAGE_CONFIG.proposal.weddingSuccessTitle,
    MARRIAGE_CONFIG.proposal.weddingDeclinedTitle,
    MARRIAGE_CONFIG.proposal.weddingTimeoutTitle,
    MARRIAGE_CONFIG.profile.haremTitle,
    MARRIAGE_CONFIG.profile.certTitle,
    MARRIAGE_CONFIG.interact.embedTitle,
    MARRIAGE_CONFIG.checkIn.embedTitle,
    MARRIAGE_CONFIG.gifts.embedTitle,
    MARRIAGE_CONFIG.vows.title,
    MARRIAGE_CONFIG.divorce.confirmTitle,
    MARRIAGE_CONFIG.divorce.announcementTitle,
    MARRIAGE_CONFIG.leaderboard.embedTitle,
  ];

  for (const t of titles) {
    assert.ok(
      t.startsWith(MARRY_EMOJIS.TITLE_L),
      `Title "${t}" phải bắt đầu bằng ${MARRY_EMOJIS.TITLE_L}`,
    );
    assert.ok(
      t.endsWith(MARRY_EMOJIS.TITLE_R),
      `Title "${t}" phải kết thúc bằng ${MARRY_EMOJIS.TITLE_R}`,
    );
    assert.ok(
      t.includes('**'),
      `Title "${t}" phải có định dạng in đậm **TITLE**`,
    );
  }
});

test('2. Giao diện V2 Lời Cầu Hôn: chuẩn Components V2, Container màu gốc, 2 nút Đồng ý & Từ chối', () => {
  const payload = buildProposalPayloadV2({
    targetId: 'user_target',
    authorId: 'user_author',
    proposalMessage: 'Về chung một nhà với anh nhé!',
    acceptBtnId: 'marry_accept_123',
    declineBtnId: 'marry_decline_123',
    avatarUrl: 'https://example.com/avatar.png',
  });

  assert.equal(payload.flags, IS_COMPONENTS_V2);
  assert.equal(payload.content, undefined, 'Components V2 không được có top-level content để tránh lỗi API Discord');

  const container = payload.components[0];
  assert.equal(container.type, 17);
  assert.equal(container.accent_color, undefined, 'Phải bỏ thanh màu hồng viền trái, dùng màu mặc định của V2');

  // Text 1: Title
  assert.equal(container.components[0].type, 10);
  assert.equal(container.components[0].content, MARRIAGE_CONFIG.proposal.embedTitle);

  // Separator 1
  assert.equal(container.components[1].type, 14);

  // Text 2: Mention target
  assert.equal(container.components[2].type, 10);
  assert.ok(container.components[2].content.includes('<@user_target>'));

  // Section with Avatar
  const section = container.components[3];
  assert.equal(section.type, 9);
  assert.equal(section.accessory.type, 11);
  assert.equal(section.accessory.media.url, 'https://example.com/avatar.png');

  // Action Row Buttons
  const row = container.components[6];
  assert.equal(row.type, 1);
  assert.equal(row.components.length, 2);
  assert.equal(row.components[0].custom_id, 'marry_accept_123');
  assert.equal(row.components[1].custom_id, 'marry_decline_123');
});

test('3. Giao diện V2 Hôn Lễ Thành Công: chuẩn Components V2, Media Gallery GIF, bỏ viền hồng', () => {
  const payload = buildWeddingSuccessPayloadV2({
    authorId: 'author_1',
    targetId: 'target_1',
    gifUrl: 'https://raw.githubusercontent.com/assets/marry.gif',
  });

  assert.equal(payload.flags, IS_COMPONENTS_V2);
  assert.equal(payload.content, undefined, 'Components V2 không được có top-level content để tránh lỗi API Discord');
  const container = payload.components[0];
  assert.equal(container.type, 17);
  assert.equal(container.accent_color, undefined);

  assert.equal(container.components[0].content, MARRIAGE_CONFIG.proposal.weddingSuccessTitle);
  assert.equal(container.components[5].type, 12, 'Phải có Media Gallery cho ảnh GIF đám cưới');
  assert.equal(container.components[5].items[0].media.url, 'https://raw.githubusercontent.com/assets/marry.gif');
});

test('4. Giao diện V2 Giấy Chứng Nhận Kết Hôn & Hậu Cung: Container V2 màu mặc định, đầy đủ thông tin', () => {
  const mockUser = {
    id: 'user_1',
    username: 'TestUser',
    displayAvatarURL: () => 'https://example.com/avatar.png',
  };

  const mockRel = {
    spouseId: 'spouse_1',
    marriedAt: Date.now() - 10 * 86400000,
    lovePoints: 1500,
    bio: 'Trăm năm hạnh phúc 💕',
    streak: 5,
  };

  const certPayload = buildCertPayloadV2({
    targetUser: mockUser,
    spouseId: 'spouse_1',
    targetSpouseRel: mockRel,
  });

  assert.equal(certPayload.flags, IS_COMPONENTS_V2);
  const certContainer = certPayload.components[0];
  assert.equal(certContainer.type, 17);
  assert.equal(certContainer.accent_color, undefined);
  assert.equal(certContainer.components[0].content, MARRIAGE_CONFIG.profile.certTitle);

  // Kiểm tra hậu cung
  const haremPayload = buildHaremPayloadV2({
    targetUser: mockUser,
    spouseList: [mockRel],
  });
  assert.equal(haremPayload.flags, IS_COMPONENTS_V2);
  const haremContainer = haremPayload.components[0];
  assert.equal(haremContainer.type, 17);
  assert.equal(haremContainer.accent_color, undefined);
  assert.equal(haremContainer.components[0].content, MARRIAGE_CONFIG.profile.haremTitle);
});

test('5. Giao diện V2 Tương Tác, Điểm Danh, Tặng Quà, Lời Thề: Container V2 chuẩn mực', () => {
  // Điểm danh
  const checkInPayload = buildCheckInPayloadV2({
    u1: 'u1',
    u2: 'u2',
    gained: 85,
    base: 50,
    streakBonus: 35,
    streak: 8,
    total: 605,
    levelName: 'Uyên Ương Say Đắm',
  });
  assert.equal(checkInPayload.flags, IS_COMPONENTS_V2);
  assert.equal(checkInPayload.components[0].accent_color, undefined);
  assert.equal(checkInPayload.components[0].components[0].content, MARRIAGE_CONFIG.checkIn.embedTitle);

  // Tương tác
  const interactPayload = buildInteractPayloadV2({
    quote: 'Hôn ngọt ngào~',
    pointsGained: 25,
    totalPoints: 500,
    level: getLoveLevel(500),
  });
  assert.equal(interactPayload.flags, IS_COMPONENTS_V2);
  assert.equal(interactPayload.components[0].accent_color, undefined);
  assert.equal(interactPayload.components[0].components[0].content, MARRIAGE_CONFIG.interact.embedTitle);

  // Tặng quà
  const giftPayload = buildGiftPayloadV2({
    userId: 'u1',
    spouseId: 'u2',
    gift: LOVE_GIFTS.trasua,
    pointsGained: 20,
    totalPoints: 520,
    level: getLoveLevel(520),
  });
  assert.equal(giftPayload.flags, IS_COMPONENTS_V2);
  assert.equal(giftPayload.components[0].accent_color, undefined);
  assert.equal(giftPayload.components[0].components[0].content, MARRIAGE_CONFIG.gifts.embedTitle);

  // Lời thề
  const vowsPayload = buildVowsPayloadV2('u2', 'Mãi mãi bên nhau!');
  assert.equal(vowsPayload.flags, IS_COMPONENTS_V2);
  assert.equal(vowsPayload.components[0].accent_color, undefined);
  assert.equal(vowsPayload.components[0].components[0].content, MARRIAGE_CONFIG.vows.title);
});

test('6. Giao diện V2 Ly Hôn: Confirm & Announcement', () => {
  const confirmPayload = buildDivorceConfirmPayloadV2('spouse_1', 'btn_confirm', 'btn_cancel');
  assert.equal(confirmPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);
  assert.equal(confirmPayload.components[0].accent_color, undefined);
  assert.equal(confirmPayload.components[0].components[0].content, MARRIAGE_CONFIG.divorce.confirmTitle);

  const announcePayload = buildDivorceAnnouncementPayloadV2('u1', 'u2');
  assert.equal(announcePayload.flags, IS_COMPONENTS_V2);
  assert.equal(announcePayload.components[0].accent_color, undefined);
  assert.equal(announcePayload.components[0].components[0].content, MARRIAGE_CONFIG.divorce.announcementTitle);
});

test('7. Bảng Vàng Couple (BXH): Tim <a:heartg7:...>, số thứ tự <a:1_:...>, chỉ hiện tối đa 5 couple', () => {
  const mockTopList = [
    { user1Id: 'u1', user2Id: 'u2', lovePoints: 5000, marriedAt: Date.now() - 50 * 86400000, streak: 10, level: getLoveLevel(5000) },
    { user1Id: 'u3', user2Id: 'u4', lovePoints: 4000, marriedAt: Date.now() - 40 * 86400000, streak: 8, level: getLoveLevel(4000) },
    { user1Id: 'u5', user2Id: 'u6', lovePoints: 3000, marriedAt: Date.now() - 30 * 86400000, streak: 6, level: getLoveLevel(3000) },
    { user1Id: 'u7', user2Id: 'u8', lovePoints: 2000, marriedAt: Date.now() - 20 * 86400000, streak: 4, level: getLoveLevel(2000) },
    { user1Id: 'u9', user2Id: 'u10', lovePoints: 1000, marriedAt: Date.now() - 10 * 86400000, streak: 2, level: getLoveLevel(1000) },
    { user1Id: 'u11', user2Id: 'u12', lovePoints: 500, marriedAt: Date.now() - 5 * 86400000, streak: 1, level: getLoveLevel(500) },
    { user1Id: 'u13', user2Id: 'u14', lovePoints: 100, marriedAt: Date.now() - 1 * 86400000, streak: 0, level: getLoveLevel(100) },
  ];

  const payload = buildLeaderboardPayloadV2(mockTopList);

  assert.equal(payload.flags, IS_COMPONENTS_V2);
  const container = payload.components[0];
  assert.equal(container.type, 17);
  assert.equal(container.accent_color, undefined, 'Màu mặc định V2, không có viền hồng');

  // Title BXH
  assert.equal(container.components[0].content, MARRIAGE_CONFIG.leaderboard.embedTitle);
  assert.ok(container.components[0].content.includes('**Bảng Vàng Couple**'));
  assert.ok(container.components[0].content.startsWith(MARRY_EMOJIS.TITLE_L));
  assert.ok(container.components[0].content.endsWith(MARRY_EMOJIS.TITLE_R));

  const listContent = container.components[2].content;

  // 1. Kiểm tra emoji số trước mỗi couple
  assert.ok(listContent.includes('<a:1_:1563484001765949550> **<@u1>**'));
  assert.ok(listContent.includes('<a:2_:1563484061111156828> **<@u3>**'));
  assert.ok(listContent.includes('<a:3_:1563484342779388045> **<@u5>**'));
  assert.ok(listContent.includes('<a:4_:1563484724725424209> **<@u7>**'));
  assert.ok(listContent.includes('<a:5_:1563484794623365151> **<@u9>**'));

  // 2. Kiểm tra emoji trái tim đỏ giữa 2 tên nhân vật đổi thành <a:heartg7:1567818322718761100>
  assert.ok(listContent.includes('<a:heartg7:1567818322718761100>'));
  assert.ok(!listContent.includes('❤️'), 'Không được còn emoji trái tim đỏ ❤️');

  // 3. Chỉ hiện 5 couple điểm cao nhất, các cặp ngoài top 5 không xuất hiện
  assert.ok(!listContent.includes('<@u11>'), 'Couple thứ 6 tuyệt đối không được hiện');
  assert.ok(!listContent.includes('<@u13>'), 'Couple thứ 7 tuyệt đối không được hiện');

  // 4. Giữ nguyên emoji điểm và streak
  assert.ok(listContent.includes('<a:trangtrig46:1547240249761996812>'));
  assert.ok(listContent.includes('<a:trangtrig45:1547239010190237819>'));
});

test('8. Tuyệt đối không có trường content legacy trong toàn bộ payload Components V2', () => {
  const builders = [
    buildProposalPayloadV2({
      targetId: 'target',
      authorId: 'author',
      proposalMessage: 'Test',
      acceptBtnId: 'acc',
      declineBtnId: 'dec',
    }),
    buildWeddingSuccessPayloadV2({ authorId: 'a', targetId: 'b' }),
    buildWeddingDeclinedPayloadV2({ authorId: 'a', targetId: 'b' }),
    buildWeddingTimeoutPayloadV2({ authorId: 'a', targetId: 'b' }),
    buildSinglePayloadV2(true, 'user_1'),
    buildCertPayloadV2({
      targetUser: { id: 'u1', username: 'Test' },
      spouseId: 'u2',
      targetSpouseRel: { lovePoints: 100, marriedAt: Date.now(), bio: 'Test', streak: 1 },
    }),
    buildInteractPayloadV2({ quote: 'Thương em', pointsGained: 20, totalPoints: 120, level: { name: 'Sơ Khai' } }),
    buildCheckInPayloadV2({
      u1: 'u1',
      u2: 'u2',
      gained: 50,
      base: 50,
      streakBonus: 0,
      streak: 2,
      total: 150,
      levelName: 'Sơ Khai',
    }),
    buildGiftPayloadV2({ userId: 'u1', spouseId: 'u2', gift: LOVE_GIFTS.hoahong, pointsGained: 30, totalPoints: 180, level: { name: 'Sơ Khai' } }),
    buildVowsPayloadV2('u2', 'Yêu em'),
    buildDivorceConfirmPayloadV2('u2', 'c_id', 'cancel_id'),
    buildDivorceAnnouncementPayloadV2('u1', 'u2'),
    buildLeaderboardPayloadV2([]),
  ];

  for (const b of builders) {
    assert.equal(
      b.content,
      undefined,
      'MessageFlags.IS_COMPONENTS_V2 cấm dùng trường content ở cấp root, tránh DiscordAPIError 50035',
    );
    assert.ok(b.components && b.components.length > 0, 'Phải có components');
  }
});

