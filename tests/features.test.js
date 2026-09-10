import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { Collection, Partials } from 'discord.js';

process.env.USAGI_IMPORT_ONLY = 'true';
process.env.LOG_LEVEL = 'error';
process.env.DISCORD_TOKEN = 'test-only-placeholder';
process.env.CLIENT_ID = '123456789012345678';
const { default: Bot } = await import('../src/app.js');
const { loadCommands, registerCommands } = await import('../src/handlers/loaders/commandLoader.js');
const { default: addReaction } = await import('../src/events/messageReactionAdd.js');
const { default: removeReaction } = await import('../src/events/messageReactionRemove.js');
const { GAME_ROLES, GAME_ROLE_NOTIFICATION_CHANNEL_ID } = await import('../src/config/gameRoles.js');
const { canControlMusic, requireVoiceChannel } = await import('../src/services/music/permissions.js');
const { getCultivationProfile, saveCultivationProfile } = await import('../src/services/cultivationService.js');

test('loads only music, role and cultivation commands, serializes slash payloads and loads all handlers', async () => {
  const client = new Bot();
  const realRest = client.rest;
  try {
    await loadCommands(client);
    assert.deepEqual([...client.commands.keys()].sort(), ['audio','join','music','nowplaying','play','queue','reactroles','testlinhthu','tutien','tutienitem','tutientest'].sort());
    await client.loadHandlers();
    assert.equal(client.buttons.size, 24);
    assert.equal(client.selectMenus.size, 9);
    assert.equal(client.modals.size, 1);
    assert.ok(client.options.partials.includes(Partials.Message));
    assert.ok(client.options.partials.includes(Partials.Reaction));
    const events = await readdir(new URL('../src/events', import.meta.url));
    assert.deepEqual(events.sort(), ['interactionCreate.js','messageCreate.js','messageReactionAdd.js','messageReactionRemove.js','ready.js','voiceStateUpdate.js'].sort());
    let registered;
    client.rest = { put: async (route, body) => { registered = { route, ...body }; } };
    await registerCommands(client, { clientId: process.env.CLIENT_ID });
    assert.equal(registered.body.length, 11);
    assert.equal(registered.route, '/applications/123456789012345678/commands');
  } finally { client.rest = realRest; await client.destroy(); }
});

let userSequence = 0;
function roleFixture({ author = 'new-bot', permission = true, position = 1, existing = false } = {}) {
  const role = { id: GAME_ROLES[0].roleId, name: 'TFT', position };
  const roles = new Collection(existing ? [[role.id, role]] : []);
  const calls = [];
  const notifications = [];
  const member = { id: 'member-' + (++userSequence), user: { bot: false, tag: 'Tester' }, roles: {
    cache: roles,
    add: async id => { calls.push(['add',id]); roles.set(id,role); },
    remove: async id => { calls.push(['remove',id]); roles.delete(id); },
  } };
  const channel = { isTextBased: () => true, permissionsFor: () => ({ has: () => true }), send: async payload => { notifications.push(payload); } };
  const guild = {
    id: 'guild', members: { me: { id:'new-bot', permissions: { has: () => permission }, roles: { highest: { position: 10 } } }, fetch: async () => member },
    roles: { fetch: async () => role },
    channels: { cache: new Collection([[GAME_ROLE_NOTIFICATION_CHANNEL_ID,channel]]), fetch: async () => channel },
  };
  member.guild = guild;
  const message = { guild, author: { id: author }, embeds: [{ title: '𝓖𝓸́𝓬 𝓵𝓪̂́𝔂 𝓻𝓸𝓵𝓮' }], partial: true, fetch: async function () { this.partial=false; return this; } };
  const reaction = { emoji: GAME_ROLES[0].emoji, message, partial: true, fetch: async function () { this.partial=false; return this; } };
  return { reaction, user: { id: member.id, bot: false }, calls, notifications };
}

test('partial reaction after restart grants role and sends one notification; removing it removes role', async () => {
  const f = roleFixture();
  await addReaction.execute(f.reaction, f.user);
  assert.deepEqual(f.calls, [['add', GAME_ROLES[0].roleId]]);
  assert.equal(f.notifications.length, 1);
  await addReaction.execute(f.reaction, f.user);
  assert.equal(f.notifications.length, 1);
  await removeReaction.execute(f.reaction, f.user);
  assert.equal(f.calls[1][0], 'remove');
});

test('ignores old bot panels, missing Manage Roles and roles above bot', async () => {
  for (const settings of [{ author:'old-bot' },{ permission:false },{ position:11 }]) {
    const f=roleFixture(settings);
    await addReaction.execute(f.reaction,f.user);
    assert.equal(f.calls.length,0);
    assert.equal(f.notifications.length,0);
  }
});

test('music controls require the same voice channel', () => {
  assert.equal(requireVoiceChannel({}), false);
  assert.equal(canControlMusic({ voice: { channel: { id:'other' } } }, { voiceChannel:'music' }), false);
  assert.equal(canControlMusic({ voice: { channel: { id:'music' } } }, { voiceChannel:'music' }), true);
});

test('cultivation retains the old database key and progress across client instances', async () => {
  const records=new Map();
  const db={ get: async (key, fallback) => structuredClone(records.get(key) ?? fallback), set: async (key,value) => records.set(key, structuredClone(value)) };
  const original=await getCultivationProfile({db},'guild','player');
  original.cultivation=12345;
  await saveCultivationProfile({db},original);
  assert.ok(records.has('games:cultivation:profile:guild:player'));
  const restored=await getCultivationProfile({db},'guild','player',{create:false});
  assert.equal(restored.cultivation,12345);
  assert.equal(await getCultivationProfile({db},'guild','unknown',{create:false}),null);
});
