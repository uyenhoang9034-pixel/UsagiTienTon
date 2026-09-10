import { Mutex } from '../utils/mutex.js';

import {
  CULTIVATION_CONFIG,
  CULTIVATION_ADVENTURE_EVENTS,
  CULTIVATION_ADVENTURE_LOCATIONS,
  CULTIVATION_EVENTS,
  CULTIVATION_ITEMS,
  CULTIVATION_REALMS,
  CULTIVATION_STAGES,
  SPIRIT_ROOTS,
} from '../config/cultivationGame.js';

/**
 * =========================================================
 * CONSTANTS
 * =========================================================
 */

const PROFILE_PREFIX =
  'games:cultivation:profile:';

const ITEM_EFFECTS = {
  tu_khi_dan: {
    cultivationBonus:
      0.25,
  },

  hoi_nguyen_dan: {
    staminaRestore:
      30,
  },

  pha_canh_dan: {
    breakthroughBonus:
      0.10,
  },
};

const USABLE_ITEM_IDS =
  new Set(
    Object.keys(
      ITEM_EFFECTS,
    ),
  );

/**
 * =========================================================
 * LINH THÚ · V2.8
 * =========================================================
 *
 * Không import cultivationPet.js tại đây
 * để tránh circular import:
 *
 * cultivationPet.js
 * → cultivationService.js
 *
 * Vì vậy Service chỉ cần biết ID + effect.
 */

const PET_ENCOUNTER_CHANCE =
  0.10;

const PET_ENCOUNTER_POOL = [
  {
    id:
      'thanh_phong_linh_ho',

    weight:
      40,
  },

  {
    id:
      'xich_viem_hoa_dieu',

    weight:
      35,
  },

  {
    id:
      'huyen_giap_linh_quy',

    weight:
      16,
  },

  {
    id:
      'thien_loi_bach_ho',

    weight:
      9,
  },
];

/**
 * =========================================================
 * EQUIPMENT
 * =========================================================
 */

function getEquippedEquipmentId(
  profile,
) {
  return (
    profile.equipment
      ?.equipped || null
  );
}

function getEquipmentCultivationBonus(
  profile,
) {
  return (
    getEquippedEquipmentId(
      profile,
    ) ===
    'thanh_phong_kiem'
      ? 0.05
      : 0
  );
}

function getEquipmentSpiritStoneBonus(
  profile,
) {
  return (
    getEquippedEquipmentId(
      profile,
    ) ===
    'tu_linh_boi'
      ? 0.10
      : 0
  );
}

function getEquipmentBreakthroughLossReduction(
  profile,
) {
  return (
    getEquippedEquipmentId(
      profile,
    ) ===
    'huyen_thiet_ho_phu'
      ? 0.20
      : 0
  );
}

/**
 * =========================================================
 * TECHNIQUE
 * =========================================================
 */

function getActiveTechniqueId(
  profile,
) {
  return (
    profile.techniques
      ?.active || null
  );
}

function getTechniqueCultivationBonus(
  profile,
) {
  return (
    getActiveTechniqueId(
      profile,
    ) ===
    'thanh_van_kiem_quyet'
      ? 0.08
      : 0
  );
}

function getTechniqueBreakthroughBonus(
  profile,
) {
  return (
    getActiveTechniqueId(
      profile,
    ) ===
    'huyen_nguyen_tam_phap'
      ? 0.05
      : 0
  );
}

function getTechniqueSpiritStoneBonus(
  profile,
) {
  return (
    getActiveTechniqueId(
      profile,
    ) ===
    'tu_linh_chan_kinh'
      ? 0.08
      : 0
  );
}

/**
 * =========================================================
 * TALISMAN
 * =========================================================
 */

function getActiveTalismanId(
  profile,
) {
  return (
    profile.treasure
      ?.activeTalisman ||
    null
  );
}

function consumeActiveTalisman(
  profile,
) {
  if (
    profile.treasure
  ) {
    profile.treasure
      .activeTalisman =
      null;
  }
}

/**
 * =========================================================
 * PET HELPERS
 * =========================================================
 */

function getActivePetId(
  profile,
) {
  return (
    profile.pets
      ?.active || null
  );
}

/**
 * Thanh Phong Linh Hồ
 * +6% Tu Vi khi Tu Luyện.
 */

function getPetCultivationBonus(
  profile,
) {
  return (
    getActivePetId(
      profile,
    ) ===
    'thanh_phong_linh_ho'
      ? 0.06
      : 0
  );
}

/**
 * Xích Viêm Hỏa Điểu
 * +8% Linh Thạch khi Thám Hiểm.
 */

function getPetAdventureStoneBonus(
  profile,
) {
  return (
    getActivePetId(
      profile,
    ) ===
    'xich_viem_hoa_dieu'
      ? 0.08
      : 0
  );
}

/**
 * Huyền Giáp Linh Quy
 * -15% Tu Vi tổn thất khi Đột Phá fail.
 */

function getPetBreakthroughLossReduction(
  profile,
) {
  return (
    getActivePetId(
      profile,
    ) ===
    'huyen_giap_linh_quy'
      ? 0.15
      : 0
  );
}

/**
 * Thiên Lôi Bạch Hổ
 * +4% tỷ lệ Đột Phá.
 */

function getPetBreakthroughBonus(
  profile,
) {
  return (
    getActivePetId(
      profile,
    ) ===
    'thien_loi_bach_ho'
      ? 0.04
      : 0
  );
}

/**
 * =========================================================
 * BASIC HELPERS
 * =========================================================
 */

function getProfileKey(
  guildId,
  userId,
) {
  return `${PROFILE_PREFIX}${guildId}:${userId}`;
}

function getGuildProfilePrefix(
  guildId,
) {
  return `${PROFILE_PREFIX}${guildId}:`;
}

function randomInt(
  min,
  max,
) {
  return (
    Math.floor(
      Math.random() *
        (
          max -
          min +
          1
        ),
    ) +
    min
  );
}

