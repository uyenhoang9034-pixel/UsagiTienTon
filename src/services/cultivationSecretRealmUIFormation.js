import { EmbedBuilder } from 'discord.js';

import * as baseUI from './cultivationSecretRealmUI.js';

import {
  buildFormationSecretRealmLines,
} from './cultivationFormationResultUI.js';

export * from './cultivationSecretRealmUI.js';

function appendFormationLines(embed, result) {
  const lines =
    buildFormationSecretRealmLines(
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

export function buildSecretRealmFailEmbed(result) {
  const embed =
    baseUI.buildSecretRealmFailEmbed(
      result,
    );

  if (!result?.ok) {
    return embed;
  }

  return appendFormationLines(
    embed,
    result,
  );
}

export function buildSecretRealmExitEmbed(result) {
  const embed =
    baseUI.buildSecretRealmExitEmbed(
      result,
    );

  if (!result?.ok) {
    return embed;
  }

  return appendFormationLines(
    embed,
    result,
  );
}
