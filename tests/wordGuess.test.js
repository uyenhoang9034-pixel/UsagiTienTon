import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MessageFlags } from 'discord.js';

import {
  WORD_GUESS_ADMIN_ROLE_ID,
  WORD_GUESS_DEFAULTS,
  WORD_GUESS_EMOJIS,
  WORD_GUESS_BUTTON_EMOJIS,
  formatWordGuessTitle,
} from '../src/config/wordGuessConfig.js';
import {
  IS_COMPONENTS_V2,
  loadWordBank,
  normalizeVietnameseGuess,
  scrambleVietnameseWord,
  buildHintMask,
  getWordStats,
  isWordGuessAdmin,
  getWordGuessGuildConfig,
  saveWordGuessGuildConfig,
  getLeaderboardEntries,
  buildRoundStartPayloadV2,
  buildMidHintPayloadV2,
  buildRoundWinPayloadV2,
  buildRoundTimeoutPayloadV2,
  buildIdlePausedPayloadV2,
  buildNightLockPayloadV2,
  buildLeaderboardPayloadV2,
  buildPersonalStreakPayloadV2,
  buildAdminPanelPayloadV2,
  buildWordGuessNoticePayloadV2,
  getActiveRound,
  getGuildLastActivityAt,
  isWordGuessNightLock,
  startWordGuessRound,
  revealRoundHint,
  handleWordGuessMessage,
  handleRoundTimeout,
  initWordGuessAutoResume,
  resetAllInMemoryRounds,
} from '../src/services/wordGuessService.js';
import doantuCommand from '../src/commands/Games/doantu.js';
import doantuAdminCommand from '../src/commands/Games/doantuAdmin.js';
import doantuButtons from '../src/interactions/buttons/doantuButtons.js';
import doantuModals from '../src/interactions/modals/doantuModals.js';

const DAYTIME_MS = Date.parse('2026-11-09T14:00:00+07:00');

function createMockClient(initialNow = DAYTIME_MS) {
  let mockNow = initialNow;
  const store = new Map();
  const sentMessages = [];
  const channel = {
    id: 'channel_guess_1',
    guild: { id: 'guild_guess_1', members: { me: null } },
    send: async (payload) => {
      const msg = {
        id: `msg_${sentMessages.length + 1}`,
        payload,
        edit: async (next) => {
          msg.payload = next;
          return msg;
        },
      };
      sentMessages.push(msg);
      return msg;
    },
  };

  const client = {
    _wordGuessNow: () => mockNow,
    setNow: (ms) => {
      mockNow = ms;
    },
    db: {
      get: async (key, fallback = null) => (store.has(key) ? structuredClone(store.get(key)) : fallback),
      set: async (key, value) => {
        store.set(key, structuredClone(value));
        return true;
      },
      delete: async (key) => store.delete(key),
    },
    channels: {
      cache: new Map([[channel.id, channel]]),
      fetch: async (id) => (id === channel.id ? channel : null),
    },
  };

  return { client, channel, store, sentMessages };
}

function collectTextsAndButtons(payload) {
  const texts = [];
  const buttons = [];

  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === 10 && typeof node.content === 'string') {
        texts.push(node.content);
      }
      if (node.type === 2) {
        buttons.push(node);
      }
      if (Array.isArray(node.components)) {
        walk(node.components);
      }
    }
  };

  walk(payload?.components);
  return { texts, buttons };
}

function assertBorderlessV2(payload, expectedTitle, { ephemeral = false } = {}) {
  const expectedFlags = ephemeral
    ? MessageFlags.Ephemeral | IS_COMPONENTS_V2
    : IS_COMPONENTS_V2;

  assert.equal(payload.flags, expectedFlags);
  assert.equal(payload.content, undefined);
  assert.equal(payload.embeds, undefined);
  assert.deepEqual(payload.allowedMentions, { parse: [] });

  assert.equal(payload.components.length, 1);
  const container = payload.components[0];
  assert.equal(container.type, 17);
  assert.equal(container.accent_color, undefined);

  const firstText = container.components[0];
  assert.equal(firstText.type, 10);
  assert.equal(firstText.content, formatWordGuessTitle(expectedTitle));
  assert.ok(firstText.content.startsWith(`${WORD_GUESS_EMOJIS.TITLE} **`));
  assert.ok(firstText.content.endsWith(`** ${WORD_GUESS_EMOJIS.TITLE}`));

  const { buttons } = collectTextsAndButtons(payload);
  for (const btn of buttons) {
    assert.equal(btn.style, 2, `Nút "${btn.label}" phải là màu xám (style: 2)`);
  }
}

test('1. Kho từ tiếng Việt >= 1000 cụm từ ghép chuẩn, không trùng lặp, không bỏ dấu', () => {
  const words = loadWordBank();
  assert.ok(words.length >= 1000, `Kho từ phải có ít nhất 1000 từ, hiện có ${words.length}`);

  const uniqueSet = new Set();
  for (const w of words) {
    const normalized = normalizeVietnameseGuess(w);
    assert.ok(!uniqueSet.has(normalized), `Từ bị trùng trong kho: "${w}"`);
    uniqueSet.add(normalized);

    const { letterCount, wordCount } = getWordStats(w);
    assert.ok(wordCount >= 2, `Cụm từ "${w}" phải có ít nhất 2 từ`);
    assert.ok(letterCount >= 4, `Cụm từ "${w}" quá ngắn (${letterCount} ký tự)`);
  }
});