function randomItem(
  array,
) {
  return array[
    Math.floor(
      Math.random() *
        array.length,
    )
  ];
}

function weightedPick(
  entries,
) {
  if (
    !Array.isArray(
      entries,
    ) ||
    entries.length === 0
  ) {
    return null;
  }

  const total =
    entries.reduce(
      (
        sum,
        entry,
      ) =>
        sum +
        Number(
          entry.weight ||
            0,
        ),
      0,
    );

  if (
    total <= 0
  ) {
    return entries[0];
  }

  let roll =
    Math.random() *
    total;

  for (
    const entry of entries
  ) {
    roll -=
      Number(
        entry.weight ||
          0,
      );

    if (
      roll <= 0
    ) {
      return entry;
    }
  }

  return entries[
    entries.length - 1
  ];
}

/**
 * =========================================================
 * PET ENCOUNTER
 * =========================================================
 */

function rollPetEncounter(
  profile,
) {
  /**
   * 10% mỗi lần Thám Hiểm hợp lệ.
   */

  if (
    Math.random() >
    PET_ENCOUNTER_CHANCE
  ) {
    return null;
  }

  /**
   * Không roll những con đã sở hữu.
   */

  const available =
    PET_ENCOUNTER_POOL.filter(
      (
        pet,
      ) =>
        profile.pets
          ?.owned?.[
            pet.id
          ] !== true,
    );

  if (
    available.length === 0
  ) {
    return null;
  }

  const picked =
    weightedPick(
      available,
    );

  return (
    picked?.id ||
    null
  );
}

/**
 * =========================================================
 * PROFILE
 * =========================================================
 */

export function createCultivationProfile(
  guildId,
  userId,
) {
  const spiritRoot =
    weightedPick(
      SPIRIT_ROOTS,
    );

  return {
    version: 8,

    guildId,
    userId,

    realmIndex: 0,
    stageIndex: 0,

    cultivation: 0,

    totalCultivation:
      0,

    spiritStones:
      100,

    stamina:
      CULTIVATION_CONFIG
        .gameplay
        .maxStamina,

    maxStamina:
      CULTIVATION_CONFIG
        .gameplay
        .maxStamina,

    spiritRoot: {
      id:
        spiritRoot.id,

      name:
        spiritRoot.name,

      rarity:
        spiritRoot.rarity,

      cultivateBonus:
        spiritRoot
          .cultivateBonus ||
        0,
    },

    /**
     * =====================================================
     * INVENTORY
     * =====================================================
     */

    inventory: {},

    /**
     * =====================================================
     * PHÁP KHÍ
     * =====================================================
     */

    equipment: {
      owned: {},
      equipped: null,
    },

    /**
     * =====================================================
     * CÔNG PHÁP
     * =====================================================
     */

    techniques: {
      learned: {},
      active: null,
    },

    /**
     * =====================================================
     * BÍ BẢO
     * =====================================================
     */

    treasure: {
      activeTalisman:
        null,
    },

    /**
     * =====================================================
     * LINH THÚ · V2.8
     * =====================================================
     */

    pets: {
      owned: {},
      active: null,
    },

    /**
     * =====================================================
     * DƯỢC HIỆU
     * =====================================================
     */

    effects: {
      nextCultivationBonus:
        0,

      nextBreakthroughBonus:
        0,
    },

    /**
     * =====================================================
     * COOLDOWN
     * =====================================================
     */

    cooldowns: {
      cultivateAt: 0,
      adventureAt: 0,
    },

    /**
     * =====================================================
     * STATS
     * =====================================================
     */

    stats: {
      cultivateCount:
        0,

      breakthroughSuccess:
        0,

      breakthroughFail:
        0,

      fortunes:
        0,

      adventureCount:
        0,

      greatFortunes:
        0,

      monsterEncounters:
        0,

      itemsFound:
        0,

      itemsUsed:
        0,

      alchemyCount:
        0,

      alchemySuccess:
        0,

      alchemyFail:
        0,

      forgeCount:
        0,

      forgeSuccess:
        0,

      forgeFail:
        0,

      techniquesLearned:
        0,

      talismansActivated:
        0,

      /**
       * V2.8
       */

      petsCaptured:
        0,
    },

    createdAt:
      Date.now(),

    updatedAt:
      Date.now(),
  };
}

/**
 * =========================================================
 * NORMALIZE PROFILE
 * =========================================================
 */

