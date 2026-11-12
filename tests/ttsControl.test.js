import test from 'node:test';
import assert from 'node:assert/strict';
import {
  Collection,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
} from 'discord.js';

process.env.USAGI_IMPORT_ONLY = 'true';
process.env.LOG_LEVEL = 'error';
process.env.DISCORD_TOKEN = 'test-only-placeholder';
process.env.CLIENT_ID = '123456789012345678';
process.env.OWNER_IDS = 'bot_owner_tts_1';

const {
  TTS_MANAGER_ROLE_ID,
  buildBotClientOptions,
  isTTSEnabledByEnv,
  parseBooleanFlag,
} = await import('../src/config/ttsConfig.js');
const { default: appConfig } = await import('../src/config/application.js');
const {
  botConfig,
  isCommandCategoryEnabled,
  isFeatureEnabled,
} = await import('../src/config/bot.js');
const {
  resolveCommandAlias,
  resolveSubcommandAlias,
} = await import('../src/config/commands/commandAliases.js');
const { getTTSGuildConfigKey } = await import('../src/utils/database/keys.js');
const {
  clearTTSStateCache,
  getTTSDisabledNoticeMessage,
  getTTSGuildConfig,
  hasTTSManagePermission,
  isTTSGuildEnabled,
  setTTSGuildEnabled,
} = await import('../src/services/tts/ttsStateService.js');
const { ttsManager } = await import('../src/services/tts/ttsManager.js');
const { default: ttsAdminCommand } = await import('../src/commands/Voice/ttsAdmin.js');
const { default: ttsCommand } = await import('../src/commands/Voice/tts.js');
const { default: ttsButtonHandler } = await import('../src/interactions/buttons/ttsButtons.js');
const { default: ttsVoiceMenuHandler } = await import('../src/interactions/selectMenus/ttsVoiceMenu.js');
const { default: messageCreateEvent } = await import('../src/events/messageCreate.js');
const { default: voiceStateUpdateEvent } = await import('../src/events/voiceStateUpdate.js');
const { default: readyEvent } = await import('../src/events/ready.js');
const { executePrefixCommand } = await import('../src/utils/messageAdapter.js');

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

function createMockDbClient() {
  const store = new Map();
  const db = {
    get: async (key, fallback = null) => (store.has(key) ? structuredClone(store.get(key)) : fallback),
    set: async (key, value) => {
      store.set(key, structuredClone(value));
      return true;
    },
    delete: async (key) => store.delete(key),
  };
  const client = {
    db,
    user: { id: 'bot_user_1', setPresence: () => {} },
    config: { bot: { presence: { status: 'online', activities: [] } } },
  };
  return { client, store };
}

function createMember({
  id = 'user_1',
  guild = { id: 'guild_tts_1', ownerId: 'guild_owner_1' },
  roleIds = [],
  roleNames = [],
  permissions = [],
} = {}) {
  const roleCache = new Collection();
  for (const roleId of roleIds) {
    roleCache.set(roleId, { id: roleId, name: `role_${roleId}` });
  }
  roleNames.forEach((name, idx) => {
    const rid = `named_role_${idx}`;
    roleCache.set(rid, { id: rid, name });
  });

  const permSet = new Set(permissions);
  const permsObj = {
    has: (flag) => permSet.has(flag),
  };

  return {
    id,
    displayName: `User_${id}`,
    user: { id, username: `user_${id}`, tag: `user_${id}#0001`, bot: false },
    guild,
    roles: { cache: roleCache },
    permissions: permsObj,
  };
}

