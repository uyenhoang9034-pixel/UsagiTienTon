import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSantaStatePayload } from '../src/services/santaWorkshopService.js';
import {
  getDuoBondState,
  handleDuoBondInvite,
  handleDuoBondAccept,
  handleDuoBondFeed,
  handleDuoBondStorage,
  handleDuoBondTradeCreate,
  handleDuoBondTradeRespond,
  handleDuoBondBreakupRequest,
  handleDuoBondBreakupRespond,
} from '../src/services/duoBondService.js';

function memoryClient() {
  const store = new Map();
  return {
    store,
    db: {
      get: async (key, fallback = null) => store.has(key) ? structuredClone(store.get(key)) : fallback,
      set: async (key, value) => { store.set(key, structuredClone(value)); return true; },
      delete: async (key) => store.delete(key),
      list: async (prefix) => [...store.keys()].filter((key) => key.startsWith(prefix)),
    },
  };
}

test('Duo Bond: kết đôi, thưởng mốc đầu, kho chung, giao dịch duyệt và hủy hai bên', async () => {
  const client = memoryClient();
  const guildId = 'duo_test_guild';
  const a = { userId: '10000000000000001', username: 'Elf A', guildId };
  const b = { userId: '10000000000000002', username: 'Elf B', guildId };
  await buildSantaStatePayload(client, a);
  await buildSantaStatePayload(client, b);

  const invite = await handleDuoBondInvite(client, a, b.userId);
  assert.equal(invite.ok, true);
  const accepted = await handleDuoBondAccept(client, b);
  assert.equal(accepted.ok, true);

  let pa = await client.db.get(`santa:player:${guildId}:${a.userId}`);
  let pb = await client.db.get(`santa:player:${guildId}:${b.userId}`);
  assert.equal(pa.materials.ribbon, 2004);
  assert.equal(pb.materials.ribbon, 2004);
  assert.equal(pa.duoBondBuffPct, 20);
  assert.equal(pb.duoBondBuffPct, 20);

  pa.snowCoins = 1000;
  pa.materials.wood = 10;
  await client.db.set(`santa:player:${guildId}:${a.userId}`, pa);
  pb.snowCoins = 1000;
  pb.materials.fabric = 10;
  await client.db.set(`santa:player:${guildId}:${b.userId}`, pb);

  const feed = await handleDuoBondFeed(client, a);
  assert.equal(feed.ok, true);
  pa = await client.db.get(`santa:player:${guildId}:${a.userId}`);
  assert.equal(pa.snowCoins, 700);

  const deposit = await handleDuoBondStorage(client, a, 'deposit', 'wood', 5);
  assert.equal(deposit.ok, true);
  const withdraw = await handleDuoBondStorage(client, b, 'withdraw', 'wood', 2);
  assert.equal(withdraw.ok, true);
  let duo = await getDuoBondState(client, a);
  assert.equal(duo.pair.sharedStorage.wood, 3);

  const created = await handleDuoBondTradeCreate(client, a, { offerMat: 'wood', offerAmount: 1, wantMat: 'fabric', wantAmount: 1 });
  assert.equal(created.ok, true);
  const approved = await handleDuoBondTradeRespond(client, b, true);
  assert.equal(approved.ok, true);
  pa = await client.db.get(`santa:player:${guildId}:${a.userId}`);
  pb = await client.db.get(`santa:player:${guildId}:${b.userId}`);
  assert.equal(pa.materials.fabric, 2);
  assert.equal(pb.materials.wood, 2);

  assert.equal((await handleDuoBondBreakupRequest(client, a)).ok, true);
  assert.equal((await handleDuoBondBreakupRespond(client, b, true)).ok, true);
  duo = await getDuoBondState(client, a);
  assert.equal(duo.pair, null);
  pa = await client.db.get(`santa:player:${guildId}:${a.userId}`);
  assert.equal(pa.duoBondBuffPct, 0);

  const inviteAgain = await handleDuoBondInvite(client, a, b.userId);
  assert.equal(inviteAgain.ok, true);
  const acceptAgain = await handleDuoBondAccept(client, b);
  assert.equal(acceptAgain.ok, true);
  pa = await client.db.get(`santa:player:${guildId}:${a.userId}`);
  assert.equal(pa.materials.ribbon, 4004);
});
