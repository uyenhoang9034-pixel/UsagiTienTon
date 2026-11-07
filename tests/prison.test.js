import test from 'node:test';
import assert from 'node:assert/strict';
import { Collection } from 'discord.js';
import { releaseMember, jailMember, PRISON_ROLE_ID } from '../src/services/prisonService.js';

function createMockGuildMember({ id = 'user-123', initialRoleIds = [] } = {}) {
  const roleCache = new Collection();
  for (const roleId of initialRoleIds) {
    roleCache.set(roleId, { id: roleId, name: `Role-${roleId}` });
  }

  const roleHistory = {
    set: [],
    add: [],
    remove: [],
  };

  const member = {
    id,
    guild: null,
    roles: {
      cache: roleCache,
      highest: { position: 100 },
      set: async (roles, reason) => {
        roleHistory.set.push({ roles: [...roles], reason });
        // Update mock cache
        member.roles.cache = new Collection();
        for (const r of roles) {
          member.roles.cache.set(r, { id: r, name: `Role-${r}` });
        }
        return member;
      },
      add: async (roleOrRoles, reason) => {
        roleHistory.add.push({ roleOrRoles, reason });
        if (typeof roleOrRoles === 'string') {
          member.roles.cache.set(roleOrRoles, { id: roleOrRoles, name: `Role-${roleOrRoles}` });
        }
        return member;
      },
      remove: async (roleOrRoles, reason) => {
        roleHistory.remove.push({ roleOrRoles, reason });
        if (typeof roleOrRoles === 'string') {
          member.roles.cache.delete(roleOrRoles);
        }
        return member;
      },
    },
    roleHistory,
  };

  return member;
}

function createMockGuild(member) {
  const allRoles = new Collection();
  // Role Tù Nhân
  allRoles.set(PRISON_ROLE_ID, {
    id: PRISON_ROLE_ID,
    name: 'Tù Nhân',
    managed: false,
    editable: true,
    position: 10,
  });

  // Regular role 1
  allRoles.set('role-old-1', {
    id: 'role-old-1',
    name: 'Thành Viên Vip',
    managed: false,
    editable: true,
    position: 20,
  });

  // Regular role 2
  allRoles.set('role-old-2', {
    id: 'role-old-2',
    name: 'Hội Viên',
    managed: false,
    editable: true,
    position: 25,
  });

  // Level role (kept during prison)
  allRoles.set('1542093887726813234', {
    id: '1542093887726813234',
    name: 'Lv.1 · Luyện Khí Kỳ',
    managed: false,
    editable: true,
    position: 15,
  });

  const guild = {
    id: 'guild-999',
    roles: {
      cache: allRoles,
      fetch: async () => allRoles,
      get: (id) => allRoles.get(id),
    },
    members: {
      me: {
        roles: {
          highest: { position: 999 },
        },
      },
      fetch: async (opts) => {
        return member;
      },
      fetchMe: async () => ({
        roles: {
          highest: { position: 999 },
        },
      }),
    },
  };

  member.guild = guild;
  return guild;
}

test('releaseMember properly strips PRISON_ROLE_ID and restores original roles', async () => {
  const member = createMockGuildMember({
    id: 'prisoner-1',
    // Member currently in prison has PRISON_ROLE_ID and their kept level role
    initialRoleIds: [PRISON_ROLE_ID, '1542093887726813234'],
  });
  createMockGuild(member);

  const mockClient = {
    db: {
      get: async () => null,
      set: async () => true,
    },
  };

  const record = {
    active: true,
    userId: member.id,
    guildId: member.guild.id,
    originalRoleIds: ['role-old-1', 'role-old-2'],
    totalLabor: 10,
    remainingLabor: 0,
    reason: 'Hết án',
  };

  const released = await releaseMember(mockClient, member, record);

  // 1. Check returned record
  assert.equal(released.active, false);
  assert.equal(released.restoredRoleCount, 2);
  assert.deepEqual(released.restoredRoleNames.sort(), ['Hội Viên', 'Thành Viên Vip'].sort());

  // 2. Check roles.set was called
  assert.equal(member.roleHistory.set.length, 1);
  const setRoles = member.roleHistory.set[0].roles;

  // Crucial check: PRISON_ROLE_ID must NOT be in setRoles
  assert.ok(!setRoles.includes(PRISON_ROLE_ID), 'PRISON_ROLE_ID must NOT be in setRoles!');
  // Kept level role must be retained
  assert.ok(setRoles.includes('1542093887726813234'), 'Level role must be preserved');
  // Old roles must be restored
  assert.ok(setRoles.includes('role-old-1'), 'role-old-1 must be restored');
  assert.ok(setRoles.includes('role-old-2'), 'role-old-2 must be restored');

  // Verify final cache
  assert.ok(!member.roles.cache.has(PRISON_ROLE_ID), 'Member must no longer have prisoner role');
});

test('releaseMember fallback strips PRISON_ROLE_ID and restores roles individually if roles.set throws', async () => {
  const member = createMockGuildMember({
    id: 'prisoner-2',
    initialRoleIds: [PRISON_ROLE_ID],
  });
  createMockGuild(member);

  // Make roles.set fail to trigger fallback
  member.roles.set = async () => {
    throw new Error('Simulated Discord API 500 on set');
  };

  const mockClient = {
    db: {
      get: async () => null,
      set: async () => true,
    },
  };

  const record = {
    active: true,
    userId: member.id,
    guildId: member.guild.id,
    originalRoleIds: ['role-old-1', 'role-old-2'],
    totalLabor: 5,
    remainingLabor: 0,
  };

  const released = await releaseMember(mockClient, member, record);

  assert.equal(released.active, false);
  assert.equal(released.restoredRoleCount, 2);

  // Fallback check 1: roles.remove was called for PRISON_ROLE_ID
  const removed = member.roleHistory.remove.some(r => r.roleOrRoles === PRISON_ROLE_ID);
  assert.ok(removed, 'PRISON_ROLE_ID must be removed via roles.remove in fallback');

  // Fallback check 2: roles.add was called individually with single string IDs (not arrays)
  const addedSingleIds = member.roleHistory.add.map(a => a.roleOrRoles);
  assert.ok(addedSingleIds.includes('role-old-1'), 'role-old-1 must be added');
  assert.ok(addedSingleIds.includes('role-old-2'), 'role-old-2 must be added');
  for (const item of addedSingleIds) {
    assert.equal(typeof item, 'string', 'Fallback must add roles individually as string IDs, never arrays');
  }
});

