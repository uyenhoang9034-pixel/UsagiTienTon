import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRISM_EMOJIS,
  IDENTITY_PROFILES,
  PRISM_ITEMS,
  PRISM_DAILY_LIMITS,
  checkDailyLimit,
  getOrGenerateDailyLimits,
  STORY_SCENARIOS,
  OUTFIT_THEMES,
  OUTFIT_TOPS,
  OUTFIT_BOTTOMS,
  OUTFIT_ACCESSORIES,
  CRUSH_MESSAGES,
  CRUSH_BRANCHES,
  RAINBOW_STREET_EVENTS,
  calculatePointChanges,
  formatWithIdentity,
  formatPointChanges,
  openMysteryBox,
  rollLootDrop,
  getVietnamDateString,
  getOrGenerateDailyQuests,
} from '../src/data/prismData.js';
import {
  IS_COMPONENTS_V2,
  buildPrismSetupPayload,
  buildPrismClaimSuccessPayload,
  buildPrismIdentitySelectPayload,
  buildPrismHubPayload,
  buildPrismStoryPayload,
  buildPrismStoryResultPayload,
  buildPrismOutfitPayload,
  buildPrismOutfitResultPayload,
  buildPrismChatPayload,
  buildPrismCrushModal,
  buildPrismChatResultPayload,
  buildPrismSpinPayload,
  buildPrismSpinResultPayload,
  buildPrismBagPayload,
  buildPrismShopPayload,
  buildPrismQuestsPayload,
  buildPrismLeaderboardPayload,
} from '../src/services/prismUI.js';

test('Prism Data: 6 Identity Profiles are fully defined with custom emojis', () => {
  const keys = ['gay', 'lesbian', 'pansexual', 'transgender', 'nonbinary', 'asexual'];
  for (const k of keys) {
    const profile = IDENTITY_PROFILES[k];
    assert.ok(profile, `Missing profile for ${k}`);
    assert.ok(profile.emoji && profile.emoji.includes(':'), `Profile ${k} has invalid emoji`);
    assert.ok(profile.name, `Profile ${k} missing name`);
    assert.ok(profile.initialPoints, `Profile ${k} missing initialPoints`);
    assert.ok(profile.crushTitle, `Profile ${k} missing crushTitle`);
  }
});

test('Prism Data: Mini-game 1 has exactly 16 scenarios with choices A, B, C', () => {
  assert.equal(STORY_SCENARIOS.length, 16);
  for (const scenario of STORY_SCENARIOS) {
    assert.ok(scenario.title);
    assert.ok(scenario.context);
    assert.ok(scenario.choices.A);
    assert.ok(scenario.choices.B);
    assert.ok(scenario.choices.C);
  }
});

test('Prism Data: Mini-game 2 has 6 themes, 8 tops, 8 bottoms, 8 accessories', () => {
  assert.equal(OUTFIT_THEMES.length, 6);
  assert.equal(OUTFIT_TOPS.length, 8);
  assert.equal(OUTFIT_BOTTOMS.length, 8);
  assert.equal(OUTFIT_ACCESSORIES.length, 8);
});

test('Prism Data: Mini-game 3 has 12 crush messages and 4 branches', () => {
  assert.equal(CRUSH_MESSAGES.length, 12);
  assert.ok(CRUSH_BRANCHES.sweet);
  assert.ok(CRUSH_BRANCHES.funny);
  assert.ok(CRUSH_BRANCHES.shy);
  assert.ok(CRUSH_BRANCHES.defaultBranch);
});

test('Prism Data: Mini-game 4 has exactly 16 rainbow street events', () => {
  assert.equal(RAINBOW_STREET_EVENTS.length, 16);
  for (const event of RAINBOW_STREET_EVENTS) {
    assert.ok(event.desc);
    assert.ok(event.points);
  }
});

