import { EmbedBuilder } from 'discord.js';

import * as baseUI from './cultivationSecretRealmUI.js';

import {
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  buildFormationSecretRealmLines,
} from './cultivationFormationResultUI.js';

export * from './cultivationSecretRealmUI.js';

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function buildPetLines(result) {
  const pet = result?.activePet || result?.pet;
  if (!pet) return [];

  const lines = [];

  if ((Number(result.petCombatBonus) || 0) > 0) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${percent(result.petCombatBonus)} tỷ lệ thắng giao chiến**`,
    );
  }

  if ((Number(result.petCombatRewardBonus) || 0) > 0 && result.success) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${percent(result.petCombatRewardBonus)} phần thưởng giao chiến**`,
    );
  }

  if ((Number(result.petLootKeepPercent) || 0) > 0) {
    lines.push(
      `${pet.emoji} ${pet.name}: **Giữ thêm ${percent(result.petLootKeepPercent)} chiến lợi phẩm khi thất bại**`,
    );
  }

  if ((Number(result.petSecretCultivationBonus) || 0) > 0) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${number(result.petSecretCultivationBonus)} Tu Vi Bí Cảnh**`,
    );
  }

  if ((Number(result.petSecretStoneBonus) || 0) > 0) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${number(result.petSecretStoneBonus)} Linh Thạch Bí Cảnh**`,
    );
  }

  for (const [itemId, quantity] of Object.entries(result.petSecretItemBonuses || {})) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${number(quantity)} ${CULTIVATION_ITEMS[itemId]?.name || itemId}**`,
    );
  }

  return lines;
}

function appendFormationLines(embed, result) {
  const lines = [
    ...buildFormationSecretRealmLines(result),
    ...buildPetLines(result),
  ];

  if (
    !embed ||
    !Array.isArray(lines) ||
    lines.length === 0
  ) {
    return embed;
  }

  const data = embed.toJSON();

  return new EmbedBuilder(data)
    .setDescription(
      [
        data.description || '',
        '',
        ...lines,
      ]
        .filter(
          line => line !== null && line !== undefined,
        )
        .join('\n'),
    );
}

export function buildSecretRealmAssistEmbed(result) {
  const embed = baseUI.buildSecretRealmAssistEmbed(result);

  if (!result?.ok) {
    return embed;
  }

  const pet = result?.activePet || result?.pet;
  if (!pet) return embed;

  const lines = [];

  if ((Number(result.petCombatBonus) || 0) > 0) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${percent(result.petCombatBonus)} tỷ lệ thắng giao chiến**`,
    );
  }

  if ((Number(result.petCombatRewardBonus) || 0) > 0) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${percent(result.petCombatRewardBonus)} phần thưởng khi thắng giao chiến**`,
    );
  }

  if (lines.length === 0) return embed;

  const data = embed.toJSON();
  return new EmbedBuilder(data).setDescription(
    [data.description || '', '', ...lines].join('\n'),
  );
}

export function buildSecretRealmWinEmbed(result) {
  const embed = baseUI.buildSecretRealmWinEmbed(result);

  if (!result?.ok) {
    return embed;
  }

  return appendFormationLines(embed, result);
}

export function buildSecretRealmFailEmbed(result) {
  const embed = baseUI.buildSecretRealmFailEmbed(result);

  if (!result?.ok) {
    return embed;
  }

  return appendFormationLines(embed, result);
}

export function buildSecretRealmExitEmbed(result) {
  const embed = baseUI.buildSecretRealmExitEmbed(result);

  if (!result?.ok) {
    return embed;
  }

  return appendFormationLines(embed, result);
}
