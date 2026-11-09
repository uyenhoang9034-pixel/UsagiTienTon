import test from 'node:test';
import assert from 'node:assert/strict';
import { MessageFlags } from 'discord.js';

import bocqueCommand from '../src/commands/Fun/bocque.js';
import xinnghiCommand from '../src/commands/Fun/xinnghi.js';
import dotviaCommand from '../src/commands/Fun/dotvia.js';
import excuseCopyButton from '../src/interactions/buttons/excuseCopy.js';
import excuseRerollButton from '../src/interactions/buttons/excuseReroll.js';

import {
  IS_COMPONENTS_V2,
  THAN_VAN_CHANNEL_ID,
  THAN_VAN_EMOJIS,
  TARGET_SPECIFIC_PRAYERS,
  formatThanVanTitle,
  isThanVanChannel,
  getUserDailyFortune,
  saveUserDailyFortune,
  getRandomFortune,
  getRandomExcuse,
  getRandomPrayers,
  buildTanLamPayloadV2,
  buildLuongPayloadV2,
  buildFortunePayloadV2,
  buildRageMeterPayloadV2,
  buildVoDePayloadV2,
  buildExcusePayloadV2,
  buildExcuseCopyPayloadV2,
  buildDotViaPayloadV2,
  buildThanVanNoticePayloadV2,
  buildExcuseEmbed,
  buildExcuseActionRow,
  extractExcuseTextFromMessage,
  isComponentsV2Message,
  handleThanVanTuBan,
} from '../src/services/thanVanTuBanService.js';

const FORBIDDEN_UNICODE_EMOJIS = [
  '❌',
  '⚠️',
  '📋',
  '🚀',
  '🎲',
  '🧋',
  '📢',
  '🕯️',
  '🌸',
  '🔮',
  '📄',
  '🔥',
  '💢',
  '🥳',
  '💸',
  '✨',
  '💖',
  '❗',
  '😈',
  '🧨',
  '🐢',
  '💔',
  '🛑',
  '🎉',
  '✅',
  '📜',
  '⏰',
  '💼',
  '🕯',
];

function collectAllTextDisplays(payload) {
  const texts = [];
  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === 10 && typeof node.content === 'string') {
        texts.push(node.content);
      }
      if (Array.isArray(node.components)) {
        walk(node.components);
      }
    }
  };
  walk(payload?.components);
  return texts;
}

function assertValidV2Payload(payload, expectedTitle, { ephemeral = false } = {}) {
  const expectedFlags = ephemeral
    ? MessageFlags.Ephemeral | IS_COMPONENTS_V2
    : IS_COMPONENTS_V2;

  assert.equal(payload.flags, expectedFlags);
  assert.equal(payload.content, undefined, 'Payload V2 không được có top-level content');
  assert.equal(payload.embeds, undefined, 'Payload V2 không được có top-level embeds');
  assert.deepEqual(payload.allowedMentions, { parse: [] });

  assert.ok(Array.isArray(payload.components) && payload.components.length === 1);
  const container = payload.components[0];
  assert.equal(container.type, 17, 'Root component phải là Container (type 17)');
  assert.equal(container.accent_color, undefined, 'Container dùng màu gốc không viền');

  const titleBlock = container.components[0];
  assert.equal(titleBlock.type, 10, 'Component đầu trong Container phải là TextDisplay title');
  assert.ok(titleBlock.content.startsWith(`${THAN_VAN_EMOJIS.TITLE_L} **`));
  assert.ok(titleBlock.content.endsWith(`** ${THAN_VAN_EMOJIS.TITLE_R}`));
  assert.equal(titleBlock.content, formatThanVanTitle(expectedTitle));

  const texts = collectAllTextDisplays(payload).join('\n');
  for (const unicodeEmoji of FORBIDDEN_UNICODE_EMOJIS) {
    assert.ok(
      !texts.includes(unicodeEmoji),
      `Không được dùng emoji Unicode "${unicodeEmoji}" trong giao diện Than Vãn`,
    );
  }
}