test('2. Kiểm tra luật BẮT BUỘC có dấu, xáo trộn chữ & khung gợi ý chữ cái đầu', () => {
  assert.equal(normalizeVietnameseGuess('Hoa Hồng'), 'hoa hồng');
  assert.notEqual(normalizeVietnameseGuess('hoa hong'), normalizeVietnameseGuess('hoa hồng'));
  assert.notEqual(normalizeVietnameseGuess('banh mi'), normalizeVietnameseGuess('bánh mì'));
  // Quy tắc đặt dấu thanh cũ/mới (cùng có dấu) vẫn khớp
  assert.equal(normalizeVietnameseGuess('hoa hoè'), normalizeVietnameseGuess('hoa hòe'));
  assert.notEqual(normalizeVietnameseGuess('hoa hoe'), normalizeVietnameseGuess('hoa hòe'));

  assert.equal(buildHintMask('sẩy thai'), 'S _ _   T _ _ _');
  assert.equal(buildHintMask('hoa hồng'), 'H _ _   H _ _ _');

  const scrambled = scrambleVietnameseWord('hoa hồng');
  const originalCompact = 'HOAHỒNG';
  assert.notEqual(scrambled.replace(/\s+/g, ''), originalCompact);
  assert.equal(
    Array.from(scrambled.replace(/\s+/g, '')).sort().join(''),
    Array.from(originalCompact).sort().join(''),
  );
});

test('3. Toàn bộ giao diện Components V2: không viền, title chuẩn, đúng emoji, toàn bộ nút xám', () => {
  const startPayload = buildRoundStartPayloadV2({
    scrambledDisplay: 'I A H Y S Ẩ T',
    letterCount: 7,
    wordCount: 2,
    durationSeconds: 60,
    roundId: 'abcd1234',
    autoStart: true,
    hintDisabled: false,
  });
  assertBorderlessV2(startPayload, 'TRÒ CHƠI ĐOÁN TỪ BẮT ĐẦU!');
  const startDetails = collectTextsAndButtons(startPayload);
  const startText = startDetails.texts.join('\n');
  assert.ok(startText.includes(WORD_GUESS_EMOJIS.LANGUAGE));
  assert.ok(startText.includes(WORD_GUESS_EMOJIS.SCRAMBLED));
  assert.ok(startText.includes(WORD_GUESS_EMOJIS.HINT));
  assert.ok(startText.includes(WORD_GUESS_EMOJIS.TIME));
  assert.ok(startText.includes(WORD_GUESS_EMOJIS.STREAK));
  assert.equal(startDetails.buttons.length, 1, 'Chỉ được có duy nhất 1 nút Mở gợi ý (không có nút Bỏ qua)');
  assert.equal(startDetails.buttons[0].label, 'Mở gợi ý');
  assert.deepEqual(startDetails.buttons[0].emoji, WORD_GUESS_BUTTON_EMOJIS.HINT);

  const hintPayload = buildMidHintPayloadV2({
    elapsedSeconds: 30,
    remainingSeconds: 30,
    hintMask: 'S _ _   T _ _ _',
    triggeredByUser: false,
  });
  assertBorderlessV2(hintPayload, 'GỢI Ý CHỮ CÁI ĐẦU!');
  const hintText = collectTextsAndButtons(hintPayload).texts.join('\n');
  assert.ok(hintText.includes(WORD_GUESS_EMOJIS.TIME));
  assert.ok(hintText.includes(WORD_GUESS_EMOJIS.HINT));
  assert.ok(hintText.includes(WORD_GUESS_EMOJIS.STREAK));

  const winPayload = buildRoundWinPayloadV2({
    winnerId: '111222333',
    answer: 'sẩy thai',
    reactionSeconds: '4.2',
    winnerStats: { currentStreak: 3, bestStreak: 14 },
  });
  assertBorderlessV2(winPayload, 'CHÍNH XÁC RỒI NÈ!');
  const winText = collectTextsAndButtons(winPayload).texts.join('\n');
  assert.ok(winText.includes(`${WORD_GUESS_EMOJIS.WINNER} **Người đoán đúng:** <@111222333>`));
  assert.ok(winText.includes(WORD_GUESS_EMOJIS.STATUS));
  assert.ok(winText.includes(WORD_GUESS_EMOJIS.TIME));
  assert.ok(winText.includes(WORD_GUESS_EMOJIS.STREAK));

  const timeoutPayload = buildRoundTimeoutPayloadV2({
    answer: 'sẩy thai',
    durationSeconds: 60,
  });
  assertBorderlessV2(timeoutPayload, 'HẾT THỜI GIAN SUY NGHĨ!');
  const timeoutText = collectTextsAndButtons(timeoutPayload).texts.join('\n');
  assert.ok(timeoutText.includes(WORD_GUESS_EMOJIS.TIME));
  assert.ok(timeoutText.includes(WORD_GUESS_EMOJIS.STATUS));
  assert.ok(timeoutText.includes(WORD_GUESS_EMOJIS.STREAK));
  assert.ok(timeoutText.includes('0 streak'));

  const adminPayload = buildAdminPanelPayloadV2({
    channelId: '123456',
    enabled: true,
    autoStart: true,
    durationSeconds: 60,
  });
  assertBorderlessV2(adminPayload, 'QUẢN TRỊ TRÒ CHƠI ĐOÁN TỪ', { ephemeral: true });
  const adminDetails = collectTextsAndButtons(adminPayload);
  assert.equal(adminDetails.buttons.length, 4);
  assert.ok(adminDetails.texts.join('\n').includes(WORD_GUESS_EMOJIS.CHANNEL));

  const streakPayload = buildPersonalStreakPayloadV2({
    userId: '111',
    stats: { currentStreak: 2, bestStreak: 5, totalWins: 12, bestTimeMs: 3400 },
    rank: 1,
    totalPlayers: 3,
  });
  assertBorderlessV2(streakPayload, 'CHUỖI STREAK CÁ NHÂN');

  const noticePayload = buildWordGuessNoticePayloadV2({
    title: 'TEST THÔNG BÁO',
    message: 'Nội dung test',
    ephemeral: true,
  });
  assertBorderlessV2(noticePayload, 'TEST THÔNG BÁO', { ephemeral: true });
});

