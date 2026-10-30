import { logger } from '../utils/logger.js';

export const PRISON_ROLE_ID = '1541818610639446066';
export const PRISON_CHANNEL_ID = '1551468471043493920';

/**
 * Danh sách toàn bộ Role ID cảnh giới / cấp độ tu vi (Level Roles).
 * Tuyệt đối bảo lưu những role này khi thành viên bị phạt tù!
 */
export const LEVEL_ROLE_IDS = new Set([
  '1542093887726813234', // Lv.1 · Luyện Khí Kỳ
  '1542094012448645202', // Lv.5 · Trúc Cơ Kỳ
  '1542094188290510958', // Lv.10 · Khai Quang Kỳ
  '1542094413361184779', // Lv.20 · Kim Đan Kỳ
  '1542094665484992522', // Lv.50 · Nguyên Anh Kỳ
  '1542236910028718160', // Lv.100 · Hóa Thần Kỳ
  '1546920260400324659', // Lv.200 · Luyện Hư Kỳ
  '1546920850656198766', // Lv.300 · Hợp Thể Kỳ
  '1546921205825536130', // Lv.500 · Đại Thừa Kỳ
  '1542215415109783642', // Lv.999 · Độ Kiếp Kỳ
  '1547187622672334918', // Lv.1999 · Chân Tiên
  '1547187688866840636', // Lv.3999 · Kim Tiên
  '1547187914729984052', // Lv.6999 · Tiên Vương
  '1547187483416993792', // Lv.9999 · Tiên Đế
]);

/**
 * Kiểm tra xem một role có phải là role cấp độ / level / tu tiên hay không.
 */
export function isLevelRole(role) {
  if (!role) return false;
  if (LEVEL_ROLE_IDS.has(role.id)) return true;
  const name = (role.name || '').trim().toLowerCase();
  return (
    /^(lv\.?|level|cấp)\s*\d+/i.test(name) ||
    /(luyện khí|trúc cơ|khai quang|kim đan|nguyên anh|hóa thần|luyện hư|hợp thể|đại thừa|độ kiếp|chân tiên|kim tiên|tiên vương|tiên đế)/i.test(name) ||
    /kỳ$|cảnh$/i.test(name)
  );
}

const keyFor = (guildId, userId) => `guild:${guildId}:prison:${userId}`;
const memoryPrisonCache = new Map();

export async function getPrisonRecord(client, guildId, userId) {
  const key = keyFor(guildId, userId);
  let record = memoryPrisonCache.get(key) || null;

  if (client?.db?.get) {
    try {
      const dbRecord = await client.db.get(key, null);
      if (dbRecord) {
        record = dbRecord;
        memoryPrisonCache.set(key, dbRecord);
      }
    } catch (e) {
      logger.debug('Lỗi khi đọc prison record từ DB:', e);
    }
  }
  return record;
}

