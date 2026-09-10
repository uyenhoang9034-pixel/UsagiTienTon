import { assertAllowlistedIdentifier } from '../../utils/sqlIdentifiers.js';
import { EXPECTED_SCHEMA_LABEL, EXPECTED_SCHEMA_VERSION } from './schemaVersion.js';

const DEFAULT_POSTGRES_DATABASE = 'usagi_tien_ton';
const DEFAULT_POSTGRES_URL = `postgresql://localhost:5432/${DEFAULT_POSTGRES_DATABASE}`;
const DEFAULT_APPLICATION_NAME = 'usagi-tien-ton';

/**
 * Runtime hiện tại chủ yếu dùng key/value qua temp_data cho Music + Tiên Lộ.
 * Các table legacy được giữ lại để schema/runtime cũ không lỗi import khi start.
 */
const configuredTables = {
  guilds: 'guilds',
  users: 'users',
  guild_users: 'guild_users',
  temp_data: 'temp_data',
  cache_data: 'cache_data',

  // Legacy compatibility tables.
  birthdays: 'birthdays',
  giveaways: 'giveaways',
  tickets: 'ticket_data',
  afk_status: 'afk_status',
  welcome_configs: 'welcome_configs',
  leveling_configs: 'leveling_configs',
  user_levels: 'user_levels',
  economy: 'economy',
  invite_tracking: 'invite_tracking',
  application_roles: 'application_roles',
  verification_audit: 'verification_audit',
};

const allowedTableIdentifiers = new Set(Object.values(configuredTables));

const validatedTables = Object.fromEntries(
  Object.entries(configuredTables).map(([key, value]) => [
    key,
    assertAllowlistedIdentifier(
      value,
      allowedTableIdentifiers,
      `PostgreSQL table identifier (${key})`,
    ),
  ]),
);

function parseInteger(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : defaultValue;
}

export function resolveSslConfig() {
  const sslEnv = process.env.POSTGRES_SSL?.toLowerCase();

  if (sslEnv === 'false' || sslEnv === '0') {
    return false;
  }

  if (sslEnv === 'true' || sslEnv === '1') {
    return { rejectUnauthorized: false };
  }

  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL || '';

  if (/sslmode=(require|verify-ca|verify-full|prefer)/i.test(url)) {
    return { rejectUnauthorized: false };
  }

  if (
    process.env.RAILWAY_ENVIRONMENT ||
    process.env.RAILWAY_PROJECT_ID ||
    process.env.NODE_ENV === 'production'
  ) {
    return { rejectUnauthorized: false };
  }

  return false;
}

function buildSharedPoolOptions() {
  return {
    max: parseInteger(process.env.POSTGRES_MAX_CONNECTIONS, 10),
    min: parseInteger(process.env.POSTGRES_MIN_CONNECTIONS, 0),
    idleTimeoutMillis: parseInteger(process.env.POSTGRES_IDLE_TIMEOUT, 30000),
    connectionTimeoutMillis: parseInteger(process.env.POSTGRES_CONNECTION_TIMEOUT, 10000),
    application_name: process.env.POSTGRES_APPLICATION_NAME || DEFAULT_APPLICATION_NAME,
    statement_timeout: process.env.NODE_ENV === 'production' ? 30000 : 0,
    keepalives: 1,
    keepalives_idle: 30,
    ssl: resolveSslConfig(),
  };
}

export function resolvePostgresPoolConfig() {
  const url = (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();
  const sharedOptions = buildSharedPoolOptions();

  if (url && url !== DEFAULT_POSTGRES_URL) {
    return {
      connectionString: url,
      ...sharedOptions,
    };
  }

  return {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInteger(process.env.POSTGRES_PORT, 5432),
    database: process.env.POSTGRES_DB || DEFAULT_POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER || 'postgres',
    password: String(process.env.POSTGRES_PASSWORD || ''),
    ...sharedOptions,
  };
}

export const pgConfig = {
  url: process.env.POSTGRES_URL || process.env.DATABASE_URL || DEFAULT_POSTGRES_URL,

  options: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInteger(process.env.POSTGRES_PORT, 5432),
    database: process.env.POSTGRES_DB || DEFAULT_POSTGRES_DATABASE,
    user: process.env.POSTGRES_USER || 'postgres',
    password: String(process.env.POSTGRES_PASSWORD || ''),
    ssl: resolveSslConfig(),

    max: parseInteger(process.env.POSTGRES_MAX_CONNECTIONS, 10),
    min: parseInteger(process.env.POSTGRES_MIN_CONNECTIONS, 0),
    idleTimeoutMillis: parseInteger(process.env.POSTGRES_IDLE_TIMEOUT, 30000),
    connectionTimeoutMillis: parseInteger(process.env.POSTGRES_CONNECTION_TIMEOUT, 10000),
    application_name: process.env.POSTGRES_APPLICATION_NAME || DEFAULT_APPLICATION_NAME,
    statement_timeout: process.env.NODE_ENV === 'production' ? 30000 : 0,
    keepalives: 1,
    keepalives_idle: 30,

    retries: parseInteger(process.env.POSTGRES_RETRIES, 3),
    backoffBase: parseInteger(process.env.POSTGRES_BACKOFF_BASE, 100),
    backoffMultiplier: parseInteger(process.env.POSTGRES_BACKOFF_MULTIPLIER, 2),
  },

  tables: validatedTables,

  defaultTTL: {
    userSession: 86400,
    temp: 3600,
    cache: 1800,
    guildConfig: null,
    music: null,
    cultivation: null,
  },

  features: {
    pooling: true,
    ssl: Boolean(resolveSslConfig()),
    metrics: true,
    debug: process.env.NODE_ENV === 'development',
    autoCreateTables: process.env.POSTGRES_AUTO_CREATE_TABLES !== 'false',
    autoMigrate: process.env.AUTO_MIGRATE !== 'false',
  },

  healthCheck: {
    enabled: true,
    interval: 30000,
    maxFailures: 3,
    query: 'SELECT 1',
  },

  migration: {
    enabled: process.env.POSTGRES_MIGRATION_ENABLED !== 'false',
    table: 'schema_migrations',
    directory: 'database/migrations',
    rollbackOnFailure: false,
    expectedVersion: EXPECTED_SCHEMA_VERSION,
    expectedLabel: EXPECTED_SCHEMA_LABEL,
  },
};

export default pgConfig;
