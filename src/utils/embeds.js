// embeds.js

import { EmbedBuilder } from 'discord.js';
import { getColor } from '../config/bot.js';

const DEFAULT_COLOR = '#F3AFC8';
const DEFAULT_FOOTER = 'Usagi Tiên Tôn';

function trimText(value, maxLength) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim().slice(0, maxLength);
}

function resolveColor(color) {
  try {
    return getColor(color, DEFAULT_COLOR) || DEFAULT_COLOR;
  } catch {
    return DEFAULT_COLOR;
  }
}

function normalizeEmbedUrl(value) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (typeof value.url === 'string') {
    return value.url.trim() || null;
  }

  return null;
}

function normalizeAuthor(author) {
  if (!author) {
    return null;
  }

  if (typeof author === 'string') {
    const name = trimText(author, 256);
    return name ? { name } : null;
  }

  if (typeof author.name === 'string') {
    const name = trimText(author.name, 256);
    if (!name) return null;

    return {
      name,
      ...(author.iconURL ? { iconURL: author.iconURL } : {}),
      ...(author.url ? { url: author.url } : {}),
    };
  }

  return null;
}

function normalizeFooter(footer) {
  if (footer === false) {
    return null;
  }

  if (!footer) {
    return { text: DEFAULT_FOOTER };
  }

  if (typeof footer === 'string') {
    const text = trimText(footer, 2048);
    return text ? { text } : null;
  }

  if (typeof footer.text === 'string') {
    const text = trimText(footer.text, 2048);
    if (!text) return null;

    return {
      text,
      ...(footer.iconURL ? { iconURL: footer.iconURL } : {}),
    };
  }

  return null;
}

function normalizeFields(fields) {
  if (!Array.isArray(fields)) {
    return [];
  }

  return fields
    .filter((field) => field?.name && field?.value)
    .slice(0, 25)
    .map((field) => ({
      name: trimText(field.name, 256),
      value: trimText(field.value, 1024),
      inline: Boolean(field.inline),
    }))
    .filter((field) => field.name && field.value);
}

export function createEmbed({
  title = '',
  description = '',
  color = 'primary',
  fields = [],
  author = null,
  footer = null,
  thumbnail = null,
  image = null,
  timestamp = false,
  url = null,
} = {}) {
  const embed = new EmbedBuilder().setColor(resolveColor(color));

  const safeTitle = trimText(title, 256);
  if (safeTitle) {
    embed.setTitle(safeTitle);
  }

  const safeDescription = trimText(description, 4096);
  if (safeDescription) {
    embed.setDescription(safeDescription);
  }

  const safeFields = normalizeFields(fields);
  if (safeFields.length > 0) {
    embed.addFields(safeFields);
  }

  const safeAuthor = normalizeAuthor(author);
  if (safeAuthor) {
    embed.setAuthor(safeAuthor);
  }

  const safeFooter = normalizeFooter(footer);
  if (safeFooter) {
    embed.setFooter(safeFooter);
  }

  const safeThumbnail = normalizeEmbedUrl(thumbnail);
  if (safeThumbnail) {
    embed.setThumbnail(safeThumbnail);
  }

  const safeImage = normalizeEmbedUrl(image);
  if (safeImage) {
    embed.setImage(safeImage);
  }

  const safeUrl = normalizeEmbedUrl(url);
  if (safeUrl) {
    embed.setURL(safeUrl);
  }

  if (timestamp === true) {
    embed.setTimestamp();
  } else if (timestamp instanceof Date) {
    embed.setTimestamp(timestamp);
  }

  return embed;
}

const NOTIFICATION_DEFAULT_TITLES = {
  success: 'Success',
  error: 'Error',
  info: 'Information',
  warning: 'Warning',
  primary: 'Notice',
};

export const USER_ERROR_TITLES = {
  validation: 'Invalid Input',
  permission: 'Permission Denied',
  configuration: 'Configuration Error',
  database: 'Database Error',
  network: 'Network Error',
  discord_api: 'Discord API Error',
  user_input: 'Input Error',
  rate_limit: 'Too Fast',
  unknown: 'Something Went Wrong',
};

