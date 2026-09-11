import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import * as adventure from './cultivationAdventureV2.js';

import {
  addInventoryItem,
  getCultivationProfile,
  getCultivationRequired,
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

export * from './cultivationAdventureV2.js';

const ADVENTURE_FRAGMENT_DROP_CHANCE = 0.10;
const MATERIAL_ITEM_IDS = [
  'thien_linh_thao',
  'huyen_thiet',
].filter((itemId) => CULTIVATION_ITEMS[itemId]);

function safeNumber(value) {
  return Number(value) || 0;
}

function randomInt(min, max) {
  const safeMin = Math.ceil(Number(min) || 0);
  const safeMax = Math.max(safeMin, Math.floor(Number(max) || safeMin));
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function randomItem(items) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return items[Math.floor(Math.random() * items.length)] || null;
}

function getInventorySnapshot(profile) {
  const snapshot = {};

  for (const [itemId, quantity] of Object.entries(profile?.inventory || {})) {
    snapshot[itemId] = Math.max(0, Math.floor(Number(quantity) || 0));
  }

  return snapshot;
}

function getInventoryGains(before, after) {
  const gains = {};
  const ids = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const itemId of ids) {
    const gain =
      Math.max(0, Number(after?.[itemId]) || 0) -
      Math.max(0, Number(before?.[itemId]) || 0);

    if (gain > 0) gains[itemId] = Math.floor(gain);
  }

  return gains;
}

function rollFractionalQuantity(baseQuantity, percent) {
  const raw = Math.max(0, Number(baseQuantity) || 0) * Math.max(0, Number(percent) || 0);
  const guaranteed = Math.floor(raw);
  const fraction = raw - guaranteed;
  return guaranteed + (fraction > 0 && Math.random() < fraction ? 1 : 0);
}