export function normalizeCultivationProfile(
  raw,
  guildId,
  userId,
) {
  if (
    !raw ||
    typeof raw !==
      'object'
  ) {
    return createCultivationProfile(
      guildId,
      userId,
    );
  }

  const base =
    createCultivationProfile(
      guildId,
      userId,
    );

  /**
   * =====================================================
   * INVENTORY
   * =====================================================
   */

  const inventory = {};

  const rawInventory =
    raw.inventory &&
    typeof raw.inventory ===
      'object' &&
    !Array.isArray(
      raw.inventory,
    )
      ? raw.inventory
      : {};

  for (
    const [
      itemId,
      quantity,
    ] of Object.entries(
      rawInventory,
    )
  ) {
    const safeQuantity =
      Math.max(
        0,
        Math.floor(
          Number(
            quantity,
          ) || 0,
        ),
      );

    if (
      safeQuantity > 0
    ) {
      inventory[
        itemId
      ] =
        safeQuantity;
    }
  }

  /**
   * =====================================================
   * EQUIPMENT
   * =====================================================
   */

  const ownedEquipment =
    {};

  const rawOwnedEquipment =
    raw.equipment
      ?.owned &&
    typeof raw.equipment
      .owned ===
      'object' &&
    !Array.isArray(
      raw.equipment
        .owned,
    )
      ? raw.equipment
          .owned
      : {};

  for (
    const [
      equipmentId,
      quantity,
    ] of Object.entries(
      rawOwnedEquipment,
    )
  ) {
    const safeQuantity =
      Math.max(
        0,
        Math.floor(
          Number(
            quantity,
          ) || 0,
        ),
      );

    if (
      safeQuantity > 0
    ) {
      ownedEquipment[
        equipmentId
      ] =
        safeQuantity;
    }
  }

  const equippedEquipment =
    typeof raw.equipment
      ?.equipped ===
      'string'
      ? raw.equipment
          .equipped
      : null;

  /**
   * =====================================================
   * TECHNIQUES
   * =====================================================
   */

  const learnedTechniques =
    {};

  const rawTechniques =
    raw.techniques
      ?.learned &&
    typeof raw.techniques
      .learned ===
      'object' &&
    !Array.isArray(
      raw.techniques
        .learned,
    )
      ? raw.techniques
          .learned
      : {};

  for (
    const [
      techniqueId,
      learned,
    ] of Object.entries(
      rawTechniques,
    )
  ) {
    if (
      learned === true
    ) {
      learnedTechniques[
        techniqueId
      ] =
        true;
    }
  }

  const activeTechnique =
    typeof raw.techniques
      ?.active ===
      'string'
      ? raw.techniques
          .active
      : null;

  /**
   * =====================================================
   * TALISMAN
   * =====================================================
   */

  const activeTalisman =
    typeof raw.treasure
      ?.activeTalisman ===
      'string'
      ? raw.treasure
          .activeTalisman
      : null;

  /**
   * =====================================================
   * PETS · V2.8
   * =====================================================
   */

  const ownedPets =
    {};

  const rawOwnedPets =
    raw.pets?.owned &&
    typeof raw.pets
      .owned ===
      'object' &&
    !Array.isArray(
      raw.pets.owned,
    )
      ? raw.pets.owned
      : {};

  for (
    const [
      petId,
      owned,
    ] of Object.entries(
      rawOwnedPets,
    )
  ) {
    if (
      owned === true
    ) {
      ownedPets[
        petId
      ] =
        true;
    }
  }

  let activePet =
    typeof raw.pets
      ?.active ===
      'string'
      ? raw.pets.active
      : null;

  /**
   * Không cho active một pet
   * mà profile không sở hữu.
   */

  if (
    activePet &&
    ownedPets[
      activePet
    ] !== true
  ) {
    activePet =
      null;
  }

  return {
    ...base,
    ...raw,

    version: 8,

    guildId,
    userId,

    inventory,

    equipment: {
      owned:
        ownedEquipment,

      equipped:
        equippedEquipment,
    },

    techniques: {
      learned:
        learnedTechniques,

      active:
        activeTechnique,
    },

    treasure: {
      activeTalisman,
    },

    pets: {
      owned:
        ownedPets,

      active:
        activePet,
    },

    effects: {
      ...base.effects,
      ...(raw.effects ||
        {}),
    },

    cooldowns: {
      ...base.cooldowns,
      ...(raw.cooldowns ||
        {}),
    },

    stats: {
      ...base.stats,
      ...(raw.stats ||
        {}),
    },

    spiritRoot:
      raw.spiritRoot ||
      base.spiritRoot,

    realmIndex:
      Math.max(
        0,
        Math.min(
          Number(
            raw.realmIndex,
          ) || 0,

          CULTIVATION_REALMS
            .length - 1,
        ),
      ),

    stageIndex:
      Math.max(
        0,
        Math.min(
          Number(
            raw.stageIndex,
          ) || 0,

          CULTIVATION_STAGES
            .length - 1,
        ),
      ),

    cultivation:
      Math.max(
        0,
        Number(
          raw.cultivation,
        ) || 0,
      ),

    totalCultivation:
      Math.max(
        0,
        Number(
          raw.totalCultivation,
        ) || 0,
      ),

    spiritStones:
      Math.max(
        0,
        Number(
          raw.spiritStones,
        ) || 0,
      ),

    stamina:
      Math.max(
        0,
        Number(
          raw.stamina,
        ) || 0,
      ),

    maxStamina:
      Math.max(
        1,
        Number(
          raw.maxStamina,
        ) ||
          CULTIVATION_CONFIG
            .gameplay
            .maxStamina,
      ),
  };
}

/**
 * =========================================================
 * GET / SAVE PROFILE
 * =========================================================
 */

export async function getCultivationProfile(
  client,
  guildId,
  userId,
  {
    create = true,
  } = {},
) {
  const key =
    getProfileKey(
      guildId,
      userId,
    );

  const raw =
    await client.db.get(
      key,
      null,
    );

  if (
    !raw &&
    !create
  ) {
    return null;
  }

  const profile =
    normalizeCultivationProfile(
      raw,
      guildId,
      userId,
    );

  if (
    !raw &&
    create
  ) {
    await client.db.set(
      key,
      profile,
    );
  }

  return profile;
}

export async function saveCultivationProfile(
  client,
  profile,
) {
  const data = {
    ...profile,

    version: 8,

    updatedAt:
      Date.now(),
  };

  await client.db.set(
    getProfileKey(
      data.guildId,
      data.userId,
    ),
    data,
  );

  return data;
}

/**
 * =========================================================
 * INVENTORY
 * =========================================================
 */

export function addInventoryItem(
  profile,
  itemId,
  quantity = 1,
) {
  if (
    !CULTIVATION_ITEMS[
      itemId
    ]
  ) {
    return false;
  }

  const safeQuantity =
    Math.max(
      1,
      Math.floor(
        Number(
          quantity,
        ) || 1,
      ),
    );

  if (
    !profile.inventory ||
    typeof profile.inventory !==
      'object'
  ) {
    profile.inventory =
      {};
  }

  profile.inventory[
    itemId
  ] =
    Math.max(
      0,
      Number(
        profile.inventory[
          itemId
        ],
      ) || 0,
    ) +
    safeQuantity;

  if (
    !profile.stats ||
    typeof profile.stats !==
      'object'
  ) {
    profile.stats =
      {};
  }

  profile.stats.itemsFound =
    Math.max(
      0,
      Number(
        profile.stats
          .itemsFound,
      ) || 0,
    ) +
    safeQuantity;

  return true;
}

