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

export function buildCultivateEmbed(result) {
  const embed = baseUI.buildCultivateEmbed(result);

  if (!result?.ok) {
    return embed;
  }

  return appendFormationLines(
    embed,
    buildFormationCultivateLines(result),
  );
}

export function buildBreakthroughEmbed(result) {
  const embed = baseUI.buildBreakthroughEmbed(result);

  if (!result?.ok) {
    return embed;
  }

  return appendFormationLines(
    embed,
    buildFormationBreakthroughLines(result),
  );
}