async function forceCongBangCombatWin(
  client,
  guildId,
  userId,
  options = {},
) {
  const combat =
    await adventure.getAdventureV2CombatInfo(
      client,
      guildId,
      userId,
      options,
    );

  if (!combat?.ok) return combat;

  const profile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  if (
    getPetEffectValue(
      profile,
      'guaranteed_adventure_combat_win',
    ) <= 0
  ) {
    return adventure.fightAdventureV2Monster(
      client,
      guildId,
      userId,
      options,
    );
  }

  const monster = combat.monster;
  const rootBonus = Math.max(
    0,
    Number(profile.spiritRoot?.cultivateBonus) || 0,
  );

  profile.stats ||= {};
  profile.cooldowns ||= {};
  profile.stats.monsterEncounters =
    Math.max(0, Number(profile.stats.monsterEncounters) || 0) + 1;

  const baseCultivation = randomInt(
    monster.cultivationMin,
    monster.cultivationMax,
  );
  const cultivation = Math.max(
    0,
    Math.round(baseCultivation * (1 + rootBonus)),
  );
  const stones = randomInt(
    monster.stonesMin,
    monster.stonesMax,
  );

  profile.cultivation = Math.max(0, Number(profile.cultivation) || 0) + cultivation;
  profile.totalCultivation = Math.max(0, Number(profile.totalCultivation) || 0) + cultivation;
  profile.spiritStones = Math.max(0, Number(profile.spiritStones) || 0) + stones;

  let droppedItem = null;

  if (Math.random() < 0.45) {
    const lootPool = [
      'thien_linh_thao',
      'huyen_thiet',
      'tu_khi_dan',
    ].filter((itemId) => CULTIVATION_ITEMS[itemId]);
    const itemId = randomItem(lootPool);

    if (itemId) {
      addInventoryItem(profile, itemId, 1);
      droppedItem = {
        itemId,
        item: CULTIVATION_ITEMS[itemId],
        quantity: 1,
      };
    }
  }

  profile.stats.adventureCount =
    Math.max(0, Number(profile.stats.adventureCount) || 0) + 1;
  profile.cooldowns.adventureAt =
    Date.now() + CULTIVATION_CONFIG.gameplay.adventureCooldownMs;

  const saved = await saveCultivationProfile(client, profile);
  await adventure.clearAdventureV2Session(client, guildId, userId);

  return {
    ok: true,
    type: 'combat',
    success: true,
    monster,
    winChance: 1,
    guaranteedByPet: true,
    petAssist: Boolean(options?.petAssist),
    pet: getActivePet(saved),
    cultivationDelta: cultivation,
    stoneDelta: stones,
    droppedItem,
    profile: saved,
    required: getCultivationRequired(saved),
  };
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

  const beforeCultivation = safeNumber(beforeProfile.cultivation);
  const beforeStones = safeNumber(beforeProfile.spiritStones);
  const beforeInventory = getInventorySnapshot(beforeProfile);
  const activePet = getActivePet(beforeProfile);

  const petAdventureStonePercent = Math.max(
    0,
    safeNumber(
      getPetEffectValue(
        beforeProfile,
        'adventure_stone_bonus',
      ),
    ),
  );

  const petAllRewardPercent = Math.max(
    0,
    safeNumber(
      getPetEffectValue(
        beforeProfile,
        'adventure_all_reward_bonus',
      ),
    ),
  );

  const petMaterialFindPercent = Math.max(
    0,
    safeNumber(
      getPetEffectValue(
        beforeProfile,
        'adventure_material_find_bonus',
      ),
    ),
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
    safeNumber(afterProfile.cultivation) - beforeCultivation,
  );

  const stoneGain = Math.max(
    0,
    safeNumber(afterProfile.spiritStones) - beforeStones,
  );

  const afterInventory = getInventorySnapshot(afterProfile);
  const inventoryGains = getInventoryGains(beforeInventory, afterInventory);

  const hasPositiveReward =
    cultivationGain > 0 ||
    stoneGain > 0 ||
    Object.keys(inventoryGains).length > 0;

  const formationFragmentDrop =
    await rollFormationFragmentDrop(
      client,
      guildId,
      userId,
      {
        chance:
          hasPositiveReward
            ? ADVENTURE_FRAGMENT_DROP_CHANCE
            : 0,
        quantity: 1,
        formationId:
          formation.formationId || null,
      },
    );

  const adventurePercent = Math.max(
    0,
    safeNumber(formation.effects?.adventureBonus),
  );

  const stonePercent = Math.max(
    0,
    safeNumber(formation.effects?.spiritStoneBonus),
  );

  const petAdventureStoneBonus =
    stoneGain > 0 &&
    petAdventureStonePercent > 0
      ? Math.max(
          1,
          Math.round(
            stoneGain * petAdventureStonePercent,
          ),
        )
      : 0;

  const petAllCultivationBonus =
    cultivationGain > 0 &&
    petAllRewardPercent > 0
      ? Math.max(
          1,
          Math.round(
            cultivationGain * petAllRewardPercent,
          ),
        )
      : 0;

  const petAllStoneBonus =
    stoneGain > 0 &&
    petAllRewardPercent > 0
      ? Math.max(
          1,
          Math.round(
            stoneGain * petAllRewardPercent,
          ),
        )
      : 0;

  const petAllItemBonuses = {};

  if (petAllRewardPercent > 0) {
    for (const [itemId, quantity] of Object.entries(inventoryGains)) {
      const bonusQuantity = rollFractionalQuantity(
        quantity,
        petAllRewardPercent,
      );

      if (bonusQuantity > 0) {
        addInventoryItem(
          afterProfile,
          itemId,
          bonusQuantity,
        );
        petAllItemBonuses[itemId] = bonusQuantity;
      }
    }
  }

  let petMaterialFindBonus = null;

  if (
    petMaterialFindPercent > 0 &&
    MATERIAL_ITEM_IDS.length > 0 &&
    Math.random() < petMaterialFindPercent
  ) {
    const itemId = randomItem(MATERIAL_ITEM_IDS);

    if (itemId) {
      addInventoryItem(afterProfile, itemId, 1);
      petMaterialFindBonus = {
        itemId,
        item: CULTIVATION_ITEMS[itemId],
        quantity: 1,
      };
    }
  }

  const formationAdventureBonus =
    cultivationGain > 0 &&
    adventurePercent > 0
      ? Math.max(
          1,
          Math.round(
            cultivationGain * adventurePercent,
          ),
        )
      : 0;

  const formationStoneBonus =
    stoneGain > 0 &&
    stonePercent > 0
      ? Math.max(
          1,
          Math.round(
            stoneGain * stonePercent,
          ),
        )
      : 0;

  if (formationAdventureBonus > 0) {
    afterProfile.cultivation += formationAdventureBonus;
    afterProfile.totalCultivation += formationAdventureBonus;
  }

  if (petAllCultivationBonus > 0) {
    afterProfile.cultivation += petAllCultivationBonus;
    afterProfile.totalCultivation += petAllCultivationBonus;
  }

  if (petAdventureStoneBonus > 0) {
    afterProfile.spiritStones += petAdventureStoneBonus;
  }

  if (petAllStoneBonus > 0) {
    afterProfile.spiritStones += petAllStoneBonus;
  }

  if (formationStoneBonus > 0) {
    afterProfile.spiritStones += formationStoneBonus;
  }

  const needsSave =
    petAdventureStoneBonus > 0 ||
    petAllCultivationBonus > 0 ||
    petAllStoneBonus > 0 ||
    Object.keys(petAllItemBonuses).length > 0 ||
    Boolean(petMaterialFindBonus) ||
    formationAdventureBonus > 0 ||
    formationStoneBonus > 0;

  const savedProfile =
    needsSave
      ? await saveCultivationProfile(
          client,
          afterProfile,
        )
      : afterProfile;

  return {
    ...result,
    profile: savedProfile,
    activePet,
    petAdventureStoneBonus,
    petAdventureStonePercent,
    petAllRewardPercent,
    petAllCultivationBonus,
    petAllStoneBonus,
    petAllItemBonuses,
    petMaterialFindPercent,
    petMaterialFindBonus,
    formationAdventureBonus,
    formationAdventurePercent:
      adventurePercent,
    formationStoneBonus,
    formationStonePercent:
      stonePercent,
    formationFragmentDrop,
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
    forceCongBangCombatWin,
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