test.after(() => {
  resetAllInMemoryRounds();
});

test('4. Luật Streak: phải nhắn có dấu mới thắng, người khác đoán trước vẫn giữ streak, chỉ reset về 0 khi hết giờ đổi từ', async () => {
  resetAllInMemoryRounds();
  const { client, channel, sentMessages } = createMockClient();

  await saveWordGuessGuildConfig(client, 'guild_guess_1', {
    channelId: channel.id,
    enabled: true,
    autoStart: true,
    durationSeconds: 60,
  });

  // Ván 1: User A thắng bằng đáp án có dấu (đáp án không dấu bị từ chối)
  const r1 = await startWordGuessRound(client, 'guild_guess_1', {
    scheduleTimers: false,
    word: 'hoa hồng',
  });
  assert.equal(r1.success, true);

  const word1 = r1.round.word;
  const noAccent1 = word1.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  assert.notEqual(noAccent1, word1);
  const ignoredNoAccent = await handleWordGuessMessage(
    { guild: { id: 'guild_guess_1' }, channelId: channel.id, channel, author: { id: 'user_A', bot: false }, content: noAccent1 },
    client,
    { scheduleNext: false },
  );
  assert.equal(ignoredNoAccent, false, 'Nhắn không dấu tuyệt đối không được tính');

  const won1 = await handleWordGuessMessage(
    { guild: { id: 'guild_guess_1' }, channelId: channel.id, channel, author: { id: 'user_A', bot: false }, content: word1 },
    client,
    { scheduleNext: false },
  );
  assert.equal(won1, true);

  let cfg = await getWordGuessGuildConfig(client, 'guild_guess_1');
  assert.equal(cfg.stats.user_A.currentStreak, 1);
  assert.equal(cfg.stats.user_A.bestStreak, 1);

  // Ván 2: User B thắng trước -> User B = 1, User A VẪN GIỮ 1 streak
  const r2 = await startWordGuessRound(client, 'guild_guess_1', { scheduleTimers: false });
  const won2 = await handleWordGuessMessage(
    { guild: { id: 'guild_guess_1' }, channelId: channel.id, channel, author: { id: 'user_B', bot: false }, content: r2.round.word },
    client,
    { scheduleNext: false },
  );
  assert.equal(won2, true);

  cfg = await getWordGuessGuildConfig(client, 'guild_guess_1');
  assert.equal(cfg.stats.user_A.currentStreak, 1, 'Người khác đoán trước vẫn phải giữ streak của User A');
  assert.equal(cfg.stats.user_B.currentStreak, 1);

  // Ván 3: User A thắng tiếp -> User A tăng lên 2 streak
  const r3 = await startWordGuessRound(client, 'guild_guess_1', { scheduleTimers: false });
  await handleWordGuessMessage(
    { guild: { id: 'guild_guess_1' }, channelId: channel.id, channel, author: { id: 'user_A', bot: false }, content: r3.round.word },
    client,
    { scheduleNext: false },
  );

  cfg = await getWordGuessGuildConfig(client, 'guild_guess_1');
  assert.equal(cfg.stats.user_A.currentStreak, 2);
  assert.equal(cfg.stats.user_A.bestStreak, 2);
  assert.equal(cfg.stats.user_B.currentStreak, 1);

  // Ván 4: Hết giờ không ai đoán ra -> Toàn bộ currentStreak về 0, giữ nguyên bestStreak
  const r4 = await startWordGuessRound(client, 'guild_guess_1', { scheduleTimers: false });
  await handleRoundTimeout(client, 'guild_guess_1', r4.round.id, { scheduleNext: false });

  cfg = await getWordGuessGuildConfig(client, 'guild_guess_1');
  assert.equal(cfg.stats.user_A.currentStreak, 0);
  assert.equal(cfg.stats.user_B.currentStreak, 0);
  assert.equal(cfg.stats.user_A.bestStreak, 2);
  assert.equal(cfg.stats.user_B.bestStreak, 1);
  assert.ok(sentMessages.length > 0);
  resetAllInMemoryRounds();
});

