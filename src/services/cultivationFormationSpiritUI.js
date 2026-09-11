import { EmbedBuilder } from 'discord.js';

import {
  buildFormationComprehendEmbed as buildBaseFormationComprehendEmbed,
  buildFormationMainEmbed as buildBaseFormationMainEmbed,
} from './cultivationFormationUI.js';

import {
  getFormationSpiritSynergy,
} from './cultivationFormationSpirit.js';

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function buildSpiritEffectLines(synergy) {
  if (!synergy?.active) {
    return [];
  }

  const effects = synergy.effects || {};
  const lines = [];

  if ((Number(effects.cultivationBonus) || 0) > 0) {
    lines.push(`• Tu Vi: **+${percent(effects.cultivationBonus)}**`);
  }

  if ((Number(effects.adventureBonus) || 0) > 0) {
    lines.push(`• Thám Hiểm: **+${percent(effects.adventureBonus)}**`);
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
    [
      description,
      '',
      ...spiritLines,
    ].join('\n'),
  );
}

export function buildFormationComprehendEmbed(result) {
  const embed = buildBaseFormationComprehendEmbed(result);
  const bonus = Math.max(
    0,
    Number(result?.extraInsightBonus) || 0,
  );

  if (!result?.ok || bonus <= 0) {
    return embed;
  }

  const data = embed.toJSON();
  const description = String(data.description || '');
  const line = `<a:ttconghuong:1547830051951738960> **Trận Linh:** +${Math.round(bonus * 100)}% Lĩnh Ngộ`;

  return new EmbedBuilder(data).setDescription(
    [
      description,
      '',
      line,
    ].join('\n'),
  );
}
