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
const { getUserMarriage, createMarriage } = await import('../src/services/marriageService.js');

const EXPECTED_COMMANDS = [
  'marry',
  'tts',
  'xoatinnhan',
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

test('loads only active commands, then serializes slash payloads', async () => {
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

  assert.ok(client.buttons.has('tts_button'));
  assert.ok(client.selectMenus.has('tts_select_voice'));
  assert.equal(client.modals.size, 0);

  for (const name of client.buttons.keys()) {
    assert.ok(
      name.startsWith('tts'),
      `Unexpected non-scoped button loaded: ${name}`,
    );
  }

  for (const name of client.selectMenus.keys()) {
    assert.ok(
      name.startsWith('tts'),
      `Unexpected non-scoped select menu loaded: ${name}`,
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

test('marriage database persistence works correctly', async () => {
  const records = new Map();

  const db = {
    get: async (key, fallback) => structuredClone(records.get(key) ?? fallback),
    set: async (key, value) => records.set(key, structuredClone(value)),
  };

  const client = { db };

  const success = await createMarriage(
    client,
    'guild123',
    'userA',
    'userB',
    { bio: 'Yêu thương đong đầy 💕' },
  );

  assert.equal(success, true);
  assert.ok(records.has('games:marriage:profile:guild123:userA'));
  assert.ok(records.has('games:marriage:profile:guild123:userB'));

  const marriageA = await getUserMarriage(client, 'guild123', 'userA');
  assert.equal(Boolean(marriageA.spouses['userB']), true);
  assert.equal(marriageA.spouses['userB'].bio, 'Yêu thương đong đầy 💕');

  const emptyUser = await getUserMarriage(client, 'guild123', 'unknownUser');
  assert.deepEqual(emptyUser.spouses, {});
});