export function removeInventoryItem(
  profile,
  itemId,
  quantity = 1,
) {
  const current =
    Math.max(
      0,
      Number(
        profile.inventory?.[
          itemId
        ],
      ) || 0,
    );

  const safeQuantity =
    Math.max(
      1,
      Math.floor(
        Number(
          quantity,
        ) || 1,
      ),
    );

  if (
    current <
    safeQuantity
  ) {
    return false;
  }

  const next =
    current -
    safeQuantity;

  if (
    next <= 0
  ) {
    delete profile.inventory[
      itemId
    ];
  } else {
    profile.inventory[
      itemId
    ] =
      next;
  }

  return true;
}

export function getInventoryEntries(
  profile,
) {
  return Object.entries(
    profile.inventory ||
      {},
  )
    .map(
      ([
        itemId,
        quantity,
      ]) => {
        const item =
          CULTIVATION_ITEMS[
            itemId
          ];

        if (
          !item ||
          quantity <= 0
        ) {
          return null;
        }

        return {
          ...item,
          quantity,
        };
      },
    )
    .filter(
      Boolean,
    );
}

export function getUsableInventoryEntries(
  profile,
) {
  return getInventoryEntries(
    profile,
  ).filter(
    (
      item,
    ) =>
      USABLE_ITEM_IDS.has(
        item.id,
      ),
  );
}

export function isCultivationItemUsable(
  itemId,
) {
  return USABLE_ITEM_IDS.has(
    itemId,
  );
}

export function getCultivationItem(
  itemId,
) {
  return (
    CULTIVATION_ITEMS[
      itemId
    ] || null
  );
}

/**
 * =========================================================
 * DROP
 * =========================================================
 */

function rollAdventureDrop(
  event,
  dropBonus = 0,
) {
  const baseChance =
    Number(
      event.dropChance,
    ) || 0;

  const dropChance =
    Math.min(
      1,
      Math.max(
        0,
        baseChance +
          dropBonus,
      ),
    );

  if (
    dropChance <= 0 ||
    Math.random() >
      dropChance
  ) {
    return null;
  }

  const drop =
    weightedPick(
      event.drops ||
        [],
    );

  if (
    !drop ||
    !CULTIVATION_ITEMS[
      drop.itemId
    ]
  ) {
    return null;
  }

  const quantity =
    randomInt(
      Math.max(
        1,
        Number(
          drop.min,
        ) || 1,
      ),

      Math.max(
        1,
        Number(
          drop.max,
        ) || 1,
      ),
    );

  return {
    item:
      CULTIVATION_ITEMS[
        drop.itemId
      ],

    itemId:
      drop.itemId,

    quantity,
  };
}

/**
 * =========================================================
 * USE ITEM
 * =========================================================
 */

export async function useCultivationItem(
  client,
  guildId,
  userId,
  itemId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const item =
        CULTIVATION_ITEMS[
          itemId
        ];

      if (
        !item ||
        !USABLE_ITEM_IDS.has(
          itemId,
        )
      ) {
        return {
          ok: false,

          reason:
            'not_usable',

          profile,
          item,
        };
      }

      const quantity =
        Math.max(
          0,
          Number(
            profile.inventory?.[
              itemId
            ],
          ) || 0,
        );

      if (
        quantity <= 0
      ) {
        return {
          ok: false,

          reason:
            'not_owned',

          profile,
          item,
        };
      }

      /**
       * =====================================================
       * TỤ KHÍ ĐAN
       * =====================================================
       */

      if (
        itemId ===
        'tu_khi_dan'
      ) {
        if (
          Number(
            profile.effects
              ?.nextCultivationBonus,
          ) > 0
        ) {
          return {
            ok: false,

            reason:
              'effect_active',

            profile,
            item,
          };
        }

        profile.effects
          .nextCultivationBonus =
          ITEM_EFFECTS
            .tu_khi_dan
            .cultivationBonus;

        removeInventoryItem(
          profile,
          itemId,
          1,
        );

        profile.stats
          .itemsUsed +=
          1;

        const saved =
          await saveCultivationProfile(
            client,
            profile,
          );

        return {
          ok: true,

          type:
            'cultivation_buff',

          item,

          bonus:
            ITEM_EFFECTS
              .tu_khi_dan
              .cultivationBonus,

          remaining:
            saved.inventory?.[
              itemId
            ] || 0,

          profile:
            saved,
        };
      }

      /**
       * =====================================================
       * HỒI NGUYÊN ĐAN
       * =====================================================
       */

      if (
        itemId ===
        'hoi_nguyen_dan'
      ) {
        if (
          profile.stamina >=
          profile.maxStamina
        ) {
          return {
            ok: false,

            reason:
              'stamina_full',

            profile,
            item,
          };
        }

        const before =
          profile.stamina;

        profile.stamina =
          Math.min(
            profile.maxStamina,

            profile.stamina +
              ITEM_EFFECTS
                .hoi_nguyen_dan
                .staminaRestore,
          );

        const restored =
          profile.stamina -
          before;

        removeInventoryItem(
          profile,
          itemId,
          1,
        );

        profile.stats
          .itemsUsed +=
          1;

        const saved =
          await saveCultivationProfile(
            client,
            profile,
          );

        return {
          ok: true,

          type:
            'stamina_restore',

          item,

          before,

          after:
            saved.stamina,

          restored,

          remaining:
            saved.inventory?.[
              itemId
            ] || 0,

          profile:
            saved,
        };
      }

      /**
       * =====================================================
       * PHÁ CẢNH ĐAN
       * =====================================================
       */

      if (
        itemId ===
        'pha_canh_dan'
      ) {
        if (
          Number(
            profile.effects
              ?.nextBreakthroughBonus,
          ) > 0
        ) {
          return {
            ok: false,

            reason:
              'effect_active',

            profile,
            item,
          };
        }

        profile.effects
          .nextBreakthroughBonus =
          ITEM_EFFECTS
            .pha_canh_dan
            .breakthroughBonus;

        removeInventoryItem(
          profile,
          itemId,
          1,
        );

        profile.stats
          .itemsUsed +=
          1;

        const saved =
          await saveCultivationProfile(
            client,
            profile,
          );

        return {
          ok: true,

          type:
            'breakthrough_buff',

          item,

          bonus:
            ITEM_EFFECTS
              .pha_canh_dan
              .breakthroughBonus,

          remaining:
            saved.inventory?.[
              itemId
            ] || 0,

          profile:
            saved,
        };
      }

      return {
        ok: false,

        reason:
          'not_usable',

        profile,
        item,
      };
    },
  );
}

