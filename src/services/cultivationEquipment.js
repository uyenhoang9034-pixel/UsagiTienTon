import {
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  getCultivationProfile,
  removeInventoryItem,
  saveCultivationProfile,
} from './cultivationService.js';

export const CULTIVATION_EQUIPMENT = {
  thanh_phong_kiem: {
    id:
      'thanh_phong_kiem',

    name:
      'Thanh Phong Kiếm',

    emoji:
      '<a:ttkiem:1547448386771222619>',

    ingredientItemId:
      'huyen_thiet',

    ingredientAmount:
      3,

    successChance:
      0.9,

    effect:
      '+5% Tu Vi khi Tu Luyện',

    effectType:
      'cultivation_bonus',

    effectValue:
      0.05,
  },

  huyen_thiet_ho_phu: {
    id:
      'huyen_thiet_ho_phu',

    name:
      'Huyền Thiết Hộ Phù',

    emoji:
      '<a:ttphu:1547448667630207086>',

    ingredientItemId:
      'huyen_thiet',

    ingredientAmount:
      5,

    successChance:
      0.75,

    effect:
      'Giảm 20% Tu Vi hao tổn khi Đột Phá thất bại',

    effectType:
      'breakthrough_loss_reduction',

    effectValue:
      0.2,
  },

  tu_linh_boi: {
    id:
      'tu_linh_boi',

    name:
      'Tụ Linh Bội',

    emoji:
      '<a:ttboi:1547448623946801152>',

    ingredientItemId:
      'huyen_thiet',

    ingredientAmount:
      8,

    successChance:
      0.55,

    effect:
      '+10% Linh Thạch nhận được',

    effectType:
      'spirit_stone_bonus',

    effectValue:
      0.1,
  },
};

export function getEquipment(
  equipmentId,
) {
  return (
    CULTIVATION_EQUIPMENT[
      equipmentId
    ] || null
  );
}

export function getEquipmentList() {
  return Object.values(
    CULTIVATION_EQUIPMENT,
  );
}

export function ensureEquipmentData(
  profile,
) {
  if (
    !profile.equipment ||
    typeof profile.equipment !==
      'object'
  ) {
    profile.equipment = {
      owned: {},
      equipped: null,
    };
  }

  if (
    !profile.equipment.owned ||
    typeof profile.equipment.owned !==
      'object'
  ) {
    profile.equipment.owned =
      {};
  }

  if (
    typeof profile.equipment
      .equipped !==
      'string'
  ) {
    profile.equipment.equipped =
      null;
  }

  if (
    !profile.stats ||
    typeof profile.stats !==
      'object'
  ) {
    profile.stats = {};
  }

  profile.stats.forgeCount =
    Math.max(
      0,
      Number(
        profile.stats.forgeCount,
      ) || 0,
    );

  profile.stats.forgeSuccess =
    Math.max(
      0,
      Number(
        profile.stats.forgeSuccess,
      ) || 0,
    );

  profile.stats.forgeFail =
    Math.max(
      0,
      Number(
        profile.stats.forgeFail,
      ) || 0,
    );

  return profile;
}

export function getOwnedEquipment(
  profile,
) {
  ensureEquipmentData(
    profile,
  );

  return getEquipmentList()
    .filter(
      (equipment) =>
        Number(
          profile.equipment
            .owned[
              equipment.id
            ],
        ) > 0,
    );
}

export function getEquippedEquipment(
  profile,
) {
  ensureEquipmentData(
    profile,
  );

  if (
    !profile.equipment
      .equipped
  ) {
    return null;
  }

  return getEquipment(
    profile.equipment
      .equipped,
  );
}

export function getEquipmentBonus(
  profile,
  effectType,
) {
  const equipment =
    getEquippedEquipment(
      profile,
    );

  if (
    !equipment ||
    equipment.effectType !==
      effectType
  ) {
    return 0;
  }

  return (
    Number(
      equipment.effectValue,
    ) || 0
  );
}

export function getOreQuantity(
  profile,
) {
  return Math.max(
    0,
    Number(
      profile.inventory
        ?.huyen_thiet,
    ) || 0,
  );
}

const forgeLocks =
  new Map();

async function withForgeLock(
  key,
  callback,
) {
  while (
    forgeLocks.has(
      key,
    )
  ) {
    await forgeLocks.get(
      key,
    );
  }

  let release;

  const lock =
    new Promise(
      (resolve) => {
        release = resolve;
      },
    );

  forgeLocks.set(
    key,
    lock,
  );

  try {
    return await callback();
  } finally {
    forgeLocks.delete(
      key,
    );

    release();
  }
}

export async function forgeEquipment(
  client,
  guildId,
  userId,
  equipmentId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return withForgeLock(
    lockKey,

    async () => {
      const equipment =
        getEquipment(
          equipmentId,
        );

      if (!equipment) {
        return {
          ok: false,
          reason:
            'invalid_equipment',
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      ensureEquipmentData(
        profile,
      );

      const available =
        getOreQuantity(
          profile,
        );

      if (
        available <
        equipment.ingredientAmount
      ) {
        return {
          ok: false,
          reason:
            'not_enough_material',
          equipment,
          available,
          profile,
        };
      }

      const removed =
        removeInventoryItem(
          profile,
          equipment.ingredientItemId,
          equipment.ingredientAmount,
        );

      if (!removed) {
        return {
          ok: false,
          reason:
            'consume_failed',
          equipment,
          available,
          profile,
        };
      }

      profile.stats.forgeCount +=
        1;

      const success =
        Math.random() <
        equipment.successChance;

      if (success) {
        const current =
          Math.max(
            0,
            Number(
              profile.equipment
                .owned[
                  equipment.id
                ],
            ) || 0,
          );

        profile.equipment.owned[
          equipment.id
        ] =
          current + 1;

        profile.stats.forgeSuccess +=
          1;
      } else {
        profile.stats.forgeFail +=
          1;
      }

      const saved =
        await saveCultivationProfile(
          client,
          profile,
        );

      return {
        ok: true,
        success,
        equipment,

        consumed:
          equipment
            .ingredientAmount,

        remainingOre:
          saved.inventory
            ?.huyen_thiet ||
          0,

        ownedQuantity:
          saved.equipment
            ?.owned?.[
              equipment.id
            ] || 0,

        profile:
          saved,
      };
    },
  );
}

export async function equipCultivationEquipment(
  client,
  guildId,
  userId,
  equipmentId,
) {
  const equipment =
    getEquipment(
      equipmentId,
    );

  if (!equipment) {
    return {
      ok: false,
      reason:
        'invalid_equipment',
    };
  }

  const profile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  ensureEquipmentData(
    profile,
  );

  const owned =
    Number(
      profile.equipment
        .owned[
          equipmentId
        ],
    ) || 0;

  if (
    owned <= 0
  ) {
    return {
      ok: false,
      reason:
        'not_owned',
      equipment,
      profile,
    };
  }

  profile.equipment.equipped =
    equipmentId;

  const saved =
    await saveCultivationProfile(
      client,
      profile,
    );

  return {
    ok: true,
    equipment,
    profile:
      saved,
  };
}