function createSlashInteraction({
  subcommand = 'trangthai',
  strings = {},
  guildId = 'guild_tts_1',
  member = null,
  user = null,
  client = null,
  values = [],
} = {}) {
  const replies = [];
  const updates = [];
  const resolvedGuild = guildId ? { id: guildId, ownerId: 'guild_owner_1' } : null;
  const resolvedMember = member ?? (guildId ? createMember({ guild: resolvedGuild }) : null);
  const resolvedUser = user ?? resolvedMember?.user ?? { id: 'user_1', username: 'user_1', tag: 'user_1#0001', bot: false };

  return {
    guildId,
    guild: resolvedGuild,
    channelId: 'text_channel_1',
    channel: { id: 'text_channel_1' },
    member: resolvedMember,
    memberPermissions: resolvedMember?.permissions ?? null,
    user: resolvedUser,
    client,
    values,
    replied: false,
    deferred: false,
    options: {
      getSubcommand: () => subcommand,
      getString: (name) => strings[name] ?? null,
    },
    reply: async (payload) => {
      replies.push(payload);
    },
    update: async (payload) => {
      updates.push(payload);
    },
    replies,
    updates,
  };
}

test('1. parseBooleanFlag & isTTSEnabledByEnv defaults to false and honors overrides', () => {
  assert.equal(parseBooleanFlag(undefined, false), false);
  assert.equal(parseBooleanFlag('', false), false);
  assert.equal(parseBooleanFlag('false', true), false);
  assert.equal(parseBooleanFlag('0', true), false);
  assert.equal(parseBooleanFlag('off', true), false);
  assert.equal(parseBooleanFlag('true', false), true);
  assert.equal(parseBooleanFlag('1', false), true);
  assert.equal(parseBooleanFlag('ON', false), true);

  assert.equal(isTTSEnabledByEnv({}), false);
  assert.equal(isTTSEnabledByEnv({ ENABLE_TTS: '' }), false);
  assert.equal(isTTSEnabledByEnv({ ENABLE_TTS: 'false' }), false);
  assert.equal(isTTSEnabledByEnv({ ENABLE_TTS: '0' }), false);
  assert.equal(isTTSEnabledByEnv({ ENABLE_TTS: 'true' }), true);
  assert.equal(isTTSEnabledByEnv({ TTS_ENABLED: 'true' }), true);
  assert.equal(isTTSEnabledByEnv({ ENABLE_TTS: 'false', TTS_ENABLED: 'true' }), false);
});

test('2. buildBotClientOptions & config feature getters strip GuildVoiceStates and VoiceStateManager when TTS disabled', async () => {
  class VoiceStateManager {}

  const disabledOpts = buildBotClientOptions({});
  assert.equal(disabledOpts.intents.includes(GatewayIntentBits.GuildVoiceStates), false);
  assert.ok(disabledOpts.intents.includes(GatewayIntentBits.Guilds));
  assert.ok(disabledOpts.intents.includes(GatewayIntentBits.GuildMessages));
  assert.ok(disabledOpts.intents.includes(GatewayIntentBits.MessageContent));
  assert.equal(disabledOpts.makeCache(VoiceStateManager, null, VoiceStateManager).maxSize, 0);

  const enabledOpts = buildBotClientOptions({ ENABLE_TTS: 'true' });
  assert.equal(enabledOpts.intents.includes(GatewayIntentBits.GuildVoiceStates), true);
  assert.equal(enabledOpts.makeCache(VoiceStateManager, null, VoiceStateManager).maxSize, 15);

  await withTTSEnv(undefined, async () => {
    assert.equal(appConfig.features.voice, false);
    assert.equal(appConfig.features.tts, false);
    assert.equal(botConfig.features.voice, false);
    assert.equal(isFeatureEnabled('voice'), false);
    assert.equal(isCommandCategoryEnabled('Voice'), false);
  });

  await withTTSEnv('true', async () => {
    assert.equal(appConfig.features.voice, true);
    assert.equal(appConfig.features.tts, true);
    assert.equal(botConfig.features.voice, true);
    assert.equal(isFeatureEnabled('voice'), true);
    assert.equal(isCommandCategoryEnabled('Voice'), true);
  });

  // Reset override check
  botConfig.features.voice = false;
  assert.equal(botConfig.features.voice, false);
  botConfig.features.voice = null;
});

