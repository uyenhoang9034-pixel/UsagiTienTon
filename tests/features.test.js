import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Collection, Events } from 'discord.js';

process.env.USAGI_IMPORT_ONLY = 'true';
process.env.LOG_LEVEL = 'error';
process.env.DISCORD_TOKEN = 'test-only-placeholder';
process.env.CLIENT_ID = '123456789012345678';
const { loadCommands, registerCommands } = await import('../src/handlers/loaders/commandLoader.js');
const { default: loadEvents } = await import('../src/handlers/loaders/events.js');
const { default: loadInteractions } = await import('../src/handlers/loaders/interactions.js');
const { getUserMarriage, createMarriage } = await import('../src/services/marriageService.js');

const EXPECTED_BASE_COMMANDS = [
  'boc-que',
  'clear',
  'close',
  'doantu',
  'doantu-admin',
  'dot-via',
  'hsk',
  'hsk-admin',
  'hsk-bxh',
  'laudon',
  'marry',
  'moticket',
  'phattu',
  'random',
  'thatu',
  'xin-nghi',
  'xoatinnhan',
];

const EXPECTED_VOICE_COMMANDS = ['tts', 'tts-admin'];

async function withTTSEnv(value, fn) {
  const prevEnable = process.env.ENABLE_TTS;
  const prevLegacy = process.env.TTS_ENABLED;

  if (value === undefined) {
    delete process.env.ENABLE_TTS;
    delete process.env.TTS_ENABLED;
  } else {
    process.env.ENABLE_TTS = value;
    delete process.env.TTS_ENABLED;
  }

  try {
    return await fn();
  } finally {
    if (prevEnable === undefined) {
      delete process.env.ENABLE_TTS;
    } else {
      process.env.ENABLE_TTS = prevEnable;
    }
    if (prevLegacy === undefined) {
      delete process.env.TTS_ENABLED;
    } else {
      process.env.TTS_ENABLED = prevLegacy;
    }
  }
}

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

test('loads only active non-TTS commands by default, and includes Voice commands when ENABLE_TTS=true', async () => {
  await withTTSEnv(undefined, async () => {
    const client = createMockClient();

    await loadCommands(client);

    assert.deepEqual(
      [...client.commands.keys()].sort(),
      [...EXPECTED_BASE_COMMANDS].sort(),
    );
    assert.equal(client.commands.has('tts'), false);
    assert.equal(client.commands.has('tts-admin'), false);

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
      [...EXPECTED_BASE_COMMANDS].sort(),
    );
  });

  await withTTSEnv('true', async () => {
    const client = createMockClient();
    await loadCommands(client);

    assert.deepEqual(
      [...client.commands.keys()].sort(),
      [...EXPECTED_BASE_COMMANDS, ...EXPECTED_VOICE_COMMANDS].sort(),
    );
    assert.ok(client.commands.has('tts'));
    assert.ok(client.commands.has('tts-admin'));
  });
});

test('skips TTS events and interactions by default, and loads them when ENABLE_TTS=true', async () => {
  await withTTSEnv(undefined, async () => {
    const client = createMockClient();

    await loadEvents(client);

    assert.equal(client.listenerCount(Events.ClientReady), 1);
    assert.equal(client.listenerCount(Events.InteractionCreate), 1);
    assert.equal(client.listenerCount(Events.MessageCreate), 1);
    assert.equal(client.listenerCount(Events.VoiceStateUpdate), 0);

    assert.equal(client.listenerCount(Events.MessageReactionAdd), 0);
    assert.equal(client.listenerCount(Events.MessageReactionRemove), 0);

    await loadInteractions(client);

    assert.equal(client.buttons.has('tts_button'), false);
    assert.equal(client.selectMenus.has('tts_select_voice'), false);

    assert.ok(client.buttons.has('rd_reroll_num'));
    assert.ok(client.buttons.has('rd_reroll_choice'));
    assert.ok(client.buttons.has('hw_prev'));
    assert.ok(client.buttons.has('hw_next'));
    assert.ok(client.buttons.has('hw_flip'));
    assert.ok(client.buttons.has('hw_heart'));
    assert.ok(client.buttons.has('hw_book'));
    assert.ok(client.buttons.has('doantu_hint'));
    assert.ok(client.buttons.has('hsk_home'));
    assert.ok(client.selectMenus.has('hsk_select_band'));
    assert.ok(client.modals.has('hw_modal_book'));
    assert.ok(client.modals.has('doantu_modal_time'));
    assert.ok(client.modals.has('hsk_modal_search'));

    for (const name of client.buttons.keys()) {
      assert.ok(
        name.startsWith('excuse') ||
          name.startsWith('rd') ||
          name.startsWith('hw') ||
          name.startsWith('doantu') ||
          name.startsWith('hsk'),
        `Unexpected button loaded while TTS is disabled: ${name}`,
      );
    }

    for (const name of client.selectMenus.keys()) {
      assert.ok(
        name.startsWith('hsk'),
        `Unexpected select menu loaded while TTS is disabled: ${name}`,
      );
    }
  });

  await withTTSEnv('true', async () => {
    const client = createMockClient();

    await loadEvents(client);
    assert.equal(client.listenerCount(Events.VoiceStateUpdate), 1);

    await loadInteractions(client);
    assert.ok(client.buttons.has('tts_button'));
    assert.ok(client.selectMenus.has('tts_select_voice'));
  });
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
