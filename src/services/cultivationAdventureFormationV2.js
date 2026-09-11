import * as adventure from './cultivationAdventureV2.js';

import {
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  getFormationGameplayBonus,
} from './cultivationFormationGameplay.js';

export * from './cultivationAdventureV2.js';

function safeNumber(value) {
  return Number(value) || 0;
}

async function runWithFormationAdventureReward(
  fn,
  client,
  guildId,
  userId,
  ...args
) {
  const beforeProfile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const beforeCultivation =
    safeNumber(
      beforeProfile.cultivation,
    );

  const beforeStones =
    safeNumber(
      beforeProfile.spiritStones,
    );

  const formation =
    await getFormationGameplayBonus(
      client,
      guildId,
      userId,
    );

  const result = await fn(
    client,
    guildId,
    userId,
    ...args
  );

  if (!result?.ok) {
    return result;
  }

  const afterProfile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const cultivationGain = Math.max(
    0,
    safeNumber(
      afterProfile.cultivation,
    ) - beforeCultivation,
  );

  const stoneGain = Math.max(
    0,
    safeNumber(
      afterProfile.spiritStones,
    ) - beforeStones,
  );

  const adventurePercent = Math.max(
    0,
    safeNumber(
      formation.effects
        ?.adventureBonus,
    ),
  );

  const stonePercent = Math.max(
    0,
    safeNumber(
      formation.effects
        ?.spiritStoneBonus,
    ),
  );

  const formationAdventureBonus =
    cultivationGain > 0 &&
    adventurePercent > 0
      ? Math.max(
          1,
          Math.round(
            cultivationGain *
              adventurePercent,
          ),
        )
      : 0;

  const formationStoneBonus =
    stoneGain > 0 &&
    stonePercent > 0
      ? Math.max(
          1,
          Math.round(
            stoneGain *
              stonePercent,
          ),
        )
      : 0;

  if (
    formationAdventureBonus <= 0 &&
    formationStoneBonus <= 0
  ) {
    return {
      ...result,
      formationAdventureBonus: 0,
      formationAdventurePercent:
        adventurePercent,
      formationStoneBonus: 0,
      formationStonePercent:
        stonePercent,
      formationResonanceLines:
        formation.lines || [],
    };
  }

  if (formationAdventureBonus > 0) {
    afterProfile.cultivation +=
      formationAdventureBonus;

    afterProfile.totalCultivation +=
      formationAdventureBonus;
  }

  if (formationStoneBonus > 0) {
    afterProfile.spiritStones +=
      formationStoneBonus;
  }

  const savedProfile =
    await saveCultivationProfile(
      client,
      afterProfile,
    );

  return {
    ...result,
    profile: savedProfile,
    formationAdventureBonus,
    formationAdventurePercent:
      adventurePercent,
    formationStoneBonus,
    formationStonePercent:
      stonePercent,
    formationResonanceLines:
      formation.lines || [],
  };
}

export async function resolveAdventureV2Choice(
  client,
  guildId,
  userId,
  choiceId,
) {
  return runWithFormationAdventureReward(
    adventure.resolveAdventureV2Choice,
    client,
    guildId,
    userId,
    choiceId,
  );
}

export async function fightAdventureV2Monster(
  client,
  guildId,
  userId,
  options,
) {
  return runWithFormationAdventureReward(
    adventure.fightAdventureV2Monster,
    client,
    guildId,
    userId,
    options,
  );
}

export async function retreatAdventureV2(
  client,
  guildId,
  userId,
) {
  return runWithFormationAdventureReward(
    adventure.retreatAdventureV2,
    client,
    guildId,
    userId,
  );
}

export async function comprehendAncientTablet(
  client,
  guildId,
  userId,
) {
  return runWithFormationAdventureReward(
    adventure.comprehendAncientTablet,
    client,
    guildId,
    userId,
  );
}

export async function openAncientStoneGate(
  client,
  guildId,
  userId,
) {
  return runWithFormationAdventureReward(
    adventure.openAncientStoneGate,
    client,
    guildId,
    userId,
  );
}

export async function disarmAncientChest(
  client,
  guildId,
  userId,
) {
  return runWithFormationAdventureReward(
    adventure.disarmAncientChest,
    client,
    guildId,
    userId,
  );
}

export async function openAncientChest(
  client,
  guildId,
  userId,
) {
  return runWithFormationAdventureReward(
    adventure.openAncientChest,
    client,
    guildId,
    userId,
  );
}

export async function leaveAncientChest(
  client,
  guildId,
  userId,
) {
  return runWithFormationAdventureReward(
    adventure.leaveAncientChest,
    client,
    guildId,
    userId,
  );
}
