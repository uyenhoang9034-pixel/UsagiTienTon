import { EmbedBuilder } from 'discord.js';

import {
  buildFormationComprehendEmbed as buildBaseFormationComprehendEmbed,
  buildFormationMainEmbed as buildBaseFormationMainEmbed,
  buildFormationResonanceEmbed as buildBaseFormationResonanceEmbed,
} from './cultivationFormationUI.js';

import {
  getFormationSpiritSynergy,
} from './cultivationFormationSpirit.js';

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function buildSpiritEffectLines(synergy) {
  if (!synergy?.active) return [];

  const effects = synergy.effects || {};
  const lines = [];

  if ((Number(effects.cultivationBonus) || 0) > 0) {
    lines.push(`• Tu Vi: **+${percent(effects.cultivationBonus)}**`);
  }
  if ((Number(effects.adventureBonus) || 0) > 0) {
    lines.push(`• Thám Hiểm · Bí Cảnh: **+${percent(effects.adventureBonus)}**`);
  }
  if ((Number(effects.spiritStoneBonus) || 0) > 0) {
    lines.push(`• Linh Thạch: **+${percent(effects.spiritStoneBonus)}**`);
  }
  if ((Number(effects.staminaReduction) || 0) > 0) {
    lines.push(`• Giảm hao Thể Lực: **${percent(effects.staminaReduction)}**`);
  }
  if ((Number(effects.breakthroughBonus) || 0) > 0) {
    lines.push(`• Đột Phá: **+${percent(effects.breakthroughBonus)}**`);
  }
  if ((Number(effects.insightBonus) || 0) > 0) {
    lines.push(`• Lĩnh Ngộ: **+${percent(effects.insightBonus)}**`);
  }

  return lines;
}

function buildTotalEffectLines(effects = {}) {
  return [
    `• Tu Vi: **+${percent(effects.cultivationBonus)}**`,
    `• Thám Hiểm · Bí Cảnh: **+${percent(effects.adventureBonus)}**`,
    `• Linh Thạch: **+${percent(effects.spiritStoneBonus)}**`,
    `• Giảm Thể Lực: **${percent(effects.staminaReduction)}**`,
    `• Đột Phá: **+${percent(effects.breakthroughBonus)}**`,
    `• Lĩnh Ngộ: **+${percent(effects.insightBonus)}**`,
  ];
}

export function buildFormationMainEmbed(user, state, profile = null) {
  const embed = buildBaseFormationMainEmbed(user, state);
  const synergy = profile
    ? getFormationSpiritSynergy(profile, state)
    : null;

  const data = embed.toJSON();
  const description = String(data.description || '');

  let spiritLines = [
    '<a:ttconghuong:1547830051951738960> **Trận Linh**',
    '• Chưa có Linh Thú đang kích hoạt.',
  ];

  if (synergy?.pet) {
    spiritLines = [
      '<a:ttconghuong:1547830051951738960> **Trận Linh**',
      `• Linh Thú: ${synergy.pet.emoji || ''} **${synergy.pet.name}**`,
      `• Cộng hưởng: **${synergy.label}**`,
      synergy.active
        ? '• Trạng thái: **Đang cộng hưởng**'
        : '• Trạng thái: **Chưa đủ điều kiện cộng hưởng**',
      ...buildSpiritEffectLines(synergy),
    ];

    if (!synergy.active && synergy.requiredFormationId === 'five_elements') {
      spiritLines.push('• Điều kiện: **Tiểu Ngũ Hành Trận có đủ Kim · Mộc · Thủy · Hỏa · Thổ**.');
    }
  }

  return new EmbedBuilder(data).setDescription(
    [description, '', ...spiritLines].join('\n'),
  );
}

export function buildFormationResonanceEmbed(state, gameplayBonus = null) {
  const embed = buildBaseFormationResonanceEmbed(state);
  const synergy = gameplayBonus?.spiritSynergy || null;

  if (!synergy?.pet) return embed;

  const data = embed.toJSON();
  const description = String(data.description || '')
    .replace('• Thám Hiểm:', '• Thám Hiểm · Bí Cảnh:');
  const spiritLines = [
    '**Trận Linh bổ sung**',
    `• ${synergy.pet.emoji || ''} **${synergy.pet.name}** · **${synergy.label}**`,
    synergy.active
      ? '• Trạng thái: **Đang cộng hưởng**'
      : '• Trạng thái: **Chưa đủ điều kiện cộng hưởng**',
    ...buildSpiritEffectLines(synergy),
  ];

  if (!synergy.active && synergy.requiredFormationId === 'five_elements') {
    spiritLines.push('• Điều kiện: **Tiểu Ngũ Hành Trận có đủ Kim · Mộc · Thủy · Hỏa · Thổ**.');
  }

  const totalLines = synergy.active
    ? ['', '**Tổng hiệu quả gameplay**', ...buildTotalEffectLines(gameplayBonus?.effects || {})]
    : [];

  return new EmbedBuilder(data).setDescription(
    [description, '', ...spiritLines, ...totalLines].join('\n'),
  );
}

export function buildFormationComprehendEmbed(result) {
  const embed = buildBaseFormationComprehendEmbed(result);

  if (!result?.ok) return embed;

  const lines = [];

  if ((Number(result.spiritInsightBonus) || 0) > 0) {
    lines.push(
      `<a:ttconghuong:1547830051951738960> **Trận Linh:** +${percent(result.spiritInsightBonus)} Lĩnh Ngộ`,
    );
  }

  if ((Number(result.petInsightBonus) || 0) > 0 && result.activePet) {
    lines.push(
      `${result.activePet.emoji} **${result.activePet.name}:** +${percent(result.petInsightBonus)} Lĩnh Ngộ`,
    );
  }

  if ((Number(result.petEssenceBonus) || 0) > 0 && result.activePet) {
    lines.push(
      `${result.activePet.emoji} **${result.activePet.name}:** +${new Intl.NumberFormat('vi-VN').format(result.petEssenceBonus)} Trận Văn`,
    );
  }

  if (result.specialCrystalDrop && result.activePet) {
    const crystalName = result.specialCrystalDrop.crystalId === 'chaos'
      ? 'Tinh Thạch · Hỗn Độn'
      : 'Tinh Thạch · Tinh Thần';
    lines.push(
      `${result.activePet.emoji} **${result.activePet.name}:** nhận **${crystalName} ×${result.specialCrystalDrop.quantity || 1}**`,
    );
  }

  if (lines.length === 0) return embed;

  const data = embed.toJSON();
  return new EmbedBuilder(data).setDescription(
    [String(data.description || ''), '', ...lines].join('\n'),
  );
}