test('5. Bảng xếp hạng Streak (5 người/trang) & phân trang ❮❮ | 1/N | ❯❯ giống Profile Booking', async () => {
  const { client } = createMockClient();
  const stats = {};
  for (let i = 1; i <= 7; i++) {
    stats[`u_${i}`] = {
      userId: `u_${i}`,
      currentStreak: i === 1 ? 3 : 0,
      bestStreak: 10 - i,
      totalWins: 15 - i,
      bestTimeMs: 2500 + i * 100,
    };
  }
  await saveWordGuessGuildConfig(client, 'guild_guess_1', {
    channelId: 'channel_guess_1',
    enabled: true,
    stats,
  });

  const config = await getWordGuessGuildConfig(client, 'guild_guess_1');
  const entries = getLeaderboardEntries(config);
  assert.equal(entries.length, 7);
  assert.equal(entries[0].userId, 'u_1');

  const page1 = buildLeaderboardPayloadV2({
    entries,
    page: 0,
    requesterStats: stats.u_1,
    requesterRank: 1,
  });
  assertBorderlessV2(page1, 'BẢNG XẾP HẠNG STREAK ĐOÁN TỪ');
  const p1Details = collectTextsAndButtons(page1);
  const p1Text = p1Details.texts.join('\n');
  for (const rankEmoji of WORD_GUESS_EMOJIS.RANK_EMOJIS) {
    assert.ok(p1Text.includes(rankEmoji));
  }
  assert.equal(p1Details.buttons[0].label, '❮❮');
  assert.equal(p1Details.buttons[0].custom_id, 'doantu_bxh_prev:0');
  assert.equal(p1Details.buttons[1].label, '1/2');
  assert.equal(p1Details.buttons[1].disabled, true);
  assert.equal(p1Details.buttons[2].label, '❯❯');
  assert.equal(p1Details.buttons[2].custom_id, 'doantu_bxh_next:0');

  // Test bấm nút next -> chuyển sang trang 2 (hiển thị #6, #7, không dùng emoji 6-7)
  let updatedPayload = null;
  const nextBtn = doantuButtons.find((b) => b.name === 'doantu_bxh_next');
  await nextBtn.execute(
    {
      guildId: 'guild_guess_1',
      user: { id: 'u_1' },
      update: async (p) => {
        updatedPayload = p;
      },
    },
    client,
    ['0'],
  );

  assert.ok(updatedPayload);
  const p2Details = collectTextsAndButtons(updatedPayload);
  const p2Text = p2Details.texts.join('\n');
  assert.ok(p2Text.includes('**#6**'));
  assert.ok(p2Text.includes('**#7**'));
  assert.equal(p2Details.buttons[1].label, '2/2');
});

