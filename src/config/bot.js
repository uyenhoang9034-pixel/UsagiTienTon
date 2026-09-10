import { logger } from '../utils/logger.js';

const BRAND_COLOR = '#F3AFC8';

function listEnv(name) {
  return String(process.env[name] || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export const botConfig = {
  name: 'Usagi Tiên Tôn',

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
    owners: listEnv('OWNER_IDS'),
    defaultCooldown: Number(process.env.DEFAULT_COMMAND_COOLDOWN || 3),
    deleteCommands: process.env.DELETE_COMMANDS === 'true',
    testGuildId: process.env.TEST_GUILD_ID,
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    prefix: process.env.PREFIX || '!',
  },

  embeds: {
    colors: {
      primary: BRAND_COLOR,
      secondary: '#2F3136',
      success: '#57F287',
      error: '#ED4245',
      warning: '#FEE75C',
      info: '#3498DB',
      light: '#FFFFFF',
      dark: '#202225',
      gray: '#99AAB5',
      music: BRAND_COLOR,
      cultivation: BRAND_COLOR,
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

  messages: {
    noPermission: 'Bạn không có quyền dùng lệnh này.',
    cooldownActive: 'Vui lòng chờ {time} rồi thử lại.',
    errorOccurred: 'Có lỗi xảy ra khi xử lý lệnh này.',
    missingPermissions: 'Bot đang thiếu quyền cần thiết để thực hiện thao tác này.',
    commandDisabled: 'Lệnh này đang bị tắt.',
    maintenanceMode: 'Bot đang trong chế độ bảo trì.',
  },

  features: {
    music: true,
    cultivation: true,
  },
};

const COMMAND_CATEGORY_FEATURE_MAP = {
  music: 'music',
  games: 'cultivation',
  game: 'cultivation',
  tutien: 'cultivation',
  tu_tien: 'cultivation',
  tienlo: 'cultivation',
  tien_lo: 'cultivation',
  cultivation: 'cultivation',
};

function normalizeCategoryKey(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

export function validateConfig() {
  const errors = [];

  if (process.env.NODE_ENV !== 'production') {
    logger.debug('Environment variables check:');
    logger.debug('DISCORD_TOKEN exists:', Boolean(process.env.DISCORD_TOKEN));
    logger.debug('TOKEN exists:', Boolean(process.env.TOKEN));
    logger.debug('CLIENT_ID exists:', Boolean(process.env.CLIENT_ID));
    logger.debug('NODE_ENV:', process.env.NODE_ENV || 'development');
  }

  if (!process.env.DISCORD_TOKEN && !process.env.TOKEN) {
    errors.push('Bot token is required (DISCORD_TOKEN or TOKEN environment variable).');
  }

  if (!process.env.CLIENT_ID) {
    errors.push('Client ID is required (CLIENT_ID environment variable).');
  }

  return errors;
}

const configErrors = validateConfig();

if (configErrors.length > 0) {
  logger.error('Bot configuration errors:', configErrors.join('\n'));

  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const BotConfig = botConfig;

export function getCommandPrefix() {
  return botConfig.commands.prefix || '!';
}

export function getBotOwners() {
  return botConfig.commands.owners;
}

export function isBotOwner(userId) {
  return Boolean(userId && getBotOwners().includes(String(userId)));
}

export function isMaintenanceMode() {
  return botConfig.commands.maintenanceMode === true;
}

export function getBotMessage(key, replacements = {}) {
  let message = botConfig.messages[key] || key;

  for (const [placeholder, value] of Object.entries(replacements)) {
    message = message.replace(
      new RegExp(`\\{${placeholder}\\}`, 'g'),
      String(value),
    );
  }

  return message;
}

export function isFeatureEnabled(featureKey) {
  if (!featureKey) {
    return true;
  }

  return botConfig.features[featureKey] !== false;
}

export function isCommandCategoryEnabled(category) {
  const normalized = normalizeCategoryKey(category);

  if (!normalized || normalized === 'core') {
    return true;
  }

  const featureKey = COMMAND_CATEGORY_FEATURE_MAP[normalized];

  if (!featureKey) {
    return false;
  }

  return isFeatureEnabled(featureKey);
}

export function getColor(path = 'primary', fallback = BRAND_COLOR) {
  if (typeof path === 'number') {
    return path;
  }

  if (typeof path === 'string' && path.startsWith('#')) {
    return parseInt(path.slice(1), 16);
  }

  const parts = String(path || 'primary').split('.');
  let current = botConfig.embeds.colors;

  for (const part of parts) {
    if (current?.[part] === undefined) {
      current = fallback;
      break;
    }

    current = current[part];
  }

  if (typeof current === 'string' && current.startsWith('#')) {
    return parseInt(current.slice(1), 16);
  }

  if (typeof fallback === 'string' && fallback.startsWith('#')) {
    return parseInt(fallback.slice(1), 16);
  }

  return fallback;
}

export function getRandomColor() {
  const colors = Object.values(botConfig.embeds.colors)
    .filter((color) => typeof color === 'string');

  return colors[Math.floor(Math.random() * colors.length)] || BRAND_COLOR;
}

/**
 * Compatibility helpers kept so old imports do not crash while the repo is being cleaned.
 * The application system is no longer part of this bot scope.
 */
export function getApplicationStatusColor(status) {
  if (status === 'approved') {
    return getColor('success');
  }

  if (status === 'denied') {
    return getColor('error');
  }

  return getColor('warning');
}

export function getDefaultApplicationQuestions() {
  return [];
}

export default botConfig;