test('1. Format Title & toàn bộ payload V2: màu gốc không viền, chuẩn (trangtrig2) **UPPERCASE** (trangtrig3)', () => {
  assert.equal(
    formatThanVanTitle('test tiêu đề chữ thường'),
    `${THAN_VAN_EMOJIS.TITLE_L} **TEST TIÊU ĐỀ CHỮ THƯỜNG** ${THAN_VAN_EMOJIS.TITLE_R}`,
  );

  const mockUser = {
    id: '123456789012345678',
    displayName: 'Vợ Kim Nong',
    displayAvatarURL: () => 'https://cdn.discordapp.com/avatars/123/abc.png',
  };
  const fortune = getRandomFortune();
  const excuse = getRandomExcuse('luon_leo');

  assertValidV2Payload(
    buildTanLamPayloadV2(new Date(2026, 0, 1, 14, 0, 0)),
    'ĐỒNG HỒ ĐẾM NGƯỢC: GIỜ CHUỒN KHỎI TƯ BẢN',
  );
  assertValidV2Payload(
    buildTanLamPayloadV2(new Date(2026, 0, 1, 18, 0, 0)),
    'ĐỒNG HỒ ĐẾM NGƯỢC: GIỜ CHUỒN KHỎI TƯ BẢN',
  );
  assertValidV2Payload(
    buildLuongPayloadV2(new Date(2026, 0, 5, 10, 0, 0)),
    'LỊCH HÓNG TING TING',
  );
  assertValidV2Payload(
    buildLuongPayloadV2(new Date(2026, 0, 10, 10, 0, 0)),
    'LỊCH HÓNG TING TING',
  );
  assertValidV2Payload(
    buildFortunePayloadV2(mockUser, fortune, false),
    'QUẺ XĂM CÔNG SỞ',
  );
  assertValidV2Payload(
    buildFortunePayloadV2(mockUser, fortune, true),
    'QUẺ XĂM CÔNG SỞ',
  );
  assertValidV2Payload(buildRageMeterPayloadV2(25), 'THƯỚC ĐO NỘ KHÍ TƯ BẢN');
  assertValidV2Payload(buildRageMeterPayloadV2(60), 'THƯỚC ĐO NỘ KHÍ TƯ BẢN');
  assertValidV2Payload(buildRageMeterPayloadV2(90), 'THƯỚC ĐO NỘ KHÍ TƯ BẢN');
  assertValidV2Payload(buildVoDePayloadV2(), 'GIỜ GIẢI CỨU - HẠ HỎA TOÀN SERVER');
  assertValidV2Payload(buildExcusePayloadV2(excuse), 'ĐƠN XIN NGHỈ PHÉP "BAO DUYỆT"');
  assertValidV2Payload(
    buildExcuseCopyPayloadV2('Kính gửi Anh/Chị quản lý,\n\nTest', { ephemeral: true }),
    'ĐÃ TRÍCH XUẤT NỘI DUNG ĐƠN XIN NGHỈ',
    { ephemeral: true },
  );
  assertValidV2Payload(
    buildDotViaPayloadV2(mockUser, 'bug'),
    'BÀN THỜ PHONG THỦY CÔNG SỞ',
  );
  assertValidV2Payload(
    buildThanVanNoticePayloadV2({
      title: 'SAI KÊNH SỬ DỤNG',
      message: `Test ${THAN_VAN_EMOJIS.FLOWER}`,
      ephemeral: true,
    }),
    'SAI KÊNH SỬ DỤNG',
    { ephemeral: true },
  );
});

