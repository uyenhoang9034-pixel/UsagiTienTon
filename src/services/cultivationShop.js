import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  FORMATION_ELEMENTS,
  getFormationState,
  saveFormationState,
} from './cultivationFormation.js';

import {
  getCultivationPet,
} from './cultivationPet.js';

export const CULTIVATION_SHOP_CATEGORIES = {
  materials: {
    id: 'materials',
    name: 'Nguyên Liệu',
  },
  formation: {
    id: 'formation',
    name: 'Trận Pháp',
  },
  treasures: {
    id: 'treasures',
    name: 'Kỳ Trân',
  },
  pets: {
    id: 'pets',
    name: 'Linh Thú',
  },
};

export const CULTIVATION_SHOP_ITEMS = {
  thien_linh_thao: {
    id: 'thien_linh_thao',
    category: 'materials',
    kind: 'inventory',
    targetId: 'thien_linh_thao',
    name: 'Thiên Linh Thảo',
    price: 1000,
    emoji: CULTIVATION_CONFIG.ui.emojis.herb,
  },

  huyen_thiet: {
    id: 'huyen_thiet',
    category: 'materials',
    kind: 'inventory',
    targetId: 'huyen_thiet',
    name: 'Huyền Thiết',
    price: 1000,
    emoji: CULTIVATION_CONFIG.ui.emojis.ore,
  },

  formation_essence: {
    id: 'formation_essence',
    category: 'formation',
    kind: 'formation_essence',
    name: 'Trận Văn',
    price: 2000,
    emoji: '<a:ttranvan:1547959053114671297>',
  },

  crystal_metal: {
    id: 'crystal_metal',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'metal',
    name: 'Kim Tinh Thạch',
    price: 4000,
    emoji: FORMATION_ELEMENTS.metal.emoji,
  },

  crystal_wood: {
    id: 'crystal_wood',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'wood',
    name: 'Mộc Tinh Thạch',
    price: 4000,
    emoji: FORMATION_ELEMENTS.wood.emoji,
  },

  crystal_water: {
    id: 'crystal_water',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'water',
    name: 'Thủy Tinh Thạch',
    price: 4000,
    emoji: FORMATION_ELEMENTS.water.emoji,
  },

  crystal_fire: {
    id: 'crystal_fire',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'fire',
    name: 'Hỏa Tinh Thạch',
    price: 4000,
    emoji: FORMATION_ELEMENTS.fire.emoji,
  },

  crystal_earth: {
    id: 'crystal_earth',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'earth',
    name: 'Thổ Tinh Thạch',
    price: 4000,
    emoji: FORMATION_ELEMENTS.earth.emoji,
  },

  crystal_wind: {
    id: 'crystal_wind',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'wind',
    name: 'Phong Tinh Thạch',
    price: 6000,
    emoji: FORMATION_ELEMENTS.wind.emoji,
  },

  crystal_lightning: {
    id: 'crystal_lightning',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'lightning',
    name: 'Lôi Tinh Thạch',
    price: 6000,
    emoji: FORMATION_ELEMENTS.lightning.emoji,
  },

  crystal_ice: {
    id: 'crystal_ice',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'ice',
    name: 'Băng Tinh Thạch',
    price: 6000,
    emoji: FORMATION_ELEMENTS.ice.emoji,
  },

  crystal_yin_yang: {
    id: 'crystal_yin_yang',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'yin_yang',
    name: 'Âm Dương Tinh Thạch',
    price: 9000,
    emoji: FORMATION_ELEMENTS.yin_yang.emoji,
  },

  crystal_spirit: {
    id: 'crystal_spirit',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'spirit',
    name: 'Tinh Thần Tinh Thạch',
    price: 9000,
    emoji: FORMATION_ELEMENTS.spirit.emoji,
  },

  crystal_chaos: {
    id: 'crystal_chaos',
    category: 'formation',
    kind: 'formation_crystal',
    targetId: 'chaos',
    name: 'Hỗn Độn Tinh Thạch',
    price: 12000,
    emoji: FORMATION_ELEMENTS.chaos.emoji,
  },

  vo_danh_kiem_pho: {
    id: 'vo_danh_kiem_pho',
    category: 'treasures',
    kind: 'inventory',
    targetId: 'vo_danh_kiem_pho',
    name: 'Vô Danh Kiếm Phổ',
    price: 20000,
    emoji: CULTIVATION_CONFIG.ui.emojis.swordManual,
  },

  co_phu: {
    id: 'co_phu',
    category: 'treasures',
    kind: 'inventory',
    targetId: 'co_phu',
    name: 'Thượng Cổ Phù',
    price: 20000,
    emoji: CULTIVATION_CONFIG.ui.emojis.talisman,
  },

  thai_co_long_tuong: {
    id: 'thai_co_long_tuong',
    category: 'pets',
    kind: 'pet',
    targetId: 'thai_co_long_tuong',
    name: 'Thái Cổ Long Tượng',
    price: 2000000000,
    emoji: getCultivationPet('thai_co_long_tuong')?.emoji || '',
  },
};

