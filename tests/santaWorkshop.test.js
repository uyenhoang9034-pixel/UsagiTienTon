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

  // 7. Mua Khung Avatar & Quay số may mắn
  const buyFrame = await handleSantaBuyItem(client, identity, 'frame_wreath');
  assert.equal(buyFrame.ok, true);
  assert.equal(buyFrame.state.player.equippedFrame, 'frame_wreath');

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
});