test('2. Kiểm tra đúng custom emoji server cho từng giao diện V2', () => {
  const mockUser = {
    id: '999',
    displayName: 'Test',
    displayAvatarURL: () => 'https://example.com/avatar.png',
  };
  const fortune = getRandomFortune();

  // Tan làm hết giờ -> hamsterg1
  const tanLamDoneText = collectAllTextDisplays(
    buildTanLamPayloadV2(new Date(2026, 0, 1, 18, 0, 0)),
  ).join('\n');
  assert.ok(tanLamDoneText.includes(THAN_VAN_EMOJIS.HAMSTER));

  // Lương mùng 10 -> trangtrig27
  const luongPaydayText = collectAllTextDisplays(
    buildLuongPayloadV2(new Date(2026, 0, 10, 9, 0, 0)),
  ).join('\n');
  assert.ok(luongPaydayText.includes(THAN_VAN_EMOJIS.TING_TING));

  // Bốc quẻ -> Section + Thumbnail avatar, trangtrig45, bang2, heartg1
  const fortunePayload = buildFortunePayloadV2(mockUser, fortune, true);
  const fortuneContainer = fortunePayload.components[0];
  const section = fortuneContainer.components.find((c) => c.type === 9);
  assert.ok(section, 'Quẻ có avatar phải dùng Section (type 9)');
  assert.equal(section.accessory.type, 11, 'Section accessory phải là Thumbnail (type 11)');
  assert.equal(section.accessory.media.url, 'https://example.com/avatar.png');
  const fortuneText = collectAllTextDisplays(fortunePayload).join('\n');
  assert.ok(fortuneText.includes(THAN_VAN_EMOJIS.DIEM_BAO));
  assert.ok(fortuneText.includes(THAN_VAN_EMOJIS.ALERT));
  assert.ok(fortuneText.includes(THAN_VAN_EMOJIS.HEART));

  // Quẻ không có avatar -> fallback TextDisplay (không lỗi Thumbnail rỗng)
  const noAvatarFortune = buildFortunePayloadV2({ id: '999', username: 'NoAvatar' }, fortune, false);
  const noAvatarSection = noAvatarFortune.components[0].components.find((c) => c.type === 9);
  assert.equal(noAvatarSection, undefined);

  // Vỡ đê -> bang3, bang2 (giải cứu khẩn cấp) & MediaGallery (type 12)
  const voDePayload = buildVoDePayloadV2();
  const voDeText = collectAllTextDisplays(voDePayload).join('\n');
  assert.ok(voDeText.includes(THAN_VAN_EMOJIS.VO_DE_ALERT));
  assert.ok(voDeText.includes(`${THAN_VAN_EMOJIS.ALERT} **LỆNH GIẢI CỨU KHẨN CẤP:**`));
  const gallery = voDePayload.components[0].components.find((c) => c.type === 12);
  assert.ok(gallery && gallery.items?.[0]?.media?.url?.startsWith('https://'));

  // Đốt vía -> bang1 & 3x trangtrig48 (nến)
  const dotViaText = collectAllTextDisplays(buildDotViaPayloadV2(mockUser, 'ot')).join('\n');
  assert.ok(dotViaText.includes(THAN_VAN_EMOJIS.PRAYER_BULLET));
  assert.ok(
    dotViaText.includes(
      `${THAN_VAN_EMOJIS.CANDLE} ${THAN_VAN_EMOJIS.CANDLE} ${THAN_VAN_EMOJIS.CANDLE}`,
    ),
  );

  // Đơn xin nghỉ & Copy popup -> nút trangtrig54 & trangtrig31
  const excusePayload = buildExcusePayloadV2(getRandomExcuse('bi_trang'));
  const actionRow = excusePayload.components[0].components.find((c) => c.type === 1);
  assert.ok(actionRow && actionRow.components.length === 2);
  assert.deepEqual(actionRow.components[0].emoji, THAN_VAN_EMOJIS.BUTTON_REROLL);
  assert.deepEqual(actionRow.components[1].emoji, THAN_VAN_EMOJIS.BUTTON_COPY);

  const copyPayload = buildExcuseCopyPayloadV2('Kính gửi Anh/Chị quản lý,\n\nABC');
  const copyText = collectAllTextDisplays(copyPayload).join('\n');
  assert.ok(copyText.includes(THAN_VAN_EMOJIS.COPY_ICON));

  // Notice -> bang2
  const noticePayload = buildThanVanNoticePayloadV2({
    title: 'THÔNG BÁO LỖI',
    message: 'Lỗi test',
  });
  const noticeText = collectAllTextDisplays(noticePayload).join('\n');
  assert.ok(noticeText.includes(`${THAN_VAN_EMOJIS.ALERT} Lỗi test`));
});