test('Prism Data: Items, Loot Drops, Mystery Box & Daily Quests are fully defined', () => {
  const itemKeys = ['lollipop', 'fan', 'crown', 'amulet', 'dice', 'mystery_box', 'boba', 'flowers', 'movie_tickets'];
  for (const k of itemKeys) {
    assert.ok(PRISM_ITEMS[k], `Missing item definition for ${k}`);
    assert.ok(PRISM_ITEMS[k].name);
    assert.ok(PRISM_ITEMS[k].emoji);
  }

  // Mystery Box roll check
  for (let i = 0; i < 20; i++) {
    const boxRes = openMysteryBox();
    assert.ok(boxRes.type === 'item' || boxRes.type === 'coins');
    assert.ok(boxRes.name);
  }

  // Loot drop roll check
  let hasDrop = false;
  for (let i = 0; i < 100; i++) {
    const drop = rollLootDrop();
    if (drop) {
      hasDrop = true;
      assert.ok(['lollipop', 'fan', 'crown'].includes(drop.itemKey));
    }
  }
  assert.ok(hasDrop, 'Expected at least 1 loot drop in 100 iterations');

  // Daily quests check
  const dateStr = getVietnamDateString();
  assert.match(dateStr, /^\d{4}-\d{2}-\d{2}$/);
  const qData = getOrGenerateDailyQuests(null);
  assert.equal(qData.date, dateStr);
  assert.equal(qData.quests.length, 3);
});

test('Prism Logic: calculatePointChanges calculates numbers in valid ranges', () => {
  const cfg = { slay: [15, 25], heart: [5, 15] };
  for (let i = 0; i < 20; i++) {
    const pts = calculatePointChanges(cfg);
    assert.ok(pts.slay >= 15 && pts.slay <= 25, `Slay out of range: ${pts.slay}`);
    assert.ok(pts.heart >= 5 && pts.heart <= 15, `Heart out of range: ${pts.heart}`);
    assert.equal(pts.rebel, 0);
  }
});

test('Prism Logic: formatWithIdentity substitutes pronouns correctly', () => {
  const text = '{crush_title} hỏi {crush_call} có rảnh đi chơi với {player_call} không?';
  const res = formatWithIdentity(text, IDENTITY_PROFILES.gay);
  assert.equal(res, 'Anh chàng barista điển trai hỏi cậu có rảnh đi chơi với mình không?');
});

test('Prism UI: Payloads comply with Components V2 requirements', () => {
  const mockPlayer = {
    user_id: '123456789',
    identity_key: 'pansexual',
    slay_points: 30,
    heart_points: 25,
    rebel_points: 20,
    rainbow_coins: 150,
    inventory: { lollipop: 2, fan: 1, amulet: 1, dice: 1, boba: 1 },
    active_buffs: { amulet: 1, dice: 1 },
  };

  const setupPayload = buildPrismSetupPayload();
  assert.equal(setupPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);
  assert.equal(setupPayload.content, undefined);
  assert.equal(setupPayload.embeds, undefined);
  assert.equal(setupPayload.components[0].type, 17); // Container

  const hubPayload = buildPrismHubPayload(mockPlayer);
  assert.equal(hubPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);
  assert.equal(hubPayload.content, undefined);
  assert.equal(hubPayload.embeds, undefined);
  assert.equal(hubPayload.components[0].type, 17);

  const storyPayload = buildPrismStoryPayload(0, mockPlayer);
  assert.equal(storyPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);

  const outfitPayload = buildPrismOutfitPayload(0, 0, 0, 0, mockPlayer);
  assert.equal(outfitPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);

  const chatPayload = buildPrismChatPayload(0, CRUSH_MESSAGES[0], mockPlayer);
  assert.equal(chatPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);

  const spinPayload = buildPrismSpinPayload(mockPlayer);
  assert.equal(spinPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);

  const bagPayload = buildPrismBagPayload(mockPlayer);
  assert.equal(bagPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);

  const shopPayload = buildPrismShopPayload(mockPlayer);
  assert.equal(shopPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);

  const questsPayload = buildPrismQuestsPayload(mockPlayer, getOrGenerateDailyQuests(null));
  assert.equal(questsPayload.flags & IS_COMPONENTS_V2, IS_COMPONENTS_V2);

  const modal = buildPrismCrushModal(0);
  assert.equal(modal.data.title, 'Nhắn Tin Cho Người Ấy');
  assert.ok(!modal.data.title.includes('<'), 'Modal title must be pure text without emoji');
});

