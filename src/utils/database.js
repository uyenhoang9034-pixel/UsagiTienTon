// database.js — facade hiện tại của Usagi Tiên Tôn
// Scope giữ lại: Music + Tiên Lộ / Tu Tiên.

import { pgDb } from './postgresDatabase.js';

import {
  db,
  initializeDatabase,
  getFromDb,
  setInDb,
  deleteFromDb,
} from './database/wrapper.js';

import {
  getGuildConfigKey,
  getMusicGuildKey,
  getMusicSessionKey,
  getMusicQueueKey,
  getCultivationProfileKey,
  getCultivationProfilePrefix,
  getCultivationAdventureV2SessionKey,
  getCultivationSecretRealmSessionKey,
  canonicalizeKey,
  getLegacyVariantsForCanonical,
} from './database/keys.js';

export {
  pgDb,
  db,
  initializeDatabase,
  getFromDb,
  setInDb,
  deleteFromDb,
};

export {
  getGuildConfigKey,
  getMusicGuildKey,
  getMusicSessionKey,
  getMusicQueueKey,
  getCultivationProfileKey,
  getCultivationProfilePrefix,
  getCultivationAdventureV2SessionKey,
  getCultivationSecretRealmSessionKey,
  canonicalizeKey,
  getLegacyVariantsForCanonical,
};

/**
 * Unwrap dữ liệu kiểu Replit/KV cũ nếu data còn bọc trong { ok, value }.
 * Giữ hàm này vì một vài helper cũ trong repo vẫn có thể import nó.
 */
export function unwrapReplitData(data) {
  if (
    data &&
    typeof data === 'object' &&
    Object.prototype.hasOwnProperty.call(data, 'ok') &&
    Object.prototype.hasOwnProperty.call(data, 'value')
  ) {
    return unwrapReplitData(data.value);
  }

  return data;
}

function getClientDb(client) {
  return client?.db ?? db;
}

function isDatabaseLike(database) {
  return Boolean(
    database &&
    typeof database.get === 'function' &&
    typeof database.set === 'function' &&
    typeof database.delete === 'function'
  );
}

function normalizeKey(key) {
  return typeof key === 'string' && key.length > 0
    ? canonicalizeKey(key)
    : key;
}

export function isDatabaseReady(client = null) {
  const database = getClientDb(client);

  if (!isDatabaseLike(database)) {
    return false;
  }

  if (typeof database.getStatus === 'function') {
    const status = database.getStatus();
    return Boolean(status?.initialized && !status?.isDegraded);
  }

  if (typeof database.isAvailable === 'function') {
    return Boolean(database.isAvailable());
  }

  return true;
}

export function getDatabaseStatus(client = null) {
  const database = getClientDb(client);

  if (!database) {
    return {
      initialized: false,
      connectionType: 'none',
      isDegraded: false,
      isAvailable: false,
    };
  }

  if (typeof database.getStatus === 'function') {
    return database.getStatus();
  }

  return {
    initialized: true,
    connectionType: database === pgDb ? 'postgresql' : 'custom',
    isDegraded: false,
    isAvailable:
      typeof database.isAvailable === 'function'
        ? Boolean(database.isAvailable())
        : true,
  };
}