test('6. Quyền role Admin 1545305594712432640, lệnh /doantu, /doantu-admin & whitelisted interactions', async () => {
  assert.equal(WORD_GUESS_ADMIN_ROLE_ID, '1545305594712432640');
  assert.equal(isWordGuessAdmin({ roles: [WORD_GUESS_ADMIN_ROLE_ID] }, 'u_admin', { ownerId: 'owner_9' }), true);
  assert.equal(isWordGuessAdmin({ roles: ['other_role'] }, 'u_normal', { ownerId: 'owner_9' }), false);
  assert.equal(isWordGuessAdmin(null, 'owner_9', { ownerId: 'owner_9' }), true);

  const { client, channel } = createMockClient();

  // Người thường gọi /doantu-admin -> bị từ chối Ephemeral
  let deniedReply = null;
  await doantuAdminCommand.execute(
    {
      guildId: 'guild_guess_1',
      user: { id: 'u_normal' },
      member: { roles: ['other_role'] },
      guild: { ownerId: 'owner_9' },
      options: { getSubcommand: () => 'panel' },
      replied: false,
      deferred: false,
      reply: async (p) => {
        deniedReply = p;
      },
    },
    null,
    client,
  );
  assertBorderlessV2(deniedReply, 'KHÔNG CÓ QUYỀN QUẢN TRỊ', { ephemeral: true });

  // Thành viên có role 1545305594712432640 gọi /doantu-admin setup -> thành công (Ephemeral)
  let setupReply = null;
  await doantuAdminCommand.execute(
    {
      guildId: 'guild_guess_1',
      channel,
      user: { id: 'u_admin' },
      member: { roles: [WORD_GUESS_ADMIN_ROLE_ID] },
      guild: { ownerId: 'owner_9', members: { me: null } },
      options: {
        getSubcommand: () => 'setup',
        getChannel: () => channel,
        getInteger: () => 45,
        getBoolean: () => true,
      },
      replied: false,
      deferred: false,
      reply: async (p) => {
        setupReply = p;
      },
    },
    null,
    client,
  );
  assertBorderlessV2(setupReply, 'QUẢN TRỊ TRÒ CHƠI ĐOÁN TỪ', { ephemeral: true });
  const setupText = collectTextsAndButtons(setupReply).texts.join('\n');
  assert.ok(setupText.includes('**45 giây**'));

  // Test modal chỉnh giây
  let modalReply = null;
  const timeModal = doantuModals.find((m) => m.name === 'doantu_modal_time');
  await timeModal.execute(
    {
      guildId: 'guild_guess_1',
      user: { id: 'u_admin' },
      member: { roles: [WORD_GUESS_ADMIN_ROLE_ID] },
      guild: { ownerId: 'owner_9' },
      fields: { getTextInputValue: () => '75' },
      replied: false,
      deferred: false,
      isFromMessage: () => true,
      update: async (p) => {
        modalReply = p;
      },
      reply: async (p) => {
        modalReply = p;
      },
    },
    client,
  );
  assert.ok(collectTextsAndButtons(modalReply).texts.join('\n').includes('**75 giây**'));

  // Test /doantu bxh & /doantu streak
  let bxhReply = null;
  await doantuCommand.execute(
    {
      guildId: 'guild_guess_1',
      user: { id: 'u_admin' },
      options: {
        getSubcommand: () => 'bxh',
        getInteger: () => 1,
      },
      replied: false,
      deferred: false,
      reply: async (p) => {
        bxhReply = p;
      },
    },
    null,
    client,
  );
  assertBorderlessV2(bxhReply, 'BẢNG XẾP HẠNG STREAK ĐOÁN TỪ');

  // Kiểm tra interactions.js whitelist đã đăng ký doantuButtons & doantuModals
  const loaderSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/handlers/loaders/interactions.js'),
    'utf-8',
  );
  assert.ok(loaderSource.includes('buttons\\/doantu'));
  assert.ok(loaderSource.includes('modals\\/doantu'));

  resetAllInMemoryRounds();
});

