import { EmbedBuilder } from 'discord.js';

import * as baseUI from './cultivationUI.js';

import {
  buildFormationBreakthroughLines,
  buildFormationCultivateLines,
} from './cultivationFormationResultUI.js';

export * from './cultivationUI.js';

function appendFormationLines(embed, lines) {
  if (!embed || !Array.isArray(lines) || lines.length === 0) {
    return embed;
  }

  const data = embed.toJSON();
  const description = data.description || '';

  return new EmbedBuilder(data).setDescription(
    [
      description,
      '',
      ...lines,
    ]
      .filter(line => line !== null && line !== undefined)
      .join('\n'),
  );
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

export function buildCultivateEmbed(result) {
  const embed = baseUI.buildCultivateEmbed(result);

  if (!result?.ok) {
    return embed;
  }

  const lines = [
    ...buildFormationCultivateLines(result),
  ];

  if (
    result.extraPetCultivationBonus > 0 &&
    result.activePet
  ) {
    lines.push(
      `${result.activePet.emoji} ${result.activePet.name}: **+${number(result.extraPetCultivationBonus)} Tu Vi**`,
    );
  }

  return appendFormationLines(
    embed,
    lines,
  );
}

export function buildBreakthroughEmbed(result) {
  const embed = baseUI.buildBreakthroughEmbed(result);

  if (!result?.ok) {
    return embed;
  }

  const lines = [
    ...buildFormationBreakthroughLines(result),
  ];

  if (
    result.guaranteedByPet &&
    result.activePet
  ) {
    lines.push(
      `${result.activePet.emoji} ${result.activePet.name}: **Đột Phá chắc chắn thành công 100%**`,
    );
  }

  return appendFormationLines(
    embed,
    lines,
  );
}
