import test from 'node:test';
import assert from 'node:assert/strict';
import { PermissionFlagsBits } from 'discord.js';

import {
  ROLE_HIERARCHY,
  COMMAND_TIERS,
  getMemberRoleTier,
  checkCommandRoleHierarchy,
} from '../src/config/roleHierarchy.js';

test('Role Hierarchy: Config definitions match user specifications', () => {
  assert.equal(ROLE_HIERARCHY.OWNER, '1541303749916754001');
  assert.equal(ROLE_HIERARCHY.ADMIN, '1545305594712432640');
  assert.equal(ROLE_HIERARCHY.SP_TICKET, '1545295139390619768');

  // Tier 1 (Owner only)
  assert.equal(COMMAND_TIERS['setup-prism'], 1);
  assert.equal(COMMAND_TIERS['prism-admin'], 1);
  assert.equal(COMMAND_TIERS['doantu-admin'], 1);
  assert.equal(COMMAND_TIERS['hsk-admin'], 1);

  // Tier 2 (Admin cấp cao + Owner)
  assert.equal(COMMAND_TIERS['xoatinnhan'], 2);
  assert.equal(COMMAND_TIERS['phattu'], 2);
  assert.equal(COMMAND_TIERS['thatu'], 2);
  assert.equal(COMMAND_TIERS['hsk'], 2);
  assert.equal(COMMAND_TIERS['tts-admin'], 2);
  assert.equal(COMMAND_TIERS['ttstrangthai'], 2);

  // Tier 3 (SP Ticket + Admin cấp cao + Owner)
  assert.equal(COMMAND_TIERS['clear'], 3);
  assert.equal(COMMAND_TIERS['close'], 3);
  assert.equal(COMMAND_TIERS['moticket'], 3);
  assert.equal(COMMAND_TIERS['ib1'], 3);
  assert.equal(COMMAND_TIERS['ib2'], 3);
  assert.equal(COMMAND_TIERS['ib3'], 3);
});

test('Role Hierarchy: getMemberRoleTier evaluates tiers accurately', () => {
  // Guild owner is Tier 1
  assert.equal(
    getMemberRoleTier({ user: { id: 'owner_1' }, roles: { cache: new Set() } }, { ownerId: 'owner_1' }),
    1
  );

  // Member with Owner role is Tier 1
  assert.equal(
    getMemberRoleTier({ user: { id: 'u1' }, roles: { cache: new Set([ROLE_HIERARCHY.OWNER]) } }),
    1
  );

  // Member with Admin role is Tier 2
  assert.equal(
    getMemberRoleTier({ user: { id: 'u2' }, roles: { cache: new Set([ROLE_HIERARCHY.ADMIN]) } }),
    2
  );

  // Member with SP Ticket role is Tier 3
  assert.equal(
    getMemberRoleTier({ user: { id: 'u3' }, roles: { cache: new Set([ROLE_HIERARCHY.SP_TICKET]) } }),
    3
  );

  // Member having both Owner & Admin is Tier 1
  assert.equal(
    getMemberRoleTier({
      user: { id: 'u4' },
      roles: { cache: new Set([ROLE_HIERARCHY.OWNER, ROLE_HIERARCHY.ADMIN]) },
    }),
    1
  );

  // Normal member is Tier 0
  assert.equal(
    getMemberRoleTier({ user: { id: 'u5' }, roles: { cache: new Set(['some_other_role']) } }),
    0
  );
});