test('7. Sau 3 phút không có ai chơi thì tạm kết thúc & hiện nút Chơi tiếp màu xám (emoji heartg1)', async () => {
  resetAllInMemoryRounds();
  try {
    assert.equal(WORD_GUESS_DEFAULTS.IDLE_TIMEOUT_MS, 180000);

    // 1. Kiểm tra UI thẻ Tạm Kết Thúc
    const idlePayload = buildIdlePausedPayloadV2();
    assertBorderlessV2(idlePayload, 'TẠM KẾT THÚC DO VẮNG NGƯỜI CHƠI');
    const idleDetails = collectTextsAndButtons(idlePayload);
    const idleText = idleDetails.texts.join('\n');
    assert.ok(idleText.includes(WORD_GUESS_EMOJIS.TIME));
    assert.ok(idleText.includes(WORD_GUESS_EMOJIS.STATUS));
    assert.ok(idleText.includes(WORD_GUESS_EMOJIS.STREAK));
    assert.ok(idleText.includes('3 phút'));
    assert.equal(idleDetails.buttons.length, 1);
    assert.equal(idleDetails.buttons[0].style, 2, 'Nút Chơi tiếp phải màu xám (style: 2)');
    assert.equal(idleDetails.buttons[0].label, 'Chơi tiếp');
    assert.equal(idleDetails.buttons[0].custom_id, 'doantu_resume');
    assert.deepEqual(idleDetails.buttons[0].emoji, WORD_GUESS_BUTTON_EMOJIS.HINT);
    assert.equal(idleDetails.buttons[0].disabled, false);

    // 2. Mô phỏng dòng thời gian 3 phút vắng người chơi
    const { client, channel, sentMessages } = createMockClient();
    await saveWordGuessGuildConfig(client, 'guild_guess_1', {
      channelId: channel.id,
      enabled: true,
      autoStart: true,
      durationSeconds: 60,
    });

    const t0 = DAYTIME_MS;
    const r1 = await startWordGuessRound(client, 'guild_guess_1', {
      scheduleTimers: false,
      now: t0,
      word: 'hoa hồng',
    });
    assert.equal(r1.success, true);
    assert.equal(getGuildLastActivityAt('guild_guess_1'), t0);

    // Hết giờ ván 1 lúc 60s -> chưa đủ 3 phút, chưa tạm kết thúc
    const to1 = await handleRoundTimeout(client, 'guild_guess_1', r1.round.id, {
      scheduleNext: false,
      now: t0 + 60_000,
    });
    assert.equal(to1.pausedIdle, false);
    assert.equal(to1.config.idlePaused, false);

    // Tự động qua ván 2 (không được reset mốc hoạt động)
    const r2 = await startWordGuessRound(client, 'guild_guess_1', {
      scheduleTimers: false,
      isAutoContinuation: true,
      now: t0 + 65_000,
      word: 'bánh chưng',
    });
    assert.equal(getGuildLastActivityAt('guild_guess_1'), t0);

    // Có người nhắn đoán thử (dù sai) lúc 80s -> phải làm mới mốc hoạt động về t0 + 80s
    const wrongGuess = await handleWordGuessMessage(
      { guild: { id: 'guild_guess_1' }, channelId: channel.id, channel, author: { id: 'user_B', bot: false }, content: 'bánh tét' },
      client,
      { scheduleNext: false, now: t0 + 80_000 },
    );
    assert.equal(wrongGuess, false);
    assert.equal(getGuildLastActivityAt('guild_guess_1'), t0 + 80_000);

    // Hết giờ ván 2 lúc 185s (mới 105s kể từ t0 + 80s) -> CHƯA đủ 3 phút tính từ tương tác gần nhất
    const to2 = await handleRoundTimeout(client, 'guild_guess_1', r2.round.id, {
      scheduleNext: false,
      now: t0 + 185_000,
    });
    assert.equal(to2.pausedIdle, false);

    // Tự động qua ván 3 và không ai tương tác nữa
    const r3 = await startWordGuessRound(client, 'guild_guess_1', {
      scheduleTimers: false,
      isAutoContinuation: true,
      now: t0 + 190_000,
      word: 'cầu vồng',
    });

    // Hết giờ ván 3 lúc 265s (185s >= 180s kể từ t0 + 80s) -> TẠM KẾT THÚC & gửi nút Chơi tiếp
    const to3 = await handleRoundTimeout(client, 'guild_guess_1', r3.round.id, {
      scheduleNext: false,
      now: t0 + 265_000,
    });
    assert.equal(to3.pausedIdle, true);
    assert.equal(to3.config.idlePaused, true);
    assert.equal(getActiveRound('guild_guess_1'), null);
    assert.equal(getGuildLastActivityAt('guild_guess_1'), null);

    // Tin nhắn áp chót là hết giờ (không đếm ngược 5s), tin cuối cùng là thẻ Tạm kết thúc + nút Chơi tiếp
    const lastTwo = sentMessages.slice(-2);
    assertBorderlessV2(lastTwo[0].payload, 'HẾT THỜI GIAN SUY NGHĨ!');
    assert.ok(!collectTextsAndButtons(lastTwo[0].payload).texts.join('\n').includes('5 giây'));
    assertBorderlessV2(lastTwo[1].payload, 'TẠM KẾT THÚC DO VẮNG NGƯỜI CHƠI');

    // Admin panel báo đúng trạng thái đang tạm nghỉ & initWordGuessAutoResume bỏ qua phòng đang tạm nghỉ
    const adminIdleText = collectTextsAndButtons(buildAdminPanelPayloadV2(to3.config, null, t0 + 265_000)).texts.join('\n');
    assert.ok(adminIdleText.includes('Đang tạm nghỉ (Quá 3 phút chưa có người chơi)'));
    assert.equal(await initWordGuessAutoResume(client), 0);

    // 3. Người chơi bấm nút Chơi tiếp (doantu_resume) -> khóa nút cũ & mở ván mới ngay
    const resumeBtn = doantuButtons.find((b) => b.name === 'doantu_resume');
    assert.ok(resumeBtn);

    let pauseCardUpdated = null;
    await resumeBtn.execute(
      {
        guildId: 'guild_guess_1',
        channelId: channel.id,
        user: { id: 'user_resumer' },
        update: async (p) => {
          pauseCardUpdated = p;
        },
        reply: async () => {},
        followUp: async () => {},
      },
      client,
      [],
    );

    assert.ok(pauseCardUpdated);
    const updatedDetails = collectTextsAndButtons(pauseCardUpdated);
    assert.equal(updatedDetails.buttons[0].disabled, true);
    assert.ok(updatedDetails.texts.join('\n').includes('<@user_resumer>'));

    const resumedRound = getActiveRound('guild_guess_1');
    assert.ok(resumedRound && !resumedRound.ended, 'Sau khi bấm Chơi tiếp phải có ván mới đang chạy');
    const cfgAfterResume = await getWordGuessGuildConfig(client, 'guild_guess_1');
    assert.equal(cfgAfterResume.idlePaused, false);
    assertBorderlessV2(sentMessages[sentMessages.length - 1].payload, 'TRÒ CHƠI ĐOÁN TỪ BẮT ĐẦU!');

    // 4. Bấm trùng khi ván mới đang chạy -> chỉ khóa nút, không tạo ván trùng
    let duplicateGuardUpdate = null;
    await resumeBtn.execute(
      {
        guildId: 'guild_guess_1',
        channelId: channel.id,
        user: { id: 'user_other' },
        update: async (p) => {
          duplicateGuardUpdate = p;
        },
        reply: async () => {},
        followUp: async () => {},
      },
      client,
      [],
    );
    assert.equal(collectTextsAndButtons(duplicateGuardUpdate).buttons[0].disabled, true);
    assert.equal(getActiveRound('guild_guess_1').id, resumedRound.id);

    // 5. Khi kênh đã tắt -> bấm Chơi tiếp sẽ khóa nút và báo Trò chơi đang tắt
    resetAllInMemoryRounds();
    await saveWordGuessGuildConfig(client, 'guild_guess_1', {
      channelId: channel.id,
      enabled: false,
      autoStart: true,
      idlePaused: true,
    });
    let disabledCardUpdate = null;
    let disabledFollowUp = null;
    await resumeBtn.execute(
      {
        guildId: 'guild_guess_1',
        channelId: channel.id,
        user: { id: 'user_other' },
        update: async (p) => {
          disabledCardUpdate = p;
        },
        reply: async () => {},
        followUp: async (p) => {
          disabledFollowUp = p;
        },
      },
      client,
      [],
    );
    assert.equal(collectTextsAndButtons(disabledCardUpdate).buttons[0].disabled, true);
    assertBorderlessV2(disabledFollowUp, 'TRÒ CHƠI ĐANG TẮT', { ephemeral: true });
  } finally {
    resetAllInMemoryRounds();
  }
});

