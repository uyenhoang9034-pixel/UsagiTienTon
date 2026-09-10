import { pgDb } from '../postgresDatabase.js';
import { MemoryStorage } from '../memoryStorage.js';
import { logger } from '../logger.js';

/**
 * Database wrapper hiện tại của Usagi Tiên Tôn.
 *
 * Scope giữ lại:
 * - Music
 * - Tiên Lộ / Tu Tiên
 *
 * Không import guild config schema cũ nữa để tránh kéo lại các hệ đã xóa
 * như Ticket / Economy / Welcome / Verification.
 */
class DatabaseWrapper {
  constructor() {
    this.initialized = false;
    this.db = null;
    this.useFallback = false;
    this.connectionType = 'none';
    this.degradedModeWarningShown = false;
    this.degradedReason = null;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      logger.info('Attempting to connect to PostgreSQL...');

      const pgConnected = await pgDb.connect();

      if (pgConnected) {
        this.db = pgDb;
        this.useFallback = false;
        this.connectionType = 'postgresql';
        this.degradedReason = null;
        this.degradedModeWarningShown = false;
        this.initialized = true;

        logger.info('✅ PostgreSQL Database initialized - using persistent database');
        return;
      }

      const pgFailure = pgDb.getLastFailure?.();

      if (pgFailure?.reason === 'SCHEMA_VERSION_MISMATCH') {
        const schemaError = new Error(
          `Schema version mismatch detected (${pgFailure.message}). Run migrations before startup.`,
        );
        schemaError.code = 'SCHEMA_VERSION_MISMATCH';
        throw schemaError;
      }

      logger.warn('PostgreSQL connect returned false.');
    } catch (error) {
      logger.warn('PostgreSQL connection failed:', error.message);

      if (error.code === 'SCHEMA_VERSION_MISMATCH') {
        throw error;
      }
    }

    /**
     * Tiên Lộ có tiến độ người chơi nên mặc định KHÔNG cho chạy bằng memory.
     * Chỉ bật tạm bằng ALLOW_MEMORY_DATABASE=true khi test local.
     */
    if (process.env.ALLOW_MEMORY_DATABASE !== 'true') {
      throw new Error(
        'PostgreSQL unavailable. Refusing to start with temporary storage because Tiên Lộ progress must persist.',
      );
    }

    this.db = new MemoryStorage();
    this.useFallback = true;
    this.connectionType = 'memory';
    this.degradedReason = 'POSTGRES_UNAVAILABLE';
    this.initialized = true;
    this.degradedModeWarningShown = true;

    logger.warn('⚠️ DATABASE DEGRADED MODE ENABLED - Using in-memory storage. Data will be lost on restart.');
    logger.warn('⚠️ Please check PostgreSQL connection and restart the bot when fixed.');
  }

  ensureReady(operation = 'database operation') {
    if (!this.initialized || !this.db) {
      throw new Error(`Database is not initialized; cannot run ${operation}.`);
    }
  }

  async get(key, defaultValue = null) {
    this.ensureReady('get');
    return this.db.get(key, defaultValue);
  }

  async set(key, value, ttl = null) {
    this.ensureReady('set');

    if (this.useFallback) {
      logger.debug(`[DEGRADED] Writing to memory: ${key}`);
    }

    return this.db.set(key, value, ttl);
  }

  async delete(key) {
    this.ensureReady('delete');

    if (this.useFallback) {
      logger.debug(`[DEGRADED] Deleting from memory: ${key}`);
    }

    return this.db.delete(key);
  }

  async list(prefix) {
    this.ensureReady('list');

    if (typeof this.db.list !== 'function') {
      return [];
    }

    return this.db.list(prefix);
  }

  async exists(key) {
    this.ensureReady('exists');

    if (typeof this.db.exists === 'function') {
      return this.db.exists(key);
    }

    const value = await this.db.get(key, null);
    return value !== null && value !== undefined;
  }

  async increment(key, amount = 1) {
    this.ensureReady('increment');

    if (this.useFallback) {
      logger.debug(`[DEGRADED] Incrementing in memory: ${key}`);
    }

    if (typeof this.db.increment === 'function') {
      return this.db.increment(key, amount);
    }

    const current = Number(await this.db.get(key, 0)) || 0;
    const nextValue = current + amount;
    await this.db.set(key, nextValue);
    return nextValue;
  }

  async decrement(key, amount = 1) {
    this.ensureReady('decrement');

    if (this.useFallback) {
      logger.debug(`[DEGRADED] Decrementing in memory: ${key}`);
    }

    if (typeof this.db.decrement === 'function') {
      return this.db.decrement(key, amount);
    }

    const current = Number(await this.db.get(key, 0)) || 0;
    const nextValue = current - amount;
    await this.db.set(key, nextValue);
    return nextValue;
  }

  isDegraded() {
    return this.useFallback;
  }

  isAvailable() {
    return Boolean(this.initialized && this.db && !this.useFallback);
  }

  getStatus() {
    return {
      initialized: this.initialized,
      connectionType: this.connectionType,
      isDegraded: this.useFallback,
      isAvailable: this.isAvailable(),
      degradedReason: this.degradedReason,
    };
  }

  getConnectionType() {
    return this.connectionType;
  }
}

export const db = new DatabaseWrapper();

export async function initializeDatabase() {
  logger.info('Initializing Database (PostgreSQL required for Tiên Lộ persistence)...');

  try {
    await db.initialize();

    if (!db.initialized || !db.db) {
      throw new Error('Database wrapper finished without an active database connection.');
    }

    logger.info(`✅ Database initialized (${db.getConnectionType()})`);
    return { db };
  } catch (error) {
    logger.error('❌ Database Initialization Error:', error);
    throw error;
  }
}

export async function getFromDb(key, defaultValue = null) {
  try {
    const value = await db.get(key, defaultValue);
    return value ?? defaultValue;
  } catch (error) {
    logger.error(`Error getting value for key ${key}:`, error);
    return defaultValue;
  }
}

export async function setInDb(key, value, ttl = null) {
  try {
    return Boolean(await db.set(key, value, ttl));
  } catch (error) {
    logger.error(`Error setting value for key ${key}:`, error);
    return false;
  }
}

export async function deleteFromDb(key) {
  try {
    return Boolean(await db.delete(key));
  } catch (error) {
    logger.error(`Error deleting key ${key}:`, error);
    return false;
  }
}

export default db;
