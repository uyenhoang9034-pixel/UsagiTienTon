import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';
import { ACHIEVEMENT_CATEGORIES } from './cultivationAchievement.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';
const ACHIEVEMENT_BUTTON = '<:ttthanhtuu:1548967680520888350>';
const ACHIEVEMENT_CONTENT = '<a:ttthanhtuu:1548968145350561842>';
const COMPLETE = '<:hachiware5:1546024887028817930>';
const INCOMPLETE = '<:hachiware6:1546024926119596123>';
const CHEST = '<a:ttruongco:1547493008914653245>';
const TITLE_POINT = '<a:trangtrig45:1547239010190237819>';
const JOURNEY = '<a:ttnhiemvu:1547682200961556510>';
const SEPARATOR = '⋆༺𓆩☠︎︎𓆪༻⋆';

function parseEmoji(value) {
  const match = String(value || '').match(/^<(a?):([^:]+):(\d+)>$/);
  if (!match) return null;
  return {
    id: match[3],
    name: match[2],
    animated: match[1] === 'a',
  };
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function applyStyle(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });
  if (CULTIVATION_CONFIG.ui.image) embed.setImage(CULTIVATION_CONFIG.ui.image);
  return embed;
}

function progressBar(current, target, size = 10) {
  const safeTarget = Math.max(1, Number(target) || 1);
  const ratio = Math.max(0, Math.min(1, (Number(current) || 0) / safeTarget));
  const filled = Math.round(ratio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

function title(text) {
  return `${TITLE_LEFT} **${text}** ${TITLE_RIGHT}`;
}

function getRequirementText(item) {
  switch (item.metric) {
    case 'cultivateCount':
      return `Tu Luyện **${number(item.target)} lần**.`;
    case 'breakthroughSuccess':
      return `Đột Phá thành công **${number(item.target)} lần**.`;
    case 'adventureCount':
      return `Hoàn thành Thám Hiểm **${number(item.target)} lần**.`;
    case 'alchemySuccess':
      return `Luyện Đan thành công **${number(item.target)} lần**.`;
    case 'forgeSuccess':
      return `Luyện Khí thành công **${number(item.target)} lần**.`;
    case 'petOwnedCount':
      return `Sở hữu **${number(item.target)} Linh Thú khác nhau**.`;
    case 'petCollectionComplete':
      return 'Thu phục **toàn bộ Linh Thú** trong Bộ Sưu Tập.';
    case 'formationMaxLevel':
      return `Nâng một Trận Đồ đạt **Lv.${number(item.target)}**.`;
    case 'formationAllPartsMax':
      return 'Đưa **Trận Đồ + toàn bộ Trận Vị + Trận Nhãn + Trận Tâm** của cùng một trận lên **Lv.100**.';
    case 'highestSpiritStones':
      return `Từng sở hữu ít nhất **${number(item.target)} Linh Thạch** cùng lúc.`;
    case 'worldBossAttacks':
      return `Khiêu chiến Thế Giới Boss **${number(item.target)} lượt**.`;
    case 'worldBossKills':
      return `Tham gia **${number(item.target)} lần trảm sát Yêu Vương**.`;
    case 'worldBossBestHit':
      return `Gây ít nhất **${number(item.target)} sát thương trong một đòn** lên Yêu Vương.`;
    case 'worldBossTop1':
      return `Đạt **Top 1 đóng góp** trong Thế Giới Boss **${number(item.target)} lần**.`;
    case 'achievementCompleted':
      return `Hoàn thành **${number(item.target)} thành tựu** khác.`;
    default:
      return `Đạt tiến độ **${number(item.target)}**.`;
  }
}

function categorySelector(ownerId, selected = null) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`tutien_achievement_category:${ownerId}`)
    .setPlaceholder('Chọn một mục Thành Tựu · Tiên Đồ')
    .addOptions(
      Object.entries(ACHIEVEMENT_CATEGORIES).map(([value, label]) => ({
        label,
        value,
        default: value === selected,
      })),
    );

  return new ActionRowBuilder().addComponents(menu);
}

