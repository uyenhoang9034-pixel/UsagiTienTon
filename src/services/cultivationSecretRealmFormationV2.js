import * as secretRealm from './cultivationSecretRealm.js';

import {
  addInventoryItem,
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  getActivePet,
  getPetEffectValue,
} from './cultivationPet.js';

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

function rollFractionalQuantity(baseQuantity, percent) {
  const raw =
    Math.max(0, safeNumber(baseQuantity)) *
    Math.max(0, safeNumber(percent));
  const guaranteed = Math.floor(raw);
  const fraction = raw - guaranteed;
  return guaranteed + (fraction > 0 && Math.random() < fraction ? 1 : 0);
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

async function applyPetFailureProtection(
  client,
  guildId,
  userId,
  result,
) {
  if (
    !result?.ok ||
    result.success !== false ||
    !result.lostLoot
  ) {
    return result;
  }

  const profile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const chance = Math.max(
    0,
    Math.min(
      1,
      safeNumber(
        getPetEffectValue(
          profile,
          'secret_realm_loot_keep_chance',
        ),
      ),
    ),
  );

  if (chance <= 0 || Math.random() >= chance) {
    return {
      ...result,
      activePet: getActivePet(profile),
      petLootProtectionChance: chance,
      petLootProtectionTriggered: false,
    };
  }

  /**
   * Khi U Minh Huyền Xà kích hoạt: giữ thêm 10% tổng chiến lợi phẩm ban đầu.
   * Base đã giữ 40%, nên lần kích hoạt này tương đương nâng phần giữ lại lên ~50%.
   */
  const totalCultivation =
    Math.max(0, safeNumber(result.keptLoot?.cultivation)) +
    Math.max(0, safeNumber(result.lostLoot?.cultivation));
  const totalStones =
    Math.max(0, safeNumber(result.keptLoot?.stones)) +
    Math.max(0, safeNumber(result.lostLoot?.stones));

  const extraCultivation = Math.min(
    Math.max(0, safeNumber(result.lostLoot?.cultivation)),
    Math.floor(totalCultivation * 0.10),
  );
  const extraStones = Math.min(
    Math.max(0, safeNumber(result.lostLoot?.stones)),
    Math.floor(totalStones * 0.10),
  );

  const extraItems = {};
  const allItemIds = new Set([
    ...Object.keys(result.keptLoot?.items || {}),
    ...Object.keys(result.lostLoot?.items || {}),
  ]);

  for (const itemId of allItemIds) {
    const kept = Math.max(0, safeNumber(result.keptLoot?.items?.[itemId]));
    const lost = Math.max(0, safeNumber(result.lostLoot?.items?.[itemId]));
    const total = kept + lost;
    const extra = Math.min(
      lost,
      rollFractionalQuantity(total, 0.10),
    );

    if (extra > 0) {
      addInventoryItem(profile, itemId, extra);
      extraItems[itemId] = extra;
    }
  }

  if (extraCultivation > 0) {
    profile.cultivation += extraCultivation;
    profile.totalCultivation += extraCultivation;
  }

  if (extraStones > 0) {
    profile.spiritStones += extraStones;
  }

  const saved =
    await saveCultivationProfile(
      client,
      profile,
    );

  return {
    ...result,
    profile: saved,
    activePet: getActivePet(saved),
    petLootProtectionChance: chance,
    petLootProtectionTriggered: true,
    petExtraKeptLoot: {
      cultivation: extraCultivation,
      stones: extraStones,
      items: extraItems,
    },
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

  const petProtected =
    await applyPetFailureProtection(
      client,
      guildId,
      userId,
      result,
    );

  // Thất bại: base service đã trả 40% keptLoot vào profile.
  // Không rơi Mảnh Trận Đồ khi thất bại.
  return applyFormationLootBonus(
    client,
    guildId,
    userId,
    petProtected,
    {
      cultivation:
        Math.max(0, safeNumber(result.keptLoot?.cultivation)) +
        Math.max(0, safeNumber(petProtected.petExtraKeptLoot?.cultivation)),
      stones:
        Math.max(0, safeNumber(result.keptLoot?.stones)) +
        Math.max(0, safeNumber(petProtected.petExtraKeptLoot?.stones)),
    },
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
