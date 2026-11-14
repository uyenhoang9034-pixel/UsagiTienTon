import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PRISM_EMOJIS,
  IDENTITY_PROFILES,
  PRISM_ITEMS,
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