/**
 * =========================================================
 * REALM HELPERS
 * =========================================================
 */

export function getRealmName(
  profile,
) {
  return (
    CULTIVATION_REALMS[
      profile.realmIndex
    ] ||
    CULTIVATION_REALMS[0]
  );
}

export function getStageName(
  profile,
) {
  return (
    CULTIVATION_STAGES[
      profile.stageIndex
    ] ||
    CULTIVATION_STAGES[0]
  );
}

export function getRealmDisplay(
  profile,
) {
  return `${getRealmName(
    profile,
  )} · ${getStageName(
    profile,
  )}`;
}

export function getProgressionIndex(
  profile,
) {
  return (
    profile.realmIndex *
      CULTIVATION_STAGES.length +
    profile.stageIndex
  );
}

export function getCultivationRequired(
  profile,
) {
  const step =
    getProgressionIndex(
      profile,
    );

  return Math.round(
    500 *
      Math.pow(
        1.42,
        step,
      ),
  );
}

export function isMaxRealm(
  profile,
) {
  return (
    profile.realmIndex >=
      CULTIVATION_REALMS
        .length - 1 &&
    profile.stageIndex >=
      CULTIVATION_STAGES
        .length - 1
  );
}

/**
 * =========================================================
 * BREAKTHROUGH CHANCE
 * =========================================================
 */

export function getBreakthroughChance(
  profile,
) {
  const step =
    getProgressionIndex(
      profile,
    );

  const base =
    CULTIVATION_CONFIG
      .gameplay
      .breakthroughBaseChance;

  const min =
    CULTIVATION_CONFIG
      .gameplay
      .breakthroughMinChance;

  return Math.max(
    min,
    base -
      step * 0.008,
  );
}

export function getEffectiveBreakthroughChance(
  profile,
) {
  const base =
    getBreakthroughChance(
      profile,
    );

  const pillBonus =
    Math.max(
      0,
      Number(
        profile.effects
          ?.nextBreakthroughBonus,
      ) || 0,
    );

  const techniqueBonus =
    getTechniqueBreakthroughBonus(
      profile,
    );

  const petBonus =
    getPetBreakthroughBonus(
      profile,
    );

  return Math.min(
    0.95,

    base +
      pillBonus +
      techniqueBonus +
      petBonus,
  );
}

/**
 * =========================================================
 * COOLDOWN
 * =========================================================
 */

export function getCultivateCooldownRemaining(
  profile,
) {
  const availableAt =
    Number(
      profile.cooldowns
        ?.cultivateAt,
    ) || 0;

  return Math.max(
    0,
    availableAt -
      Date.now(),
  );
}

export function getAdventureCooldownRemaining(
  profile,
) {
  const availableAt =
    Number(
      profile.cooldowns
        ?.adventureAt,
    ) || 0;

  return Math.max(
    0,
    availableAt -
      Date.now(),
  );
}

/**
 * =========================================================
 * TU LUYỆN
 * =========================================================
 */