test('Role Hierarchy: checkCommandRoleHierarchy enforces inheritance and restriction', () => {
  const makeInteraction = (roleId) => ({
    member: {
      user: { id: 'user_test' },
      roles: { cache: new Set(roleId ? [roleId] : []) },
    },
    guild: { ownerId: 'someone_else' },
  });

  const ownerInter = makeInteraction(ROLE_HIERARCHY.OWNER);
  const adminInter = makeInteraction(ROLE_HIERARCHY.ADMIN);
  const ticketInter = makeInteraction(ROLE_HIERARCHY.SP_TICKET);
  const everyoneInter = makeInteraction(null);

  // 1. Tier 1 commands (e.g. /doantu-admin, /hsk-admin, /setup-prism, /prism-admin)
  assert.equal(checkCommandRoleHierarchy(ownerInter, 'doantu-admin').allowed, true);
  assert.equal(checkCommandRoleHierarchy(adminInter, 'doantu-admin').allowed, false);
  assert.equal(checkCommandRoleHierarchy(ticketInter, 'doantu-admin').allowed, false);
  assert.equal(checkCommandRoleHierarchy(everyoneInter, 'doantu-admin').allowed, false);

  // 2. Tier 2 commands (e.g. /xoatinnhan, /phattu, /thatu, /hsk, /tts-admin, /ttstrangthai)
  assert.equal(checkCommandRoleHierarchy(ownerInter, 'xoatinnhan').allowed, true);
  assert.equal(checkCommandRoleHierarchy(adminInter, 'xoatinnhan').allowed, true);
  assert.equal(checkCommandRoleHierarchy(ticketInter, 'xoatinnhan').allowed, false);
  assert.equal(checkCommandRoleHierarchy(everyoneInter, 'xoatinnhan').allowed, false);

  assert.equal(checkCommandRoleHierarchy(ownerInter, 'tts-admin').allowed, true);
  assert.equal(checkCommandRoleHierarchy(adminInter, 'tts-admin').allowed, true);
  assert.equal(checkCommandRoleHierarchy(ticketInter, 'tts-admin').allowed, false);
  assert.equal(checkCommandRoleHierarchy(everyoneInter, 'tts-admin').allowed, false);

  assert.equal(checkCommandRoleHierarchy(ownerInter, 'ttstrangthai').allowed, true);
  assert.equal(checkCommandRoleHierarchy(adminInter, 'ttstrangthai').allowed, true);
  assert.equal(checkCommandRoleHierarchy(ticketInter, 'ttstrangthai').allowed, false);
  assert.equal(checkCommandRoleHierarchy(everyoneInter, 'ttstrangthai').allowed, false);

  // 3. Tier 3 commands (e.g. /clear, /close, /moticket, /ib1)
  assert.equal(checkCommandRoleHierarchy(ownerInter, 'clear').allowed, true);
  assert.equal(checkCommandRoleHierarchy(adminInter, 'clear').allowed, true);
  assert.equal(checkCommandRoleHierarchy(ticketInter, 'clear').allowed, true);
  assert.equal(checkCommandRoleHierarchy(everyoneInter, 'clear').allowed, false);

  // 4. Unrestricted command for everyone (e.g. /boc-que, /random)
  assert.equal(checkCommandRoleHierarchy(everyoneInter, 'boc-que').allowed, true);
  assert.equal(checkCommandRoleHierarchy(ticketInter, 'boc-que').allowed, true);
  assert.equal(checkCommandRoleHierarchy(adminInter, 'boc-que').allowed, true);
  assert.equal(checkCommandRoleHierarchy(ownerInter, 'boc-que').allowed, true);
});

test('Role Hierarchy: Command builders have Administrator default member permissions', async () => {
  const commandsToTest = [
    { name: 'setup-prism', path: '../src/commands/Games/setupPrism.js' },
    { name: 'prism-admin', path: '../src/commands/Games/prismAdmin.js' },
    { name: 'doantu-admin', path: '../src/commands/Games/doantuAdmin.js' },
    { name: 'hsk-admin', path: '../src/commands/Games/hskAdmin.js' },
    { name: 'xoatinnhan', path: '../src/commands/Games/xoatinnhan.js' },
    { name: 'phattu', path: '../src/commands/Moderation/phattu.js' },
    { name: 'thatu', path: '../src/commands/Moderation/thatu.js' },
    { name: 'hsk', path: '../src/commands/Games/hsk.js' },
    { name: 'clear', path: '../src/commands/Moderation/clear.js' },
    { name: 'close', path: '../src/commands/Moderation/close.js' },
    { name: 'moticket', path: '../src/commands/Moderation/moticket.js' },
    { name: 'ib1', path: '../src/commands/Moderation/ib1.js' },
    { name: 'ib2', path: '../src/commands/Moderation/ib2.js' },
    { name: 'ib3', path: '../src/commands/Moderation/ib3.js' },
    { name: 'tts-admin', path: '../src/commands/Voice/ttsAdmin.js' },
    { name: 'ttstrangthai', path: '../src/commands/Voice/ttsTrangThai.js' },
  ];

  for (const item of commandsToTest) {
    const mod = await import(item.path);
    const cmd = mod.default || mod;
    const json = cmd.data?.toJSON ? cmd.data.toJSON() : cmd.data;
    assert.equal(
      json.default_member_permissions,
      String(PermissionFlagsBits.Administrator),
      `Command /${item.name} must have default_member_permissions set to Administrator`
    );
  }
});