test('3. Excuse Copy & Reroll hỗ trợ cả message Components V2 mới và message Embed cũ', async () => {
  const excuseData = getRandomExcuse('hai_huoc');
  const v2Payload = buildExcusePayloadV2(excuseData);

  // Mock V2 interaction.message (đọc từ TextDisplay trong Container)
  const v2Message = {
    flags: IS_COMPONENTS_V2,
    components: v2Payload.components,
    embeds: [],
  };
  assert.equal(isComponentsV2Message(v2Message), true);

  const extractedV2 = extractExcuseTextFromMessage(v2Message);
  assert.ok(extractedV2.startsWith('Kính gửi Anh/Chị quản lý,'));
  assert.ok(extractedV2.includes(excuseData.text));
  assert.ok(!extractedV2.includes('Tone:'));

  // Test button excuse_copy trên V2 message
  let copyReply = null;
  await excuseCopyButton.execute(
    {
      message: v2Message,
      user: { tag: 'VoKimNong#0001' },
      replied: false,
      deferred: false,
      reply: async (p) => {
        copyReply = p;
      },
    },
    {},
    [],
  );
  assert.ok(copyReply);
  assertValidV2Payload(copyReply, 'ĐÃ TRÍCH XUẤT NỘI DUNG ĐƠN XIN NGHỈ', {
    ephemeral: true,
  });

  // Test button excuse_reroll trên V2 message
  let v2UpdatePayload = null;
  await excuseRerollButton.execute(
    {
      message: v2Message,
      user: { tag: 'VoKimNong#0001' },
      replied: false,
      deferred: false,
      update: async (p) => {
        v2UpdatePayload = p;
      },
    },
    {},
    ['hai_huoc'],
  );
  assert.ok(v2UpdatePayload);
  assertValidV2Payload(v2UpdatePayload, 'ĐƠN XIN NGHỈ PHÉP "BAO DUYỆT"');

  // Legacy Embed compatibility
  const legacyEmbed = buildExcuseEmbed(excuseData).toJSON();
  const legacyRow = buildExcuseActionRow(excuseData.styleKey).toJSON();
  const legacyMessage = {
    flags: 0,
    components: [legacyRow],
    embeds: [legacyEmbed],
  };
  assert.equal(isComponentsV2Message(legacyMessage), false);
  const extractedLegacy = extractExcuseTextFromMessage(legacyMessage);
  assert.equal(extractedLegacy, extractedV2);

  let legacyUpdatePayload = null;
  await excuseRerollButton.execute(
    {
      message: legacyMessage,
      user: { tag: 'VoKimNong#0001' },
      replied: false,
      deferred: false,
      update: async (p) => {
        legacyUpdatePayload = p;
      },
    },
    {},
    ['hai_huoc'],
  );
  assert.ok(legacyUpdatePayload);
  assert.equal(legacyUpdatePayload.flags, undefined);
  assert.equal(legacyUpdatePayload.embeds.length, 1);
  assert.equal(legacyUpdatePayload.components.length, 1);
});

test('4. Sửa bug bốc quẻ fortuneHistoryCache (không ReferenceError khi không có DB)', async () => {
  const userId = 'cache_test_user_v2';
  const dateStr = '2026-11-09';
  const fortune = getRandomFortune();

  assert.equal(await getUserDailyFortune(null, userId, dateStr), null);
  await saveUserDailyFortune(null, userId, dateStr, fortune);
  const fetched = await getUserDailyFortune({}, userId, dateStr);
  assert.deepEqual(fetched, fortune);
});