test('8. Khóa cứng ban đêm 00:00 - 08:00 sáng (giờ Việt Nam): tự nghỉ 8 tiếng, bấm chơi trả thẻ khóa ban đêm', async () => {
  resetAllInMemoryRounds();
  try {
    // 1. Kiểm tra biên múi giờ Việt Nam (UTC+7)
    assert.equal(WORD_GUESS_DEFAULTS.NIGHT_LOCK_START_HOUR, 0);
    assert.equal(WORD_GUESS_DEFAULTS.NIGHT_LOCK_END_HOUR, 8);
    assert.equal(isWordGuessNightLock(Date.parse('2026-11-09T23:59:59+07:00')).locked, false);
    assert.equal(isWordGuessNightLock(Date.parse('2026-11-10T00:00:00+07:00')).locked, true);
    assert.equal(isWordGuessNightLock(Date.parse('2026-11-10T03:30:00+07:00')).locked, true);
    assert.equal(isWordGuessNightLock(Date.parse('2026-11-10T07:59:59+07:00')).locked, true);
    assert.equal(isWordGuessNightLock(Date.parse('2026-11-10T08:00:00+07:00')).locked, false);

    // 2. Kiểm tra giao diện Ephemeral & giao diện Kênh khi chuyển sang ban đêm
    const nightEphemeral = buildNightLockPayloadV2({
      currentTimeText: '01:15',
      includeResumeButton: false,
      ephemeral: true,
    });
    assertBorderlessV2(nightEphemeral, 'BOT ĐANG KHÓA NGHỈ BAN ĐÊM', { ephemeral: true });
    const epDetails = collectTextsAndButtons(nightEphemeral);
    const epText = epDetails.texts.join('\n');
    assert.ok(epText.includes(WORD_GUESS_EMOJIS.TIME));
    assert.ok(epText.includes(WORD_GUESS_EMOJIS.ADMIN_DISABLE));
    assert.ok(epText.includes(WORD_GUESS_EMOJIS.HINT));
    assert.ok(epText.includes('00:00 - 08:00'));
    assert.ok(epText.includes('01:15'));
    assert.equal(epDetails.buttons.length, 0);

    const nightChannel = buildNightLockPayloadV2({
      currentTimeText: '00:00',
      includeResumeButton: true,
      ephemeral: false,
    });
    assertBorderlessV2(nightChannel, 'BOT ĐANG KHÓA NGHỈ BAN ĐÊM', { ephemeral: false });
    const chDetails = collectTextsAndButtons(nightChannel);
    assert.equal(chDetails.buttons.length, 1);
    assert.equal(chDetails.buttons[0].style, 2);
    assert.equal(chDetails.buttons[0].label, 'Chơi tiếp');
    assert.equal(chDetails.buttons[0].custom_id, 'doantu_resume');
    assert.deepEqual(chDetails.buttons[0].emoji, WORD_GUESS_BUTTON_EMOJIS.HINT);

    // 3. Trong khung 00:00 - 08:00: chặn khởi động, chặn bấm Chơi tiếp, chặn nút Admin Start & Setup
    const lateNightMs = Date.parse('2026-11-10T01:15:00+07:00');
    const { client, channel, sentMessages } = createMockClient(lateNightMs);
    await saveWordGuessGuildConfig(client, 'guild_guess_1', {
      channelId: channel.id,
      enabled: true,
      autoStart: true,
      idlePaused: true,
      durationSeconds: 60,
    });

    assert.equal(await initWordGuessAutoResume(client), 0);

    const blockedStart = await startWordGuessRound(client, 'guild_guess_1');
    assert.equal(blockedStart.success, false);
    assert.equal(blockedStart.reason, 'NIGHT_LOCK');

    const resumeBtn = doantuButtons.find((b) => b.name === 'doantu_resume');
    let resumeNightReply = null;
    await resumeBtn.execute(
      {
        guildId: 'guild_guess_1',
        channelId: channel.id,
        user: { id: 'user_night' },
        reply: async (p) => {
          resumeNightReply = p;
        },
        update: async () => {
          throw new Error('Không được tắt nút gốc trong ban đêm');
        },
      },
      client,
      [],
    );
    assertBorderlessV2(resumeNightReply, 'BOT ĐANG KHÓA NGHỈ BAN ĐÊM', { ephemeral: true });
    assert.ok(collectTextsAndButtons(resumeNightReply).texts.join('\n').includes('01:15'));
    assert.equal(getActiveRound('guild_guess_1'), null);

    const adminStartBtn = doantuButtons.find((b) => b.name === 'doantu_admin_start');
    let adminStartNightReply = null;
    await adminStartBtn.execute(
      {
        guildId: 'guild_guess_1',
        user: { id: 'u_admin' },
        member: { roles: [WORD_GUESS_ADMIN_ROLE_ID] },
        guild: { ownerId: 'owner_9' },
        reply: async (p) => {
          adminStartNightReply = p;
        },
      },
      client,
    );
    assertBorderlessV2(adminStartNightReply, 'BOT ĐANG KHÓA NGHỈ BAN ĐÊM', { ephemeral: true });

    let setupNightReply = null;
    await doantuAdminCommand.execute(
      {
        guildId: 'guild_guess_1',
        channel,
        user: { id: 'u_admin' },
        member: { roles: [WORD_GUESS_ADMIN_ROLE_ID] },
        guild: { ownerId: 'owner_9', members: { me: null } },
        options: {
          getSubcommand: () => 'setup',
          getChannel: () => channel,
          getInteger: () => 45,
          getBoolean: () => true,
        },
        replied: false,
        deferred: false,
        reply: async (p) => {
          setupNightReply = p;
        },
      },
      null,
      client,
    );
    assertBorderlessV2(setupNightReply, 'BOT ĐANG KHÓA NGHỈ BAN ĐÊM', { ephemeral: true });
    assert.ok(collectTextsAndButtons(setupNightReply).texts.join('\n').includes('Đã lưu cấu hình kênh chơi'));

    const cfgAtNight = await getWordGuessGuildConfig(client, 'guild_guess_1');
    const adminNightText = collectTextsAndButtons(buildAdminPanelPayloadV2(cfgAtNight, null, lateNightMs)).texts.join('\n');
    assert.ok(adminNightText.includes('Đang khóa nghỉ ban đêm (00:00 - 08:00 sáng)'));

    // 4. Ván bắt đầu lúc 23:59:40 -> hết giờ lúc 00:00:40 phải tự khóa ban đêm & gửi nút Chơi tiếp cho 08:00 sáng
    const beforeMidnightMs = Date.parse('2026-11-09T23:59:40+07:00');
    const afterMidnightMs = Date.parse('2026-11-10T00:00:40+07:00');
    client.setNow(beforeMidnightMs);
    const crossRound = await startWordGuessRound(client, 'guild_guess_1', {
      scheduleTimers: false,
      word: 'hoa hồng',
    });
    assert.equal(crossRound.success, true);

    client.setNow(afterMidnightMs);
    const crossTimeout = await handleRoundTimeout(client, 'guild_guess_1', crossRound.round.id, {
      scheduleNext: true,
    });
    assert.equal(crossTimeout.pausedNight, true);
    assert.equal(crossTimeout.config.idlePaused, true);
    assert.equal(getActiveRound('guild_guess_1'), null);
    assertBorderlessV2(sentMessages[sentMessages.length - 1].payload, 'BOT ĐANG KHÓA NGHỈ BAN ĐÊM', { ephemeral: false });

    // 5. Ván bắt đầu lúc 23:59:50 -> có người đoán trúng lúc 00:00:05 vẫn cộng streak nhưng dừng vòng tự động để ngủ ban đêm
    client.setNow(Date.parse('2026-11-09T23:59:50+07:00'));
    await startWordGuessRound(client, 'guild_guess_1', {
      scheduleTimers: false,
      word: 'bánh chưng',
    });
    client.setNow(Date.parse('2026-11-10T00:00:05+07:00'));
    const lateWin = await handleWordGuessMessage(
      { guild: { id: 'guild_guess_1' }, channelId: channel.id, channel, author: { id: 'user_late', bot: false }, content: 'bánh chưng' },
      client,
      { scheduleNext: true },
    );
    assert.equal(lateWin, true);
    assert.equal((await getWordGuessGuildConfig(client, 'guild_guess_1')).stats.user_late.currentStreak, 1);
    assertBorderlessV2(sentMessages[sentMessages.length - 1].payload, 'BOT ĐANG KHÓA NGHỈ BAN ĐÊM', { ephemeral: false });

    // 6. Đúng 08:00:00 sáng -> bấm Chơi tiếp mở ván mới ngay
    client.setNow(Date.parse('2026-11-10T08:00:00+07:00'));
    let wakeUpdate = null;
    await resumeBtn.execute(
      {
        guildId: 'guild_guess_1',
        channelId: channel.id,
        user: { id: 'user_morning' },
        update: async (p) => {
          wakeUpdate = p;
        },
        reply: async () => {},
        followUp: async () => {},
      },
      client,
      [],
    );
    assert.equal(collectTextsAndButtons(wakeUpdate).buttons[0].disabled, true);
    assert.ok(getActiveRound('guild_guess_1') && !getActiveRound('guild_guess_1').ended);
  } finally {
    resetAllInMemoryRounds();
  }
});
