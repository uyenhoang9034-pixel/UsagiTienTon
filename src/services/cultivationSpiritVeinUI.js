import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';
const SPIRIT_STONE = CULTIVATION_CONFIG.ui.emojis.spiritStone;
const SEPARATOR = '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function title(label) {
  return `${TITLE_LEFT} ${label} ${TITLE_RIGHT}`;
}

function style(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });

  if (CULTIVATION_CONFIG.ui.image) {
    embed.setImage(CULTIVATION_CONFIG.ui.image);
  }

  return embed;
}

function parseEmoji(emoji) {
  const match = String(emoji || '').match(/^<(a?):([^:]+):(\d+)>$/);

  if (!match) return null;

  return {
    id: match[3],
    name: match[2],
    animated: match[1] === 'a',
  };
}

function progressBar(ratio, size = 10) {
  const safeRatio = Math.max(0, Math.min(1, Number(ratio) || 0));
  const filled = Math.round(safeRatio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, size - filled))}`;
}

function duration(ms) {
  const totalMinutes = Math.max(0, Math.ceil((Number(ms) || 0) / 60_000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours} giờ ${minutes} phút`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
}

function veinButton(ownerId, action, label, styleType = ButtonStyle.Secondary) {
  const component = new ButtonBuilder()
    .setCustomId(`tutien_spirit_vein:${ownerId}:${action}`)
    .setLabel(label)
    .setStyle(styleType);

  const emoji = parseEmoji(SPIRIT_STONE);
  if (emoji) component.setEmoji(emoji);

  return component;
}

export function appendSpiritVeinButton(rows, ownerId) {
  const cloned = [...rows];
  let target = cloned[2];

  if (!target || target.components.length >= 5) {
    target = new ActionRowBuilder();
    cloned.push(target);
  }

  target.addComponents(
    veinButton(ownerId, 'main', 'Linh Mạch'),
  );

  return cloned;
}

export function buildSpiritVeinEmbed(user, snapshot, notice = null) {
  const {
    profile,
    state,
    config,
    next,
    fillRatio,
    timeUntilFullMs,
    isFull,
    isMaxLevel,
    requiredRealmName,
  } = snapshot;

  const lines = [
    '*Linh mạch ẩn dưới tiên sơn, nhật nguyệt luân chuyển, linh khí tự kết thành thạch.*',
    '',
    `${SPIRIT_STONE} **Linh Mạch:** Lv.${state.level}`,
    `${SPIRIT_STONE} **Sản lượng:** ${number(config.productionPerHour)} / giờ`,
    `${SPIRIT_STONE} **Đã kết:** ${number(state.stored)} / ${number(config.capacity)}`,
    isFull
      ? '⏳ **Trạng thái:** Linh Mạch đã đầy, đang ngừng kết tinh.'
      : `⏳ **Thời gian đến đầy:** ${duration(timeUntilFullMs)}`,
    '',
    `\`${progressBar(fillRatio)}\` **${Math.round(fillRatio * 100)}%**`,
    '',
    SEPARATOR,
    '',
    `${SPIRIT_STONE} **Linh Thạch đang có:** ${number(profile.spiritStones)}`,
  ];

  if (!isMaxLevel && next) {
    lines.push(
      '',
      `**Nâng lên Lv.${next.level}**`,
      `${SPIRIT_STONE} Chi phí: **${number(next.upgradeCost)} Linh Thạch**`,
      `◈ Yêu cầu cảnh giới: **${requiredRealmName} trở lên**`,
      `◈ Sản lượng mới: **${number(next.productionPerHour)} / giờ**`,
      `◈ Sức chứa mới: **${number(next.capacity)}**`,
    );
  } else {
    lines.push('', '✦ **Linh Mạch đã đạt Lv.10 tối đa.**');
  }

  if (notice) {
    lines.push('', SEPARATOR, '', notice);
  }

  lines.push(
    '',
    '*Linh Mạch vẫn âm thầm vận chuyển khi đạo hữu rời Tiên Lộ. Kho đầy thì sẽ ngừng sản sinh cho đến khi được thu hoạch.*',
    '',
    `**Đạo hữu:** <@${user.id}>`,
  );

  return style(
    new EmbedBuilder()
      .setTitle(title('𝓛𝓲𝓷𝓱 𝓜𝓪̣𝓬𝓱 · 灵脉'))
      .setDescription(lines.join('\n')),
  );
}

export function buildSpiritVeinRows(ownerId, snapshot) {
  const collect = veinButton(
    ownerId,
    'collect',
    'Thu Hoạch',
    ButtonStyle.Success,
  ).setDisabled((Number(snapshot.state?.stored) || 0) <= 0);

  const upgrade = veinButton(
    ownerId,
    'upgrade',
    snapshot.isMaxLevel ? 'Đã Tối Đa' : 'Nâng Linh Mạch',
    ButtonStyle.Secondary,
  ).setDisabled(Boolean(snapshot.isMaxLevel));

  const dashboard = veinButton(
    ownerId,
    'dashboard',
    'Quay lại Tiên Lộ',
    ButtonStyle.Secondary,
  );

  return [
    new ActionRowBuilder().addComponents(
      collect,
      upgrade,
      dashboard,
    ),
  ];
}

export function buildSpiritVeinNotice(result) {
  if (result.ok && result.collected > 0) {
    return `${SPIRIT_STONE} **Thu hoạch thành công:** +${number(result.collected)} Linh Thạch.`;
  }

  if (result.ok && result.upgradeCost) {
    return `${SPIRIT_STONE} **Linh Mạch đã thăng lên Lv.${result.state.level}.**\nĐã tiêu **${number(result.upgradeCost)} Linh Thạch**.`;
  }

  if (result.reason === 'nothing_to_collect') {
    return '*Linh Mạch chưa kết đủ Linh Thạch để thu hoạch.*';
  }

  if (result.reason === 'realm_too_low') {
    return `*Cảnh giới chưa đủ. Cần đạt **${result.requiredRealmName} trở lên** để nâng Linh Mạch tiếp theo.*`;
  }

  if (result.reason === 'not_enough_stones') {
    return `${SPIRIT_STONE} *Linh Thạch chưa đủ để nâng Linh Mạch.*`;
  }

  if (result.reason === 'max_level') {
    return '*Linh Mạch đã đạt cấp tối đa.*';
  }

  return null;
}

export function getSpiritVeinDashboardEmoji() {
  return parseEmoji(SPIRIT_STONE);
}