export async function cultivate(
  client,
  guildId,
  userId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const cooldown =
        getCultivateCooldownRemaining(
          profile,
        );

      if (
        cooldown > 0
      ) {
        return {
          ok: false,

          reason:
            'cooldown',

          cooldownRemaining:
            cooldown,

          profile,
        };
      }

      const staminaCost =
        CULTIVATION_CONFIG
          .gameplay
          .cultivateStaminaCost;

      if (
        profile.stamina <
        staminaCost
      ) {
        return {
          ok: false,

          reason:
            'stamina',

          profile,
        };
      }

      const event =
        weightedPick(
          CULTIVATION_EVENTS,
        );

      const baseCultivation =
        randomInt(
          CULTIVATION_CONFIG
            .gameplay
            .cultivateBaseMin,

          CULTIVATION_CONFIG
            .gameplay
            .cultivateBaseMax,
        );

      const baseStones =
        randomInt(
          CULTIVATION_CONFIG
            .gameplay
            .spiritStoneMin,

          CULTIVATION_CONFIG
            .gameplay
            .spiritStoneMax,
        );

      const rootBonus =
        Number(
          profile.spiritRoot
            ?.cultivateBonus,
        ) || 0;

      let cultivationDelta =
        Math.round(
          baseCultivation *
            event
              .cultivationMultiplier *
            (
              1 +
              rootBonus
            ),
        );

      const baseStoneReward =
        Math.max(
          0,
          Math.round(
            baseStones *
              event
                .stoneMultiplier,
          ),
        );

      /**
       * =====================================================
       * PHÁP KHÍ — LINH THẠCH
       * =====================================================
       */

      const equipmentStonePercent =
        getEquipmentSpiritStoneBonus(
          profile,
        );

      const equipmentStoneBonus =
        equipmentStonePercent >
          0 &&
        baseStoneReward >
          0
          ? Math.max(
              1,

              Math.round(
                baseStoneReward *
                  equipmentStonePercent,
              ),
            )
          : 0;

      /**
       * =====================================================
       * CÔNG PHÁP — LINH THẠCH
       * =====================================================
       */

      const techniqueStonePercent =
        getTechniqueSpiritStoneBonus(
          profile,
        );

      const techniqueStoneBonus =
        techniqueStonePercent >
          0 &&
        baseStoneReward >
          0
          ? Math.max(
              1,

              Math.round(
                baseStoneReward *
                  techniqueStonePercent,
              ),
            )
          : 0;

      const stoneDelta =
        baseStoneReward +
        equipmentStoneBonus +
        techniqueStoneBonus;

      /**
       * Event âm.
       */

      if (
        cultivationDelta < 0
      ) {
        cultivationDelta =
          -Math.min(
            profile.cultivation,

            Math.abs(
              cultivationDelta,
            ),
          );
      }

      /**
       * =====================================================
       * THANH PHONG KIẾM
       * =====================================================
       */

      const equipmentCultivationPercent =
        getEquipmentCultivationBonus(
          profile,
        );

      const equipmentCultivationBonus =
        equipmentCultivationPercent >
          0 &&
        cultivationDelta >
          0
          ? Math.max(
              1,

              Math.round(
                cultivationDelta *
                  equipmentCultivationPercent,
              ),
            )
          : 0;

      /**
       * =====================================================
       * THANH VÂN KIẾM QUYẾT
       * =====================================================
       */

      const techniqueCultivationPercent =
        getTechniqueCultivationBonus(
          profile,
        );

      const techniqueCultivationBonus =
        techniqueCultivationPercent >
          0 &&
        cultivationDelta >
          0
          ? Math.max(
              1,

              Math.round(
                cultivationDelta *
                  techniqueCultivationPercent,
              ),
            )
          : 0;

      /**
       * =====================================================
       * V2.8 — THANH PHONG LINH HỒ
       * =====================================================
       */

      const petCultivationPercent =
        getPetCultivationBonus(
          profile,
        );

      const petCultivationBonus =
        petCultivationPercent >
          0 &&
        cultivationDelta >
          0
          ? Math.max(
              1,

              Math.round(
                cultivationDelta *
                  petCultivationPercent,
              ),
            )
          : 0;

      /**
       * Base.
       */

      profile.cultivation =
        Math.max(
          0,

          profile.cultivation +
            cultivationDelta,
        );

      profile.totalCultivation +=
        Math.max(
          0,
          cultivationDelta,
        );

      /**
       * Permanent bonuses.
       */

      profile.cultivation +=
        equipmentCultivationBonus +
        techniqueCultivationBonus +
        petCultivationBonus;

      profile.totalCultivation +=
        equipmentCultivationBonus +
        techniqueCultivationBonus +
        petCultivationBonus;

      /**
       * =====================================================
       * TỤ KHÍ ĐAN
       * =====================================================
       */

      const pillPercent =
        Math.max(
          0,

          Number(
            profile.effects
              ?.nextCultivationBonus,
          ) || 0,
        );

      let cultivationPillBonus =
        0;

      if (
        pillPercent > 0
      ) {
        if (
          cultivationDelta >
          0
        ) {
          cultivationPillBonus =
            Math.max(
              1,

              Math.round(
                cultivationDelta *
                  pillPercent,
              ),
            );

          profile.cultivation +=
            cultivationPillBonus;

          profile.totalCultivation +=
            cultivationPillBonus;
        }

        profile.effects
          .nextCultivationBonus =
          0;
      }

      profile.spiritStones +=
        stoneDelta;

      profile.stamina =
        Math.max(
          0,

          profile.stamina -
            staminaCost,
        );

      profile.cooldowns
        .cultivateAt =
        Date.now() +
        CULTIVATION_CONFIG
          .gameplay
          .cultivateCooldownMs;

      profile.stats
        .cultivateCount +=
        1;

      if (
        event.id ===
          'minor_fortune' ||
        event.id ===
          'great_fortune'
      ) {
        profile.stats
          .fortunes +=
          1;
      }

      const saved =
        await saveCultivationProfile(
          client,
          profile,
        );

      return {
        ok: true,

        event,

        profile:
          saved,

        cultivationDelta,

        equipmentCultivationBonus,

        equipmentCultivationPercent,

        techniqueCultivationBonus,

        techniqueCultivationPercent,

        /**
         * V2.8
         */

        petCultivationBonus,

        petCultivationPercent,

        cultivationPillBonus,

        cultivationPillPercent:
          pillPercent,

        stoneDelta,

        equipmentStoneBonus,

        equipmentStonePercent,

        techniqueStoneBonus,

        techniqueStonePercent,

        staminaCost,

        required:
          getCultivationRequired(
            saved,
          ),
      };
    },
  );
}

/**
 * =========================================================
 * THÁM HIỂM
 * =========================================================
 */

