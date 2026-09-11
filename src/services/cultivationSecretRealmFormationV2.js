import * as secretRealm from './cultivationSecretRealm.js';

import {
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  getFormationGameplayBonus,
} from './cultivationFormationGameplay.js';

import {
  rollFormationFragmentDrop,
} from './cultivationFormationRewards.js';

export * from './cultivationSecretRealm.js';

function safeNumber(value) {
  return Number(value) || 0;
}

function calculateBonus(amount, percent) {
  const base = Math.max(0, safeNumber(amount));
  const rate = Math.max(0, safeNumber(percent));

  if (base <= 0 || rate <= 0) {
    return 0;
  }

  return Math.max(
    1,
    Math.round(base * rate),
  );
}

function getSecretRealmFragmentQuantity(floor) {
  const depth = Math.max(
    0,
    Math.floor(
      Number(floor) || 0,
    ),
  );

  if (depth >= 5) {
    return 2;
  }

  if (depth >= 2) {
    return 1;
  }

  return 0;
}

async function applyFormationLootBonus(
  client,
  guildId,
  userId,
  result,
  loot,
) {
  if (!result?.ok) {
    return result;
  }

  const formation =
    await getFormationGameplayBonus(
      client,
      guildId,
      userId,
    );

  const adventurePercent = Math.max(
    0,
    safeNumber(
      formation.effects?.adventureBonus,
    ),
  );

  const stonePercent = Math.max(
    0,
    safeNumber(
      formation.effects?.spiritStoneBonus,
    ),
  );

  const formationAdventureBonus =
    calculateBonus(
      loot?.cultivation,
      adventurePercent,
    );

  const formationStoneBonus =
    calculateBonus(
      loot?.stones,
      stonePercent,
    );

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

  const profile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  if (formationAdventureBonus > 0) {
    profile.cultivation +=
      formationAdventureBonus;

    profile.totalCultivation +=
      formationAdventureBonus;
  }

  if (formationStoneBonus > 0) {
    profile.spiritStones +=
      formationStoneBonus;
  }

  const savedProfile =
    await saveCultivationProfile(
      client,
      profile,
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

export async function fightSecretRealmMonster(
  client,
  guildId,
  userId,
  options,
) {
  const result =
    await secretRealm.fightSecretRealmMonster(
      client,
      guildId,
      userId,
      options,
    );

  if (!result?.ok) {
    return result;
  }

  // Khi thắng, chiến lợi phẩm vẫn nằm trong session và chưa được cộng vào profile.
  // Chỉ áp Cộng Hưởng lúc cash out để tránh cộng hai lần.
  if (result.success) {
    const formation =
      await getFormationGameplayBonus(
        client,
        guildId,
        userId,
      );

    return {
      ...result,
      formationAdventurePercent:
        Math.max(
          0,
          safeNumber(
            formation.effects?.adventureBonus,
          ),
        ),
      formationStonePercent:
        Math.max(
          0,
          safeNumber(
            formation.effects?.spiritStoneBonus,
          ),
        ),
      formationResonanceLines:
        formation.lines || [],
    };
  }

  // Thất bại: base service đã trả 40% keptLoot vào profile.
  // Không rơi Mảnh Trận Đồ khi thất bại.
  return applyFormationLootBonus(
    client,
    guildId,
    userId,
    result,
    result.keptLoot,
  );
}

export async function leaveSecretRealm(
  client,
  guildId,
  userId,
) {
  const result =
    await secretRealm.leaveSecretRealm(
      client,
      guildId,
      userId,
    );

  const rewarded =
    await applyFormationLootBonus(
      client,
      guildId,
      userId,
      result,
      result?.loot,
    );

  if (!rewarded?.ok) {
    return rewarded;
  }

  const fragmentQuantity =
    getSecretRealmFragmentQuantity(
      rewarded.floor,
    );

  const formationFragmentDrop =
    await rollFormationFragmentDrop(
      client,
      guildId,
      userId,
      {
        chance:
          fragmentQuantity > 0
            ? 1
            : 0,
        quantity:
          Math.max(
            1,
            fragmentQuantity,
          ),
      },
    );

  return {
    ...rewarded,
    formationFragmentDrop,
  };
}
