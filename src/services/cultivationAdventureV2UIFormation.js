import { EmbedBuilder } from 'discord.js';

import * as baseUI from './cultivationAdventureV2UI.js';

import {
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  buildFormationAdventureLines,
} from './cultivationFormationResultUI.js';

export * from './cultivationAdventureV2UI.js';

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function buildPetAdventureLines(result) {
  if (!result?.activePet) return [];

  const pet = result.activePet;
  const lines = [];

  if (result.guaranteedByPet) {
    lines.push(
      `${pet.emoji} ${pet.name}: **Giao chiến chắc chắn chiến thắng 100%**`,
    );
  }

  if (result.petAllCultivationBonus > 0) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${number(result.petAllCultivationBonus)} Tu Vi Thám Hiểm**`,
    );
  }

  if (result.petAllStoneBonus > 0) {
    lines.push(
      `${pet.emoji} ${pet.name}: **+${number(result.petAllStoneBonus)} Linh Thạch Thám Hiểm**`,
    );
  }

  for (const [itemId, quantity] of Object.entries(result.petAllItemBonuses || {})) {
    const item = CULTIVATION_ITEMS[itemId];
    lines.push(
      `${pet.emoji} ${pet.name}: **+${number(quantity)} ${item?.name || itemId}**`,
    );
  }

  if (result.petMaterialFindBonus) {
    lines.push(
      `${pet.emoji} ${pet.name}: **Tầm Bảo +${number(result.petMaterialFindBonus.quantity)} ${result.petMaterialFindBonus.item?.name || result.petMaterialFindBonus.itemId}**`,
    );
  }

  return lines;
}

function appendFormationLines(embed, result) {
  const lines = [
    ...buildFormationAdventureLines(
      result,
    ),
    ...buildPetAdventureLines(
      result,
    ),
  ];

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