test('3. hasTTSManagePermission grants managers/owners/admins and blocks normal users', () => {
  const guild = { id: 'g1', ownerId: 'guild_owner_99' };

  assert.equal(hasTTSManagePermission(createMember({ id: 'bot_owner_tts_1', guild })), true);
  assert.equal(hasTTSManagePermission(createMember({ id: 'guild_owner_99', guild })), true);
  assert.equal(
    hasTTSManagePermission(createMember({ id: 'admin_1', guild, permissions: [PermissionFlagsBits.Administrator] })),
    true,
  );
  assert.equal(
    hasTTSManagePermission(createMember({ id: 'mgr_1', guild, permissions: [PermissionFlagsBits.ManageGuild] })),
    true,
  );
  assert.equal(
    hasTTSManagePermission(createMember({ id: 'role_id_1', guild, roleIds: [TTS_MANAGER_ROLE_ID] })),
    true,
  );
  assert.equal(
    hasTTSManagePermission(createMember({ id: 'role_name_1', guild, roleNames: ['Quản lý'] })),
    true,
  );
  assert.equal(
    hasTTSManagePermission(createMember({ id: 'regular_1', guild, roleIds: ['999'], roleNames: ['Thành viên'] })),
    false,
  );
});

test('4. ttsStateService persists guild state cleanly in DB with per-client WeakMap cache isolation', async () => {
  const { client: clientA, store: storeA } = createMockDbClient();
  const { client: clientB } = createMockDbClient();
  const guildId = 'guild_state_1';

  await withTTSEnv('true', async () => {
    assert.equal(await isTTSGuildEnabled(clientA, guildId), true);
    assert.equal(await isTTSGuildEnabled(clientB, guildId), true);

    const saved = await setTTSGuildEnabled(clientA, guildId, false, {
      updatedBy: 'admin_1',
      reason: 'Không ai dùng',
    });

    assert.equal(saved.enabled, false);
    assert.equal(saved.persisted, true);
    assert.equal(saved.reason, 'Không ai dùng');
    assert.equal(storeA.has(getTTSGuildConfigKey(guildId)), true);

    assert.equal(await isTTSGuildEnabled(clientA, guildId), false);
    // Client B has a separate DB/cache scope and should still see default enabled=true
    assert.equal(await isTTSGuildEnabled(clientB, guildId), true);

    clearTTSStateCache(clientA);
    const reloaded = await getTTSGuildConfig(clientA, guildId);
    assert.equal(reloaded.enabled, false);
    assert.equal(reloaded.reason, 'Không ai dùng');

    const reEnabled = await setTTSGuildEnabled(clientA, guildId, true, { updatedBy: 'admin_1' });
    assert.equal(reEnabled.enabled, true);
    assert.equal(reEnabled.reason, null);
    assert.equal(await isTTSGuildEnabled(clientA, guildId), true);
  });

  await withTTSEnv(undefined, async () => {
    assert.equal(await isTTSGuildEnabled(clientA, guildId), false);
    const msg = getTTSDisabledNoticeMessage();
    assert.ok(msg.includes('ENABLE_TTS=false'));
  });
});

