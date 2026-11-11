import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { MessageFlags } from 'discord.js';

import {
  HSK_ADMIN_ROLE_ID,
  HSK_ALLOWED_ADMIN_ROLES,
  HSK_BANDS,
  HSK_BUTTON_EMOJIS,
  HSK_DEFAULTS,
  HSK_EMOJIS,
  HSK_STUDY_TIERS,
  formatHskTitle,
} from '../src/config/hskConfig.js';
import {
  IS_COMPONENTS_V2,
  buildArenaRoundPayloadV2,
  buildArenaTimeoutPayloadV2,
  buildArenaWinPayloadV2,
  buildHskAdminPanelPayloadV2,
  buildHskIdlePausedPayloadV2,
  buildHskLeaderboardPayloadV2,
  buildHskNightLockPayloadV2,
  buildHskNoticePayloadV2,
  buildPersonalArenaOverviewPayloadV2,
  buildPersonalFlashcardPayloadV2,
  buildPersonalHubPayloadV2,
  buildPersonalNotebookPayloadV2,
  buildPersonalQuizPayloadV2,
  buildQuestionFromWord,
  buildStudyRoomLobbyPayloadV2,
  detectChannelStudyTier,
  evictUnusedBandCaches,
  getActiveHskArenaRound,
  getEffectiveBandForTier,
  getHskArenaLastActivityAt,
  getHskGuildConfig,
  getHskUserProgress,
  getLoadedBandCacheSize,
  getPersonalSession,
  handleHskArenaAnswer,
  handleHskArenaHint,
  handleHskArenaTimeout,
  initHskAutoResume,
  isHskAdmin,
  isHskNightLock,
  loadBandWords,
  resetAllHskRuntimeState,
  saveHskGuildConfig,
  searchHskVocabulary,
  startHskArenaRound,
} from '../src/services/hskService.js';
import hskCommand from '../src/commands/Games/hsk.js';
import hskAdminCommand from '../src/commands/Games/hskAdmin.js';
import hskButtons from '../src/interactions/buttons/hskButtons.js';
import hskMenus from '../src/interactions/selectMenus/hskMenus.js';
import hskModals from '../src/interactions/modals/hskModals.js';

const DAYTIME_MS = Date.parse('2026-11-11T14:00:00+07:00');

