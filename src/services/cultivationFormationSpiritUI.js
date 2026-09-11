import { EmbedBuilder } from 'discord.js';

import {
  buildFormationComprehendEmbed as buildBaseFormationComprehendEmbed,
} from './cultivationFormationUI.js';

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
