import { PermissionFlagsBits } from 'discord.js';
import { isBotOwner } from '../../config/bot.js';
import {
  TTS_DEFAULT_GUILD_CONFIG,
  TTS_MANAGER_ROLE_ID,
  isTTSEnabledByEnv,
} from '../../config/ttsConfig.js';
import {
  getDatabaseValue,
  isDatabaseReady,
  setDatabaseValue,
} from '../../utils/database.js';
import { getTTSGuildConfigKey } from '../../utils/database/keys.js';
import { logger } from '../../utils/logger.js';

export { TTS_MANAGER_ROLE_ID };

const DEFAULT_CACHE_SCOPE = Symbol('tts_default_cache_scope');
const scopedConfigCaches = new WeakMap();
let defaultScopeCache = new Map();
const guildOperationQueues = new Map();

function getScopeCache(client = null) {
  const scope = client?.db && typeof client.db === 'object' ? client.db : null;
  if (!scope) {
    return defaultScopeCache;
  }

  let cache = scopedConfigCaches.get(scope);
  if (!cache) {
    cache = new Map();
    scopedConfigCaches.set(scope, cache);
  }
  return cache;
}

export function clearTTSStateCache(client = null) {
  if (client?.db && typeof client.db === 'object') {
    scopedConfigCaches.delete(client.db);
    return;
  }
  defaultScopeCache = new Map();
}

export function withTTSGuildLock(guildId, fn) {
  const key = String(guildId || DEFAULT_CACHE_SCOPE.description);
  const previous = guildOperationQueues.get(key) || Promise.resolve();
  const next = previous.then(fn, fn);
  const cleanup = next.then(
    () => {
      if (guildOperationQueues.get(key) === cleanup) {
        guildOperationQueues.delete(key);
      }
    },
    () => {
      if (guildOperationQueues.get(key) === cleanup) {
        guildOperationQueues.delete(key);
      }
    },
  );
  guildOperationQueues.set(key, cleanup);
  return next;
}

/**
 * Kiểm tra người dùng có quyền Quản lý TTS hay không:
 * - Bot Owner (OWNER_IDS)
 * - Chủ máy chủ (Server Owner)
 * - Quyền Administrator hoặc ManageGuild
 * - Role ID 1545305594712432640
 * - Role có tên Admin / Administrator / Quản lý / Quản trị viên
 */
export function hasTTSManagePermission(
  member,
  userId = null,
  guild = null,
  memberPermissions = null,
) {
  const uid = String(userId || member?.id || member?.user?.id || '');
  if (uid && isBotOwner(uid)) {
    return true;
  }

  const targetGuild = guild || member?.guild;
  if (uid && targetGuild?.ownerId && String(targetGuild.ownerId) === uid) {
    return true;
  }

  const perms = memberPermissions || member?.permissions;
  if (perms?.has?.(PermissionFlagsBits.Administrator)) {
    return true;
  }
  if (perms?.has?.(PermissionFlagsBits.ManageGuild)) {
    return true;
  }

  if (!member) {
    return false;
  }

  if (member.roles?.cache?.has?.(TTS_MANAGER_ROLE_ID)) {
    return true;
  }
  if (Array.isArray(member.roles) && member.roles.includes(TTS_MANAGER_ROLE_ID)) {
    return true;
  }
  if (Array.isArray(member._roles) && member._roles.includes(TTS_MANAGER_ROLE_ID)) {
    return true;
  }

  const hasAdminRole = member.roles?.cache?.some?.((r) =>
    /^(admin|administrator|quản lý|quản trị viên|quan ly|quan tri vien)$/i.test(r.name?.trim()),
  );
  if (hasAdminRole) {
    return true;
  }

  return false;
}

export function normalizeTTSGuildConfig(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ...TTS_DEFAULT_GUILD_CONFIG };
  }

  return {
    enabled: raw.enabled !== false,
    updatedBy: raw.updatedBy ? String(raw.updatedBy) : null,
    updatedAt: Number.isFinite(Number(raw.updatedAt)) ? Number(raw.updatedAt) : null,
    reason: raw.reason ? String(raw.reason).trim().slice(0, 300) : null,
  };
}

export async function getTTSGuildConfig(client, guildId) {
  if (!guildId) {
    return { ...TTS_DEFAULT_GUILD_CONFIG };
  }

  const key = String(guildId);
  const cache = getScopeCache(client);
  if (cache.has(key)) {
    return { ...cache.get(key) };
  }

  const raw = await getDatabaseValue(client, getTTSGuildConfigKey(key), null);
  const normalized = normalizeTTSGuildConfig(raw);

  if (raw !== null || typeof client?.db?.get === 'function' || isDatabaseReady(client)) {
    cache.set(key, normalized);
  }

  return { ...normalized };
}

export async function isTTSGuildEnabled(client, guildId) {
  if (!isTTSEnabledByEnv()) {
    return false;
  }

  if (!guildId) {
    return true;
  }

  const config = await getTTSGuildConfig(client, guildId);
  return config.enabled !== false;
}

export async function setTTSGuildEnabled(
  client,
  guildId,
  enabled,
  { updatedBy = null, reason = null } = {},
) {
  if (!guildId) {
    throw new Error('Thiếu guildId để lưu cấu hình TTS.');
  }

  const key = String(guildId);
  return withTTSGuildLock(key, async () => {
    const nextConfig = normalizeTTSGuildConfig({
      enabled: Boolean(enabled),
      updatedBy: updatedBy ? String(updatedBy) : null,
      updatedAt: Date.now(),
      reason: enabled ? null : reason || null,
    });

    const persisted = await setDatabaseValue(
      client,
      getTTSGuildConfigKey(key),
      nextConfig,
    );

    if (!persisted) {
      logger.warn(`[TTS] Không thể lưu cấu hình TTS (enabled=${nextConfig.enabled}) cho guild ${key} vào DB.`);
    }

    const cache = getScopeCache(client);
    cache.set(key, nextConfig);

    return {
      ...nextConfig,
      persisted: Boolean(persisted),
    };
  });
}

export function getTTSDisabledNoticeMessage(guildConfig = null) {
  if (!isTTSEnabledByEnv()) {
    return (
      '💤 Dạ vợ của Kim Nong ơi, tính năng nói thay (TTS) hiện đang **TẮT TRIỆT ĐỂ** ở cấp hệ thống (`ENABLE_TTS=false`) để tiết kiệm RAM ạ!\n' +
      '• Khi nào cần dùng lại, chỉ cần đổi `ENABLE_TTS=true` rồi khởi động lại bot nha 💕'
    );
  }

  const reasonLine = guildConfig?.reason ? `\n• **Lý do:** ${guildConfig.reason}` : '';
  return (
    `💤 Dạ vợ của Kim Nong ơi, tính năng nói thay (TTS) hiện đang được **TẮT** trong máy chủ này để tiết kiệm RAM ạ!${reasonLine}\n` +
    '• Quản lý có thể gõ `/tts-admin bat` để bật lại bất cứ lúc nào nha 💕'
  );
}

export function getProcessMemoryStats() {
  const mem = process.memoryUsage();
  const toMB = (bytes) => Number((bytes / 1024 / 1024).toFixed(1));
  return {
    heapUsedMB: toMB(mem.heapUsed),
    heapTotalMB: toMB(mem.heapTotal),
    rssMB: toMB(mem.rss),
    externalMB: toMB(mem.external),
  };
}

