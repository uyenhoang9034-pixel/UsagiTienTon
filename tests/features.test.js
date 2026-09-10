import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Collection, Events } from 'discord.js';

process.env.USAGI_IMPORT_ONLY = 'true';
process.env.LOG_LEVEL = 'error';
process.env.DISCORD_TOKEN = 'test-only-placeholder';
process.env.CLIENT_ID = '123456789012345678';
process.env.LAVALINK_NODES = JSON.stringify([
  {
    host: 'localhost',
    port: 2333,
    password: 'test-only-placeholder',
    secure: false,
    name: 'Test',
  },
]);

const { loadCommands, registerCommands } = await import('../src/handlers/loaders/commandLoader.js');
const { default: loadEvents } = await import('../src/handlers/loaders/events.js');
const { default: loadInteractions } = await import('../src/handlers/loaders/interactions.js');
const { canControlMusic, requireVoiceChannel } = await import('../src/services/music/permissions.js');
const { getCultivationProfile, saveCultivationProfile } = await import('../src/services/cultivationService.js');

const EXPECTED_COMMANDS = [
  'join',
  'music',
  'nowplaying',
  'play',
  'queue',
  'tutien',
  'tutienitem',
  'tutientest',
];

function createMockClient() {
  const client = new EventEmitter();

  client.commands = new Collection();
  client.events = new Collection();
  client.buttons = new Collection();
  client.selectMenus = new Collection();
  client.modals = new Collection();
  client.cooldowns = new Collection();

  client.rest = {
    put: async () => ({}),
  };

  client.config = {
    bot: {
      presence: {
        activities: [],
        status: 'online',
      },
    },
  };

  client.user = {
    id: 'test-bot',
    setPresence: () => {},
  };

  client.guilds = {
    cache: new Collection(),
  };

  return client;
}

test('loads only Music and Tiên Lộ commands, then serializes slash payloads', async () => {
  const client = createMockClient();

  await loadCommands(client);

  assert.deepEqual(
    [...client.commands.keys()].sort(),
    EXPECTED_COMMANDS.sort(),
  );

  const restCalls = [];
  client.rest = {
    put: async (route, payload) => {
      restCalls.push({ route, ...payload });
      return [];
    },
  };

  await registerCommands(client, {
    clientId: process.env.CLIENT_ID,
  });

  const registerCall = restCalls.at(-1);

  assert.equal(
    registerCall.route,
    '/applications/123456789012345678/commands',
  );

  assert.deepEqual(
    registerCall.body.map((command) => command.name).sort(),
    EXPECTED_COMMANDS.sort(),
  );
});

test('loads only scoped events and scoped interactions', async () => {
  const client = createMockClient();

  await loadEvents(client);

  assert.equal(client.listenerCount(Events.ClientReady), 1);
  assert.equal(client.listenerCount(Events.InteractionCreate), 1);
  assert.equal(client.listenerCount(Events.MessageCreate), 1);
  assert.equal(client.listenerCount(Events.VoiceStateUpdate), 1);

  assert.equal(client.listenerCount(Events.MessageReactionAdd), 0);
  assert.equal(client.listenerCount(Events.MessageReactionRemove), 0);

  await loadInteractions(client);

  assert.ok(client.buttons.has('tutien_action'));
  assert.ok(client.buttons.size > 1);
  assert.ok(client.selectMenus.size > 0);
  assert.equal(client.modals.size, 0);

  for (const name of client.selectMenus.keys()) {
    assert.ok(
      name.startsWith('tutien'),
      `Unexpected non-Tiên Lộ select menu loaded: ${name}`,
    );
  }
});

test('music controls require the same voice channel', () => {
  assert.equal(requireVoiceChannel({}), false);

  assert.equal(
    canControlMusic(
      { voice: { channel: { id: 'other' } } },
      { voiceChannel: 'music' },
    ),
    false,
  );

  assert.equal(
    canControlMusic(
      { voice: { channel: { id: 'music' } } },
      { voiceChannel: 'music' },
    ),
    true,
  );
});

test('cultivation keeps the stable database key and restores progress', async () => {
  const records = new Map();

  const db = {
    get: async (key, fallback) => structuredClone(records.get(key) ?? fallback),
    set: async (key, value) => records.set(key, structuredClone(value)),
  };

  const original = await getCultivationProfile(
    { db },
    'guild',
    'player',
  );

  original.cultivation = 12345;

  await saveCultivationProfile(
    { db },
    original,
  );

  assert.ok(records.has('games:cultivation:profile:guild:player'));

  const restored = await getCultivationProfile(
    { db },
    'guild',
    'player',
    { create: false },
  );

  assert.equal(restored.cultivation, 12345);

  assert.equal(
    await getCultivationProfile(
      { db },
      'guild',
      'unknown',
      { create: false },
    ),
    null,
  );
});
