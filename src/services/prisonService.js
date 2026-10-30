export const PRISON_ROLE_ID = '1541818610639446066';

export const PRISON_CHANNEL_ID = '1551468471043493920';

const keyFor = (guildId, userId) => `guild:${guildId}:prison:${userId}`;

export async function getPrisonRecord(client, guildId, userId) {
  if (!client?.db?.get) return null;
  return (await client.db.get(keyFor(guildId, userId), null)) || null;
}

async function savePrisonRecord(client, guildId, userId, data) {
  if (!client?.db?.set) throw new Error('Database client is unavailable.');
  await client.db.set(keyFor(guildId, userId), data);
  return data;
}

export async function jailMember(client, member, { laborRequired, reason, moderatorId }) {
  const guild = member.guild;
  const existing = await getPrisonRecord(client, guild.id, member.id);
  const botMember = guild.members.me || await guild.members.fetchMe();

  if (!botMember.permissions.has('ManageRoles')) {
    throw new Error('Bot cần quyền Manage Roles để phạt tù.');
  }

  const prisonRole = guild.roles.cache.get(PRISON_ROLE_ID) || await guild.roles.fetch(PRISON_ROLE_ID).catch(() => null);
  if (!prisonRole) {
    throw new Error('Không tìm thấy role Tù Nhân.');
  }
  if (!prisonRole.editable) {
    throw new Error('Bot không thể cấp role Tù Nhân. Hãy kéo role của bot lên trên role Tù Nhân.');
  }

  const freshMember = await guild.members.fetch(member.id);

  // Lấy các role cũ không phải managed và không phải prisonRole để lưu vào record
  const oldRoles = freshMember.roles.cache.filter(role =>
    role.id !== guild.id &&
    role.id !== PRISON_ROLE_ID &&
    !role.managed
  );

  const originalRoleIds = existing?.active
    ? existing.originalRoleIds || []
    : [...oldRoles.keys()];

  // Nếu là người mới vào tù:
  if (!existing?.active) {
    // Các role bot PHẢI giữ lại: role managed (ví dụ Nitro Booster) hoặc role cao hơn bot không can thiệp được
    const rolesToKeep = freshMember.roles.cache.filter(role =>
      role.id !== guild.id &&
      (role.managed || !role.editable)
    );

    // Target roles: role Tù Nhân + các role bắt buộc phải giữ lại
    const targetRoleIds = [...new Set([PRISON_ROLE_ID, ...rolesToKeep.keys()])];

    try {
      // Dùng roles.set để thay thế toàn bộ role của member trong DUY NHẤT 1 API CALL!
      // Tránh triệt để race condition và lỗi rate limit khi gỡ từng role trong vòng lặp.
      await freshMember.roles.set(targetRoleIds, `Usagi Prison: phạt tù (${reason || 'Không có lý do'})`);
    } catch (setErr) {
      // Fallback nếu roles.set gặp lỗi: Thêm role tù trước, sau đó gỡ các role có thể gỡ
      if (!freshMember.roles.cache.has(PRISON_ROLE_ID)) {
        await freshMember.roles.add(PRISON_ROLE_ID, 'Usagi Prison: vào tù').catch(() => {});
      }
      const removable = oldRoles.filter(r => r.editable);
      if (removable.size > 0) {
        await freshMember.roles.remove(removable, 'Usagi Prison: phạt tù').catch(() => {});
      }
    }
  } else {
    // Nếu phạm nhân đã ở trong tù sẵn: đảm bảo role Tù Nhân vẫn được cấp
    if (!freshMember.roles.cache.has(PRISON_ROLE_ID)) {
      await freshMember.roles.add(PRISON_ROLE_ID, 'Usagi Prison: vào tù').catch(() => {});
    }
  }

  const added = Math.max(1, Math.floor(Number(laborRequired) || 1));
  const totalLabor = existing?.active ? Number(existing.totalLabor || 0) + added : added;
  const remainingLabor = existing?.active ? Number(existing.remainingLabor || 0) + added : added;

  return savePrisonRecord(client, guild.id, member.id, {
    active: true,
    userId: member.id,
    guildId: guild.id,
    originalRoleIds,
    totalLabor,
    remainingLabor,
    completedLabor: Math.max(0, totalLabor - remainingLabor),
    reason: String(reason || 'Không có lý do'),
    moderatorId,
    jailedAt: existing?.jailedAt || Date.now(),
    updatedAt: Date.now(),
  });
}

export async function releaseMember(client, member, record) {
  const guild = member.guild;
  const botMember = guild.members.me || await guild.members.fetchMe();
  const freshMember = await guild.members.fetch(member.id).catch(() => member);

  const restorable = (record.originalRoleIds || [])
    .map(id => guild.roles.cache.get(id))
    .filter(role =>
      role &&
      role.id !== guild.id &&
      role.id !== PRISON_ROLE_ID &&
      !role.managed &&
      role.editable &&
      role.position < botMember.roles.highest.position
    )
    .map(role => role.id);

  try {
    const currentRolesWithoutPrison = freshMember.roles.cache
      .filter(r => r.id !== guild.id && r.id !== PRISON_ROLE_ID)
      .map(r => r.id);
    const newRoles = [...new Set([...currentRolesWithoutPrison, ...restorable])];
    await freshMember.roles.set(newRoles, 'Usagi Prison: mãn hạn tù');
  } catch {
    if (freshMember.roles.cache.has(PRISON_ROLE_ID)) {
      await freshMember.roles.remove(PRISON_ROLE_ID, 'Usagi Prison: mãn hạn tù').catch(() => {});
    }
    if (restorable.length > 0) {
      await freshMember.roles.add(restorable, 'Usagi Prison: khôi phục role sau mãn hạn').catch(() => {});
    }
  }

  const released = {
    ...record,
    active: false,
    remainingLabor: 0,
    completedLabor: Number(record.totalLabor || 0),
    releasedAt: Date.now(),
    updatedAt: Date.now(),
  };
  await savePrisonRecord(client, guild.id, member.id, released);
  return released;
}

export async function performLabor(client, member) {
  const record = await getPrisonRecord(client, member.guild.id, member.id);
  if (!record?.active) return { status: 'not_prisoner', record: null };

  const remaining = Math.max(0, Number(record.remainingLabor || 0) - 1);
  const total = Math.max(1, Number(record.totalLabor || 1));
  const next = {
    ...record,
    remainingLabor: remaining,
    completedLabor: total - remaining,
    updatedAt: Date.now(),
  };

  if (remaining === 0) {
    const released = await releaseMember(client, member, next);
    return { status: 'released', record: released };
  }

  await savePrisonRecord(client, member.guild.id, member.id, next);
  return { status: remaining === 1 ? 'last_one' : 'progress', record: next };
}

export function progressBar(completed, total) {
  const safeTotal = Math.max(1, Number(total || 1));
  const safeCompleted = Math.min(safeTotal, Math.max(0, Number(completed || 0)));
  const percent = Math.round((safeCompleted / safeTotal) * 100);
  const slots = 10;
  const filled = Math.round((safeCompleted / safeTotal) * slots);
  return `${'█'.repeat(filled)}${'░'.repeat(slots - filled)} ${percent}%`;
}
