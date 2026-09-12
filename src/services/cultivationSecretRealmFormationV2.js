import {
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

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

const SECRET_REALM_PREFIX =
  'games:cultivation:secretRealm:';

function safeNumber(value) {
  return Number(value) || 0;
}

function randomInt(min, max) {
  const safeMin = Math.ceil(Number(min) || 0);
  const safeMax = Math.max(safeMin, Math.floor(Number(max) || safeMin));
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function calculateBonus(amount, percent) {
  const base = Math.max(0, safeNumber(amount));
  const rate = Math.max(0, safeNumber(percent));

  if (base <= 0 || rate <= 0) return 0;
  return Math.max(1, Math.round(base * rate));
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
  const depth = Math.max(0, Math.floor(Number(floor) || 0));
  if (depth >= 5) return 2;
  if (depth >= 2) return 1;
  return 0;
}

function rollForcedFloorItem(floor) {
  const roll = Math.random();

  if (floor >= 5 && roll < 0.08 && CULTIVATION_ITEMS.vo_danh_kiem_pho) {
    return { itemId: 'vo_danh_kiem_pho', quantity: 1 };
  }

  if (roll < 0.28 && CULTIVATION_ITEMS.tu_khi_dan) {
    return { itemId: 'tu_khi_dan', quantity: 1 };
  }

  if (roll < 0.60 && CULTIVATION_ITEMS.huyen_thiet) {
    return {
      itemId: 'huyen_thiet',
      quantity: randomInt(1, Math.min(3, 1 + Math.floor(floor / 2))),
    };
  }

  return {
    itemId: 'thien_linh_thao',
    quantity: randomInt(1, Math.min(3, 1 + Math.floor(floor / 2))),
  };
}

async function fightSecretRealmWithPetBonus(
  client,
  guildId,
  userId,
  options = {},
) {
  const combat = await secretRealm.getSecretRealmCombatInfo(
    client,
    guildId,
    userId,
    options,
  );

  if (!combat?.ok) return combat;

  const profile = await getCultivationProfile(
    client,
    guildId,
    userId,
  );

  const petCombatBonus = Math.max(
    0,
    safeNumber(
      getPetEffectValue(profile, 'combat_success_bonus'),
    ),
  );
  const petCombatRewardBonus = Math.max(
    0,
    safeNumber(
      getPetEffectValue(profile, 'combat_reward_bonus'),
    ),
  );

  if (petCombatBonus <= 0 && petCombatRewardBonus <= 0) {
    return secretRealm.fightSecretRealmMonster(
      client,
      guildId,
      userId,
      options,
    );
  }

  const session = combat.session;
  const monster = combat.monster;
  const floor = Math.max(1, Number(session.floor) || 1);
  const finalWinChance = Math.min(
    1,
    Math.max(0, Number(combat.winChance) || 0) + petCombatBonus,
  );

  profile.stats ||= {};
  profile.stats.monsterEncounters =
    Math.max(0, Number(profile.stats.monsterEncounters) || 0) + 1;

  const success = Math.random() < finalWinChance;

  if (success) {
    const baseCultivation = randomInt(
      monster.cultivationMin,
      monster.cultivationMax,
    );
    const baseStones = randomInt(
      monster.stonesMin,
      monster.stonesMax,
    );
    const rewardMultiplier = 1 + petCombatRewardBonus;
    const cultivation = Math.max(
      0,
      Math.round(baseCultivation * rewardMultiplier),
    );
    const stones = Math.max(
      0,
      Math.round(baseStones * rewardMultiplier),
    );

    session.loot ||= { cultivation: 0, stones: 0, items: {} };
    session.loot.items ||= {};
    session.loot.cultivation =
      Math.max(0, safeNumber(session.loot.cultivation)) + cultivation;
    session.loot.stones =
      Math.max(0, safeNumber(session.loot.stones)) + stones;

    let droppedItem = null;

    if (Math.random() < 0.55) {
      droppedItem = rollForcedFloorItem(floor);

      if (droppedItem && CULTIVATION_ITEMS[droppedItem.itemId]) {
        const bonusQuantity = rollFractionalQuantity(
          droppedItem.quantity,
          petCombatRewardBonus,
        );
        droppedItem.quantity += bonusQuantity;
        session.loot.items[droppedItem.itemId] =
          Math.max(
            0,
            Number(session.loot.items[droppedItem.itemId]) || 0,
          ) + droppedItem.quantity;
      } else {
        droppedItem = null;
      }
    }

    session.state = 'cleared';
    session.monster = null;
    session.updatedAt = Date.now();

    await Promise.all([
      client.db.set(
        `${SECRET_REALM_PREFIX}${guildId}:${userId}`,
        session,
      ),
      saveCultivationProfile(client, profile),
    ]);

    return {
      ok: true,
      success: true,
      clearedFloor: floor,
      maxFloor: 5,
      monster,
      petAssist: Boolean(options?.petAssist),
      pet: getActivePet(profile),
      winChance: finalWinChance,
      baseWinChance: combat.winChance,
      petCombatBonus,
      petCombatRewardBonus,
      floorCultivation: cultivation,
      floorStones: stones,
      droppedItem,
      loot: session.loot,
      completed: floor >= 5,
    };
  }

  // Nếu bonus tỷ lệ thắng không cứu được lượt này, để base xử lý thất bại
  // bằng một roll chắc chắn thất bại sẽ không an toàn. Ta tái hiện nhánh fail
  // để giữ đúng mất Tu Vi/Thể Lực và cơ chế giữ 40% loot.
  const cultivationLoss = Math.min(
    Math.max(0, Number(profile.cultivation) || 0),
    randomInt(monster.lossMin, monster.lossMax),
  );
  const staminaLoss = Math.min(
    Math.max(0, Number(profile.stamina) || 0),
    randomInt(6, 12 + floor * 2),
  );

  profile.cultivation = Math.max(
    0,
    Number(profile.cultivation) - cultivationLoss,
  );
  profile.stamina = Math.max(
    0,
    Number(profile.stamina) - staminaLoss,
  );

  const keptLoot = {
    cultivation: Math.floor(safeNumber(session.loot?.cultivation) * 0.40),
    stones: Math.floor(safeNumber(session.loot?.stones) * 0.40),
    items: {},
  };
  const lostLoot = {
    cultivation: 0,
    stones: 0,
    items: {},
  };

  for (const [itemId, quantity] of Object.entries(session.loot?.items || {})) {
    const safeQuantity = Math.max(0, Math.floor(Number(quantity) || 0));
    const kept = Math.floor(safeQuantity * 0.40);
    if (kept > 0) keptLoot.items[itemId] = kept;
    lostLoot.items[itemId] = safeQuantity - kept;
  }

  lostLoot.cultivation =
    Math.max(0, safeNumber(session.loot?.cultivation) - keptLoot.cultivation);
  lostLoot.stones =
    Math.max(0, safeNumber(session.loot?.stones) - keptLoot.stones);

  profile.cultivation += keptLoot.cultivation;
  profile.totalCultivation += keptLoot.cultivation;
  profile.spiritStones =
    Math.max(0, Number(profile.spiritStones) || 0) + keptLoot.stones;

  for (const [itemId, quantity] of Object.entries(keptLoot.items)) {
    addInventoryItem(profile, itemId, quantity);
  }

  profile.cooldowns ||= {};
  profile.cooldowns.adventureAt = Date.now();

  const saved = await saveCultivationProfile(client, profile);
  await secretRealm.clearSecretRealmSession(client, guildId, userId);

  return {
    ok: true,
    success: false,
    floor,
    monster,
    cultivationLoss,
    staminaLoss,
    keptLoot,
    lostLoot,
    profile: saved,
    pet: getActivePet(saved),
    winChance: finalWinChance,
    baseWinChance: combat.winChance,
    petCombatBonus,
    petCombatRewardBonus,
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

  const profile = await getCultivationProfile(
    client,
    guildId,
    userId,
  );

  const keepPercent = Math.min(
    1,
    Math.max(
      0,
      safeNumber(
        getPetEffectValue(
          profile,
          'secret_realm_loot_keep_percent',
        ),
      ),
    ),
  );

  if (keepPercent <= 0) {
    return {
      ...result,
      activePet: getActivePet(profile),
      petLootKeepPercent: 0,
    };
  }

  const totalCultivation =
    Math.max(0, safeNumber(result.keptLoot?.cultivation)) +
    Math.max(0, safeNumber(result.lostLoot?.cultivation));
  const totalStones =
    Math.max(0, safeNumber(result.keptLoot?.stones)) +
    Math.max(0, safeNumber(result.lostLoot?.stones));

  const extraCultivation = Math.min(
    Math.max(0, safeNumber(result.lostLoot?.cultivation)),
    Math.floor(totalCultivation * keepPercent),
  );
  const extraStones = Math.min(
    Math.max(0, safeNumber(result.lostLoot?.stones)),
    Math.floor(totalStones * keepPercent),
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
      rollFractionalQuantity(total, keepPercent),
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

  const saved = await saveCultivationProfile(client, profile);

  return {
    ...result,
    profile: saved,
    activePet: getActivePet(saved),
    petLootKeepPercent: keepPercent,
    petExtraKeptLoot: {
      cultivation: extraCultivation,
      stones: extraStones,
      items: extraItems,
    },
  };
}

async function applyFormationAndPetLootBonus(
  client,
  guildId,
  userId,
  result,
  loot,
) {
  if (!result?.ok) return result;

  const [formation, profile] = await Promise.all([
    getFormationGameplayBonus(client, guildId, userId),
    getCultivationProfile(client, guildId, userId),
  ]);

  const adventurePercent = Math.max(
    0,
    safeNumber(formation.effects?.adventureBonus),
  );
  const stonePercent = Math.max(
    0,
    safeNumber(formation.effects?.spiritStoneBonus),
  );
  const petSecretRewardPercent = Math.max(
    0,
    safeNumber(
      getPetEffectValue(profile, 'secret_realm_all_reward_bonus'),
    ),
  );

  const formationAdventureBonus = calculateBonus(
    loot?.cultivation,
    adventurePercent,
  );
  const formationStoneBonus = calculateBonus(
    loot?.stones,
    stonePercent,
  );
  const petCultivationBonus = calculateBonus(
    loot?.cultivation,
    petSecretRewardPercent,
  );
  const petStoneBonus = calculateBonus(
    loot?.stones,
    petSecretRewardPercent,
  );
  const petItemBonuses = {};

  for (const [itemId, quantity] of Object.entries(loot?.items || {})) {
    const bonusQuantity = rollFractionalQuantity(
      quantity,
      petSecretRewardPercent,
    );
    if (bonusQuantity > 0) {
      addInventoryItem(profile, itemId, bonusQuantity);
      petItemBonuses[itemId] = bonusQuantity;
    }
  }

  if (formationAdventureBonus > 0 || petCultivationBonus > 0) {
    profile.cultivation += formationAdventureBonus + petCultivationBonus;
    profile.totalCultivation += formationAdventureBonus + petCultivationBonus;
  }

  if (formationStoneBonus > 0 || petStoneBonus > 0) {
    profile.spiritStones += formationStoneBonus + petStoneBonus;
  }

  const needsSave =
    formationAdventureBonus > 0 ||
    formationStoneBonus > 0 ||
    petCultivationBonus > 0 ||
    petStoneBonus > 0 ||
    Object.keys(petItemBonuses).length > 0;

  const savedProfile = needsSave
    ? await saveCultivationProfile(client, profile)
    : profile;

  return {
    ...result,
    profile: savedProfile,
    activePet: getActivePet(savedProfile),
    formationAdventureBonus,
    formationAdventurePercent: adventurePercent,
    formationStoneBonus,
    formationStonePercent: stonePercent,
    formationResonanceLines: formation.lines || [],
    petSecretRewardPercent,
    petSecretCultivationBonus: petCultivationBonus,
    petSecretStoneBonus: petStoneBonus,
    petSecretItemBonuses: petItemBonuses,
  };
}

export async function fightSecretRealmMonster(
  client,
  guildId,
  userId,
  options,
) {
  const result = await fightSecretRealmWithPetBonus(
    client,
    guildId,
    userId,
    options,
  );

  if (!result?.ok) return result;

  if (result.success) {
    const formation = await getFormationGameplayBonus(
      client,
      guildId,
      userId,
    );

    return {
      ...result,
      formationAdventurePercent: Math.max(
        0,
        safeNumber(formation.effects?.adventureBonus),
      ),
      formationStonePercent: Math.max(
        0,
        safeNumber(formation.effects?.spiritStoneBonus),
      ),
      formationResonanceLines: formation.lines || [],
    };
  }

  const petProtected = await applyPetFailureProtection(
    client,
    guildId,
    userId,
    result,
  );

  return applyFormationAndPetLootBonus(
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
      items: {
        ...(result.keptLoot?.items || {}),
        ...(petProtected.petExtraKeptLoot?.items || {}),
      },
    },
  );
}

export async function leaveSecretRealm(
  client,
  guildId,
  userId,
) {
  const result = await secretRealm.leaveSecretRealm(
    client,
    guildId,
    userId,
  );

  const rewarded = await applyFormationAndPetLootBonus(
    client,
    guildId,
    userId,
    result,
    result?.loot,
  );

  if (!rewarded?.ok) return rewarded;

  const fragmentQuantity = getSecretRealmFragmentQuantity(
    rewarded.floor,
  );

  const formationFragmentDrop = await rollFormationFragmentDrop(
    client,
    guildId,
    userId,
    {
      chance: fragmentQuantity > 0 ? 1 : 0,
      quantity: Math.max(1, fragmentQuantity),
    },
  );

  return {
    ...rewarded,
    formationFragmentDrop,
  };
}