test('5. /tts-admin tat disables TTS, destroys active session resources/timers, and blocks /tts + interactions until /tts-admin bat', async () => {
  const { client, store } = createMockDbClient();
  const guildId = 'guild_admin_toggle_1';
  const adminMember = createMember({
    id: 'mgr_user_1',
    guild: { id: guildId, ownerId: 'guild_owner_1' },
    roleIds: [TTS_MANAGER_ROLE_ID],
  });
  const regularMember = createMember({
    id: 'regular_user_1',
    guild: { id: guildId, ownerId: 'guild_owner_1' },
  });

  let connectionDestroyed = false;
  let playerStopped = false;
  const fakeStream = { destroyed: false, destroy() { this.destroyed = true; } };
  const fakeResourceStream = { destroyed: false, destroy() { this.destroyed = true; } };

  try {
    await withTTSEnv('true', async () => {
      // Unauthorized user is rejected
      const deniedInteraction = createSlashInteraction({
        subcommand: 'tat',
        guildId,
        member: regularMember,
        client,
      });
      await ttsAdminCommand.execute(deniedInteraction, null, client);
      assert.equal(deniedInteraction.replies.length, 1);
      assert.equal(deniedInteraction.replies[0].flags, MessageFlags.Ephemeral);
      assert.ok(deniedInteraction.replies[0].content.includes('Quản lý'));

      // Seed active TTS session
      const idleTimer = setTimeout(() => {}, 60_000);
      const aloneTimer = setTimeout(() => {}, 60_000);
      const playbackWatchdog = setTimeout(() => {}, 60_000);
      ttsManager.sessions.set(guildId, {
        guildId,
        voiceChannelId: 'vc_1',
        textChannelId: 'tc_1',
        ownerId: adminMember.id,
        voiceId: 'vi-VN-HoaiMyNeural',
        speed: '1.0x',
        mode: 'all',
        queue: [{ text: 'xin chao' }],
        isPlaying: true,
        idleTimer,
        aloneTimer,
        playbackWatchdog,
        currentStream: fakeStream,
        currentResource: { playStream: fakeResourceStream },
        connection: { destroy: () => { connectionDestroyed = true; } },
        player: { stop: (force) => { playerStopped = Boolean(force); } },
      });

      assert.equal(ttsManager.hasSession(guildId), true);

      // Admin executes /tts-admin tat
      const tatInteraction = createSlashInteraction({
        subcommand: 'tat',
        strings: { ly_do: 'Ít người dùng' },
        guildId,
        member: adminMember,
        client,
      });
      await ttsAdminCommand.execute(tatInteraction, null, client);

      assert.equal(tatInteraction.replies.length, 1);
      assert.equal(tatInteraction.replies[0].flags, MessageFlags.Ephemeral);
      assert.ok(store.has(getTTSGuildConfigKey(guildId)));
      assert.equal(await isTTSGuildEnabled(client, guildId), false);
      assert.equal(ttsManager.hasSession(guildId), false);
      assert.equal(connectionDestroyed, true);
      assert.equal(playerStopped, true);
      assert.equal(fakeStream.destroyed, true);
      assert.equal(fakeResourceStream.destroyed, true);

      // While guild TTS is disabled, /tts, tts_button, and tts_select_voice are all blocked
      const blockedTts = createSlashInteraction({
        subcommand: 'vao',
        guildId,
        member: regularMember,
        client,
      });
      await ttsCommand.execute(blockedTts, null, client);
      assert.equal(blockedTts.replies.length, 1);
      assert.equal(blockedTts.replies[0].flags, MessageFlags.Ephemeral);
      assert.ok(blockedTts.replies[0].content.includes('/tts-admin bat'));

      const blockedBtn = createSlashInteraction({ guildId, member: regularMember, client });
      await ttsButtonHandler.execute(blockedBtn, client, ['open_voices', guildId]);
      assert.equal(blockedBtn.replies.length, 1);
      assert.ok(blockedBtn.replies[0].content.includes('Đang') || blockedBtn.replies[0].content.includes('TẮT'));

      const blockedMenu = createSlashInteraction({
        guildId,
        member: regularMember,
        client,
        values: ['vi-VN-NamMinhNeural'],
      });
      await ttsVoiceMenuHandler.execute(blockedMenu, client, [guildId]);
      assert.equal(blockedMenu.replies.length, 1);
      assert.ok(blockedMenu.replies[0].content.includes('TẮT'));

      // Status reflects disabled state without importing heavy voice module
      const statusInteraction = createSlashInteraction({
        subcommand: 'trangthai',
        guildId,
        member: adminMember,
        client,
      });
      await ttsAdminCommand.execute(statusInteraction, null, client);
      assert.equal(statusInteraction.replies.length, 1);
      assert.equal(ttsManager.isVoiceModuleLoaded(), false);
      assert.equal(ttsManager.isAudioEngineLoaded(), false);

      // Admin re-enables with /tts-admin bat
      const batInteraction = createSlashInteraction({
        subcommand: 'bat',
        guildId,
        member: adminMember,
        client,
      });
      await ttsAdminCommand.execute(batInteraction, null, client);
      assert.equal(batInteraction.replies.length, 1);
      assert.equal(await isTTSGuildEnabled(client, guildId), true);
    });

    // When ENABLE_TTS=false at env level, /tts-admin informs admin that env hard-disable is active
    await withTTSEnv(undefined, async () => {
      const envOffInteraction = createSlashInteraction({
        subcommand: 'trangthai',
        guildId,
        member: adminMember,
        client,
      });
      await ttsAdminCommand.execute(envOffInteraction, null, client);
      assert.equal(envOffInteraction.replies.length, 1);
      assert.ok(envOffInteraction.replies[0].content.includes('ENABLE_TTS=false'));
    });
  } finally {
    const leftover = ttsManager.sessions.get(guildId);
    if (leftover) {
      if (leftover.idleTimer) clearTimeout(leftover.idleTimer);
      if (leftover.aloneTimer) clearTimeout(leftover.aloneTimer);
      if (leftover.playbackWatchdog) clearTimeout(leftover.playbackWatchdog);
      ttsManager.sessions.delete(guildId);
    }
  }
});

