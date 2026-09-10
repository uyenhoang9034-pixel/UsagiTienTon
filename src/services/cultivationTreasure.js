import { Mutex } from '../utils/mutex.js';

import {
  getCultivationProfile,
  removeInventoryItem,
  saveCultivationProfile,
} from './cultivationService.js';

/**
 * =========================================================
 * BÍ BẢO · 秘宝
 * =========================================================
 *
 * Item thật trong cultivationGame.js:
 *
 * co_phu = Thượng Cổ Phù
 *
 * KHÔNG dùng thuong_co_phu.
 */

export const CULTIVATION_TALISMANS = {
  /**
   * =====================================================
   * HỘ ĐẠO PHÙ
   * =====================================================
   */

  ho_dao_phu: {
    id:
      'ho_dao_phu',

    name:
      'Hộ Đạo Phù',

    materialId:
      'co_phu',

    materialName:
      'Thượng Cổ Phù',

    materialAmount:
      1,

    description:
      'Phù văn hộ thể, thiên kiếp cũng khó tổn đạo cơ.',

    effect:
      'Lần Đột Phá thất bại kế tiếp không mất Tu Vi.',

    effectType:
      'breakthrough_protection',

    effectValue:
      1,
  },

  /**
   * =====================================================
   * TẦM BẢO PHÙ
   * =====================================================
   */

  tam_bao_phu: {
    id:
      'tam_bao_phu',

    name:
      'Tầm Bảo Phù',

    materialId:
      'co_phu',

    materialName:
      'Thượng Cổ Phù',

    materialAmount:
      1,

    description:
      'Phù quang dẫn lối, cơ duyên ẩn sâu cũng khó thoát khỏi linh thức.',

    effect:
      'Lần Thám Hiểm kế tiếp tăng mạnh tỷ lệ tìm thấy vật phẩm.',

    effectType:
      'adventure_drop_bonus',

    /**
     * +35 điểm phần trăm.
     *
     * 20% → 55%
     * 40% → 75%
     */

    effectValue:
      0.35,
  },

  /**
   * =====================================================
   * TỤ TÀI PHÙ
   * =====================================================
   */

  tu_tai_phu: {
    id:
      'tu_tai_phu',

    name:
      'Tụ Tài Phù',

    materialId:
      'co_phu',

    materialName:
      'Thượng Cổ Phù',

    materialAmount:
      1,

    description:
      'Tài khí hội tụ, linh thạch theo phù lực mà đến.',

    effect:
      'Lần Thám Hiểm kế tiếp nhận thêm 50% Linh Thạch.',

    effectType:
      'adventure_stone_bonus',

    effectValue:
      0.50,
  },
};

/**
 * =========================================================
 * GET TALISMAN
 * =========================================================
 */

export function getCultivationTalisman(
  talismanId,
) {
  return (
    CULTIVATION_TALISMANS[
      talismanId
    ] || null
  );
}

/**
 * =========================================================
 * GET TALISMAN LIST
 * =========================================================
 */

export function getCultivationTalismanList() {
  return Object.values(
    CULTIVATION_TALISMANS,
  );
}

/**
 * =========================================================
 * NORMALIZE TREASURE DATA
 * =========================================================
 */

export function ensureTreasureData(
  profile,
) {
  if (
    !profile.treasure ||
    typeof profile.treasure !==
      'object' ||
    Array.isArray(
      profile.treasure,
    )
  ) {
    profile.treasure = {
      activeTalisman:
        null,
    };
  }

  if (
    typeof profile.treasure
      .activeTalisman !==
      'string'
  ) {
    profile.treasure
      .activeTalisman =
      null;
  }

  return profile;
}

/**
 * =========================================================
 * GET ACTIVE TALISMAN
 * =========================================================
 */