const purchaseLocks = new Map();

async function withPurchaseLock(key, callback) {
  while (purchaseLocks.has(key)) {
    await purchaseLocks.get(key);
  }

  let release;
  const lock = new Promise((resolve) => {
    release = resolve;
  });

  purchaseLocks.set(key, lock);

  try {
    return await callback();
  } finally {
    purchaseLocks.delete(key);
    release();
  }
}

export function getCultivationShopItem(itemId) {
  return CULTIVATION_SHOP_ITEMS[itemId] || null;
}

export function getCultivationShopItems(category = null) {
  const items = Object.values(CULTIVATION_SHOP_ITEMS);

  if (!category) {
    return items;
  }

  return items.filter((item) => item.category === category);
}

export async function getCultivationShopSnapshot(
  client,
  guildId,
  userId,
) {
  const [profile, formationState] = await Promise.all([
    getCultivationProfile(client, guildId, userId),
    getFormationState(client, guildId, userId),
  ]);

  return {
    profile,
    formationState,
  };
}

export async function buyCultivationShopItem(
  client,
  guildId,
  userId,
  itemId,
) {
  const shopItem = getCultivationShopItem(itemId);

  if (!shopItem) {
    return {
      ok: false,
      reason: 'invalid_item',
    };
  }

  const lockKey = `${guildId}:${userId}`;

  return withPurchaseLock(lockKey, async () => {
    const profile = await getCultivationProfile(
      client,
      guildId,
      userId,
    );

    const price = Math.max(0, Number(shopItem.price) || 0);

    if (shopItem.kind === 'pet') {
      const alreadyOwned =
        profile.pets?.owned?.[shopItem.targetId] === true;

      if (alreadyOwned) {
        return {
          ok: false,
          reason: 'already_owned',
          item: shopItem,
          profile,
        };
      }
    }

    if ((Number(profile.spiritStones) || 0) < price) {
      return {
        ok: false,
        reason: 'not_enough_stones',
        item: shopItem,
        profile,
      };
    }

    let formationState = null;
    let ownedQuantity = 0;

    if (shopItem.kind === 'inventory') {
      const item = CULTIVATION_ITEMS[shopItem.targetId];

      if (!item) {
        return {
          ok: false,
          reason: 'invalid_target',
          item: shopItem,
          profile,
        };
      }

      if (!profile.inventory || typeof profile.inventory !== 'object') {
        profile.inventory = {};
      }

      profile.inventory[shopItem.targetId] =
        Math.max(
          0,
          Number(profile.inventory[shopItem.targetId]) || 0,
        ) + 1;

      ownedQuantity = profile.inventory[shopItem.targetId];
    } else if (shopItem.kind === 'formation_essence') {
      formationState = await getFormationState(
        client,
        guildId,
        userId,
      );

      formationState.formationEssence =
        Math.max(0, Number(formationState.formationEssence) || 0) + 1;

      ownedQuantity = formationState.formationEssence;
    } else if (shopItem.kind === 'formation_crystal') {
      formationState = await getFormationState(
        client,
        guildId,
        userId,
      );

      if (!FORMATION_ELEMENTS[shopItem.targetId]) {
        return {
          ok: false,
          reason: 'invalid_target',
          item: shopItem,
          profile,
        };
      }

      if (
        !formationState.elementCrystals ||
        typeof formationState.elementCrystals !== 'object'
      ) {
        formationState.elementCrystals = {};
      }

      formationState.elementCrystals[shopItem.targetId] =
        Math.max(
          0,
          Number(formationState.elementCrystals[shopItem.targetId]) || 0,
        ) + 1;

      ownedQuantity =
        formationState.elementCrystals[shopItem.targetId];
    } else if (shopItem.kind === 'pet') {
      if (!profile.pets || typeof profile.pets !== 'object') {
        profile.pets = {
          owned: {},
          active: null,
        };
      }

      if (!profile.pets.owned || typeof profile.pets.owned !== 'object') {
        profile.pets.owned = {};
      }

      profile.pets.owned[shopItem.targetId] = true;
      ownedQuantity = 1;
    } else {
      return {
        ok: false,
        reason: 'invalid_kind',
        item: shopItem,
        profile,
      };
    }

    profile.spiritStones =
      Math.max(0, Number(profile.spiritStones) || 0) - price;

    const savedProfile = await saveCultivationProfile(
      client,
      profile,
    );

    if (formationState) {
      formationState = await saveFormationState(
        client,
        guildId,
        userId,
        formationState,
      );
    }

    return {
      ok: true,
      item: shopItem,
      price,
      ownedQuantity,
      profile: savedProfile,
      formationState,
    };
  });
}