export async function adventure(
  client,
  guildId,
  userId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const cooldown =
        getAdventureCooldownRemaining(
          profile,
        );

      if (
        cooldown > 0
      ) {
        return {
          ok: false,

          reason:
            'cooldown',

          cooldownRemaining:
            cooldown,

          profile,
        };
      }

      /**
       * =====================================================
       * V2.8 — LINH THÚ HIỆN THẾ
       * =====================================================
       *
       * Đây là một event Thám Hiểm riêng.
       * Nếu gặp Linh Thú thì không roll event thường.
       */

      const petEncounter =
        rollPetEncounter(
          profile,
        );

      if (
        petEncounter
      ) {
        profile.stats
          .adventureCount +=
          1;

        profile.cooldowns
          .adventureAt =
          Date.now() +
          CULTIVATION_CONFIG
            .gameplay
            .adventureCooldownMs;

        const saved =
          await saveCultivationProfile(
            client,
            profile,
          );

        return {
          ok: true,

          petEncounter,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      /**
       * =====================================================
       * NORMAL ADVENTURE
       * =====================================================
       */

      const location =
        randomItem(
          CULTIVATION_ADVENTURE_LOCATIONS,
        );

      const event =
        weightedPick(
          CULTIVATION_ADVENTURE_EVENTS,
        );

      const activeTalismanId =
        getActiveTalismanId(
          profile,
        );

      const adventureTalisman =
        [
          'tam_bao_phu',
          'tu_tai_phu',
        ].includes(
          activeTalismanId,
        );

      let cultivationDelta =
        0;

      let stoneDelta =
        0;

      let equipmentStoneBonus =
        0;

      let techniqueStoneBonus =
        0;

      let petStoneBonus =
        0;

      let talismanStoneBonus =
        0;

      let droppedItem =
        null;

      /**
       * =====================================================
       * YÊU THÚ
       * =====================================================
       */

      if (
        event.type ===
        'monster'
      ) {
        const requestedLoss =
          randomInt(
            event.cultivationLossMin,
            event.cultivationLossMax,
          );

        const actualLoss =
          Math.min(
            profile.cultivation,
            requestedLoss,
          );

        cultivationDelta =
          -actualLoss;

        profile.cultivation =
          Math.max(
            0,

            profile.cultivation -
              actualLoss,
          );

        profile.stats
          .monsterEncounters +=
          1;
      } else {
        /**
         * ===================================================
         * NORMAL REWARD
         * ===================================================
         */

        cultivationDelta =
          randomInt(
            event.cultivationMin ||
              0,

            event.cultivationMax ||
              0,
          );

        const baseStoneReward =
          randomInt(
            event.stonesMin ||
              0,

            event.stonesMax ||
              0,
          );

        /**
         * Pháp Khí.
         */

        const equipmentStonePercent =
          getEquipmentSpiritStoneBonus(
            profile,
          );

        if (
          equipmentStonePercent >
            0 &&
          baseStoneReward > 0
        ) {
          equipmentStoneBonus =
            Math.max(
              1,

              Math.round(
                baseStoneReward *
                  equipmentStonePercent,
              ),
            );
        }

        /**
         * Công Pháp.
         */

        const techniqueStonePercent =
          getTechniqueSpiritStoneBonus(
            profile,
          );

        if (
          techniqueStonePercent >
            0 &&
          baseStoneReward > 0
        ) {
          techniqueStoneBonus =
            Math.max(
              1,

              Math.round(
                baseStoneReward *
                  techniqueStonePercent,
              ),
            );
        }

        /**
         * ===================================================
         * V2.8 — XÍCH VIÊM HỎA ĐIỂU
         * ===================================================
         */

        const petStonePercent =
          getPetAdventureStoneBonus(
            profile,
          );

        if (
          petStonePercent >
            0 &&
          baseStoneReward > 0
        ) {
          petStoneBonus =
            Math.max(
              1,

              Math.round(
                baseStoneReward *
                  petStonePercent,
              ),
            );
        }

        /**
         * Tụ Tài Phù.
         */

        if (
          activeTalismanId ===
            'tu_tai_phu' &&
          baseStoneReward >
            0
        ) {
          talismanStoneBonus =
            Math.max(
              1,

              Math.round(
                baseStoneReward *
                  0.50,
              ),
            );
        }

        /**
         * Tất cả bonus đều tính
         * trên base reward.
         */

        stoneDelta =
          baseStoneReward +
          equipmentStoneBonus +
          techniqueStoneBonus +
          petStoneBonus +
          talismanStoneBonus;

        const rootBonus =
          Number(
            profile.spiritRoot
              ?.cultivateBonus,
          ) || 0;

        cultivationDelta =
          Math.round(
            cultivationDelta *
              (
                1 +
                rootBonus
              ),
          );

        profile.cultivation +=
          cultivationDelta;

        profile.totalCultivation +=
          cultivationDelta;

        profile.spiritStones +=
          stoneDelta;

        if (
          event.type ===
          'great_fortune'
        ) {
          profile.stats
            .greatFortunes +=
            1;

          profile.stats
            .fortunes +=
            1;
        }

        /**
         * Tầm Bảo Phù.
         */

        const dropBonus =
          activeTalismanId ===
          'tam_bao_phu'
            ? 0.35
            : 0;

        droppedItem =
          rollAdventureDrop(
            event,
            dropBonus,
          );

        if (
          droppedItem
        ) {
          addInventoryItem(
            profile,
            droppedItem.itemId,
            droppedItem.quantity,
          );
        }
      }

      /**
       * =====================================================
       * CONSUME ADVENTURE TALISMAN
       * =====================================================
       */

      if (
        adventureTalisman
      ) {
        consumeActiveTalisman(
          profile,
        );
      }

      profile.stats
        .adventureCount +=
        1;

      profile.cooldowns
        .adventureAt =
        Date.now() +
        CULTIVATION_CONFIG
          .gameplay
          .adventureCooldownMs;

      const saved =
        await saveCultivationProfile(
          client,
          profile,
        );

      return {
        ok: true,

        location,

        event,

        cultivationDelta,

        stoneDelta,

        equipmentStoneBonus,

        techniqueStoneBonus,

        /**
         * V2.8
         */

        petStoneBonus,

        talismanStoneBonus,

        talismanConsumed:
          adventureTalisman,

        talismanId:
          adventureTalisman
            ? activeTalismanId
            : null,

        droppedItem,

        profile:
          saved,

        required:
          getCultivationRequired(
            saved,
          ),
      };
    },
  );
}

/**
 * =========================================================
 * ĐỘT PHÁ
 * =========================================================
 */