function createMockClient(initialNow = DAYTIME_MS) {
  let mockNow = initialNow;
  const store = new Map();
  const sentMessages = [];

  const channel = {
    id: 'channel_hsk_1',
    guild: { id: 'guild_hsk_1', members: { me: null } },
    send: async (payload) => {
      const msg = {
        id: `msg_hsk_${sentMessages.length + 1}`,
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
    _hskNow: () => mockNow,
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

function collectPayloadNodes(payload) {
  const texts = [];
  const buttons = [];
  const menus = [];
  const actionRows = [];

  const walk = (nodes) => {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      if (!node) continue;
      if (node.type === 1) {
        actionRows.push(node);
      }
      if (node.type === 10 && typeof node.content === 'string') {
        texts.push(node.content);
      }
      if (node.type === 2) {
        buttons.push(node);
      }
      if (node.type === 3) {
        menus.push(node);
      }
      if (Array.isArray(node.components)) {
        walk(node.components);
      }
      if (node.accessory && node.accessory.type === 2) {
        buttons.push(node.accessory);
      }
    }
  };

  walk(payload?.components);
  return { texts, buttons, menus, actionRows };
}

function assertHskV2Contract(payload, expectedTitle, { ephemeral = false } = {}) {
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
  assert.equal(firstText.content, formatHskTitle(expectedTitle));
  assert.ok(firstText.content.startsWith(`${HSK_EMOJIS.TITLE_LEFT} **`));
  assert.ok(firstText.content.endsWith(`** ${HSK_EMOJIS.TITLE_RIGHT}`));

  const { texts, buttons, actionRows } = collectPayloadNodes(payload);
  for (const row of actionRows) {
    assert.ok(Array.isArray(row.components) && row.components.length <= 5, 'ActionRow vượt quá 5 component');
  }
  for (const btn of buttons) {
    assert.equal(btn.style, 2, `Nút "${btn.label}" phải là màu xám (style: 2)`);
    assert.ok(String(btn.label || '').length >= 1 && String(btn.label || '').length <= 80, `Label vượt 80 ký tự: ${btn.label}`);
    assert.ok(String(btn.custom_id || '').length >= 1 && String(btn.custom_id || '').length <= 100, `custom_id vượt 100 ký tự: ${btn.custom_id}`);
  }
  for (const txt of texts) {
    const withoutSlashCmds = txt.replace(/`\/hsk[^`]*`/g, '');
    assert.ok(!withoutSlashCmds.includes('`'), `Không được dùng backtick xanh cho Pinyin/từ vựng: ${txt}`);
  }
}

test.after(() => {
  resetAllHskRuntimeState();
});

test('1. Kho 7 JSON shards HSK 3.0 (315 từ), kiểm định nội dung & giải phóng RAM nhẹ', () => {
  resetAllHskRuntimeState();
  try {
    let total = 0;
    const seenIds = new Set();
    const seenHanzi = new Set();

    for (const band of HSK_BANDS) {
      const words = loadBandWords(band.id);
      assert.equal(words.length, 45, `${band.name} phải có đúng 45 từ chuẩn hóa`);
      total += words.length;

      const meaningsInBand = new Set();
      for (const w of words) {
        assert.ok(!seenIds.has(w.id), `Trùng word.id: ${w.id}`);
        seenIds.add(w.id);

        assert.ok(!seenHanzi.has(w.hanzi), `Trùng Hanzi toàn kho: ${w.hanzi}`);
        seenHanzi.add(w.hanzi);

        assert.equal(w.band, band.id);
        assert.ok(w.meaning && w.meaning.length <= 58, `Nghĩa quá dài (${w.id}): ${w.meaning}`);
        assert.ok(!meaningsInBand.has(w.meaning), `Trùng nghĩa trong ${band.name}: ${w.meaning}`);
        meaningsInBand.add(w.meaning);

        assert.ok(w.pos && w.posVi, `Thiếu pos/posVi ở ${w.id}`);
        assert.ok(Array.isArray(w.pyDist) && w.pyDist.length === 3, `Thiếu pyDist ở ${w.id}`);
        assert.ok(!w.pyDist.includes(w.pinyin), `pyDist trùng đáp án đúng ở ${w.id}`);
        assert.equal(new Set(w.pyDist).size, 3, `pyDist bị trùng nội bộ ở ${w.id}`);

        assert.ok(Array.isArray(w.clozeDist) && w.clozeDist.length === 3, `Thiếu clozeDist ở ${w.id}`);
        assert.ok(!w.clozeDist.includes(w.hanzi), `clozeDist trùng hanzi ở ${w.id}`);
        assert.equal(new Set(w.clozeDist).size, 3, `clozeDist bị trùng nội bộ ở ${w.id}`);

        assert.ok(w.clozeZh && w.clozeZh.includes('____'), `clozeZh thiếu ____ ở ${w.id}`);
        assert.ok(!w.clozeZh.includes(w.hanzi), `clozeZh bị lộ đáp án ở ${w.id}`);
      }
    }
    assert.equal(total, 315);

    // Dọn RAM: khi giải phóng cache thì bandWordCache trở về 0
    evictUnusedBandCaches();
    assert.equal(getLoadedBandCacheSize(), 0);

    // Tra cứu toàn kho không ghim toàn bộ 7 shard vào RAM
    const resZh = searchHskVocabulary('循序渐进', { maxResults: 3 });
    assert.equal(resZh[0]?.hanzi, '循序渐进');
    const resPy = searchHskVocabulary('xunxu', { maxResults: 3 });
    assert.equal(resPy[0]?.hanzi, '循序渐进');
    const resVi = searchHskVocabulary('thu vien', { maxResults: 3 });
    assert.equal(resVi[0]?.hanzi, '图书馆');
    assert.equal(getLoadedBandCacheSize(), 0, 'Tra cứu toàn kho không được nạp giữ cả 7 mảnh trong RAM');
  } finally {
    resetAllHskRuntimeState();
  }
});

test('2. Kiểm tra Components V2 đúng thiết kế user duyệt (Menu không footer, Emoji chuẩn, Chevron ảnh mẫu, Ôn luyện riêng)', () => {
  resetAllHskRuntimeState();
  const b1Words = loadBandWords(1);
  const b7Words = loadBandWords(7);
  const sampleWord = b1Words[0];
  const sampleQuestion = buildQuestionFromWord(sampleWord, 'vi', b1Words);

  // 2a. Menu cá nhân: không footer, đúng emoji, 4 nút xám
  const hub = buildPersonalHubPayloadV2({
    ownerId: 'u1',
    progress: { selectedBand: 1, personalStreak: 5, masteredIds: ['b1_1', 'b1_2'], wrongWords: { b1_3: { id: 'b1_3' } }, srs: {} },
    ephemeral: true,
    nowMs: DAYTIME_MS,
  });
  assertHskV2Contract(hub, 'HSK 3.0 — ÔN LUYỆN TIẾNG TRUNG CÁ NHÂN', { ephemeral: true });
  const hubNodes = collectPayloadNodes(hub);
  const hubText = hubNodes.texts.join('\n');
  assert.ok(!hubText.includes('-#'), 'Menu cá nhân KHÔNG được có footer');
  assert.ok(hubText.includes('Chào bạn! Mời bạn chọn cấp độ HSK 3.0 bên dưới rồi bấm chế độ muốn ôn nha:'));
  assert.ok(hubText.includes(HSK_EMOJIS.LEVEL));
  assert.ok(hubText.includes(HSK_EMOJIS.STREAK));
  assert.ok(hubText.includes('> Đã thuộc: **2 từ**'));
  assert.ok(hubText.includes(HSK_EMOJIS.NOTEBOOK));
  assert.ok(hubText.includes('> **1 từ** vừa trả lời sai'));
  assert.equal(hubNodes.menus.length, 1);
  assert.equal(hubNodes.buttons.length, 4);
  assert.deepEqual(hubNodes.buttons[0].emoji, HSK_BUTTON_EMOJIS.ACTION);
  assert.deepEqual(hubNodes.buttons[1].emoji, HSK_BUTTON_EMOJIS.ACTION);
  assert.deepEqual(hubNodes.buttons[2].emoji, HSK_BUTTON_EMOJIS.NOTEBOOK);
  assert.deepEqual(hubNodes.buttons[3].emoji, HSK_BUTTON_EMOJIS.ARENA);

  // 2b. Trắc nghiệm cá nhân: Gợi ý (trangtrig49), ❯❯ Câu tiếp theo (không emoji tùy chỉnh), Về menu (trangtrig62)
  const quiz = buildPersonalQuizPayloadV2({
    ownerId: 'u1',
    progress: { selectedBand: 1, personalStreak: 2, bestPersonalStreak: 4 },
    word: sampleWord,
    question: sampleQuestion,
    ephemeral: true,
  });
  assertHskV2Contract(quiz, 'TRẮC NGHIỆM HSK 3.0 — HSK 1', { ephemeral: true });
  const quizButtons = collectPayloadNodes(quiz).buttons;
  const hintBtn = quizButtons.find((b) => b.custom_id.startsWith('hsk_quiz_hint:'));
  const nextBtn = quizButtons.find((b) => b.custom_id.startsWith('hsk_quiz_next:'));
  const homeBtn = quizButtons.find((b) => b.custom_id.startsWith('hsk_home:'));
  assert.deepEqual(hintBtn.emoji, HSK_BUTTON_EMOJIS.HINT);
  assert.equal(nextBtn.label, '❯❯ Câu tiếp theo');
  assert.equal(nextBtn.emoji, undefined);
  assert.deepEqual(homeBtn.emoji, HSK_BUTTON_EMOJIS.ACTION);

  // 2c. Flashcard SRS: Lật thẻ xem đáp án (trangtrig54) & Về menu (trangtrig62)
  const flashFront = buildPersonalFlashcardPayloadV2({
    ownerId: 'u1',
    progress: { selectedBand: 7, srs: {} },
    word: b7Words[0],
    flipped: false,
    ephemeral: true,
  });
  assertHskV2Contract(flashFront, 'FLASHCARD HSK 3.0 — SRS NHẮC NGẮT QUÃNG', { ephemeral: true });
  const flashFrontBtns = collectPayloadNodes(flashFront).buttons;
  assert.deepEqual(flashFrontBtns[0].emoji, HSK_BUTTON_EMOJIS.FLIP);
  assert.deepEqual(flashFrontBtns[1].emoji, HSK_BUTTON_EMOJIS.ACTION);

  // 2d. Sổ tay từ sai & Tra cứu nhanh: bold Pinyin không chữ xanh, Đã thuộc trangtrig31, Ôn lại emoji streak
  const notebook = buildPersonalNotebookPayloadV2({
    ownerId: 'u1',
    progress: {
      wrongWords: {
        [sampleWord.id]: {
          id: sampleWord.id,
          band: sampleWord.band,
          hanzi: sampleWord.hanzi,
          pinyin: sampleWord.pinyin,
          meaning: sampleWord.meaning,
          wrongCount: 2,
          lastWrongAt: DAYTIME_MS,
        },
      },
    },
    searchQuery: b7Words[0].hanzi,
    searchResults: [b7Words[0]],
    ephemeral: true,
    nowMs: DAYTIME_MS,
  });
  assertHskV2Contract(notebook, 'SỔ TAY TỪ SAI & TRA CỨU NHANH HSK 3.0', { ephemeral: true });
  const nbNodes = collectPayloadNodes(notebook);
  assert.ok(nbNodes.texts.join('\n').includes(`**${sampleWord.hanzi}** (**${sampleWord.pinyin}**)`));
  const doneBtn = nbNodes.buttons.find((b) => b.custom_id.startsWith('hsk_nb_done:'));
  const reviewBtn = nbNodes.buttons.find((b) => b.custom_id.startsWith('hsk_nb_review:'));
  const nbHomeBtn = nbNodes.buttons.find((b) => b.custom_id.startsWith('hsk_home:'));
  assert.deepEqual(doneBtn.emoji, HSK_BUTTON_EMOJIS.CHECK);
  assert.deepEqual(reviewBtn.emoji, HSK_BUTTON_EMOJIS.STREAK);
  assert.deepEqual(nbHomeBtn.emoji, HSK_BUTTON_EMOJIS.ACTION);

  // 2e. Đấu trường kênh chung: <:trangtri2:...> không animated, Ôn luyện riêng không tiếng Anh, ❯❯ Ván mới
  const arena = buildArenaRoundPayloadV2({
    roundNumber: 12,
    levelLabel: 'HSK 1 · Sơ cấp 1',
    durationSeconds: 45,
    word: sampleWord,
    question: sampleQuestion,
    roundId: 'rnd12abc',
    topStreakEntry: { userId: 'u_top', currentStreak: 4, bestStreak: 7 },
    controlsDisabled: false,
  });
  assertHskV2Contract(arena, 'ĐẤU TRƯỜNG HSK 3.0 — VÁN #12', { ephemeral: false });
  const arenaNodes = collectPayloadNodes(arena);
  const arenaText = arenaNodes.texts.join('\n');
  assert.equal(HSK_BUTTON_EMOJIS.TIME.animated, false);
  assert.ok(arenaText.includes('<:trangtri2:1567819836279492652> Thời gian ván:'));
  assert.ok(arenaText.includes('<a:trangtrig61:1569559986550612051> Cấp độ kênh:'));
  assert.ok(arenaText.includes('Pinyin: <a:trangtrig49:1567818140375851018> Bấm "Mở gợi ý" để xem riêng'));
  assert.ok(arenaText.includes(`${HSK_EMOJIS.STREAK} Đang giữ chuỗi:`));

  const arenaPersonalBtn = arenaNodes.buttons.find((b) => b.custom_id === 'hsk_arena_personal');
  const arenaBxhBtn = arenaNodes.buttons.find((b) => b.custom_id === 'hsk_arena_bxh');
  const arenaNextBtn = arenaNodes.buttons.find((b) => b.custom_id.startsWith('hsk_arena_next:'));
  const arenaHintBtn = arenaNodes.buttons.find((b) => b.custom_id.startsWith('hsk_arena_hint:'));
  assert.equal(arenaPersonalBtn.label, 'Ôn luyện riêng');
  assert.deepEqual(arenaPersonalBtn.emoji, HSK_BUTTON_EMOJIS.NOTEBOOK);
  assert.deepEqual(arenaHintBtn.emoji, HSK_BUTTON_EMOJIS.HINT);
  assert.deepEqual(arenaBxhBtn.emoji, HSK_BUTTON_EMOJIS.ACTION);
  assert.equal(arenaNextBtn.label, '❯❯ Ván mới');
  assert.equal(arenaNextBtn.emoji, undefined);

  // 2f. Kiểm tra các thẻ phụ khác
  assertHskV2Contract(
    buildArenaWinPayloadV2({ roundNumber: 12, winnerId: 'u1', word: sampleWord, reactionSeconds: '2.5', winnerStats: { currentStreak: 1, bestStreak: 1 } }),
    'CHÍNH XÁC — VÁN #12',
  );
  assertHskV2Contract(
    buildArenaTimeoutPayloadV2({ roundNumber: 12, word: sampleWord, durationSeconds: 45 }),
    'HẾT THỜI GIAN — VÁN #12',
  );
  assertHskV2Contract(buildHskIdlePausedPayloadV2(), 'ĐẤU TRƯỜNG TẠM NGHỈ DO VẮNG NGƯỜI CHƠI');
  assertHskV2Contract(buildHskNightLockPayloadV2({ currentTimeText: '01:00', includeResumeButton: false, ephemeral: true }), 'ĐẤU TRƯỜNG ĐANG NGHỈ BAN ĐÊM', { ephemeral: true });
  assertHskV2Contract(buildHskLeaderboardPayloadV2({ entries: [], page: 0, ephemeral: true }), 'BẢNG XẾP HẠNG ĐẤU TRƯỜNG HSK 3.0', { ephemeral: true });
  assertHskV2Contract(buildPersonalArenaOverviewPayloadV2({ ownerId: 'u1', config: {}, ephemeral: true }), 'THÔNG TIN ĐẤU TRƯỜNG HSK 3.0', { ephemeral: true });
  assertHskV2Contract(buildStudyRoomLobbyPayloadV2('elementary'), HSK_STUDY_TIERS.elementary.roomTitle, { ephemeral: false });
  assertHskV2Contract(buildStudyRoomLobbyPayloadV2('advanced'), HSK_STUDY_TIERS.advanced.roomTitle, { ephemeral: false });
  assertHskV2Contract(buildHskAdminPanelPayloadV2({}), 'QUẢN TRỊ ĐẤU TRƯỜNG & ÔN LUYỆN HSK 3.0', { ephemeral: true });
  assertHskV2Contract(buildHskNoticePayloadV2({ title: 'THÔNG BÁO', message: 'Nội dung', ephemeral: true }), 'THÔNG BÁO', { ephemeral: true });
});

test('3. Lệnh /hsk, prefix &hsk (công khai + nhiều từ khóa) và tách phiên Ephemeral khi người khác bấm nút', async () => {
  resetAllHskRuntimeState();
  const { client } = createMockClient();

  // 3a. Slash /hsk -> Ephemeral Hub
  let slashReply = null;
  await hskCommand.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'owner_1' },
      options: { getString: () => null },
      replied: false,
      deferred: false,
      reply: async (p) => {
        slashReply = p;
      },
    },
    null,
    client,
  );
  assertHskV2Contract(slashReply, 'HSK 3.0 — ÔN LUYỆN TIẾNG TRUNG CÁ NHÂN', { ephemeral: true });

  // 3b. Prefix &hsk thu vien -> Non-ephemeral Notebook + searchResultIds được lưu đúng key
  let prefixSearchReply = null;
  await hskCommand.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'owner_1' },
      _isPrefixCommand: true,
      options: {
        getString: () => 'thu',
        _hoistedOptions: [{ value: 'thu' }, { value: 'vien' }],
      },
      replied: false,
      deferred: false,
      reply: async (p) => {
        prefixSearchReply = p;
      },
    },
    null,
    client,
  );
  assertHskV2Contract(prefixSearchReply, 'SỔ TAY TỪ SAI & TRA CỨU NHANH HSK 3.0', { ephemeral: false });
  assert.ok(collectPayloadNodes(prefixSearchReply).texts.join('\n').includes('图书馆'));
  const savedSess = getPersonalSession('guild_hsk_1', 'owner_1', DAYTIME_MS);
  assert.ok(Array.isArray(savedSess.searchResultIds) && savedSess.searchResultIds.length > 0);

  // 3c. Owner chọn HSK 5 qua Select Menu trên thẻ công khai -> update không gắn cờ Ephemeral
  const bandSelect = hskMenus.find((m) => m.name === 'hsk_select_band');
  let ownerUpdated = null;
  await bandSelect.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'owner_1' },
      values: ['5'],
      message: { flags: { bitfield: IS_COMPONENTS_V2 } },
      update: async (p) => {
        ownerUpdated = p;
      },
      reply: async () => {
        throw new Error('Owner phải update trực tiếp');
      },
    },
    client,
    ['owner_1'],
  );
  assert.equal(ownerUpdated.flags, IS_COMPONENTS_V2);
  assert.ok(collectPayloadNodes(ownerUpdated).texts.join('\n').includes('HSK 5 · Trung cấp 5'));
  assert.equal((await getHskUserProgress(client, 'guild_hsk_1', 'owner_1')).selectedBand, 5);

  // 3d. Người chơi khác (other_2) bấm nút Trắc nghiệm trên thẻ công khai của owner_1 -> mở thẻ Ephemeral riêng của other_2
  const modeQuizBtn = hskButtons.find((b) => b.name === 'hsk_mode_quiz');
  let otherReply = null;
  await modeQuizBtn.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'other_2' },
      message: { flags: { bitfield: IS_COMPONENTS_V2 } },
      update: async () => {
        throw new Error('Không được ghi đè thẻ của owner');
      },
      reply: async (p) => {
        otherReply = p;
      },
    },
    client,
    ['owner_1'],
  );
  assert.equal(otherReply.flags, MessageFlags.Ephemeral | IS_COMPONENTS_V2);
  assert.ok(collectPayloadNodes(otherReply).texts.join('\n').includes('HSK 1'), 'Người khác giữ cấp độ mặc định HSK 1 của riêng họ');
});

