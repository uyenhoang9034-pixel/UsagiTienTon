import { EmbedBuilder } from 'discord.js';

import * as baseUI from './cultivationAdventureV295UI.js';

import {
  buildFormationAdventureLines,
} from './cultivationFormationResultUI.js';

export * from './cultivationAdventureV295UI.js';

function appendFormationLines(embed, result) {
  const lines = buildFormationAdventureLines(result);

  if (!embed || !Array.isArray(lines) || lines.length === 0) {
    return embed;
  }

  const data = embed.toJSON();

  return new EmbedBuilder(data)
    .setDescription([
      data.description || '',
      '',
      ...lines,
    ].filter(line => line !== null && line !== undefined).join('\n'));
}

export function buildEquipmentResonanceEmbed(result) {
  return appendFormationLines(
    baseUI.buildEquipmentResonanceEmbed(result),
    result,
  );
}

export function buildTechniqueResonanceEmbed(result) {
  return appendFormationLines(
    baseUI.buildTechniqueResonanceEmbed(result),
    result,
  );
}
