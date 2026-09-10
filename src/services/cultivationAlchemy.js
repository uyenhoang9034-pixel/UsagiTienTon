import {
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  getCultivationProfile,
  removeInventoryItem,
  saveCultivationProfile,
} from './cultivationService.js';

/**
 * =========================================================
 * CULTIVATION ALCHEMY
 * =========================================================
 */

export const CULTIVATION_ALCHEMY_RECIPES = {
  tu_khi_dan: {
    id: 'tu_khi_dan',

    resultItemId:
      'tu_khi_dan',

    name:
      'Tụ Khí Đan',

    ingredientItemId:
      'thien_linh_thao',

    ingredientAmount: 2,

    successChance: 0.9,
  },

  hoi_nguyen_dan: {
    id: 'hoi_nguyen_dan',

    resultItemId:
      'hoi_nguyen_dan',

    name:
      'Hồi Nguyên Đan',

    ingredientItemId:
      'thien_linh_thao',

    ingredientAmount: 3,

    successChance: 0.8,
  },

  pha_canh_dan: {
    id: 'pha_canh_dan',

    resultItemId:
      'pha_canh_dan',

    name:
      'Phá Cảnh Đan',

    ingredientItemId:
      'thien_linh_thao',

    ingredientAmount: 5,

    successChance: 0.55,
  },
};

/**
 * =========================================================
 * RECIPE HELPERS
 * =========================================================
 */

export function getAlchemyRecipe(
  recipeId,
) {
  return (
    CULTIVATION_ALCHEMY_RECIPES[
      recipeId
    ] || null
  );
}

export function getAlchemyRecipes() {
  return Object.values(
    CULTIVATION_ALCHEMY_RECIPES,
  );
}

export function getAlchemyIngredientQuantity(
  profile,
  recipe,
) {
  if (!recipe) {
    return 0;
  }

  return Math.max(
    0,
    Number(
      profile.inventory?.[
        recipe.ingredientItemId
      ],
    ) || 0,
  );
}

/**
 * =========================================================
 * STATS
 * =========================================================
 */

function ensureAlchemyStats(
  profile,
) {
  if (
    !profile.stats ||
    typeof profile.stats !==
      'object'
  ) {
    profile.stats = {};
  }

  profile.stats.alchemyCount =
    Math.max(
      0,
      Number(
        profile.stats.alchemyCount,
      ) || 0,
    );

  profile.stats.alchemySuccess =
    Math.max(
      0,
      Number(
        profile.stats.alchemySuccess,
      ) || 0,
    );

  profile.stats.alchemyFail =
    Math.max(
      0,
      Number(
        profile.stats.alchemyFail,
      ) || 0,
    );
}

/**
 * =========================================================
 * SIMPLE PLAYER LOCK
 * =========================================================
 *
 * Khóa theo:
 *
 * cultivation:guildId:userId
 *
 * để tránh spam nút Luyện Đan cùng lúc.
 */

const alchemyLocks =
  new Map();

async function withAlchemyLock(
  key,
  callback,
) {
  while (
    alchemyLocks.has(
      key,
    )
  ) {
    await alchemyLocks.get(
      key,
    );
  }

  let release;

  const lock =
    new Promise(
      (resolve) => {
        release =
          resolve;
      },
    );

  alchemyLocks.set(
    key,
    lock,
  );

  try {
    return await callback();
  } finally {
    alchemyLocks.delete(
      key,
    );

    release();
  }
}

/**
 * =========================================================
 * BREW PILL
 * =========================================================
 */

export async function brewCultivationPill(
  client,
  guildId,
  userId,
  recipeId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return withAlchemyLock(
    lockKey,

    async () => {
      const recipe =
        getAlchemyRecipe(
          recipeId,
        );

      if (!recipe) {
        return {
          ok: false,

          reason:
            'invalid_recipe',
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      ensureAlchemyStats(
        profile,
      );

      const ingredient =
        CULTIVATION_ITEMS[
          recipe
            .ingredientItemId
        ];

      const resultItem =
        CULTIVATION_ITEMS[
          recipe
            .resultItemId
        ];

      const available =
        getAlchemyIngredientQuantity(
          profile,
          recipe,
        );

      /**
       * Không đủ nguyên liệu.
       */

      if (
        available <
        recipe.ingredientAmount
      ) {
        return {
          ok: false,

          reason:
            'not_enough_material',

          recipe,

          ingredient,

          resultItem,

          available,

          profile,
        };
      }

      /**
       * =====================================================
       * CONSUME MATERIAL
       * =====================================================
       *
       * Bắt đầu luyện là mất nguyên liệu,
       * bất kể thành công hay thất bại.
       */

      const removed =
        removeInventoryItem(
          profile,
          recipe.ingredientItemId,
          recipe.ingredientAmount,
        );

      if (!removed) {
        return {
          ok: false,

          reason:
            'consume_failed',

          recipe,

          ingredient,

          resultItem,

          available,

          profile,
        };
      }

      profile.stats.alchemyCount +=
        1;

      /**
       * =====================================================
       * ROLL
       * =====================================================
       */

      const success =
        Math.random() <
        recipe.successChance;

      /**
       * =====================================================
       * SUCCESS
       * =====================================================
       */

      if (success) {
        /**
         * Không gọi addInventoryItem().
         *
         * Vì addInventoryItem hiện tại của game
         * có tăng stats.itemsFound.
         *
         * Đan luyện ra KHÔNG phải vật phẩm
         * nhặt được từ Thám Hiểm.
         */

        if (
          !profile.inventory ||
          typeof profile.inventory !==
            'object'
        ) {
          profile.inventory =
            {};
        }

        const current =
          Math.max(
            0,
            Number(
              profile.inventory[
                recipe.resultItemId
              ],
            ) || 0,
          );

        profile.inventory[
          recipe.resultItemId
        ] =
          current + 1;

        profile.stats.alchemySuccess +=
          1;
      } else {
        /**
         * ===================================================
         * FAIL
         * ===================================================
         */

        profile.stats.alchemyFail +=
          1;
      }

      /**
       * =====================================================
       * SAVE
       * =====================================================
       */

      const saved =
        await saveCultivationProfile(
          client,
          profile,
        );

      return {
        ok: true,

        success,

        recipe,

        ingredient,

        resultItem,

        consumed:
          recipe.ingredientAmount,

        remainingIngredient:
          saved.inventory?.[
            recipe.ingredientItemId
          ] || 0,

        resultQuantity:
          saved.inventory?.[
            recipe.resultItemId
          ] || 0,

        profile:
          saved,
      };
    },
  );
}