const USER_ERROR_COLORS = {
  rate_limit: 'warning',
};

function containsDiscordRenderable(content = '') {
  return /<@!?&?\d+>|<#\d+>|\b\d{17,19}\b/.test(String(content));
}

function buildNotificationEmbed(title, body = '', color = 'primary') {
  const defaultTitle = NOTIFICATION_DEFAULT_TITLES[color] || NOTIFICATION_DEFAULT_TITLES.primary;
  let titleText = trimText(title, 256);
  let bodyText = trimText(body, 4096);

  if (titleText && containsDiscordRenderable(titleText)) {
    bodyText = bodyText ? `${titleText}\n\n${bodyText}` : titleText;
    titleText = defaultTitle;
  }

  return createEmbed({
    title: titleText || defaultTitle,
    description: bodyText,
    color,
  });
}

export function buildUserErrorEmbed(errorType, description = '', options = {}) {
  const type = errorType || 'unknown';
  const title = options.titleOverride || USER_ERROR_TITLES[type] || USER_ERROR_TITLES.unknown;
  const color = USER_ERROR_COLORS[type] || 'error';

  return createEmbed({
    title,
    description,
    color,
  });
}

/** @deprecated Prefer buildUserErrorEmbed or replyUserError from errorHandler.js. */
export function errorEmbed(title, detail = null, options = {}) {
  const { showDetails = process.env.NODE_ENV !== 'production' } = options;
  const description =
    detail && showDetails && typeof detail !== 'string'
      ? formatCodeBlock(detail.message || String(detail))
      : detail || '';

  return buildUserErrorEmbed('unknown', description, {
    titleOverride: title && title !== 'Error' ? title : undefined,
  });
}

export function successEmbed(title, body = '') {
  return arguments.length === 1
    ? buildNotificationEmbed('Success', title, 'success')
    : buildNotificationEmbed(title || 'Success', body, 'success');
}

export function infoEmbed(title, body = '') {
  return arguments.length === 1
    ? buildNotificationEmbed('Information', title, 'info')
    : buildNotificationEmbed(title || 'Information', body, 'info');
}

export function warningEmbed(title, body = '') {
  return arguments.length === 1
    ? buildNotificationEmbed('Warning', title, 'warning')
    : buildNotificationEmbed(title || 'Warning', body, 'warning');
}

export function formatUser(user) {
  if (!user) {
    return 'Unknown User';
  }

  return `${user} (${user.tag || user.username || 'unknown'} | ${user.id || 'no-id'})`;
}

export function formatDate(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

export function formatRelativeTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export function formatCodeBlock(content, language = '') {
  return `\`\`\`${language}\n${String(content)}\n\`\`\``;
}

export function formatInlineCode(content) {
  return `\`${String(content)}\``;
}

export function formatBold(content) {
  return `**${String(content)}**`;
}

export function formatItalic(content) {
  return `*${String(content)}*`;
}

export function formatUnderline(content) {
  return `__${String(content)}__`;
}

export function formatStrikethrough(content) {
  return `~~${String(content)}~~`;
}

export function formatSpoiler(content) {
  return `||${String(content)}||`;
}

export function formatQuote(content) {
  return `> ${String(content)}`;
}

export function formatList(items, ordered = false) {
  if (!Array.isArray(items)) {
    return '';
  }

  return items
    .map((item, index) => `${ordered ? `${index + 1}.` : '•'} ${item}`)
    .join('\n');
}

export function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms <= 0) {
    return '0s';
  }

  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / (1000 * 60)) % 60;
  const hours = Math.floor(ms / (1000 * 60 * 60)) % 24;
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function formatProgressBar(current, max, size = 10) {
  const safeSize = Math.max(1, Math.min(30, Number(size) || 10));
  const safeMax = Number(max) || 0;
  const progress = safeMax > 0 ? Math.min(Math.max(0, Number(current) / safeMax), 1) : 0;
  const filled = Math.round(safeSize * progress);
  const empty = safeSize - filled;

  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(progress * 100)}%`;
}