test('4. Luồng Ôn luyện cá nhân đầy đủ: Trắc nghiệm (sai->Sổ tay, đúng->Streak), 3 chế độ, Flashcard SRS, Modal Tra cứu & Sổ tay', async () => {
  resetAllHskRuntimeState();
  const { client } = createMockClient();

  const startQuizBtn = hskButtons.find((b) => b.name === 'hsk_mode_quiz');
  const ansBtn = hskButtons.find((b) => b.name === 'hsk_quiz_ans');
  const hintBtn = hskButtons.find((b) => b.name === 'hsk_quiz_hint');
  const typeBtn = hskButtons.find((b) => b.name === 'hsk_quiz_type');
  const nextBtn = hskButtons.find((b) => b.name === 'hsk_quiz_next');

  let currentPayload = null;
  const makePersonalInteraction = (userId = 'u_study') => ({
    guildId: 'guild_hsk_1',
    user: { id: userId },
    message: { flags: { bitfield: MessageFlags.Ephemeral | IS_COMPONENTS_V2 } },
    update: async (p) => {
      currentPayload = p;
    },
    reply: async (p) => {
      currentPayload = p;
    },
  });

  // Mở trắc nghiệm -> mở gợi ý -> chọn SAI
  await startQuizBtn.execute(makePersonalInteraction(), client, ['u_study']);
  const sess1 = getPersonalSession('guild_hsk_1', 'u_study', DAYTIME_MS);
  const q1 = sess1.quizQuestion;

  await hintBtn.execute(makePersonalInteraction(), client, ['u_study', q1.qId]);
  assert.ok(collectPayloadNodes(currentPayload).texts.join('\n').includes('Gợi ý:'));

  const wrongIdx = (q1.correctIndex + 1) % 4;
  await ansBtn.execute(makePersonalInteraction(), client, ['u_study', q1.qId, String(wrongIdx)]);
  assert.ok(collectPayloadNodes(currentPayload).texts.join('\n').includes('Chưa đúng rồi!'));

  let prog = await getHskUserProgress(client, 'guild_hsk_1', 'u_study');
  assert.equal(prog.personalStreak, 0);
  assert.ok(prog.wrongWords[q1.wordId], 'Trả lời sai phải tự lưu vào Sổ tay');

  // Chuyển sang câu tiếp theo và trả lời ĐÚNG
  await nextBtn.execute(makePersonalInteraction(), client, ['u_study']);
  const q2 = getPersonalSession('guild_hsk_1', 'u_study', DAYTIME_MS).quizQuestion;
  await ansBtn.execute(makePersonalInteraction(), client, ['u_study', q2.qId, String(q2.correctIndex)]);
  prog = await getHskUserProgress(client, 'guild_hsk_1', 'u_study');
  assert.equal(prog.personalStreak, 1);
  assert.ok(prog.masteredIds.includes(q2.wordId));

  // Đổi dạng 汉字 -> Pinyin & Điền khuyết
  await typeBtn.execute(makePersonalInteraction(), client, ['u_study', 'pinyin']);
  assert.equal(getPersonalSession('guild_hsk_1', 'u_study', DAYTIME_MS).quizQuestion.quizType, 'pinyin');
  await typeBtn.execute(makePersonalInteraction(), client, ['u_study', 'cloze']);
  assert.equal(getPersonalSession('guild_hsk_1', 'u_study', DAYTIME_MS).quizQuestion.quizType, 'cloze');

  // Flashcard + Lật thẻ + Chấm điểm SRS
  const flashBtn = hskButtons.find((b) => b.name === 'hsk_mode_flash');
  const flipBtn = hskButtons.find((b) => b.name === 'hsk_flash_flip');
  const rateBtn = hskButtons.find((b) => b.name === 'hsk_flash_rate');

  await flashBtn.execute(makePersonalInteraction(), client, ['u_study']);
  const flashWordId = getPersonalSession('guild_hsk_1', 'u_study', DAYTIME_MS).flashWordId;
  await flipBtn.execute(makePersonalInteraction(), client, ['u_study', flashWordId]);
  assert.ok(collectPayloadNodes(currentPayload).texts.join('\n').includes('Ví dụ:'));

  await rateBtn.execute(makePersonalInteraction(), client, ['u_study', flashWordId, 'good']);
  prog = await getHskUserProgress(client, 'guild_hsk_1', 'u_study');
  assert.ok(prog.masteredIds.includes(flashWordId));
  assert.ok(prog.srs[flashWordId].dueAt > DAYTIME_MS);

  // Modal Tra cứu nhanh + Nút Đã thuộc trong Sổ tay
  const searchModal = hskModals.find((m) => m.name === 'hsk_modal_search');
  await searchModal.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'u_study' },
      message: { flags: { bitfield: MessageFlags.Ephemeral | IS_COMPONENTS_V2 } },
      fields: { getTextInputValue: () => 'xunxu' },
      isFromMessage: () => true,
      update: async (p) => {
        currentPayload = p;
      },
      reply: async (p) => {
        currentPayload = p;
      },
    },
    client,
  );
  assert.ok(collectPayloadNodes(currentPayload).texts.join('\n').includes('循序渐进'));

  const nbDoneBtn = hskButtons.find((b) => b.name === 'hsk_nb_done');
  await nbDoneBtn.execute(makePersonalInteraction(), client, ['u_study', q1.wordId, '0']);
  prog = await getHskUserProgress(client, 'guild_hsk_1', 'u_study');
  assert.equal(prog.wrongWords[q1.wordId], undefined);
});

