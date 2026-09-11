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
  FORMATION_DEFINITIONS,
  FORMATION_ELEMENTS,
} from './cultivationFormation.js';

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

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function duration(ms) {
  const totalSeconds = Math.max(
    0,
    Math.ceil((Number(ms) || 0) / 1000),
  );
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (!minutes) return `${seconds}s`;
  if (!seconds) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function button(
  ownerId,
  action,
  label,
  emoji = LIGHTNING_EMOJI_ID,
  styleValue = ButtonStyle.Secondary,
) {
  return new ButtonBuilder()
    .setCustomId(`tutien_formation:${ownerId}:${action}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(styleValue);
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
    (tribulation) => {
      const recommended = FORMATION_DEFINITIONS[
        tribulation.recommendedFormationId
      ];

      return [
        `${TRIBULATION_EMOJI} **${tribulation.name}** · Kiếp cấp ${tribulation.difficulty}`,
        `• Trận Đồ tương ứng: **${recommended?.name || 'Không rõ'}**`,
        `• ${tribulation.description}`,
      ].join('\n');
    },
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
        '*Ứng Kiếp thất bại ở bản hiện tại không làm mất tài nguyên, nhưng vẫn tính cooldown.*',
      ].join('\n')),
  );
}

export function buildFormationTribulationPreviewRows(
  ownerId,
  tribulationId,
) {
  return [
    new ActionRowBuilder().addComponents(
      button(
        ownerId,
        `tribulation_attempt:${tribulationId}`,
        'Ứng Kiếp',
        LIGHTNING_EMOJI_ID,
        ButtonStyle.Danger,
      ),
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

export function buildFormationTribulationResultEmbed(result) {
  if (!result?.ok) {
    if (result?.reason === 'cooldown') {
      return style(
        new EmbedBuilder()
          .setTitle(title('Trận Kiếp'))
          .setDescription([
            `${TRIBULATION_EMOJI} **Kiếp khí chưa tan.**`,
            `Có thể Ứng Kiếp lại sau **${duration(result.remainingMs)}**.`,
          ].join('\n')),
      );
    }

    return style(
      new EmbedBuilder()
        .setTitle(title('Trận Kiếp'))
        .setDescription('Không thể tiến hành Ứng Kiếp lúc này.'),
    );
  }

  const tribulation = result.preview?.tribulation;
  const chance = result.preview?.winChance;

  if (!result.success) {
    return style(
      new EmbedBuilder()
        .setTitle(title('Ứng Kiếp Thất Bại'))
        .setDescription([
          `${TRIBULATION_EMOJI} **${tribulation?.name || 'Trận Kiếp'}**`,
          '',
          'Thiên uy phá vỡ trận thế, đạo hữu buộc phải thu trận.',
          `Tỷ lệ khi ứng kiếp: **${percent(chance)}**`,
          '',
          '• **Không mất Tu Vi, Linh Thạch hay tài nguyên Trận Pháp.**',
          '• Lượt Ứng Kiếp này vẫn tính cooldown **30 phút**.',
        ].join('\n')),
    );
  }

  const reward = result.reward || {};
  const formation = FORMATION_DEFINITIONS[
    reward.formationId
  ];
  const crystal = FORMATION_ELEMENTS[
    reward.crystalId
  ];
  const unlocked = Array.isArray(reward.unlockedNow) && reward.unlockedNow.length
    ? reward.unlockedNow.map((item) => `• **${item.name}**`).join('\n')
    : '• Không mở khóa Trận Đồ mới.';

  return style(
    new EmbedBuilder()
      .setTitle(title('Ứng Kiếp Thành Công'))
      .setDescription([
        `${TRIBULATION_EMOJI} **${tribulation?.name || 'Trận Kiếp'}** đã bị Trận Đạo hóa giải.`,
        `Tỷ lệ khi ứng kiếp: **${percent(chance)}**`,
        '',
        '**Thiên Kiếp phản bổ**',
        `<a:ttlinhngo:1547820024440291389> Lĩnh Ngộ **+${number(reward.insightGain)}**`,
        `<a:ttranvan:1547959053114671297> Trận Văn **+${number(reward.essenceGain)}**`,
        `<a:ttmanhtrando:1547960167667081276> Mảnh **${formation?.name || 'Trận Đồ'} +${number(reward.fragmentGain)}**`,
        `${crystal?.emoji || ''} ${crystal?.name || 'Ngũ Hành'} Tinh Thạch **+${number(reward.crystalGain)}**`,
        '',
        '**Thiên cơ lĩnh ngộ**',
        unlocked,
        '',
        'Cooldown Ứng Kiếp: **30 phút**.',
      ].join('\n')),
  );
}

export function buildFormationTribulationResultRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      button(
        ownerId,
        'tribulation',
        'Trận Kiếp',
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