function backRow(ownerId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tutien_achievement:${ownerId}:main`)
      .setLabel('Thành Tựu')
      .setEmoji(parseEmoji(ACHIEVEMENT_BUTTON))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tutien_achievement:${ownerId}:titles`)
      .setLabel('Danh Hiệu')
      .setEmoji(parseEmoji(TITLE_POINT))
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tutien_achievement:${ownerId}:dashboard`)
      .setLabel('Quay lại Tiên Lộ')
      .setEmoji(parseEmoji(JOURNEY))
      .setStyle(ButtonStyle.Secondary),
  );
}

export function buildAchievementMainEmbed(user, snapshot, notice = null) {
  const total = snapshot.achievements.length;
  const claimable = snapshot.achievements.filter(
    item => item.completed && !item.claimed,
  ).length;

  const lines = [
    `${ACHIEVEMENT_CONTENT} **THÀNH TỰU · TIÊN ĐỒ**`,
    '',
    `Đạo hữu: <@${user.id}>`,
    '',
    `${COMPLETE} Hoàn thành: **${snapshot.completed} / ${total}**`,
    `${CHEST} Có thể nhận thưởng: **${claimable}**`,
    `${TITLE_POINT} Điểm Thành Tựu: **${number(snapshot.points)}**`,
    `${TITLE_POINT} Danh hiệu đã mở: **${snapshot.state.titles.unlocked.length}**`,
    '',
    SEPARATOR,
    '',
    'Những thành tựu có thể tính từ **dữ liệu Tiên Lộ đã tồn tại trước khi hệ thống này mở**.',
    'Mỗi phần thưởng chỉ có thể nhận **một lần duy nhất**.',
  ];

  if (notice) lines.push('', SEPARATOR, '', notice);

  return applyStyle(
    new EmbedBuilder()
      .setTitle(title('THÀNH TỰU · TIÊN ĐỒ'))
      .setDescription(lines.join('\n')),
  );
}

export function buildAchievementMainRows(ownerId) {
  return [categorySelector(ownerId), backRow(ownerId)];
}

export function buildAchievementCategoryEmbed(user, snapshot, category, notice = null) {
  const label = ACHIEVEMENT_CATEGORIES[category] || 'Thành Tựu';
  const items = snapshot.achievements.filter(item => item.category === category);

  const blocks = items.map(item => {
    const status = item.completed ? COMPLETE : INCOMPLETE;
    const claimed = item.claimed ? ' · **Đã nhận**' : '';
    const titleLine = item.title
      ? `\n${TITLE_POINT} Danh hiệu: **「 ${item.title} 」**`
      : '';

    return [
      `${status} **${item.name}**${claimed}`,
      `◈ Yêu cầu: ${getRequirementText(item)}`,
      `\`${progressBar(item.current, item.target)} ${number(Math.min(item.current, item.target))} / ${number(item.target)}\``,
      `${CHEST} ${number(item.reward)} Linh Thạch · ${TITLE_POINT} ${number(item.points)} điểm${titleLine}`,
    ].join('\n');
  });

  const lines = [
    `${ACHIEVEMENT_CONTENT} **${label.toUpperCase()}**`,
    '',
    `Đạo hữu: <@${user.id}>`,
    '',
    ...blocks.flatMap((block, index) =>
      index === blocks.length - 1 ? [block] : [block, '']),
  ];

  if (notice) lines.push('', SEPARATOR, '', notice);

  return applyStyle(
    new EmbedBuilder()
      .setTitle(title(`THÀNH TỰU · ${label.toUpperCase()}`))
      .setDescription(lines.join('\n').slice(0, 4096)),
  );
}

export function buildAchievementCategoryRows(ownerId, snapshot, category) {
  const rows = [categorySelector(ownerId, category)];
  const claimable = snapshot.achievements.filter(
    item => item.category === category && item.completed && !item.claimed,
  );

  for (let index = 0; index < claimable.length; index += 5) {
    const slice = claimable.slice(index, index + 5);
    rows.push(
      new ActionRowBuilder().addComponents(
        ...slice.map(item =>
          new ButtonBuilder()
            .setCustomId(`tutien_achievement:${ownerId}:claim:${item.id}`)
            .setLabel(item.name.slice(0, 80))
            .setEmoji(parseEmoji(CHEST))
            .setStyle(ButtonStyle.Secondary),
        ),
      ),
    );
  }

  rows.push(backRow(ownerId));
  return rows.slice(0, 5);
}

export function buildAchievementTitlesEmbed(user, snapshot, notice = null) {
  const unlocked = snapshot.state.titles.unlocked;
  const equipped = snapshot.state.titles.equipped;

  const lines = [
    `${TITLE_POINT} **DANH HIỆU TIÊN ĐỒ**`,
    '',
    `Đạo hữu: <@${user.id}>`,
    `${TITLE_POINT} Đang sử dụng: ${equipped ? `**「 ${equipped} 」**` : '*Chưa trang bị*'}`,
    '',
    SEPARATOR,
    '',
    unlocked.length > 0
      ? unlocked.map(name => `${name === equipped ? COMPLETE : TITLE_POINT} **「 ${name} 」**`).join('\n')
      : '*Chưa mở khóa danh hiệu nào.*',
  ];

  if (notice) lines.push('', SEPARATOR, '', notice);

  return applyStyle(
    new EmbedBuilder()
      .setTitle(title('DANH HIỆU · TIÊN ĐỒ'))
      .setDescription(lines.join('\n').slice(0, 4096)),
  );
}

export function buildAchievementTitlesRows(ownerId, snapshot) {
  const rows = [];
  const titles = snapshot.state.titles.unlocked.slice(0, 25);

  if (titles.length > 0) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`tutien_achievement_title:${ownerId}`)
          .setPlaceholder('Chọn danh hiệu muốn trang bị')
          .addOptions(
            titles.map(name => ({
              label: name.slice(0, 100),
              value: name.slice(0, 100),
              default: name === snapshot.state.titles.equipped,
            })),
          ),
      ),
    );
  }

  rows.push(backRow(ownerId));
  return rows;
}

export function getAchievementDashboardButton(ownerId) {
  return new ButtonBuilder()
    .setCustomId(`tutien_achievement:${ownerId}:main`)
    .setLabel('Thành Tựu')
    .setEmoji(parseEmoji(ACHIEVEMENT_BUTTON))
    .setStyle(ButtonStyle.Secondary);
}