test('5. Đấu trường kênh chung: 100% bấm nút, chống spam 1 lượt/ván, mở gợi ý riêng, thắng +Streak & BXH 5 người/trang', async () => {
  resetAllHskRuntimeState();
  const { client, channel, sentMessages } = createMockClient();

  await saveHskGuildConfig(client, 'guild_hsk_1', {
    channelId: channel.id,
    enabled: true,
    autoStart: true,
    arenaLevelKey: '1',
    durationSeconds: 45,
  });

  // Mở Ván #1
  const r1 = await startHskArenaRound(client, 'guild_hsk_1', { scheduleTimers: false });
  assert.equal(r1.success, true);
  assert.equal(r1.round.roundNumber, 1);

  const wrongChoice = (r1.round.question.correctIndex + 1) % 4;
  let wrongReplyA = null;
  await handleHskArenaAnswer(
    {
      guildId: 'guild_hsk_1',
      channel,
      user: { id: 'player_A' },
      reply: async (p) => {
        wrongReplyA = p;
      },
    },
    client,
    r1.round.id,
    wrongChoice,
  );
  assertHskV2Contract(wrongReplyA, 'CHƯA CHÍNH XÁC RỒI!', { ephemeral: true });
  assert.ok(getActiveHskArenaRound('guild_hsk_1') && !getActiveHskArenaRound('guild_hsk_1').ended, 'Người A bấm sai không được kết thúc ván');
  const progA = await getHskUserProgress(client, 'guild_hsk_1', 'player_A');
  assert.ok(progA.wrongWords[r1.round.word.id], 'Bấm sai ở Đấu trường cũng tự lưu Sổ tay');

  // Người A cố spam bấm lại trong cùng Ván #1 -> bị chặn Ephemeral
  let spamReplyA = null;
  await handleHskArenaAnswer(
    {
      guildId: 'guild_hsk_1',
      channel,
      user: { id: 'player_A' },
      reply: async (p) => {
        spamReplyA = p;
      },
    },
    client,
    r1.round.id,
    r1.round.question.correctIndex,
  );
  assertHskV2Contract(spamReplyA, 'ĐÃ DÙNG LƯỢT TRONG VÁN NÀY', { ephemeral: true });

  // Người B bấm Mở gợi ý riêng -> nhận Ephemeral Pinyin
  let hintReplyB = null;
  await handleHskArenaHint(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'player_B' },
      reply: async (p) => {
        hintReplyB = p;
      },
    },
    client,
    r1.round.id,
  );
  assertHskV2Contract(hintReplyB, 'GỢI Ý RIÊNG — VÁN #1', { ephemeral: true });
  assert.ok(collectPayloadNodes(hintReplyB).texts.join('\n').includes(r1.round.word.pinyin));

  // Người B bấm ĐÚNG -> thắng ván #1, khóa nút A/B/C/D trên thẻ gốc, gửi thẻ thắng & tăng Streak
  let cardUpdated = null;
  const won = await handleHskArenaAnswer(
    {
      guildId: 'guild_hsk_1',
      channel,
      user: { id: 'player_B' },
      update: async (p) => {
        cardUpdated = p;
      },
    },
    client,
    r1.round.id,
    r1.round.question.correctIndex,
    { scheduleNext: false, now: DAYTIME_MS + 3200 },
  );
  assert.equal(won, true);
  assert.equal(getActiveHskArenaRound('guild_hsk_1'), null);

  const updatedBtns = collectPayloadNodes(cardUpdated).buttons;
  const answerBtns = updatedBtns.filter((b) => b.custom_id.startsWith('hsk_arena_ans:'));
  assert.equal(answerBtns.every((b) => b.disabled === true), true);
  const nextArenaBtn = updatedBtns.find((b) => b.custom_id.startsWith('hsk_arena_next:'));
  assert.equal(nextArenaBtn.disabled, undefined);

  assertHskV2Contract(sentMessages[sentMessages.length - 1].payload, 'CHÍNH XÁC — VÁN #1');

  const cfgAfterWin = await getHskGuildConfig(client, 'guild_hsk_1');
  assert.equal(cfgAfterWin.stats.player_B.currentStreak, 1);
  assert.equal(cfgAfterWin.stats.player_B.bestStreak, 1);

  // Kiểm tra BXH Server & Phân trang 7 người
  const bxhStats = {};
  for (let i = 1; i <= 7; i += 1) {
    bxhStats[`top_${i}`] = {
      userId: `top_${i}`,
      currentStreak: i === 1 ? 4 : 0,
      bestStreak: 10 - i,
      totalWins: 15 - i,
      bestTimeMs: 1800 + i * 100,
    };
  }
  await saveHskGuildConfig(client, 'guild_hsk_1', { ...cfgAfterWin, stats: bxhStats });

  const bxhBtn = hskButtons.find((b) => b.name === 'hsk_arena_bxh');
  let bxhReply = null;
  await bxhBtn.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'top_1' },
      reply: async (p) => {
        bxhReply = p;
      },
    },
    client,
  );
  assertHskV2Contract(bxhReply, 'BẢNG XẾP HẠNG ĐẤU TRƯỜNG HSK 3.0', { ephemeral: true });
  const bxhPage1Nodes = collectPayloadNodes(bxhReply);
  for (const rankEmoji of HSK_EMOJIS.RANK_EMOJIS) {
    assert.ok(bxhPage1Nodes.texts.join('\n').includes(rankEmoji));
  }
  assert.equal(bxhPage1Nodes.buttons[1].label, '1/2');

  const bxhNextBtn = hskButtons.find((b) => b.name === 'hsk_bxh_next');
  let bxhPage2 = null;
  await bxhNextBtn.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'top_1' },
      message: { flags: { bitfield: MessageFlags.Ephemeral | IS_COMPONENTS_V2 } },
      update: async (p) => {
        bxhPage2 = p;
      },
    },
    client,
    ['0'],
  );
  const bxhPage2Text = collectPayloadNodes(bxhPage2).texts.join('\n');
  assert.ok(bxhPage2Text.includes('**#6**'));
  assert.ok(bxhPage2Text.includes('**#7**'));
});

