import {
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  getCultivationProfile,
  removeInventoryItem,
  saveCultivationProfile,
} from './cultivationService.js';
import { getCaveSnapshot } from './cultivationCave.js';

export const CULTIVATION_CRAFT_QUANTITIES = [1, 10, 100, 1000];

export const CULTIVATION_ALCHEMY_RECIPES = {
  tu_khi_dan: {
    id: 'tu_khi_dan',
    resultItemId: 'tu_khi_dan',
    name: 'Tụ Khí Đan',
    ingredientItemId: 'thien_linh_thao',
    ingredientAmount: 2,
    successChance: 0.9,
  },
  hoi_nguyen_dan: {
    id: 'hoi_nguyen_dan',
    resultItemId: 'hoi_nguyen_dan',
    name: 'Hồi Nguyên Đan',
    ingredientItemId: 'thien_linh_thao',
    ingredientAmount: 3,
    successChance: 0.8,
  },
  pha_canh_dan: {
    id: 'pha_canh_dan',
    resultItemId: 'pha_canh_dan',
    name: 'Phá Cảnh Đan',
    ingredientItemId: 'thien_linh_thao',
    ingredientAmount: 5,
    successChance: 0.55,
  },
};

function normalizeCraftQuantity(quantity) {
  const parsed = Math.floor(Number(quantity) || 1);
  return CULTIVATION_CRAFT_QUANTITIES.includes(parsed) ? parsed : 1;
}

export function getAlchemyRecipe(recipeId) {
  return CULTIVATION_ALCHEMY_RECIPES[recipeId] || null;
}

export function getAlchemyRecipes() {
  return Object.values(CULTIVATION_ALCHEMY_RECIPES);
}

export function getAlchemyIngredientQuantity(profile, recipe) {
  if (!recipe) return 0;
  return Math.max(
    0,
    Number(profile.inventory?.[recipe.ingredientItemId]) || 0,
  );
}

function ensureAlchemyStats(profile) {
  if (!profile.stats || typeof profile.stats !== 'object') {
    profile.stats = {};
  }

  profile.stats.alchemyCount = Math.max(
    0,
    Number(profile.stats.alchemyCount) || 0,
  );
  profile.stats.alchemySuccess = Math.max(
    0,
    Number(profile.stats.alchemySuccess) || 0,
  );
  profile.stats.alchemyFail = Math.max(
    0,
    Number(profile.stats.alchemyFail) || 0,
  );
}

const alchemyLocks = new Map();

async function withAlchemyLock(key, callback) {
  while (alchemyLocks.has(key)) {
    await alchemyLocks.get(key);
  }

  let release;
  const lock = new Promise((resolve) => {
    release = resolve;
  });
  alchemyLocks.set(key, lock);

  try {
    return await callback();
  } finally {
    alchemyLocks.delete(key);
    release();
  }
}

export async function brewCultivationPill(
  client,
  guildId,
  userId,
  recipeId,
  quantity = 1,
) {
  const lockKey = `cultivation:${guildId}:${userId}`;

  return withAlchemyLock(lockKey, async () => {
    const recipe = getAlchemyRecipe(recipeId);
    if (!recipe) {
      return { ok: false, reason: 'invalid_recipe' };
    }

    const craftQuantity = normalizeCraftQuantity(quantity);
    const profile = await getCultivationProfile(client, guildId, userId);
    ensureAlchemyStats(profile);

    const cave = await getCaveSnapshot(client, guildId, userId);
    const caveAlchemyBonus = Math.max(0, Number(cave?.alchemyBonus) || 0);
    const effectiveSuccessChance = Math.min(
      1,
      Math.max(0, Number(recipe.successChance) || 0) + caveAlchemyBonus,
    );

    const ingredient = CULTIVATION_ITEMS[recipe.ingredientItemId];
    const resultItem = CULTIVATION_ITEMS[recipe.resultItemId];
    const available = getAlchemyIngredientQuantity(profile, recipe);
    const requiredMaterial = recipe.ingredientAmount * craftQuantity;

    if (available < requiredMaterial) {
      return {
        ok: false,
        reason: 'not_enough_material',
        recipe,
        ingredient,
        resultItem,
        quantity: craftQuantity,
        requiredMaterial,
        available,
        profile,
        caveAlchemyBonus,
        effectiveSuccessChance,
      };
    }

    const removed = removeInventoryItem(
      profile,
      recipe.ingredientItemId,
      requiredMaterial,
    );

    if (!removed) {
      return {
        ok: false,
        reason: 'consume_failed',
        recipe,
        ingredient,
        resultItem,
        quantity: craftQuantity,
        requiredMaterial,
        available,
        profile,
        caveAlchemyBonus,
        effectiveSuccessChance,
      };
    }

    let successCount = 0;
    for (let index = 0; index < craftQuantity; index += 1) {
      if (Math.random() < effectiveSuccessChance) {
        successCount += 1;
      }
    }

    const failCount = craftQuantity - successCount;
    profile.stats.alchemyCount += craftQuantity;
    profile.stats.alchemySuccess += successCount;
    profile.stats.alchemyFail += failCount;

    if (successCount > 0) {
      if (!profile.inventory || typeof profile.inventory !== 'object') {
        profile.inventory = {};
      }

      profile.inventory[recipe.resultItemId] =
        Math.max(0, Number(profile.inventory[recipe.resultItemId]) || 0) +
        successCount;
    }

    const saved = await saveCultivationProfile(client, profile);

    return {
      ok: true,
      success: successCount > 0,
      quantity: craftQuantity,
      successCount,
      failCount,
      recipe,
      ingredient,
      resultItem,
      consumed: requiredMaterial,
      requiredMaterial,
      caveAlchemyBonus,
      effectiveSuccessChance,
      remainingIngredient:
        saved.inventory?.[recipe.ingredientItemId] || 0,
      resultQuantity: saved.inventory?.[recipe.resultItemId] || 0,
      profile: saved,
    };
  });
}
