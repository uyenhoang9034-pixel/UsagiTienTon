import {
  ActionRowBuilder,
  EmbedBuilder,
} from 'discord.js';

import * as baseUI from './cultivationUI.js';

import {
  appendFormationButton,
} from './cultivationFormationUI.js';

import {
  appendSpiritVeinButton,
} from './cultivationSpiritVeinUI.js';

import {
  getAchievementDashboardButton,
} from './cultivationAchievementUI.js';

import {
  getWorldBossDashboardButton,
} from './cultivationWorldBossUI.js';

import {
  getDungeonDashboardButton,
} from './cultivationDungeonUI.js';

import {
  getImmortalOrderDashboardButton,
} from './cultivationImmortalOrderUI.js';

import {
  getCaveDashboardButton,
} from './cultivationCaveUI.js';

import {
  buildFormationBreakthroughLines,
  buildFormationCultivateLines,
} from './cultivationFormationResultUI.js';

export * from './cultivationUI.js';

const TIEN_PHUONG_EMOJI = {
  id: '1548288038898241577',
  name: 'tttienphuong',
  animated: false,
};

const LINH_MACH_EMOJI = {
  id: '1548968111363858484',
  name: 'ttlinhmach',
  animated: false,
};

function appendFormationLines(embed, lines) {
  if (!embed || !Array.isArray(lines) || lines.length === 0) return embed;
  const data = embed.toJSON();
  const description = data.description || '';
  return new EmbedBuilder(data).setDescription([description, '', ...lines].filter(line => line !== null && line !== undefined).join('\n'));
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(Number(value) || 0)));
}

function percent(value) { return `${Math.round((Number(value) || 0) * 100)}%`; }

function applyDashboardEmojis(rows) {
  for (const row of rows || []) {
    for (const component of row?.components || []) {
      if (component?.data?.label === 'Tiên Phường') component.setEmoji(TIEN_PHUONG_EMOJI);
      if (component?.data?.label === 'Linh Mạch') component.setEmoji(LINH_MACH_EMOJI);
    }
  }
  return rows;
}

function routeBreakthroughThroughTribulation(rows, ownerId) {
  for (const row of rows || []) {
    for (const component of row?.components || []) {
      if (component?.data?.label === 'Đột Phá') {
        component.setCustomId(`tutien_tribulation:${ownerId}:smart`);
      }
    }
  }
  return rows;
}

function appendMetaButtons(rows, ownerId) {
  const cloned = [...rows];
  let target = cloned.find(row => (row?.components?.length || 0) === 0);
  if (!target) {
    target = new ActionRowBuilder();
    cloned.push(target);
  }
  const buttons = [
    getAchievementDashboardButton(ownerId),
    getWorldBossDashboardButton(ownerId),
    getDungeonDashboardButton(ownerId),
    getImmortalOrderDashboardButton(ownerId),
    getCaveDashboardButton(ownerId),
  ];
  for (const btn of buttons) {
    if ((target.components?.length || 0) >= 5) {
      target = new ActionRowBuilder();
      cloned.push(target);
    }
    target.addComponents(btn);
  }
  return cloned;
}

export function buildDashboardRows(ownerId, guild = null) {
  const withSpiritVein = appendSpiritVeinButton(baseUI.buildDashboardRows(ownerId), ownerId);
  const withFormation = appendFormationButton(withSpiritVein, ownerId, guild);
  const withMeta = appendMetaButtons(withFormation, ownerId);
  const routed = routeBreakthroughThroughTribulation(withMeta, ownerId);
  return applyDashboardEmojis(routed);
}

export function buildCultivateEmbed(result) {
  const embed = baseUI.buildCultivateEmbed(result);
  if (!result?.ok) return embed;
  const lines = [...buildFormationCultivateLines(result)];
  if (result.extraPetCultivationBonus > 0 && result.activePet) lines.push(`${result.activePet.emoji} ${result.activePet.name}: **+${number(result.extraPetCultivationBonus)} Tu Vi**`);
  if (result.petStaminaRefund > 0 && result.activePet) lines.push(`${result.activePet.emoji} ${result.activePet.name}: **Bù lại ${number(result.petStaminaRefund)} Thể Lực**`);
  return appendFormationLines(embed, lines);
}

export function buildBreakthroughEmbed(result) {
  const embed = baseUI.buildBreakthroughEmbed(result);
  if (!result?.ok) return embed;
  const lines = [...buildFormationBreakthroughLines(result)];
  if (result.guaranteedByPet && result.activePet) lines.push(`${result.activePet.emoji} ${result.activePet.name}: **Đột Phá chắc chắn thành công 100%**`);
  else if ((Number(result.petBreakthroughBonus) || 0) > 0 && result.activePet) lines.push(`${result.activePet.emoji} ${result.activePet.name}: **+${percent(result.petBreakthroughBonus)} tỷ lệ Đột Phá**`);
  if (!result.success && (Number(result.petLossSaved) || 0) > 0 && result.activePet) lines.push(`${result.activePet.emoji} ${result.activePet.name}: **Bù lại ${number(result.petLossSaved)} Tu Vi tổn thất**`);
  return appendFormationLines(embed, lines);
}