test('6. Hết giờ ván đấu, tự động nghỉ sau 3 phút vắng người chơi & nút ❯❯ Chơi tiếp / ❯❯ Ván mới', async () => {
  resetAllHskRuntimeState();
  const { client, channel, sentMessages } = createMockClient();

  await saveHskGuildConfig(client, 'guild_hsk_1', {
    channelId: channel.id,
    enabled: true,
    autoStart: true,
    durationSeconds: 45,
    stats: {
      player_B: { userId: 'player_B', currentStreak: 3, bestStreak: 5, totalWins: 10 },
    },
  });

  const t0 = DAYTIME_MS;
  const r1 = await startHskArenaRound(client, 'guild_hsk_1', { scheduleTimers: false, now: t0 });
  assert.equal(getHskArenaLastActivityAt('guild_hsk_1'), t0);

  // Hết giờ lúc +45s -> chưa đủ 3 phút, reset currentStreak nhưng giữ bestStreak = 5
  const to1 = await handleHskArenaTimeout(client, 'guild_hsk_1', r1.round.id, {
    scheduleNext: false,
    now: t0 + 45_000,
  });
  assert.equal(to1.pausedIdle, false);
  assert.equal(to1.config.stats.player_B.currentStreak, 0);
  assert.equal(to1.config.stats.player_B.bestStreak, 5);

  // Ván kế tiếp (auto continuation) -> mốc hoạt động giữ nguyên từ t0, hết giờ lúc t0 + 185s (>= 3 phút) -> Tạm nghỉ
  const r2 = await startHskArenaRound(client, 'guild_hsk_1', {
    scheduleTimers: false,
    isAutoContinuation: true,
    now: t0 + 50_000,
  });
  const to2 = await handleHskArenaTimeout(client, 'guild_hsk_1', r2.round.id, {
    scheduleNext: false,
    now: t0 + 185_000,
  });
  assert.equal(to2.pausedIdle, true);
  assert.equal(to2.config.idlePaused, true);
  assertHskV2Contract(sentMessages[sentMessages.length - 1].payload, 'ĐẤU TRƯỜNG TẠM NGHỈ DO VẮNG NGƯỜI CHƠI');
  assert.equal(await initHskAutoResume(client), 0);

  // Member bấm nút Chơi tiếp -> khóa nút cũ & mở ván mới ngay
  const resumeBtn = hskButtons.find((b) => b.name === 'hsk_arena_resume');
  let idleUpdated = null;
  await resumeBtn.execute(
    {
      guildId: 'guild_hsk_1',
      channelId: channel.id,
      user: { id: 'member_9' },
      update: async (p) => {
        idleUpdated = p;
      },
      reply: async () => {},
      followUp: async () => {},
    },
    client,
    [],
  );
  assert.equal(collectPayloadNodes(idleUpdated).buttons[0].disabled, true);
  const r3 = getActiveHskArenaRound('guild_hsk_1');
  assert.ok(r3 && !r3.ended);

  // Member thường bấm ❯❯ Ván mới giữa chừng -> thông báo đang diễn ra (chống skip giữa ván)
  const nextArenaBtn = hskButtons.find((b) => b.name === 'hsk_arena_next');
  let memberSkipReply = null;
  await nextArenaBtn.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'member_9' },
      member: { roles: ['member_role'] },
      guild: { ownerId: 'owner_999' },
      reply: async (p) => {
        memberSkipReply = p;
      },
    },
    client,
    [r3.id],
  );
  assertHskV2Contract(memberSkipReply, `VÁN #${r3.roundNumber} ĐANG DIỄN RA`, { ephemeral: true });

  // Kết thúc r3 trong chế độ thủ công -> sau đó bất kỳ member nào bấm ❯❯ Ván mới đều mở được ván mới
  await handleHskArenaTimeout(client, 'guild_hsk_1', r3.id, { scheduleNext: false, now: t0 + 240_000 });
  let updatedNoOp = false;
  await nextArenaBtn.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'member_9' },
      member: { roles: ['member_role'] },
      guild: { ownerId: 'owner_999' },
      deferUpdate: async () => {
        updatedNoOp = true;
      },
      reply: async () => {},
    },
    client,
    [r3.id],
  );
  assert.equal(updatedNoOp, true);
  assert.ok(getActiveHskArenaRound('guild_hsk_1')?.roundNumber === r3.roundNumber + 1);
});

