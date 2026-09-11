import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import {
  FORMATION_TRIBULATIONS,
} from './cultivationFormationTribulation.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';
const TRIBULATION_EMOJI = '<a:ttloi:1547835063406698496>';
const FORMATION_EMOJI_ID = '1547820164291240076';
const LIGHTNING_EMOJI_ID = '1547835063406698496';

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

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function button(ownerId, action, label, emoji = LIGHTNING_EMOJI_ID) {
  return new ButtonBuilder()
    .setCustomId(`tutien_formation:${ownerId}:${action}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary);
}

export function appendFormationTribulationRow(rows, ownerId) {
  return [
    ...rows,
    new ActionRowBuilder().addComponents(
      button(
        ownerId,
        'tribulation',
        'Trận Kiếp',
      ),
    ),
  ];
}

export function buildFormationTribulationListEmbed() {
  const lines = Object.values(FORMATION_TRIBULATIONS).map(
    (tribulation) => [
      `${TRIBULATION_EMOJI} **${tribulation.name}** · Kiếp cấp ${tribulation.difficulty}`,
      `• Trận Đồ tương ứng: **${tribulation.recommendedFormationId}**`,
      `• ${tribulation.description}`,
    ].join('\n'),
  );

  return style(
    new EmbedBuilder()
      .setTitle(title('Trận Kiếp'))
      .setDescription([
        `${TRIBULATION_EMOJI} **Thiên Kiếp giáng thế · Trận Đạo nghịch thiên**`,
        '',
        ...lines.flatMap((line) => [line, '']),
        '*Chọn một Kiếp để xem tỷ lệ ứng kiếp với Trận Đồ hiện tại.*',
      ].join('\n')),
  );
}

export function buildFormationTribulationRows(ownerId) {
  const values = Object.values(FORMATION_TRIBULATIONS);

  return [
    new ActionRowBuilder().addComponents(
      ...values.slice(0, 3).map((tribulation) =>
        button(
          ownerId,
          `tribulation_preview:${tribulation.id}`,
          tribulation.name,
        ),
      ),
    ),
    new ActionRowBuilder().addComponents(
      ...values.slice(3).map((tribulation) =>
        button(
          ownerId,
          `tribulation_preview:${tribulation.id}`,
          tribulation.name,
        ),
      ),
      button(
        ownerId,
        'main',
        'Trận Pháp',
        FORMATION_EMOJI_ID,
      ),
    ),
  ];
}

export function buildFormationTribulationPreviewEmbed(result) {
  if (!result?.ok) {
    return style(
      new EmbedBuilder()
        .setTitle(title('Trận Kiếp'))
        .setDescription('Không thể quan trắc Trận Kiếp này.'),
    );
  }

  const {
    tribulation,
    formation,
    formationMatch,
    formationLevel,
    averageSlotLevel,
    eye,
    gameplayBonus,
    bonuses,
    winChance,
  } = result;

  const recommended = formationMatch
    ? '✅ **Trận Đồ tương hợp**'
    : '⚠️ **Trận Đồ không tương hợp**';

  const spiritLine = gameplayBonus?.spiritSynergy?.active
    ? `• Trận Linh: **+${percent(bonuses.spiritSynergyBonus)}**`
    : '• Trận Linh: **Không kích hoạt**';

  return style(
    new EmbedBuilder()
      .setTitle(title(tribulation.name))
      .setDescription([
        `${TRIBULATION_EMOJI} **Kiếp cấp ${tribulation.difficulty}**`,
        `*${tribulation.description}*`,
        '',
        `<a:ttrando:1547820131889979464> **Trận Đồ:** ${formation.name} · Lv.${formationLevel}`,
        `• Trận Vị trung bình: **Lv.${averageSlotLevel.toFixed(1)}**`,
        `• Trận Nhãn: **Lv.${eye.level}**`,
        `• ${recommended}`,
        '',
        '**Gia trì ứng kiếp**',
        `• Cảnh giới: **+${percent(bonuses.realmBonus)}**`,
        `• Cấp Trận Đồ: **+${percent(bonuses.formationLevelBonus)}**`,
        `• Tinh Luyện Trận Vị: **+${percent(bonuses.slotLevelBonus)}**`,
        `• Trận Nhãn: **+${percent(bonuses.eyeLevelBonus)}**`,
        `• Tương hợp Trận Đồ: **+${percent(bonuses.matchingFormationBonus)}**`,
        `• Cộng Hưởng: **+${percent(bonuses.resonanceBonus)}**`,
        spiritLine,
        '',
        `${TRIBULATION_EMOJI} **Tỷ lệ ứng kiếp thành công: ${percent(winChance)}**`,
        '',
        '*Đây mới là quan trắc. Chưa tiêu tài nguyên và chưa thực sự ứng kiếp.*',
      ].join('\n')),
  );
}

export function buildFormationTribulationPreviewRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      button(
        ownerId,
        'tribulation',
        'Đổi Trận Kiếp',
      ),
      button(
        ownerId,
        'main',
        'Trận Pháp',
        FORMATION_EMOJI_ID,
      ),
    ),
  ];
}