test('5. Lệnh Slash & Prefix (/boc-que, /xin-nghi, /dot-via): kiểm tra kênh & Ephemeral đúng theo mode', async () => {
  // Kiểm tra helper isThanVanChannel cho cả slash (channelId) và prefix mock (channel.id, channelId undefined)
  assert.equal(isThanVanChannel({ channelId: THAN_VAN_CHANNEL_ID }), true);
  assert.equal(isThanVanChannel({ channel: { id: THAN_VAN_CHANNEL_ID } }), true);
  assert.equal(isThanVanChannel({ channel: { id: 'thread_1', parentId: THAN_VAN_CHANNEL_ID } }), true);
  assert.equal(isThanVanChannel({ channel: { id: 'wrong_channel' } }), false);

  const mockOptions = { getString: () => null };
  const mockUser = { id: 'u_cmd_1', username: 'VoKimNong', displayAvatarURL: () => null };

  // Slash sai kênh -> có MessageFlags.Ephemeral | IS_COMPONENTS_V2
  for (const [cmd, expectedIcon] of [
    [bocqueCommand, THAN_VAN_EMOJIS.FLOWER],
    [xinnghiCommand, THAN_VAN_EMOJIS.FLOWER],
    [dotviaCommand, THAN_VAN_EMOJIS.CANDLE],
  ]) {
    let replyPayload = null;
    await cmd.execute(
      {
        channelId: '999999',
        channel: { id: '999999' },
        user: mockUser,
        options: mockOptions,
        replied: false,
        deferred: false,
        reply: async (p) => {
          replyPayload = p;
        },
      },
      null,
      {},
    );
    assertValidV2Payload(replyPayload, 'SAI KÊNH SỬ DỤNG', { ephemeral: true });
    const txt = collectAllTextDisplays(replyPayload).join('\n');
    assert.ok(txt.includes(THAN_VAN_EMOJIS.ALERT));
    assert.ok(txt.includes(expectedIcon));
  }

  // Prefix (&bocque, &xinnghi, &dotvia) sai kênh -> không Ephemeral
  let prefixWrongReply = null;
  await bocqueCommand.execute(
    {
      _isPrefixCommand: true,
      channel: { id: '888888' },
      user: mockUser,
      options: mockOptions,
      replied: false,
      deferred: false,
      reply: async (p) => {
        prefixWrongReply = p;
      },
    },
    null,
    {},
  );
  assertValidV2Payload(prefixWrongReply, 'SAI KÊNH SỬ DỤNG', { ephemeral: false });

  // Prefix (&bocque) ĐÚNG kênh (không có channelId, chỉ có channel.id) -> chạy bình thường, ra Quẻ V2
  let prefixRightReply = null;
  await bocqueCommand.execute(
    {
      _isPrefixCommand: true,
      channel: { id: THAN_VAN_CHANNEL_ID },
      user: { id: 'u_prefix_ok_1', username: 'VoKimNong', displayAvatarURL: () => null },
      options: mockOptions,
      replied: false,
      deferred: false,
      reply: async (p) => {
        prefixRightReply = p;
      },
    },
    null,
    {},
  );
  assertValidV2Payload(prefixRightReply, 'QUẺ XĂM CÔNG SỞ', { ephemeral: false });
});

test('6. Auto-responder handleThanVanTuBan: sửa bug "dot via" khớp nhầm "ot" & xuất payload V2', async () => {
  // Đốt vía không nói "ot" -> không được tự gán TARGET_SPECIFIC_PRAYERS.ot
  const basePrayers = getRandomPrayers(3, null);
  assert.ok(!basePrayers.includes(TARGET_SPECIFIC_PRAYERS.ot));

  const sepPrayers = getRandomPrayers(3, 'sep');
  assert.equal(sepPrayers[0], TARGET_SPECIFIC_PRAYERS['sếp']);

  const otPrayers = getRandomPrayers(3, 'ot');
  assert.equal(otPrayers[0], TARGET_SPECIFIC_PRAYERS.ot);

  let sentPayload = null;
  const mockMessage = {
    guild: { id: 'guild_v2_test' },
    channelId: THAN_VAN_CHANNEL_ID,
    channel: { id: THAN_VAN_CHANNEL_ID, send: async (p) => { sentPayload = p; } },
    author: { id: 'user_tv_1', bot: false, tag: 'TestUser#1', displayAvatarURL: () => null },
    client: {},
    content: 'dot via dau tuan',
    reply: async (p) => {
      sentPayload = p;
      return p;
    },
  };

  const handled = await handleThanVanTuBan(mockMessage);
  assert.equal(handled, true);
  assert.ok(sentPayload);
  assert.equal(sentPayload.flags, IS_COMPONENTS_V2);
  assert.equal(sentPayload.content, undefined);
  assert.deepEqual(sentPayload.allowedMentions, { parse: [], repliedUser: false });

  const bodyText = collectAllTextDisplays(sentPayload).join('\n');
  assert.ok(bodyText.includes(formatThanVanTitle('BÀN THỜ PHONG THỦY CÔNG SỞ')));
  assert.ok(
    !bodyText.includes(TARGET_SPECIFIC_PRAYERS.ot),
    '"dot via" không được match nhầm chữ "ot" trong chữ "dot"',
  );
});