export async function getDatabaseValue(client, key, defaultValue = null) {
  const database = getClientDb(client);

  if (!database || typeof database.get !== 'function') {
    return defaultValue;
  }

  try {
    const value = await database.get(normalizeKey(key), defaultValue);
    const unwrapped = unwrapReplitData(value);

    return unwrapped ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setDatabaseValue(client, key, value, ttl = null) {
  const database = getClientDb(client);

  if (!database || typeof database.set !== 'function') {
    return false;
  }

  try {
    return Boolean(await database.set(normalizeKey(key), value, ttl));
  } catch {
    return false;
  }
}

export async function deleteDatabaseValue(client, key) {
  const database = getClientDb(client);

  if (!database || typeof database.delete !== 'function') {
    return false;
  }

  try {
    return Boolean(await database.delete(normalizeKey(key)));
  } catch {
    return false;
  }
}

/**
 * Music helpers — dành cho dữ liệu Music cần lưu theo guild.
 */
export function getMusicKeys(guildId) {
  return {
    guild: getMusicGuildKey(guildId),
    session: getMusicSessionKey(guildId),
    queue: getMusicQueueKey(guildId),
  };
}

export async function getMusicData(client, guildId, defaultValue = {}) {
  return getDatabaseValue(
    client,
    getMusicGuildKey(guildId),
    defaultValue,
  );
}

export async function saveMusicData(client, guildId, value) {
  return setDatabaseValue(
    client,
    getMusicGuildKey(guildId),
    value,
  );
}

/**
 * Cultivation helpers — giữ key ổn định để không mất tiến độ người chơi.
 */
export function getCultivationKeys(guildId, userId) {
  return {
    profile: getCultivationProfileKey(guildId, userId),
    adventureV2Session: getCultivationAdventureV2SessionKey(guildId, userId),
    secretRealmSession: getCultivationSecretRealmSessionKey(guildId, userId),
  };
}

export async function getCultivationProfileData(
  client,
  guildId,
  userId,
  defaultValue = null,
) {
  return getDatabaseValue(
    client,
    getCultivationProfileKey(guildId, userId),
    defaultValue,
  );
}

export async function saveCultivationProfileData(client, guildId, userId, value) {
  return setDatabaseValue(
    client,
    getCultivationProfileKey(guildId, userId),
    value,
  );
}

export async function deleteCultivationProfileData(client, guildId, userId) {
  return deleteDatabaseValue(
    client,
    getCultivationProfileKey(guildId, userId),
  );
}

const DEFAULT_MESSAGES = {
  noPermission: 'Bạn không có quyền dùng lệnh này.',
  cooldownActive: 'Vui lòng chờ {time} rồi thử lại.',
  errorOccurred: 'Có lỗi xảy ra khi xử lý lệnh này.',
  missingPermissions: 'Bot đang thiếu quyền cần thiết để thực hiện thao tác này.',
  commandDisabled: 'Lệnh này đang bị tắt.',
  maintenanceMode: 'Bot đang trong chế độ bảo trì.',
};

export function getMessage(key, replacements = {}) {
  let message = DEFAULT_MESSAGES[key] || key;

  for (const [placeholder, value] of Object.entries(replacements || {})) {
    message = message.replace(
      new RegExp(`\\{${placeholder}\\}`, 'g'),
      String(value),
    );
  }

  return message;
}

const DEFAULT_COLORS = {
  primary: '#F3AFC8',
  success: '#57F287',
  error: '#ED4245',
  warning: '#FEE75C',
  info: '#3498DB',
  dark: '#202225',
  light: '#FFFFFF',
  gray: '#99AAB5',
  music: '#F3AFC8',
  cultivation: '#F3AFC8',
};

export function getColor(nameOrHex = 'primary', fallback = '#F3AFC8') {
  if (typeof nameOrHex === 'number') {
    return nameOrHex;
  }

  if (typeof nameOrHex === 'string' && /^#[0-9a-f]{6}$/i.test(nameOrHex)) {
    return parseInt(nameOrHex.slice(1), 16);
  }

  const color = DEFAULT_COLORS[nameOrHex] || fallback;

  if (typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color)) {
    return parseInt(color.slice(1), 16);
  }

  if (typeof color === 'number') {
    return color;
  }

  return parseInt('F3AFC8', 16);
}

const databaseFacade = {
  pgDb,
  db,
  initializeDatabase,
  getFromDb,
  setInDb,
  deleteFromDb,
  unwrapReplitData,
  isDatabaseReady,
  getDatabaseStatus,
  getDatabaseValue,
  setDatabaseValue,
  deleteDatabaseValue,
  getMusicKeys,
  getMusicData,
  saveMusicData,
  getCultivationKeys,
  getCultivationProfileData,
  saveCultivationProfileData,
  deleteCultivationProfileData,
  getMessage,
  getColor,
};

export default databaseFacade;