test('Prism UI & Data: Custom emojis match user specifications', () => {
  // 1. Vương Miện Tự Hào
  assert.equal(PRISM_EMOJIS.trangtrig14, '<a:trangtrig14:1546047912969113622>');
  assert.equal(PRISM_ITEMS.crown.emoji, '<a:trangtrig14:1546047912969113622>');

  // 2. Cặp Vé Xem Phim Đôi & Hộp Mù Bí Ẩn
  assert.equal(PRISM_EMOJIS.trangtrig19, '<a:trangtrig19:1546068350030053406>');
  assert.equal(PRISM_ITEMS.movie_tickets.emoji, '<a:trangtrig19:1546068350030053406>');
  assert.equal(PRISM_EMOJIS.giftg1, '<a:giftg1:1543150714732412948>');
  assert.equal(PRISM_ITEMS.mystery_box.emoji, '<a:giftg1:1543150714732412948>');

  // 3. Mini-game list emoji vs Hub Button emoji
  assert.equal(PRISM_EMOJIS.trangtrig52, '<a:trangtrig52:1567818998475657246>');
  assert.equal(PRISM_EMOJIS.trangtrig62, '<a:trangtrig62:1569560241190871152>');

  // 4. Daily Quests emoji
  assert.equal(PRISM_EMOJIS.trangtrig61, '<a:trangtrig61:1569559986550612051>');

  const mockPlayer = {
    user_id: '123456789',
    identity_key: 'pansexual',
    slay_points: 30,
    heart_points: 25,
    rebel_points: 20,
    rainbow_coins: 150,
    inventory: { lollipop: 2, fan: 1, crown: 1, movie_tickets: 1 },
    active_buffs: {},
  };

  // Check Hub text has trangtrig52
  const hubPayload = buildPrismHubPayload(mockPlayer);
  const hubJson = JSON.stringify(hubPayload);
  assert.ok(hubJson.includes('<a:trangtrig52:1567818998475657246> **Tình Huống Khó Đỡ:**'));
  assert.ok(hubJson.includes('<a:trangtrig52:1567818998475657246> **Sàn Diễn Outfit:**'));
  assert.ok(hubJson.includes('<a:trangtrig52:1567818998475657246> **Chat Chit Cùng Crush:**'));
  assert.ok(hubJson.includes('<a:trangtrig52:1567818998475657246> **Vòng Quay Định Mệnh:**'));

  // Check Bag has crown & movie tickets updated emojis
  const bagPayload = buildPrismBagPayload(mockPlayer);
  const bagJson = JSON.stringify(bagPayload);
  assert.ok(bagJson.includes('<a:trangtrig14:1546047912969113622> `[Cực Hiếm]` **Vương Miện Tự Hào**'));
  assert.ok(bagJson.includes('<a:trangtrig19:1546068350030053406> **Cặp Vé Xem Phim Đôi**'));

  // Check Shop has mystery box & movie tickets updated emojis
  const shopPayload = buildPrismShopPayload(mockPlayer);
  const shopJson = JSON.stringify(shopPayload);
  assert.ok(shopJson.includes('<a:giftg1:1543150714732412948> **Hộp Mù Bí Ẩn**'));
  assert.ok(shopJson.includes('<a:trangtrig19:1546068350030053406> **Cặp Vé Xem Phim Đôi**'));

  // Check Quests has trangtrig61
  const questsPayload = buildPrismQuestsPayload(mockPlayer, getOrGenerateDailyQuests(null));
  const questsJson = JSON.stringify(questsPayload);
  assert.ok(questsJson.includes('<a:trangtrig61:1569559986550612051> **'));
});

test('Prism Shop: Updated item prices match specifications', () => {
  assert.equal(PRISM_ITEMS.lollipop.price, 100);
  assert.equal(PRISM_ITEMS.fan.price, 200);
  assert.equal(PRISM_ITEMS.amulet.price, 300);
  assert.equal(PRISM_ITEMS.dice.price, 320);
  assert.equal(PRISM_ITEMS.mystery_box.price, 1000);
  assert.equal(PRISM_ITEMS.boba.price, 200);
  assert.equal(PRISM_ITEMS.flowers.price, 300);
  assert.equal(PRISM_ITEMS.movie_tickets.price, 900);

  const mockPlayer = {
    user_id: '123456789',
    identity_key: 'pansexual',
    slay_points: 30,
    heart_points: 25,
    rebel_points: 20,
    rainbow_coins: 1500,
    inventory: {},
    active_buffs: {},
  };

  const shopPayload = buildPrismShopPayload(mockPlayer);
  const shopJson = JSON.stringify(shopPayload);
  assert.ok(shopJson.includes('**Kẹo Mút Lục Sắc** (`100`'));
  assert.ok(shopJson.includes('**Quạt Xếp Ánh Kim** (`200`'));
  assert.ok(shopJson.includes('**Bùa Hộ Mệnh** (`300`'));
  assert.ok(shopJson.includes('**Xúc Xắc May Mắn** (`320`'));
  assert.ok(shopJson.includes('**Hộp Mù Bí Ẩn** (`1000`'));
  assert.ok(shopJson.includes('**Trà Sữa Trân Châu Đường Đen** (`200`'));
  assert.ok(shopJson.includes('**Bó Hoa Tươi Thắm** (`300`'));
  assert.ok(shopJson.includes('**Cặp Vé Xem Phim Đôi** (`900`'));
});