export function getActiveTalisman(
  profile,
) {
  ensureTreasureData(
    profile,
  );

  const talismanId =
    profile.treasure
      .activeTalisman;

  if (!talismanId) {
    return null;
  }

  /**
   * Nếu id cũ / lỗi không còn tồn tại
   * thì không coi là active.
   */

  return (
    getCultivationTalisman(
      talismanId,
    ) || null
  );
}

/**
 * =========================================================
 * CHECK EFFECT
 * =========================================================
 */

export function hasActiveTalisman(
  profile,
  effectType,
) {
  const talisman =
    getActiveTalisman(
      profile,
    );

  return (
    talisman?.effectType ===
    effectType
  );
}

/**
 * =========================================================
 * GET EFFECT VALUE
 * =========================================================
 */

export function getTalismanEffectValue(
  profile,
  effectType,
) {
  const talisman =
    getActiveTalisman(
      profile,
    );

  if (
    !talisman ||
    talisman.effectType !==
      effectType
  ) {
    return 0;
  }

  return Math.max(
    0,
    Number(
      talisman.effectValue,
    ) || 0,
  );
}

/**
 * =========================================================
 * THƯỢNG CỔ PHÙ QUANTITY
 * =========================================================
 *
 * QUAN TRỌNG:
 *
 * cultivationGame.js đang lưu:
 *
 * co_phu: {
 *   name: 'Thượng Cổ Phù'
 * }
 */

export function getAncientTalismanQuantity(
  profile,
) {
  return Math.max(
    0,
    Number(
      profile.inventory?.[
        'co_phu'
      ],
    ) || 0,
  );
}

/**
 * =========================================================
 * KÍCH HOẠT THƯỢNG CỔ PHÙ
 * =========================================================
 */

export async function activateCultivationTalisman(
  client,
  guildId,
  userId,
  talismanId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      /**
       * =====================================================
       * VALIDATE TALISMAN
       * =====================================================
       */

      const talisman =
        getCultivationTalisman(
          talismanId,
        );

      if (!talisman) {
        return {
          ok: false,

          reason:
            'invalid_talisman',
        };
      }

      /**
       * =====================================================
       * LOAD PROFILE
       * =====================================================
       */

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      ensureTreasureData(
        profile,
      );

      /**
       * =====================================================
       * CHỈ ACTIVE 1 PHÙ
       * =====================================================
       */

      const current =
        getActiveTalisman(
          profile,
        );

      if (current) {
        return {
          ok: false,

          reason:
            'talisman_active',

          activeTalisman:
            current,

          talisman,

          profile,
        };
      }

      /**
       * =====================================================
       * CHECK THƯỢNG CỔ PHÙ
       * =====================================================
       */

      const available =
        getAncientTalismanQuantity(
          profile,
        );

      if (
        available <
        talisman.materialAmount
      ) {
        return {
          ok: false,

          reason:
            'not_enough_material',

          available,

          required:
            talisman.materialAmount,

          talisman,

          profile,
        };
      }

      /**
       * =====================================================
       * CONSUME THƯỢNG CỔ PHÙ
       * =====================================================
       */

      const removed =
        removeInventoryItem(
          profile,
          talisman.materialId,
          talisman.materialAmount,
        );

      if (!removed) {
        return {
          ok: false,

          reason:
            'consume_failed',

          talisman,

          available,

          profile,
        };
      }

      /**
       * =====================================================
       * ACTIVE EFFECT
       * =====================================================
       */

      profile.treasure
        .activeTalisman =
        talisman.id;

      /**
       * =====================================================
       * STATS
       * =====================================================
       */

      if (
        !profile.stats ||
        typeof profile.stats !==
          'object'
      ) {
        profile.stats = {};
      }

      profile.stats
        .talismansActivated =
        Math.max(
          0,
          Number(
            profile.stats
              .talismansActivated,
          ) || 0,
        ) + 1;

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

        talisman,

        consumed:
          talisman.materialAmount,

        remaining:
          saved.inventory?.[
            'co_phu'
          ] || 0,

        profile:
          saved,
      };
    },
  );
}
