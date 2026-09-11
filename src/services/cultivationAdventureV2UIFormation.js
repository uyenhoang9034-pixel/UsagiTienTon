import { EmbedBuilder } from 'discord.js';

import * as baseUI from './cultivationAdventureV2UI.js';

import {
  buildFormationAdventureLines,
} from './cultivationFormationResultUI.js';

export * from './cultivationAdventureV2UI.js';

function appendFormationLines(embed, result) {
  const lines =
    buildFormationAdventureLines(
      result,
    );

  if (
    !embed ||
    !Array.isArray(lines) ||
    lines.length === 0
  ) {
    return embed;
  }

  const data =
    embed.toJSON();

  return new EmbedBuilder(data)
    .setDescription(
      [
        data.description || '',
        '',
        ...lines,
      ]
        .filter(
          line =>
            line !== null &&
            line !== undefined,
        )
        .join('\n'),
    );
}

function wrapResult(builder, result) {
  const embed =
    builder(result);

  if (!result?.ok) {
    return embed;
  }

  return appendFormationLines(
    embed,
    result,
  );
}

export function buildAdventureV2ResultEmbed(result) {
  return wrapResult(
    baseUI.buildAdventureV2ResultEmbed,
    result,
  );
}

export function buildAdventureV2CombatResultEmbed(result) {
  return wrapResult(
    baseUI.buildAdventureV2CombatResultEmbed,
    result,
  );
}

export function buildAdventureV2RetreatEmbed(result) {
  return wrapResult(
    baseUI.buildAdventureV2RetreatEmbed,
    result,
  );
}

export function buildAncientGateFailedEmbed(result) {
  return wrapResult(
    baseUI.buildAncientGateFailedEmbed,
    result,
  );
}

export function buildChestDisarmEmbed(result) {
  return wrapResult(
    baseUI.buildChestDisarmEmbed,
    result,
  );
}

export function buildAncientChestResultEmbed(result) {
  return wrapResult(
    baseUI.buildAncientChestResultEmbed,
    result,
  );
}