test('Prism Limits: Daily hard limits for mini-games are enforced', () => {
  assert.equal(PRISM_DAILY_LIMITS.story, 10);
  assert.equal(PRISM_DAILY_LIMITS.outfit, 3);
  assert.equal(PRISM_DAILY_LIMITS.chat, 2);
  assert.equal(PRISM_DAILY_LIMITS.spin, 1);

  const initialLimits = getOrGenerateDailyLimits(null);
  assert.equal(initialLimits.counts.story, 0);
  assert.equal(initialLimits.counts.outfit, 0);
  assert.equal(initialLimits.counts.chat, 0);
  assert.equal(initialLimits.counts.spin, 0);

  // Check within limit
  assert.equal(checkDailyLimit(initialLimits, 'story').allowed, true);
  assert.equal(checkDailyLimit(initialLimits, 'outfit').allowed, true);
  assert.equal(checkDailyLimit(initialLimits, 'chat').allowed, true);
  assert.equal(checkDailyLimit(initialLimits, 'spin').allowed, true);

  // Check reaching limit
  const maxedLimits = {
    date: getVietnamDateString(),
    counts: { story: 10, outfit: 3, chat: 2, spin: 1 },
  };
  assert.equal(checkDailyLimit(maxedLimits, 'story').allowed, false);
  assert.equal(checkDailyLimit(maxedLimits, 'outfit').allowed, false);
  assert.equal(checkDailyLimit(maxedLimits, 'chat').allowed, false);
  assert.equal(checkDailyLimit(maxedLimits, 'spin').allowed, false);
});

test('Prism Leaderboard: 4 sections (Thần thái, Chân thành, Nổi loạn, Tổng) are rendered', () => {
  const mockPlayer = {
    user_id: '123456789',
    identity_key: 'pansexual',
    slay_points: 30,
    heart_points: 25,
    rebel_points: 20,
    rainbow_coins: 150,
  };

  const mockLeaderboardData = {
    topSlay: [{ user_id: '111', identity_key: 'gay', slay_points: 50 }],
    topHeart: [{ user_id: '222', identity_key: 'lesbian', heart_points: 60 }],
    topRebel: [{ user_id: '333', identity_key: 'nonbinary', rebel_points: 40 }],
    topTotal: [
      { user_id: '444', identity_key: 'pansexual', slay_points: 30, heart_points: 30, rebel_points: 30, total_points: 90 },
    ],
  };

  const payload = buildPrismLeaderboardPayload(mockPlayer, mockLeaderboardData, 1);
  const json = JSON.stringify(payload);

  assert.ok(json.includes('# 1. BXH THẦN THÁI'));
  assert.ok(json.includes('# 2. BXH CHÂN THÀNH'));
  assert.ok(json.includes('# 3. BXH NỔI LOẠN'));
  assert.ok(json.includes('# 4. BXH TỔNG'));

  // Section 1: Thần thái points
  assert.ok(json.includes('<@111>'));
  assert.ok(json.includes('50** Thần thái'));

  // Section 2: Chân thành points
  assert.ok(json.includes('<@222>'));
  assert.ok(json.includes('60** Chân thành'));

  // Section 3: Nổi loạn points
  assert.ok(json.includes('<@333>'));
  assert.ok(json.includes('40** Nổi loạn'));

  // Section 4: BXH Tổng displays the 3 individual scores without the sum
  assert.ok(json.includes('<@444>'));
  assert.ok(json.includes('**30**'));
  assert.ok(!json.includes('**90** điểm'));
});

test('Prism Admin: isPrismEnabled and setPrismEnabled toggle state correctly', async () => {
  const { isPrismEnabled, setPrismEnabled } = await import('../src/services/prismHandler.js');
  assert.equal(typeof isPrismEnabled, 'function');
  assert.equal(typeof setPrismEnabled, 'function');

  // Test setPrismEnabled toggling
  await setPrismEnabled(false);
  assert.equal(isPrismEnabled(), false);

  await setPrismEnabled(true);
  assert.equal(isPrismEnabled(), true);
});