export async function savePrisonRecord(client, guildId, userId, data) {
  const key = keyFor(guildId, userId);
  memoryPrisonCache.set(key, data);

  if (client?.db?.set) {
    try {
      await client.db.set(key, data);
    } catch (e) {
      logger.warn('[Prison] Lỗi khi lưu prison record vào DB:', e.message);
    }
  }
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

  // Lọc toàn bộ role hiện tại của thành viên (trừ @everyone)
  const currentMemberRoles = freshMember.roles.cache.filter(role => role.id !== guild.id);

  // Phân loại: Role nào cần giữ lại, role nào phải gỡ full
  const rolesToKeep = [];
  const rolesToStrip = [];

  for (const role of currentMemberRoles.values()) {
    if (role.id === PRISON_ROLE_ID) {
      continue;
    }
    // Giữ lại: Role Level + Role Managed (Discord cấm gỡ) + Role cao hơn bot (bot không quyền gỡ)
    if (isLevelRole(role) || role.managed || !role.editable) {
      rolesToKeep.push(role);
    } else {
      rolesToStrip.push(role);
    }
  }

  // Danh sách role cũ cần nhớ để phục hồi khi mãn hạn/thả tù
  const originalRoleIds = existing?.active && Array.isArray(existing.originalRoleIds) && existing.originalRoleIds.length > 0
    ? existing.originalRoleIds
    : rolesToStrip.map(r => r.id);

  // Cập nhật role trên Discord:
  if (!existing?.active) {
    const targetRoleIds = [...new Set([PRISON_ROLE_ID, ...rolesToKeep.map(r => r.id)])];

    try {
      // Dùng roles.set thay thế trong 1 API call duy nhất
      await freshMember.roles.set(targetRoleIds, `Usagi Prison: phạt tù (${reason || 'Không có lý do'})`);
    } catch (setErr) {
      logger.warn('[Prison] roles.set lỗi, fallback sang add/remove tuần tự:', setErr.message);
      if (!freshMember.roles.cache.has(PRISON_ROLE_ID)) {
        await freshMember.roles.add(PRISON_ROLE_ID, 'Usagi Prison: vào tù').catch(() => {});
      }
      if (rolesToStrip.length > 0) {
        await freshMember.roles.remove(rolesToStrip.map(r => r.id), 'Usagi Prison: phạt tù').catch(async () => {
          for (const r of rolesToStrip) {
            await freshMember.roles.remove(r.id).catch(() => {});
          }
        });
      }
    }
  } else {
    if (!freshMember.roles.cache.has(PRISON_ROLE_ID)) {
      await freshMember.roles.add(PRISON_ROLE_ID, 'Usagi Prison: vào tù').catch(() => {});
    }
  }

  const added = Math.max(1, Math.floor(Number(laborRequired) || 1));
  const totalLabor = existing?.active ? Number(existing.totalLabor || 0) + added : added;
  const remainingLabor = existing?.active ? Number(existing.remainingLabor || 0) + added : added;

  const record = {
    active: true,
    userId: member.id,
    guildId: guild.id,
    originalRoleIds,
    strippedRoleNames: rolesToStrip.map(r => r.name),
    totalLabor,
    remainingLabor,
    completedLabor: Math.max(0, totalLabor - remainingLabor),
    reason: String(reason || 'Không có lý do'),
    moderatorId,
    jailedAt: existing?.jailedAt || Date.now(),
    updatedAt: Date.now(),
  };

  return savePrisonRecord(client, guild.id, member.id, record);
}

export async function releaseMember(client, member, record) {
  const guild = member.guild;
  const botMember = guild.members.me || await guild.members.fetchMe();
  const freshMember = await guild.members.fetch(member.id).catch(() => member);

  // 1. Gỡ role Tù Nhân
  if (freshMember.roles.cache.has(PRISON_ROLE_ID)) {
    await freshMember.roles.remove(PRISON_ROLE_ID, 'Usagi Prison: mãn hạn tù').catch((err) => {
      logger.warn('[Prison] Lỗi gỡ role Tù Nhân:', err.message);
    });
  }

  // 2. Fetch toàn bộ roles trong guild để tránh cache thiếu
  const guildRoles = await guild.roles.fetch().catch(() => guild.roles.cache);

  const roleIdsToRestore = record?.originalRoleIds || [];
  const validRolesToRestore = roleIdsToRestore
    .map(id => guildRoles.get(id))
    .filter(role =>
      role &&
      role.id !== guild.id &&
      role.id !== PRISON_ROLE_ID &&
      !role.managed &&
      role.editable &&
      role.position < botMember.roles.highest.position
    );

  const restoredRoleNames = [];
  const failedRoleNames = [];

  // 3. Khôi phục lại các role cũ cho thành viên
  if (validRolesToRestore.length > 0) {
    try {
      await freshMember.roles.add(validRolesToRestore.map(r => r.id), 'Usagi Prison: khôi phục role sau mãn hạn');
      restoredRoleNames.push(...validRolesToRestore.map(r => r.name));
    } catch (batchErr) {
      logger.warn('[Prison] roles.add batch lỗi, khôi phục tuần tự từng role:', batchErr.message);
      for (const role of validRolesToRestore) {
        try {
          await freshMember.roles.add(role.id, 'Usagi Prison: khôi phục role sau mãn hạn');
          restoredRoleNames.push(role.name);
        } catch (singleErr) {
          logger.error(`[Prison] Không thể cấp lại role ${role.name} (${role.id}):`, singleErr.message);
          failedRoleNames.push(role.name);
        }
      }
    }
  }

  const released = {
    ...record,
    active: false,
    remainingLabor: 0,
    completedLabor: Number(record.totalLabor || 0),
    restoredRoleCount: restoredRoleNames.length,
    restoredRoleNames,
    failedRoleNames,
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