test('6. command aliases and prefix execution for !ttsadmin disable/enable work without Ephemeral flag error', async () => {
  assert.equal(resolveCommandAlias('ttsadmin'), 'tts-admin');
  assert.equal(resolveSubcommandAlias('disable'), 'tat');
  assert.equal(resolveSubcommandAlias('enable'), 'bat');

  const { client } = createMockDbClient();
  const guildId = 'guild_prefix_tts_1';
  const guild = {
    id: guildId,
    ownerId: 'guild_owner_1',
    members: { cache: new Collection() },
  };
  const adminMember = createMember({
    id: 'mgr_prefix_1',
    guild,
    roleIds: [TTS_MANAGER_ROLE_ID],
  });
  const sentMessages = [];

  await withTTSEnv('true', async () => {
    const message = {
      id: 'msg_prefix_1',
      content: '!ttsadmin disable',
      author: adminMember.user,
      member: adminMember,
      guild,
      channel: {
        id: 'tc_prefix_1',
        send: async (payload) => {
          sentMessages.push(payload);
          return { id: 'reply_prefix_1', payload, edit: async () => {} };
        },
      },
      client,
      createdTimestamp: Date.now(),
      createdAt: new Date(),
    };

    await executePrefixCommand(ttsAdminCommand, message, ['disable'], client, '!', null);
    assert.equal(sentMessages.length, 1);
    assert.equal(sentMessages[0].flags, undefined);
    assert.equal(await isTTSGuildEnabled(client, guildId), false);

    await executePrefixCommand(ttsAdminCommand, message, ['enable'], client, '!', null);
    assert.equal(sentMessages.length, 2);
    assert.equal(sentMessages[1].flags, undefined);
    assert.equal(await isTTSGuildEnabled(client, guildId), true);
  });
});

test('7. messageCreate, voiceStateUpdate, and ready events behave cleanly with zero heavy voice imports when TTS disabled', async () => {
  await withTTSEnv(undefined, async () => {
    const { client } = createMockDbClient();
    client.commands = new Collection();

    // messageCreate ignores non-command chat and does not touch ttsManager
    await messageCreateEvent.execute(
      {
        author: { bot: false, id: 'u1', tag: 'u1#0001' },
        guild: { id: 'g1' },
        channelId: 'c1',
        channel: { id: 'c1' },
        content: 'hello usagi',
      },
      client,
    );

    // voiceStateUpdate returns immediately
    await voiceStateUpdateEvent.execute(
      { guild: { id: 'g1' } },
      { guild: { id: 'g1' } },
      client,
    );

    // ready executes cleanly
    await readyEvent.execute(client);

    assert.equal(ttsManager.isVoiceModuleLoaded(), false);
    assert.equal(ttsManager.isAudioEngineLoaded(), false);
    assert.match(await ttsManager.getDependencyReport(), /chưa nạp vào RAM/);
  });
});