export async function breakthrough(
  client,
  guildId,
  userId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      if (
        isMaxRealm(
          profile,
        )
      ) {
        return {
          ok: false,

          reason:
            'max_realm',

          profile,
        };
      }

      const required =
        getCultivationRequired(
          profile,
        );

      if (
        profile.cultivation <
        required
      ) {
        return {
          ok: false,

          reason:
            'not_ready',

          required,

          profile,
        };
      }

      const baseChance =
        getBreakthroughChance(
          profile,
        );

      /**
       * Phá Cảnh Đan.
       */

      const breakthroughPillBonus =
        Math.max(
          0,

          Number(
            profile.effects
              ?.nextBreakthroughBonus,
          ) || 0,
        );

      /**
       * Huyền Nguyên Tâm Pháp.
       */

      const techniqueBreakthroughBonus =
        getTechniqueBreakthroughBonus(
          profile,
        );

      /**
       * V2.8 — Thiên Lôi Bạch Hổ.
       */

      const petBreakthroughBonus =
        getPetBreakthroughBonus(
          profile,
        );

      /**
       * Trần 95%.
       */

      const chance =
        Math.min(
          0.95,

          baseChance +
            breakthroughPillBonus +
            techniqueBreakthroughBonus +
            petBreakthroughBonus,
        );

      const oldRealm =
        getRealmDisplay(
          profile,
        );

      /**
       * Phá Cảnh Đan chỉ mất khi
       * thực sự bắt đầu Đột Phá.
       */

      if (
        breakthroughPillBonus >
        0
      ) {
        profile.effects
          .nextBreakthroughBonus =
          0;
      }

      const success =
        Math.random() <
        chance;

      /**
       * =====================================================
       * SUCCESS
       * =====================================================
       */

      if (
        success
      ) {
        profile.cultivation -=
          required;

        if (
          profile.stageIndex <
          CULTIVATION_STAGES
            .length - 1
        ) {
          profile.stageIndex +=
            1;
        } else {
          profile.stageIndex =
            0;

          profile.realmIndex +=
            1;
        }

        profile.stats
          .breakthroughSuccess +=
          1;

        const saved =
          await saveCultivationProfile(
            client,
            profile,
          );

        return {
          ok: true,

          success: true,

          chance,

          baseChance,

          breakthroughPillBonus,

          techniqueBreakthroughBonus,

          /**
           * V2.8
           */

          petBreakthroughBonus,

          oldRealm,

          newRealm:
            getRealmDisplay(
              saved,
            ),

          profile:
            saved,
        };
      }

      /**
       * =====================================================
       * FAIL
       * =====================================================
       */

      const originalLoss =
        Math.max(
          1,

          Math.round(
            required *
              CULTIVATION_CONFIG
                .gameplay
                .breakthroughFailureLossPercent,
          ),
        );

      const activeTalismanId =
        getActiveTalismanId(
          profile,
        );

      const talismanProtected =
        activeTalismanId ===
        'ho_dao_phu';

      let equipmentLossReduction =
        0;

      let equipmentLossSaved =
        0;

      let petLossReduction =
        0;

      let petLossSaved =
        0;

      let loss =
        0;

      /**
       * Hộ Đạo Phù ưu tiên cao nhất.
       */

      if (
        talismanProtected
      ) {
        loss =
          0;

        consumeActiveTalisman(
          profile,
        );
      } else {
        /**
         * Huyền Thiết Hộ Phù.
         */

        equipmentLossReduction =
          getEquipmentBreakthroughLossReduction(
            profile,
          );

        equipmentLossSaved =
          equipmentLossReduction >
            0
            ? Math.max(
                1,

                Math.round(
                  originalLoss *
                    equipmentLossReduction,
                ),
              )
            : 0;

        /**
         * V2.8 — Huyền Giáp Linh Quy.
         */

        petLossReduction =
          getPetBreakthroughLossReduction(
            profile,
          );

        petLossSaved =
          petLossReduction >
            0
            ? Math.max(
                1,

                Math.round(
                  originalLoss *
                    petLossReduction,
                ),
              )
            : 0;

        /**
         * Hai effect cộng độc lập
         * trên loss gốc.
         */

        loss =
          Math.max(
            1,

            originalLoss -
              equipmentLossSaved -
              petLossSaved,
          );
      }

      profile.cultivation =
        Math.max(
          0,

          profile.cultivation -
            loss,
        );

      profile.stats
        .breakthroughFail +=
        1;

      const saved =
        await saveCultivationProfile(
          client,
          profile,
        );

      return {
        ok: true,

        success: false,

        chance,

        baseChance,

        breakthroughPillBonus,

        techniqueBreakthroughBonus,

        /**
         * V2.8
         */

        petBreakthroughBonus,

        originalLoss,

        loss,

        equipmentLossReduction,

        equipmentLossSaved,

        petLossReduction,

        petLossSaved,

        talismanProtected,

        talismanId:
          talismanProtected
            ? 'ho_dao_phu'
            : null,

        oldRealm,

        profile:
          saved,
      };
    },
  );
}

/**
 * =========================================================
 * LEADERBOARD
 * =========================================================
 */

export async function getCultivationLeaderboard(
  client,
  guildId,
  limit = 10,
) {
  const prefix =
    getGuildProfilePrefix(
      guildId,
    );

  const keys =
    await client.db.list(
      prefix,
    );

  if (
    !Array.isArray(
      keys,
    ) ||
    keys.length === 0
  ) {
    return [];
  }

  const entries =
    [];

  for (
    const key of keys
  ) {
    const userId =
      key.slice(
        prefix.length,
      );

    if (!userId) {
      continue;
    }

    const profile =
      await getCultivationProfile(
        client,
        guildId,
        userId,
        {
          create:
            false,
        },
      );

    if (!profile) {
      continue;
    }

    entries.push({
      userId,

      profile,

      progressionIndex:
        getProgressionIndex(
          profile,
        ),
    });
  }

  entries.sort(
    (
      a,
      b,
    ) => {
      if (
        b.progressionIndex !==
        a.progressionIndex
      ) {
        return (
          b.progressionIndex -
          a.progressionIndex
        );
      }

      if (
        b.profile
          .cultivation !==
        a.profile
          .cultivation
      ) {
        return (
          b.profile
            .cultivation -
          a.profile
            .cultivation
        );
      }

      return (
        b.profile
          .totalCultivation -
        a.profile
          .totalCultivation
      );
    },
  );

  return entries.slice(
    0,
    limit,
  );
}
