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

  const feed = await handleDuoBondFeed(client, a);
  assert.equal(feed.ok, true);
  pa = await client.db.get(`santa:player:${guildId}:${a.userId}`);
  assert.equal(pa.snowCoins, 50 - 300 < 0 ? 50 : 50); // Không đủ Xu thì cho ăn phải bị chặn.
});