test('7. Khóa cứng ban đêm 00:00 - 08:00 VN cho Đấu trường nhưng Ôn luyện riêng /hsk vẫn mở 24/7', async () => {
  resetAllHskRuntimeState();
  try {
    assert.equal(isHskNightLock(Date.parse('2026-11-11T23:59:59+07:00')).locked, false);
    assert.equal(isHskNightLock(Date.parse('2026-11-12T00:00:00+07:00')).locked, true);
    assert.equal(isHskNightLock(Date.parse('2026-11-12T03:30:00+07:00')).locked, true);
    assert.equal(isHskNightLock(Date.parse('2026-11-12T07:59:59+07:00')).locked, true);
    assert.equal(isHskNightLock(Date.parse('2026-11-12T08:00:00+07:00')).locked, false);

    const lateNightMs = Date.parse('2026-11-12T01:15:00+07:00');
    const { client, channel, sentMessages } = createMockClient(lateNightMs);
    await saveHskGuildConfig(client, 'guild_hsk_1', {
      channelId: channel.id,
      enabled: true,
      autoStart: true,
    });

    assert.equal(await initHskAutoResume(client), 0);
    const blocked = await startHskArenaRound(client, 'guild_hsk_1');
    assert.equal(blocked.reason, 'NIGHT_LOCK');

    // Trong ban đêm, nút Ôn luyện riêng trên thẻ Đấu trường vẫn mở bình thường!
    const arenaPersonalBtn = hskButtons.find((b) => b.name === 'hsk_arena_personal');
    let nightStudyReply = null;
    await arenaPersonalBtn.execute(
      {
        guildId: 'guild_hsk_1',
        user: { id: 'night_owl' },
        reply: async (p) => {
          nightStudyReply = p;
        },
      },
      client,
    );
    assertHskV2Contract(nightStudyReply, 'HSK 3.0 — ÔN LUYỆN TIẾNG TRUNG CÁ NHÂN', { ephemeral: true });

    // Ván bắt đầu trước 00:00 rồi bước qua 00:00:30 khi hết giờ -> tự khóa ban đêm kèm nút Chơi tiếp & Ôn luyện riêng
    client.setNow(Date.parse('2026-11-11T23:59:45+07:00'));
    const cross = await startHskArenaRound(client, 'guild_hsk_1', { scheduleTimers: false });
    assert.equal(cross.success, true);

    client.setNow(Date.parse('2026-11-12T00:00:30+07:00'));
    const crossTo = await handleHskArenaTimeout(client, 'guild_hsk_1', cross.round.id, { scheduleNext: true });
    assert.equal(crossTo.pausedNight, true);
    assertHskV2Contract(sentMessages[sentMessages.length - 1].payload, 'ĐẤU TRƯỜNG ĐANG NGHỈ BAN ĐÊM', { ephemeral: false });

    // 08:00 sáng -> bấm Chơi tiếp mở lại Đấu trường
    client.setNow(Date.parse('2026-11-12T08:00:00+07:00'));
    const resumeBtn = hskButtons.find((b) => b.name === 'hsk_arena_resume');
    let morningUpdate = null;
    await resumeBtn.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: channel.id,
        user: { id: 'morning_user' },
        update: async (p) => {
          morningUpdate = p;
        },
        reply: async () => {},
        followUp: async () => {},
      },
      client,
      [],
    );
    assert.equal(collectPayloadNodes(morningUpdate).buttons[0].disabled, true);
    assert.ok(getActiveHskArenaRound('guild_hsk_1') && !getActiveHskArenaRound('guild_hsk_1').ended);
  } finally {
    resetAllHskRuntimeState();
  }
});

test('8. Phân quyền /hsk-admin, bảng Admin V2, modal chỉnh giây, & kiểm tra interactions.js / ready.js wiring', async () => {
  resetAllHskRuntimeState();
  assert.ok(HSK_ALLOWED_ADMIN_ROLES.has('1545305594712432640'));
  assert.ok(HSK_ALLOWED_ADMIN_ROLES.has('1541303749916754001'));
  assert.equal(isHskAdmin({ roles: [HSK_ADMIN_ROLE_ID] }, 'u_adm', { ownerId: 'own_1' }), true);
  assert.equal(isHskAdmin({ roles: ['1541303749916754001'] }, 'u_adm2', { ownerId: 'own_1' }), true);
  assert.equal(isHskAdmin({ roles: ['random_role'] }, 'u_mem', { ownerId: 'own_1' }), false);

  const { client, channel } = createMockClient();

  // Member thường bị chặn
  let deniedReply = null;
  await hskAdminCommand.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'u_mem' },
      member: { roles: ['random_role'] },
      guild: { ownerId: 'own_1' },
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
  assertHskV2Contract(deniedReply, 'KHÔNG CÓ QUYỀN QUẢN TRỊ', { ephemeral: true });

  // Admin chạy /hsk-admin setup -> mở luôn Ván #1
  let setupReply = null;
  await hskAdminCommand.execute(
    {
      guildId: 'guild_hsk_1',
      channel,
      user: { id: 'u_adm' },
      member: { roles: [HSK_ADMIN_ROLE_ID] },
      guild: { ownerId: 'own_1', members: { me: null } },
      options: {
        getSubcommand: () => 'setup',
        getChannel: () => channel,
        getString: () => 'mixed_1_3',
        getInteger: () => 30,
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
  assertHskV2Contract(setupReply, 'QUẢN TRỊ ĐẤU TRƯỜNG & ÔN LUYỆN HSK 3.0', { ephemeral: true });
  const setupText = collectPayloadNodes(setupReply).texts.join('\n');
  assert.ok(setupText.includes('Hỗn hợp Sơ cấp (HSK 1–3)'));
  assert.ok(setupText.includes('**30 giây**'));
  assert.ok(getActiveHskArenaRound('guild_hsk_1'));

  // Đổi cấp độ & chế độ qua nút + select menu + modal chỉnh giây
  const adminMenu = hskMenus.find((m) => m.name === 'hsk_admin_select_band');
  let menuUpdate = null;
  await adminMenu.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'u_adm' },
      member: { roles: [HSK_ADMIN_ROLE_ID] },
      guild: { ownerId: 'own_1' },
      values: ['mixed_all'],
      update: async (p) => {
        menuUpdate = p;
      },
    },
    client,
  );
  assert.ok(collectPayloadNodes(menuUpdate).texts.join('\n').includes('Tổng hợp tất cả (HSK 1–9)'));

  const modeBtn = hskButtons.find((b) => b.name === 'hsk_admin_mode');
  let modeUpdate = null;
  await modeBtn.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'u_adm' },
      member: { roles: [HSK_ADMIN_ROLE_ID] },
      guild: { ownerId: 'own_1' },
      update: async (p) => {
        modeUpdate = p;
      },
    },
    client,
  );
  assert.ok(collectPayloadNodes(modeUpdate).texts.join('\n').includes('Hỗn hợp (Nghĩa + Điền khuyết)'));

  const timeModal = hskModals.find((m) => m.name === 'hsk_modal_time');
  let timeModalUpdate = null;
  await timeModal.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'u_adm' },
      member: { roles: [HSK_ADMIN_ROLE_ID] },
      guild: { ownerId: 'own_1' },
      fields: { getTextInputValue: () => '60' },
      isFromMessage: () => true,
      update: async (p) => {
        timeModalUpdate = p;
      },
      reply: async (p) => {
        timeModalUpdate = p;
      },
    },
    client,
  );
  assert.ok(collectPayloadNodes(timeModalUpdate).texts.join('\n').includes('**60 giây**'));

  // Tắt kênh đấu trường -> vòng hiện tại dừng & dọn RAM
  const disableBtn = hskButtons.find((b) => b.name === 'hsk_admin_disable');
  let disableUpdate = null;
  await disableBtn.execute(
    {
      guildId: 'guild_hsk_1',
      user: { id: 'u_adm' },
      member: { roles: [HSK_ADMIN_ROLE_ID] },
      guild: { ownerId: 'own_1' },
      update: async (p) => {
        disableUpdate = p;
      },
    },
    client,
  );
  assert.ok(collectPayloadNodes(disableUpdate).texts.join('\n').includes('Đang tạm tắt'));
  assert.equal(getActiveHskArenaRound('guild_hsk_1'), null);

  // Kiểm tra whitelist trong interactions.js & auto-resume trong ready.js
  const loaderSource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/handlers/loaders/interactions.js'),
    'utf-8',
  );
  assert.ok(loaderSource.includes('buttons\\/hsk'));
  assert.ok(loaderSource.includes('selectMenus\\/hsk'));
  assert.ok(loaderSource.includes('modals\\/hsk'));

  const readySource = fs.readFileSync(
    path.resolve(process.cwd(), 'src/events/ready.js'),
    'utf-8',
  );
  assert.ok(readySource.includes('initHskAutoResume'));
});

