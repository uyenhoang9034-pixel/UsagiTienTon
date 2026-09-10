import {
  Mutex,
} from '../utils/mutex.js';

import {
  getCultivationProfile,
  removeInventoryItem,
  saveCultivationProfile,
} from './cultivationService.js';

export const CULTIVATION_TECHNIQUES = {
  thanh_van_kiem_quyet: {
    id:
      'thanh_van_kiem_quyet',

    name:
      'Thanh Vân Kiếm Quyết',

    emoji:
      '<a:ttbikip:1547448442022797342>',

    description:
      'Kiếm tâm nhất niệm, thanh vân tự khai.',

    materialId:
      'vo_danh_kiem_pho',

    materialName:
      'Vô Danh Kiếm Phổ',

    materialAmount:
      1,

    effect:
      '+8% Tu Vi khi Tu Luyện',

    effectType:
      'cultivation_bonus',

    effectValue:
      0.08,
  },

  huyen_nguyen_tam_phap: {
    id:
      'huyen_nguyen_tam_phap',

    name:
      'Huyền Nguyên Tâm Pháp',

    emoji:
      '<a:ttbikip:1547448442022797342>',

    description:
      'Tâm định khí hòa, đạo cơ tự nhiên viên mãn.',

    materialId:
      'vo_danh_kiem_pho',

    materialName:
      'Vô Danh Kiếm Phổ',

    materialAmount:
      1,

    effect:
      '+5% Tỷ Lệ Đột Phá',

    effectType:
      'breakthrough_bonus',

    effectValue:
      0.05,
  },

  tu_linh_chan_kinh: {
    id:
      'tu_linh_chan_kinh',

    name:
      'Tụ Linh Chân Kinh',

    emoji:
      '<a:ttbikip:1547448442022797342>',

    description:
      'Tụ thiên địa linh vận, hóa vạn khí thành tài.',

    materialId:
      'vo_danh_kiem_pho',

    materialName:
      'Vô Danh Kiếm Phổ',

    materialAmount:
      1,

    effect:
      '+8% Linh Thạch nhận được',

    effectType:
      'spirit_stone_bonus',

    effectValue:
      0.08,
  },
};

export function getTechnique(
  techniqueId,
) {
  return (
    CULTIVATION_TECHNIQUES[
      techniqueId
    ] || null
  );
}

export function getTechniqueList() {
  return Object.values(
    CULTIVATION_TECHNIQUES,
  );
}

export function ensureTechniqueData(
  profile,
) {
  if (
    !profile.techniques ||
    typeof profile.techniques !==
      'object' ||
    Array.isArray(
      profile.techniques,
    )
  ) {
    profile.techniques = {
      learned: {},
      active: null,
    };
  }

  if (
    !profile.techniques.learned ||
    typeof profile.techniques
      .learned !==
      'object' ||
    Array.isArray(
      profile.techniques
        .learned,
    )
  ) {
    profile.techniques.learned =
      {};
  }

  if (
    typeof profile.techniques
      .active !==
      'string'
  ) {
    profile.techniques.active =
      null;
  }

  return profile;
}

export function getLearnedTechniques(
  profile,
) {
  ensureTechniqueData(
    profile,
  );

  return getTechniqueList()
    .filter(
      (technique) =>
        profile.techniques
          .learned[
            technique.id
          ] === true,
    );
}

export function getActiveTechnique(
  profile,
) {
  ensureTechniqueData(
    profile,
  );

  const activeId =
    profile.techniques.active;

  if (!activeId) {
    return null;
  }

  return (
    getTechnique(
      activeId,
    ) || null
  );
}

export function getTechniqueBonus(
  profile,
  effectType,
) {
  const technique =
    getActiveTechnique(
      profile,
    );

  if (
    !technique ||
    technique.effectType !==
      effectType
  ) {
    return 0;
  }

  return Math.max(
    0,
    Number(
      technique.effectValue,
    ) || 0,
  );
}

export function getTechniqueMaterialQuantity(
  profile,
) {
  return Math.max(
    0,
    Number(
      profile.inventory
        ?.vo_danh_kiem_pho,
    ) || 0,
  );
}

export async function learnCultivationTechnique(
  client,
  guildId,
  userId,
  techniqueId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const technique =
        getTechnique(
          techniqueId,
        );

      if (!technique) {
        return {
          ok: false,
          reason:
            'invalid_technique',
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      ensureTechniqueData(
        profile,
      );

      if (
        profile.techniques
          .learned[
            technique.id
          ] === true
      ) {
        return {
          ok: false,
          reason:
            'already_learned',
          technique,
          profile,
        };
      }

      const available =
        getTechniqueMaterialQuantity(
          profile,
        );

      if (
        available <
        technique.materialAmount
      ) {
        return {
          ok: false,
          reason:
            'not_enough_material',
          technique,
          available,

          required:
            technique
              .materialAmount,

          profile,
        };
      }

      const removed =
        removeInventoryItem(
          profile,
          technique.materialId,
          technique.materialAmount,
        );

      if (!removed) {
        return {
          ok: false,
          reason:
            'consume_failed',
          technique,
          available,
          profile,
        };
      }

      profile.techniques
        .learned[
          technique.id
        ] = true;

      let autoActivated =
        false;

      if (
        !profile.techniques.active
      ) {
        profile.techniques.active =
          technique.id;

        autoActivated =
          true;
      }

      if (
        !profile.stats ||
        typeof profile.stats !==
          'object'
      ) {
        profile.stats = {};
      }

      profile.stats
        .techniquesLearned =
        Math.max(
          0,
          Number(
            profile.stats
              .techniquesLearned,
          ) || 0,
        ) + 1;

      const saved =
        await saveCultivationProfile(
          client,
          profile,
        );

      return {
        ok: true,
        technique,

        consumed:
          technique.materialAmount,

        remaining:
          saved.inventory
            ?.vo_danh_kiem_pho ||
          0,

        autoActivated,

        profile:
          saved,
      };
    },
  );
}

export async function activateCultivationTechnique(
  client,
  guildId,
  userId,
  techniqueId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const technique =
        getTechnique(
          techniqueId,
        );

      if (!technique) {
        return {
          ok: false,
          reason:
            'invalid_technique',
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      ensureTechniqueData(
        profile,
      );

      if (
        profile.techniques
          .learned[
            technique.id
          ] !== true
      ) {
        return {
          ok: false,
          reason:
            'not_learned',
          technique,
          profile,
        };
      }

      if (
        profile.techniques
          .active ===
        technique.id
      ) {
        return {
          ok: true,

          alreadyActive:
            true,

          technique,
          profile,
        };
      }

      profile.techniques.active =
        technique.id;

      const saved =
        await saveCultivationProfile(
          client,
          profile,
        );

      return {
        ok: true,

        alreadyActive:
          false,

        technique,

        profile:
          saved,
      };
    },
  );
}
