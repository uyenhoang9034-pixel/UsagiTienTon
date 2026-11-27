import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDailyRiddle,
  buildSantaStatePayload,
  handleSantaCheckin,
  handleSantaRiddle,
  handleSantaCollect,
  handleSantaCraft,
  handleSantaDeliver,
  handleSantaUpgrade,
  handleSantaBuyItem,
  handleSantaSpinWheel,
  handleSantaHireHelper,
  handleSantaFeverBonus,
  handleSantaContributeTree,
  handleSantaVisitFriend,
  handleSantaRepelGrinch,
  handleSantaEquipCosmetic,
  handleSantaClaimQuest,
  grantSantaSnowCoins,
  handleSantaAckGifts,
  getScaledWheelSegments,
  handleSantaAttackBoss,
  handleSantaExchangeMaterial,
  handleSantaOpenMysteryBox,
  getScaledRecipes,
  getUpgradeCost,
  getHelperUpgradeCost,
  handleSantaFeedPet,
  handleSantaOpenAdvent,
  getSantaLeaderboard,
} from '../src/services/santaWorkshopService.js';

function createMemoryClient() {
  const store = new Map();
  return {
    store,
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

test('Luồng chơi Xưởng Quà Ông Già Noel: Điểm danh -> Giải đố -> Chế tạo -> Giao hàng -> Shop & Quay số', async () => {
  const client = createMemoryClient();
  const identity = { userId: 'elf_01', username: 'UsagiElf', guildId: 'guild_noel' };

  // 1. State khởi tạo mặc định
  const initial = await buildSantaStatePayload(client, identity);
  assert.equal(initial.player.workshopLevel, 1);
  assert.equal(initial.player.snowCoins, 50);
  assert.equal(initial.player.orders.length, 3);

  // 2. Điểm danh hàng ngày
  const checkinRes = await handleSantaCheckin(client, identity);
  assert.equal(checkinRes.ok, true);
  assert.equal(checkinRes.state.checkedInToday, true);
  assert.ok(checkinRes.state.player.snowCoins > 50);

  // Điểm danh lần 2 trong ngày bị chặn
  const checkinAgain = await handleSantaCheckin(client, identity);
  assert.equal(checkinAgain.ok, false);

  // 3. Giải đố Noel
  const riddle = getDailyRiddle(initial.today);
  const wrongRiddle = await handleSantaRiddle(client, identity, (riddle.answerIndex + 1) % riddle.options.length);
  assert.equal(wrongRiddle.ok, false);

  const rightRiddle = await handleSantaRiddle(client, identity, riddle.answerIndex);
  assert.equal(rightRiddle.ok, true);
  assert.equal(rightRiddle.state.riddleSolvedToday, true);

  // 4. Tap thu thập nguyên liệu
  const tapRes = await handleSantaCollect(client, identity, { isTap: true });
  assert.equal(tapRes.ok, true);

  // 5. Chế tạo đồ chơi theo đơn hàng đầu tiên & Giao hàng
  const firstOrder = tapRes.state.player.orders[0];
  const craftRes = await handleSantaCraft(client, identity, firstOrder.toyId);
  assert.equal(craftRes.ok, true);

  if (firstOrder.qty > 1) {
    await handleSantaCraft(client, identity, firstOrder.toyId);
  }

  const coinsBeforeDeliver = craftRes.state.player.snowCoins;
  const deliverRes = await handleSantaDeliver(client, identity, firstOrder.id);
  assert.equal(deliverRes.ok, true);
  assert.ok(deliverRes.state.player.snowCoins > coinsBeforeDeliver);
  assert.equal(deliverRes.state.player.totalDelivered, 1);

  // 6. Nâng cấp Xưởng
  const upgradeRes = await handleSantaUpgrade(client, identity);
  assert.equal(upgradeRes.ok, true);
  assert.equal(upgradeRes.state.player.workshopLevel, 2);

  // 7. Mua Khung Avatar & Quay số may mắn (đã scale theo Xưởng Cấp 2 = x1.5)
  const buyFrame = await handleSantaBuyItem(client, identity, 'frame_wreath');
  assert.equal(buyFrame.ok, true);
  assert.equal(buyFrame.state.player.equippedFrame, 'frame_wreath');
  assert.equal(buyFrame.state.wheelMultiplier, 1.5);

  const spinRes = await handleSantaSpinWheel(client, identity);
  assert.equal(spinRes.ok, true);
  assert.equal(typeof spinRes.wheelIndex, 'number');

  // 8. Thuê Yêu Tinh phụ việc & nhận thưởng Fever Mưa Quà
  const hireRes = await handleSantaHireHelper(client, identity, 'lumberjack');
  assert.equal(hireRes.ok, true);
  assert.equal(hireRes.state.player.helpers.lumberjack, 1);

  const feverRes = await handleSantaFeverBonus(client, identity, { hits: 10 });
  assert.equal(feverRes.ok, true);
  assert.equal(feverRes.state.player.feverCount, 1);

  // 9. Đuổi Grinch & Đóng góp Cây Thông Server (mở khóa thành tựu tree_contrib)
  const grinchRes = await handleSantaRepelGrinch(client, identity);
  assert.equal(grinchRes.ok, true);

  const treeRes = await handleSantaContributeTree(client, identity, { mode: 'coins' });
  assert.equal(treeRes.ok, true);
  assert.ok(treeRes.state.serverTree.points >= 35);
  assert.ok(treeRes.state.player.unlockedAchievements.includes('tree_contrib'));

  // 10. Mua & trang bị Thú Cưng + Skin + Ghé thăm bạn bè
  const buyPet = await handleSantaBuyItem(client, identity, 'pet_usagi');
  assert.equal(buyPet.ok, true);
  assert.equal(buyPet.state.player.equippedPet, 'pet_usagi');

  const equipSkin = await handleSantaEquipCosmetic(client, identity, { kind: 'skin', itemId: 'skin_classic' });
  assert.equal(equipSkin.ok, true);

  const friendId = { userId: 'elf_02', username: 'FriendElf', guildId: 'guild_noel' };
  await buildSantaStatePayload(client, friendId);
  const likeRes = await handleSantaVisitFriend(client, identity, { targetUserId: 'elf_02', action: 'like' });
  assert.equal(likeRes.ok, true);

  // 11. Nhận thưởng nhiệm vụ hàng ngày (10 nhiệm vụ/ngày)
  assert.equal(likeRes.state.dailyQuestsMeta.length, 10);
  const claimRes = await handleSantaClaimQuest(client, identity, 'q_checkin');
  assert.equal(claimRes.ok, true);

  // 12. Admin tặng Xu Tuyết & user mở Activity nhận thông báo
  const grantRes = await grantSantaSnowCoins(client, {
    guildId: 'guild_noel',
    targetUser: { id: 'elf_01', username: 'UsagiElf' },
    amount: 500,
    adminUser: { username: 'BossKimNong' },
    note: 'Thưởng chăm chỉ',
  });
  assert.equal(grantRes.ok, true);
  assert.equal(grantRes.player.pendingGiftNotices.length, 1);

  const ackRes = await handleSantaAckGifts(client, identity);
  assert.equal(ackRes.ok, true);
  assert.equal(ackRes.state.player.pendingGiftNotices.length, 0);

  // 13. Vé Quay scale đến Lv.20 (+6 vé ở Lv.17+), Boss Server, Chợ & Hộp Bí Ẩn
  const lv17Segs = getScaledWheelSegments(17);
  const ticketSeg = lv17Segs.find((s) => s.type === 'tickets');
  assert.equal(ticketSeg.amount, 6);

  const bossRes = await handleSantaAttackBoss(client, identity, { mode: 'tap' });
  assert.equal(bossRes.ok, true);

  const swapRes = await handleSantaExchangeMaterial(client, identity, { mode: 'swap', fromMat: 'wood', toMat: 'magicDust' });
  assert.equal(swapRes.ok, true);

  const boxRes = await handleSantaOpenMysteryBox(client, identity);
  assert.equal(boxRes.ok, true);

  // 14. Nguyên liệu chế tạo tăng theo cấp xưởng
  const lv1Teddy = getScaledRecipes(1).find((r) => r.id === 'teddy');
  const lv10Teddy = getScaledRecipes(10).find((r) => r.id === 'teddy');
  assert.ok(lv10Teddy.ingredients.fabric > lv1Teddy.ingredients.fabric);

  // 15. Giới hạn mua gói nguyên liệu 1 lần/tuần
  await grantSantaSnowCoins(client, {
    guildId: 'guild_noel',
    targetUser: { id: 'elf_01', username: 'UsagiElf' },
    amount: 500,
    adminUser: { username: 'Boss' },
  });
  const pack1 = await handleSantaBuyItem(client, identity, 'mat_pack_small');
  assert.equal(pack1.ok, true);
  const pack2 = await handleSantaBuyItem(client, identity, 'mat_pack_small');
  assert.equal(pack2.ok, false);

  // 16. Giới hạn mua Thuốc Tăng Tốc x3 1 lần/3 ngày
  const buff1 = await handleSantaBuyItem(client, identity, 'buff_x3_10m');
  assert.equal(buff1.ok, true);
  const buff2 = await handleSantaBuyItem(client, identity, 'buff_x3_10m');
  assert.equal(buff2.ok, false);

  // 17. Cho thú cưng ăn lên cấp & Mở Lịch Quà Giáng Sinh 24 ô & Vòng quay Lv.100
  const feedRes = await handleSantaFeedPet(client, identity, { mode: 'coins' });
  assert.equal(feedRes.ok, true);
  assert.equal(feedRes.state.player.petLevels.pet_usagi, 2);

  const advRes = await handleSantaOpenAdvent(client, identity, 1);
  assert.equal(advRes.ok, true);
  assert.equal(advRes.state.player.adventOpened.length, 1);

  const lv100Segs = getScaledWheelSegments(100);
  assert.equal(lv100Segs.find((s) => s.type === 'tickets').amount, 11);

  // 18. Công thức tới Lv.100 & Boss giới hạn 3 thường + 2 ném đồ/ngày
  const lv100Recipes = getScaledRecipes(100);
  assert.ok(lv100Recipes.some((r) => r.minLevel === 100));
  const b1 = await handleSantaAttackBoss(client, identity, { mode: 'tap' });
  const b2 = await handleSantaAttackBoss(client, identity, { mode: 'tap' });
  const b3 = await handleSantaAttackBoss(client, identity, { mode: 'tap' });
  assert.equal(b1.ok, true);
  assert.equal(b2.ok, true);
  assert.equal(b3.ok, false); // Đã đánh 1 lần ở mục 13 + 2 lần ở đây = 3 lần -> lần thứ 4 bị chặn!

  // 19. BXH xếp theo workshopLevel giảm dần -> cùng level xếp theo totalDelivered giảm dần
  await client.db.set('santa:leaderboard:guild_sort', [
    { userId: 'u_low_lv', username: 'Lv20', workshopLevel: 20, totalDelivered: 300, reputation: 9999 },
    { userId: 'u_hi_lv', username: 'Lv21', workshopLevel: 21, totalDelivered: 30, reputation: 10 },
  ]);
  const sortedBoard = await getSantaLeaderboard(client, 'guild_sort');
  assert.equal(sortedBoard[0].userId, 'u_hi_lv');
});


test('Tiến trình Xưởng Noel hỗ trợ cấp 2000 với chi phí late-game tăng mạnh', async () => {
  assert.equal(getUpgradeCost(100), 2_000_000);
  assert.equal(getUpgradeCost(101), 3_000_000);
  assert.equal(getUpgradeCost(1000), 20_000_000);
  assert.equal(getUpgradeCost(1500), 200_000_000);
  assert.equal(getUpgradeCost(1999), 200_000_000);

  const helper = { baseCost: 80 };
  assert.equal(getHelperUpgradeCost(helper, 1500), 200_000_000);

  const lv100 = getScaledRecipes(100).find((r) => r.id === 'teddy');
  const lv2000 = getScaledRecipes(2000).find((r) => r.id === 'teddy');
  assert.ok(lv2000.ingredients.fabric > lv100.ingredients.fabric * 40);

  const lv2000Wheel = getScaledWheelSegments(2000);
  assert.ok(lv2000Wheel.find((s) => s.type === 'coins').amount > getScaledWheelSegments(100).find((s) => s.type === 'coins').amount);
  assert.equal(lv2000Wheel.find((s) => s.type === 'tickets').amount, 201);

  const client = createMemoryClient();
  const identity = { userId: 'high_level_elf', username: 'HighLevelElf', guildId: 'high_level_guild' };
  await buildSantaStatePayload(client, identity);
  const key = 'santa:player:high_level_guild:high_level_elf';
  const player = await client.db.get(key);
  player.workshopLevel = 2000;
  player.snowCoins = 1_000_000_000;
  player.unlockedAchievements = ['coins_1000'];
  await client.db.set(key, player);

  const maxState = await buildSantaStatePayload(client, identity);
  assert.equal(maxState.maxWorkshopLevel, 2000);
  assert.equal(maxState.shopItems.find((item) => item.id === 'lucky_ticket').price, 60_030);
  const ticketPurchase = await handleSantaBuyItem(client, identity, 'lucky_ticket');
  assert.equal(ticketPurchase.ok, true);
  assert.equal(ticketPurchase.state.player.snowCoins, 1_000_000_000 - 60_030);
  const workshopBlocked = await handleSantaUpgrade(client, identity);
  assert.equal(workshopBlocked.ok, false);

  const helperMax = await handleSantaHireHelper(client, identity, 'lumberjack');
  assert.equal(helperMax.ok, true);
  const current = await client.db.get(key);
  current.helpers.lumberjack = 2000;
  await client.db.set(key, current);
  const helperBlocked = await handleSantaHireHelper(client, identity, 'lumberjack');
  assert.equal(helperBlocked.ok, false);
});

test('Giới hạn mỗi người 3 lượt tim và 3 lượt tặng quà mỗi ngày', async () => {
  const client = createMemoryClient();
  const identity = { userId: 'social_elf', username: 'SocialElf', guildId: 'social_guild' };
  const friend = { userId: 'social_friend', username: 'FriendElf', guildId: 'social_guild' };
  const friend2 = { userId: 'social_friend_2', username: 'FriendElf2', guildId: 'social_guild' };
  await buildSantaStatePayload(client, identity);
  await buildSantaStatePayload(client, friend);
  await buildSantaStatePayload(client, friend2);

  const playerKey = 'santa:player:social_guild:social_elf';
  const player = await client.db.get(playerKey);
  player.toys.teddy = 4;
  await client.db.set(playerKey, player);

  for (let i = 0; i < 3; i += 1) {
    const result = await handleSantaVisitFriend(client, identity, { targetUserId: friend.userId, action: 'like' });
    assert.equal(result.ok, true);
  }
  const fourthLike = await handleSantaVisitFriend(client, identity, { targetUserId: friend.userId, action: 'like' });
  assert.equal(fourthLike.ok, false);
  const otherFriendLike = await handleSantaVisitFriend(client, identity, { targetUserId: friend2.userId, action: 'like' });
  assert.equal(otherFriendLike.ok, true);

  for (let i = 0; i < 3; i += 1) {
    const result = await handleSantaVisitFriend(client, identity, { targetUserId: friend.userId, action: 'gift' });
    assert.equal(result.ok, true);
  }
  const fourthGift = await handleSantaVisitFriend(client, identity, { targetUserId: friend.userId, action: 'gift' });
  assert.equal(fourthGift.ok, false);
  const otherFriendGift = await handleSantaVisitFriend(client, identity, { targetUserId: friend2.userId, action: 'gift' });
  assert.equal(otherFriendGift.ok, true);
});

test('Mua & trang bị các khung avatar và trang phục yêu tinh mới trong Shop Noel', async () => {
  const client = createMemoryClient();
  const identity = { userId: 'fashion_elf', username: 'FashionElf', guildId: 'fashion_guild' };
  await buildSantaStatePayload(client, identity);

  const playerKey = 'santa:player:fashion_guild:fashion_elf';
  const player = await client.db.get(playerKey);
  player.snowCoins = 20_000;
  await client.db.set(playerKey, player);

  const newFrames = ['frame_gingerbread', 'frame_fireplace', 'frame_starlight'];
  for (const frameId of newFrames) {
    const res = await handleSantaBuyItem(client, identity, frameId);
    assert.equal(res.ok, true);
    assert.equal(res.state.player.equippedFrame, frameId);
    assert.ok(res.state.player.ownedFrames.includes(frameId));
  }

  const newSkins = ['skin_snowman_suit', 'skin_nutcracker', 'skin_starlight'];
  for (const skinId of newSkins) {
    const res = await handleSantaBuyItem(client, identity, skinId);
    assert.equal(res.ok, true);
    assert.equal(res.state.player.equippedSkin, skinId);
    assert.ok(res.state.player.ownedSkins.includes(skinId));
  }

  const switchFrame = await handleSantaEquipCosmetic(client, identity, { kind: 'frame', itemId: 'frame_fireplace' });
  assert.equal(switchFrame.ok, true);
  assert.equal(switchFrame.state.player.equippedFrame, 'frame_fireplace');

  const switchSkin = await handleSantaEquipCosmetic(client, identity, { kind: 'skin', itemId: 'skin_nutcracker' });
  assert.equal(switchSkin.ok, true);
  assert.equal(switchSkin.state.player.equippedSkin, 'skin_nutcracker');
});
