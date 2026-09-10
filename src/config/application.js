import { fileURLToPath } from 'url';
import path from 'path';

import { pgConfig } from './database/postgres.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.join(__dirname, '../..');

function parseList(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
}

function parseInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const appConfig = {
  paths: {
    root: projectRoot,
    commands: path.join(__dirname, '../commands'),
    events: path.join(__dirname, '../events'),
    config: __dirname,
    utils: path.join(__dirname, '../utils'),
    services: path.join(__dirname, '../services'),
    handlers: path.join(__dirname, '../handlers'),
    interactions: path.join(__dirname, '../interactions'),
    assets: path.join(projectRoot, 'assets'),
  },

  bot: {
    token: process.env.DISCORD_TOKEN || process.env.TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID,

    presence: {
      status: process.env.BOT_STATUS || 'online',
      activities: [
        {
          name: 'Custom Status',
          state: process.env.BOT_ACTIVITY || 'stalking',
          type: 4,
        },
      ],
    },

    commands: {
      owners: parseList(process.env.OWNER_IDS),
      defaultCooldown: parseInteger(process.env.DEFAULT_COMMAND_COOLDOWN, 3),
      deleteCommands: parseBoolean(process.env.DELETE_COMMANDS, false),
      testGuildId: process.env.TEST_GUILD_ID,
      maintenanceMode: parseBoolean(process.env.MAINTENANCE_MODE, false),
      prefix: process.env.PREFIX || '!',
    },

    embeds: {
      colors: {
        primary: '#F3AFC8',
        music: '#F3AFC8',
        cultivation: '#F3AFC8',
        success: '#57F287',
        error: '#ED4245',
        warning: '#FEE75C',
        info: '#3498DB',
        dark: '#202225',
        light: '#FFFFFF',
        gray: '#99AAB5',
      },
      footer: {
        text: 'Usagi Tiên Tôn',
        icon: null,
      },
      thumbnail: null,
      author: {
        name: null,
        icon: null,
        url: null,
      },
    },
  },

  postgresql: {
    ...pgConfig,
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: {
      enabled: parseBoolean(process.env.LOG_TO_FILE, false),
      path: path.join(projectRoot, 'logs'),
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    },
    console: {
      enabled: true,
      colorize: true,
      timestamp: true,
    },
  },

  api: {
    port: parseInteger(process.env.PORT, 3000),
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || '*',
      methods: ['GET', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    },
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100,
    },
  },

  features: {
    music: true,
    cultivation: true,
  },

  env: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
};

Object.freeze(appConfig);

export default appConfig;
