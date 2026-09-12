import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';
import {
  FORMATION_ELEMENTS,
  MAX_HEART_LEVEL,
  getActiveFormation,
  getFormationHeart,
  getFormationLevel,
  getFormationUpgradeCost,
} from './cultivationFormation.js';
import {
  FORMATION_EMOJIS,
  FORMATION_RESOURCE_EMOJIS,
} from './cultivationFormationUI.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';

function style(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });
  if (CULTIVATION_CONFIG.ui.image) embed.setImage(CULTIVATION_CONFIG.ui.image);
  return embed;
}

function number(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function formationButton(ownerId, action, label, disabled = false) {
  const button = new ButtonBuilder()
    .setCustomId(`tutien_formation_heart:${ownerId}:${action}`)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);

  const emojiId = String(FORMATION_ELEMENTS.yin_yang.emoji).match(/:(\d+)>$/)?.[1];
  if (emojiId) button.setEmoji({ id: emojiId });
  return button;
}

function backButton(ownerId) {
  return new ButtonBuilder()
    .setCustomId(`tutien_formation:${ownerId}:main`)
    .setLabel('Trận Pháp')
    .setEmoji(FORMATION_EMOJIS.formation)
    .setStyle(ButtonStyle.Secondary);
}

function resultLine(result) {
  if (!result) return null;
  if (result.ok) {
    return `${FORMATION_ELEMENTS.yin_yang.emoji} **Trận Tâm đã tăng lên Lv.${result.level}.** Đã tiêu **${number(result.essenceCost)} Trận Văn** + **${number(result.crystalCost)} Âm Dương Tinh Thạch**.`;
  }
  if (result.reason === 'not_enough_essence') {
    return `${FORMATION_RESOURCE_EMOJIS.essence} Chưa đủ **Trận Văn**. Cần **${number(result.essenceCost)}**.`;
  }
  if (result.reason === 'not_enough_crystal') {
    return `${FORMATION_ELEMENTS.yin_yang.emoji} Chưa đủ **Âm Dương Tinh Thạch**. Cần **${number(result.crystalCost)}**.`;
  }
  if (result.reason === 'formation_level_gate') {
    return `🔒 Cần nâng **Trận Đồ lên Lv.${number(result.requiredFormationLevel)}** trước.`;
  }
  if (result.reason === 'max_level') {
    return `${FORMATION_ELEMENTS.yin_yang.emoji} Trận Tâm đã đạt **Lv.${MAX_HEART_LEVEL}**.`;
  }
  return 'Không thể nâng Trận Tâm lúc này.';
}

export function buildFormationHeartEmbed(state, result = null) {
  const formation = getActiveFormation(state);
  const formationLevel = getFormationLevel(state, formation.id);
  const heart = getFormationHeart(state, formation.id);
  const nextCost = heart.level < MAX_HEART_LEVEL
    ? getFormationUpgradeCost('heart', heart.level)
    : null;
  const crystalAmount = Math.max(
    0,
    Number(state.elementCrystals?.yin_yang) || 0,
  );
  const heartBonus = heart.level * 0.0015;
  const blockedByFormation = heart.level >= formationLevel && heart.level < MAX_HEART_LEVEL;
  const status = resultLine(result);

  return style(new EmbedBuilder()
    .setTitle(`${TITLE_LEFT} Trận Tâm · 阵心 ${TITLE_RIGHT}`)
    .setDescription([
      `<a:ttrando:1547820131889979464> **${formation.name} · Lv.${formationLevel}**`,
      '',
      `${FORMATION_ELEMENTS.yin_yang.emoji} **Trận Tâm:** Âm Dương`,
      `${FORMATION_RESOURCE_EMOJIS.refine} **Cấp Trận Tâm:** Lv.${heart.level}/${MAX_HEART_LEVEL}`,
      `${FORMATION_RESOURCE_EMOJIS.essence} **Trận Văn:** ${number(state.formationEssence)}`,
      `${FORMATION_ELEMENTS.yin_yang.emoji} **Âm Dương Tinh Thạch:** ${number(crystalAmount)}`,
      '',
      `◈ **Hiệu quả hiện tại:** +${(heartBonus * 100).toFixed(2)}% hiệu quả Cộng Hưởng toàn trận.`,
      nextCost
        ? `◈ **Nâng cấp kế tiếp:** ${number(nextCost.essenceCost)} Trận Văn + ${number(nextCost.crystalCost)} Âm Dương Tinh Thạch.`
        : '◈ **Nâng cấp kế tiếp:** Đã đạt cấp tối đa.',
      blockedByFormation
        ? `🔒 **Khóa cấp:** phải nâng Trận Đồ lên Lv.${heart.level + 1} trước.`
        : '',
      '',
      status ? `**Kết quả**\n${status}` : '',
      '',
      '*Âm Dương làm Trận Tâm, điều hòa toàn bộ trận mạch. Cấp Trận Tâm không thể vượt Cấp Trận Đồ.*',
    ].filter(Boolean).join('\n')));
}

export function buildFormationHeartRows(ownerId, state) {
  const formation = getActiveFormation(state);
  const formationLevel = getFormationLevel(state, formation.id);
  const heart = getFormationHeart(state, formation.id);
  const isMax = heart.level >= MAX_HEART_LEVEL;
  const blockedByFormation = heart.level >= formationLevel && !isMax;

  return [
    new ActionRowBuilder().addComponents(
      formationButton(
        ownerId,
        'refine',
        isMax ? 'Đã Viên Mãn' : blockedByFormation ? 'Cần nâng Trận Đồ' : 'Nâng Trận Tâm',
        isMax || blockedByFormation,
      ),
      backButton(ownerId),
    ),
  ];
}