test('9. Kiến trúc 3 kênh tách biệt: 1 Đấu trường + 2 Phòng Ôn Luyện (Sơ cấp HSK 1-3 & Trung-Cao HSK 4-9), chống trùng kênh & lưu tiến độ độc lập', async () => {
  resetAllHskRuntimeState();
  try {
    const { client, channel: chArena } = createMockClient();
    const makeChannel = (id) => {
      const messages = [];
      return {
        id,
        messages,
        guild: { id: 'guild_hsk_1', members: { me: null } },
        send: async (payload) => {
          const msg = {
            id: `msg_${id}_${messages.length + 1}`,
            payload,
            edit: async (next) => {
              msg.payload = next;
              return msg;
            },
          };
          messages.push(msg);
          return msg;
        },
      };
    };

    const chElem = makeChannel('ch_elem_1_3');
    const chAdv = makeChannel('ch_adv_4_9');
    client.channels.cache.set(chElem.id, chElem);
    client.channels.cache.set(chAdv.id, chAdv);
    const origFetch = client.channels.fetch;
    client.channels.fetch = async (id) => {
      if (id === chElem.id) return chElem;
      if (id === chAdv.id) return chAdv;
      return origFetch(id);
    };

    // 9a. Setup kênh Đấu trường
    let arenaSetupReply = null;
    await hskAdminCommand.execute(
      {
        guildId: 'guild_hsk_1',
        channel: chArena,
        user: { id: 'u_adm' },
        member: { roles: [HSK_ADMIN_ROLE_ID] },
        guild: { ownerId: 'own_1', members: { me: null } },
        options: {
          getSubcommand: () => 'setup',
          getChannel: () => chArena,
          getString: () => '1',
          getInteger: () => 45,
          getBoolean: () => false,
        },
        replied: false,
        deferred: false,
        reply: async (p) => {
          arenaSetupReply = p;
        },
      },
      null,
      client,
    );
    assertHskV2Contract(arenaSetupReply, 'QUẢN TRỊ ĐẤU TRƯỜNG & ÔN LUYỆN HSK 3.0', { ephemeral: true });

    // 9b. Chống gán Phòng Ôn Luyện trùng với kênh Đấu trường
    let collideArenaReply = null;
    await hskAdminCommand.execute(
      {
        guildId: 'guild_hsk_1',
        channel: chArena,
        user: { id: 'u_adm' },
        member: { roles: [HSK_ADMIN_ROLE_ID] },
        guild: { ownerId: 'own_1', members: { me: null } },
        options: {
          getSubcommand: () => 'setup-onluyen',
          getString: (name) => (name === 'phanhe' ? 'elementary' : null),
          getChannel: () => chArena,
        },
        replied: false,
        deferred: false,
        reply: async (p) => {
          collideArenaReply = p;
        },
      },
      null,
      client,
    );
    assertHskV2Contract(collideArenaReply, 'TRÙNG VỚI KÊNH ĐẤU TRƯỜNG', { ephemeral: true });

    // 9c. Setup Phòng Sơ cấp (chElem) -> gửi bảng cố định HSK 1-3
    let elemSetupReply = null;
    await hskAdminCommand.execute(
      {
        guildId: 'guild_hsk_1',
        channel: chElem,
        user: { id: 'u_adm' },
        member: { roles: [HSK_ADMIN_ROLE_ID] },
        guild: { ownerId: 'own_1', members: { me: null } },
        options: {
          getSubcommand: () => 'setup-onluyen',
          getString: (name) => (name === 'phanhe' ? 'elementary' : null),
          getChannel: () => chElem,
        },
        replied: false,
        deferred: false,
        reply: async (p) => {
          elemSetupReply = p;
        },
      },
      null,
      client,
    );
    assertHskV2Contract(elemSetupReply, 'QUẢN TRỊ ĐẤU TRƯỜNG & ÔN LUYỆN HSK 3.0', { ephemeral: true });
    assert.equal(chElem.messages.length, 1);
    assertHskV2Contract(chElem.messages[0].payload, HSK_STUDY_TIERS.elementary.roomTitle, { ephemeral: false });

    // 9d. Chống gán Trung - Cao cấp đè lên Phòng Sơ cấp
    let collideStudyReply = null;
    await hskAdminCommand.execute(
      {
        guildId: 'guild_hsk_1',
        channel: chElem,
        user: { id: 'u_adm' },
        member: { roles: [HSK_ADMIN_ROLE_ID] },
        guild: { ownerId: 'own_1', members: { me: null } },
        options: {
          getSubcommand: () => 'setup-onluyen',
          getString: (name) => (name === 'phanhe' ? 'advanced' : null),
          getChannel: () => chElem,
        },
        replied: false,
        deferred: false,
        reply: async (p) => {
          collideStudyReply = p;
        },
      },
      null,
      client,
    );
    assertHskV2Contract(collideStudyReply, 'TRÙNG VỚI PHÂN HỆ ÔN LUYỆN KHÁC', { ephemeral: true });

    // 9e. Setup Phòng Trung - Cao cấp (chAdv) -> gửi bảng cố định HSK 4-9
    let advSetupReply = null;
    await hskAdminCommand.execute(
      {
        guildId: 'guild_hsk_1',
        channel: chAdv,
        user: { id: 'u_adm' },
        member: { roles: [HSK_ADMIN_ROLE_ID] },
        guild: { ownerId: 'own_1', members: { me: null } },
        options: {
          getSubcommand: () => 'setup-onluyen',
          getString: (name) => (name === 'phanhe' ? 'advanced' : null),
          getChannel: () => chAdv,
        },
        replied: false,
        deferred: false,
        reply: async (p) => {
          advSetupReply = p;
        },
      },
      null,
      client,
    );
    assertHskV2Contract(advSetupReply, 'QUẢN TRỊ ĐẤU TRƯỜNG & ÔN LUYỆN HSK 3.0', { ephemeral: true });
    assert.equal(chAdv.messages.length, 1);
    assertHskV2Contract(chAdv.messages[0].payload, HSK_STUDY_TIERS.advanced.roomTitle, { ephemeral: false });

    // 9f. Chống gán Đấu trường đè lên Phòng Ôn luyện
    let collideSetupArenaReply = null;
    await hskAdminCommand.execute(
      {
        guildId: 'guild_hsk_1',
        channel: chAdv,
        user: { id: 'u_adm' },
        member: { roles: [HSK_ADMIN_ROLE_ID] },
        guild: { ownerId: 'own_1', members: { me: null } },
        options: {
          getSubcommand: () => 'setup',
          getChannel: () => chAdv,
          getString: () => null,
          getInteger: () => null,
          getBoolean: () => null,
        },
        replied: false,
        deferred: false,
        reply: async (p) => {
          collideSetupArenaReply = p;
        },
      },
      null,
      client,
    );
    assertHskV2Contract(collideSetupArenaReply, 'KÊNH ĐANG DÙNG CHO ÔN LUYỆN', { ephemeral: true });

    const savedCfg = await getHskGuildConfig(client, 'guild_hsk_1');
    assert.equal(savedCfg.channelId, chArena.id);
    assert.equal(savedCfg.studyChannels.elementary, chElem.id);
    assert.equal(savedCfg.studyChannels.advanced, chAdv.id);
    assert.equal(detectChannelStudyTier(savedCfg, chElem.id), 'elementary');
    assert.equal(detectChannelStudyTier(savedCfg, chAdv.id), 'advanced');
    assert.equal(detectChannelStudyTier(savedCfg, chArena.id), 'all');

    // 9g. Bấm nút Phòng Sơ cấp (hsk_room_band & hsk_room_mode) -> Ephemeral, lọc Select Menu đúng 3 cấp, giữ nhớ elementaryBand=2
    const roomBandBtn = hskButtons.find((b) => b.name === 'hsk_room_band');
    const roomModeBtn = hskButtons.find((b) => b.name === 'hsk_room_mode');
    const rateBtn = hskButtons.find((b) => b.name === 'hsk_flash_rate');
    const homeBtn = hskButtons.find((b) => b.name === 'hsk_home');

    let elemHubReply = null;
    await roomBandBtn.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: chElem.id,
        user: { id: 'learner_9' },
        reply: async (p) => {
          elemHubReply = p;
        },
      },
      client,
      ['2', 'e'],
    );
    assertHskV2Contract(elemHubReply, 'HSK 3.0 — ÔN LUYỆN TIẾNG TRUNG CÁ NHÂN', { ephemeral: true });
    const elemMenuOpts = collectPayloadNodes(elemHubReply).menus[0].options;
    assert.deepEqual(
      elemMenuOpts.map((o) => o.value),
      ['1', '2', '3'],
      'Phòng Sơ cấp chỉ hiển thị lựa chọn HSK 1–3',
    );

    // Chuyển sang Phòng Trung-Cao chọn HSK 6 -> không làm mất elementaryBand = 2
    let advHubReply = null;
    await roomBandBtn.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: chAdv.id,
        user: { id: 'learner_9' },
        reply: async (p) => {
          advHubReply = p;
        },
      },
      client,
      ['6', 'a'],
    );
    assertHskV2Contract(advHubReply, 'HSK 3.0 — ÔN LUYỆN TIẾNG TRUNG CÁ NHÂN', { ephemeral: true });
    const advMenuOpts = collectPayloadNodes(advHubReply).menus[0].options;
    assert.deepEqual(
      advMenuOpts.map((o) => o.value),
      ['4', '5', '6', '7'],
      'Phòng Trung–Cao cấp chỉ hiển thị lựa chọn HSK 4–9',
    );

    const progBoth = await getHskUserProgress(client, 'guild_hsk_1', 'learner_9');
    assert.equal(getEffectiveBandForTier(progBoth, 'elementary'), 2);
    assert.equal(getEffectiveBandForTier(progBoth, 'advanced'), 6);

    // Quay lại bấm "Trắc nghiệm 4 nút" thẳng trên thẻ Phòng Sơ cấp -> dùng HSK 2, nút Về menu vẫn mang :e
    let directElemQuiz = null;
    await roomModeBtn.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: chElem.id,
        user: { id: 'learner_9' },
        reply: async (p) => {
          directElemQuiz = p;
        },
      },
      client,
      ['quiz', 'e'],
    );
    assertHskV2Contract(directElemQuiz, 'TRẮC NGHIỆM HSK 3.0 — HSK 2', { ephemeral: true });
    const elemQuizBtns = collectPayloadNodes(directElemQuiz).buttons;
    const elemHomeBtn = elemQuizBtns.find((b) => b.custom_id.startsWith('hsk_home:'));
    assert.equal(elemHomeBtn.custom_id, 'hsk_home:learner_9:e');
    assert.ok(elemQuizBtns.every((b) => b.custom_id.endsWith(':e')), 'Mọi nút Trắc nghiệm trong phòng Sơ cấp phải giữ mã :e');

    // Bấm Flashcard thẳng ở Phòng Trung-Cao -> lấy thẻ HSK 6, bấm Quên lưu sổ tay chung
    let directAdvFlash = null;
    await roomModeBtn.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: chAdv.id,
        user: { id: 'learner_9' },
        reply: async (p) => {
          directAdvFlash = p;
        },
      },
      client,
      ['flash', 'a'],
    );
    assert.ok(collectPayloadNodes(directAdvFlash).texts.join('\n').includes('HSK 6'));
    const advFlashBtns = collectPayloadNodes(directAdvFlash).buttons;
    assert.ok(advFlashBtns.every((b) => b.custom_id.endsWith(':a')), 'Mọi nút Flashcard trong phòng Trung–Cao phải giữ mã :a');
    const flashWid = getPersonalSession('guild_hsk_1', 'learner_9', DAYTIME_MS).flashWordId;
    assert.ok(flashWid.startsWith('b6_'));

    let afterRate = null;
    await rateBtn.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: chAdv.id,
        user: { id: 'learner_9' },
        message: { flags: { bitfield: MessageFlags.Ephemeral | IS_COMPONENTS_V2 } },
        update: async (p) => {
          afterRate = p;
        },
        reply: async (p) => {
          afterRate = p;
        },
      },
      client,
      ['learner_9', flashWid, 'again', 'a'],
    );
    assert.ok(collectPayloadNodes(afterRate).texts.join('\n').includes('HSK 6'));
    const progAfterMistake = await getHskUserProgress(client, 'guild_hsk_1', 'learner_9');
    assert.ok(progAfterMistake.wrongWords[flashWid], 'Từ sai ở phòng Trung–Cao lưu vào Sổ tay chung');

    // Bấm Về menu (:e) -> mở Menu lọc đúng Sơ cấp (3 options) & hiển thị 1 từ trong Sổ tay
    let backToElemHome = null;
    await homeBtn.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: chElem.id,
        user: { id: 'learner_9' },
        message: { flags: { bitfield: MessageFlags.Ephemeral | IS_COMPONENTS_V2 } },
        update: async (p) => {
          backToElemHome = p;
        },
        reply: async (p) => {
          backToElemHome = p;
        },
      },
      client,
      ['learner_9', 'e'],
    );
    assert.equal(collectPayloadNodes(backToElemHome).menus[0].options.length, 3);
    assert.ok(collectPayloadNodes(backToElemHome).texts.join('\n').includes('> **1 từ** vừa trả lời sai'));

    // 9h. Gõ /hsk trực tiếp trong kênh Sơ cấp tự lọc HSK 1-3, còn ở kênh thường đủ 7 cấp
    let slashInElem = null;
    await hskCommand.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: chElem.id,
        user: { id: 'learner_9' },
        options: { getString: () => null },
        replied: false,
        deferred: false,
        reply: async (p) => {
          slashInElem = p;
        },
      },
      null,
      client,
    );
    assert.equal(collectPayloadNodes(slashInElem).menus[0].options.length, 3);

    let slashElsewhere = null;
    await hskCommand.execute(
      {
        guildId: 'guild_hsk_1',
        channelId: 'random_channel',
        user: { id: 'learner_9' },
        options: { getString: () => null },
        replied: false,
        deferred: false,
        reply: async (p) => {
          slashElsewhere = p;
        },
      },
      null,
      client,
    );
    assert.equal(collectPayloadNodes(slashElsewhere).menus[0].options.length, 7);

    // 9i. Nút Admin "Gửi lại bảng Sơ cấp" đăng lại thẻ cố định vào chElem
    const postStudyBtn = hskButtons.find((b) => b.name === 'hsk_admin_post_study');
    let adminPanelRefreshed = null;
    await postStudyBtn.execute(
      {
        guildId: 'guild_hsk_1',
        user: { id: 'u_adm' },
        member: { roles: [HSK_ADMIN_ROLE_ID] },
        guild: { ownerId: 'own_1' },
        update: async (p) => {
          adminPanelRefreshed = p;
        },
        reply: async () => {},
        followUp: async () => {},
      },
      client,
      ['elementary'],
    );
    assertHskV2Contract(adminPanelRefreshed, 'QUẢN TRỊ ĐẤU TRƯỜNG & ÔN LUYỆN HSK 3.0', { ephemeral: true });
    assert.equal(chElem.messages.length, 2);
  } finally {
    resetAllHskRuntimeState();
  }
});


