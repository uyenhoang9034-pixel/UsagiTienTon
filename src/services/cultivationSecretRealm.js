import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  addInventoryItem,
  getCultivationProfile,
  getCultivationRequired,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  getActivePet,
} from './cultivationPet.js';

import {
  getEquippedEquipment,
} from './cultivationEquipment.js';

import {
  getActiveTechnique,
} from './cultivationTechnique.js';

import {
  Mutex,
} from '../utils/mutex.js';

/**
 * =========================================================
 * V2.9.3 · BÍ CẢNH
 * =========================================================
 */

const SECRET_REALM_PREFIX =
  'games:cultivation:secretRealm:';

const SECRET_REALM_MAX_AGE =
  20 * 60 * 1000;

const MAX_FLOOR =
  5;

/**
 * =========================================================
 * BÍ CẢNH
 * =========================================================
 */

export const SECRET_REALMS = {
  u_minh_bi_canh: {
    id:
      'u_minh_bi_canh',

    name:
      'U MINH CỔ CẢNH',

    description:
      'Một bí cảnh bị màn sương đen bao phủ, bên trong yêu khí và linh khí cùng tồn tại.',

    recommendedRealm:
      'Trúc Cơ trở lên',

    danger:
      3,
  },

  van_linh_bi_canh: {
    id:
      'van_linh_bi_canh',

    name:
      'VẠN LINH BÍ CẢNH',

    description:
      'Không gian cổ xưa chứa đầy linh quang, nhưng càng tiến sâu sát khí càng nặng.',

    recommendedRealm:
      'Kim Đan trở lên',

    danger:
      4,
  },

  thuong_co_bi_canh: {
    id:
      'thuong_co_bi_canh',

    name:
      'THƯỢNG CỔ BÍ CẢNH',

    description:
      'Một mảnh không gian còn sót lại từ thời thượng cổ, cơ duyên và nguy hiểm cùng tồn tại.',

    recommendedRealm:
      'Nguyên Anh trở lên',

    danger:
      5,
  },
};

/**
 * =========================================================
 * MONSTER POOL
 * =========================================================
 */

const SECRET_MONSTERS = [
  {
    id:
      'am_vu_ma_lang',

    name:
      'Ám Vụ Ma Lang',
  },

  {
    id:
      'huyen_am_doc_hat',

    name:
      'Huyền Âm Độc Hạt',
  },

  {
    id:
      'xich_huyet_yeu_xa',

    name:
      'Xích Huyết Yêu Xà',
  },

  {
    id:
      'co_thi_khoi_loi',

    name:
      'Cổ Thi Khôi Lỗi',
  },

  {
    id:
      'thien_ma_tan_hon',

    name:
      'Thiên Ma Tàn Hồn',
  },
];

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function key(
  guildId,
  userId,
) {
  return `${SECRET_REALM_PREFIX}${guildId}:${userId}`;
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

function clamp(
  value,
  min,
  max,
) {
  return Math.max(
    min,
    Math.min(
      max,
      value,
    ),
  );
}

function createEmptyLoot() {
  return {
    cultivation:
      0,

    stones:
      0,

    items: {},
  };
}

function normalizeLoot(
  raw,
) {
  const loot =
    createEmptyLoot();

  loot.cultivation =
    Math.max(
      0,
      Number(
        raw?.cultivation,
      ) || 0,
    );

  loot.stones =
    Math.max(
      0,
      Number(
        raw?.stones,
      ) || 0,
    );

  if (
    raw?.items &&
    typeof raw.items ===
      'object'
  ) {
    loot.items = {
      ...raw.items,
    };
  }

  return loot;
}

/**
 * =========================================================
 * SESSION
 * =========================================================
 */

export async function getSecretRealmSession(
  client,
  guildId,
  userId,
) {
  const session =
    await client.db.get(
      key(
        guildId,
        userId,
      ),
    );

  if (
    !session ||
    typeof session !==
      'object'
  ) {
    return null;
  }

  if (
    Date.now() -
      (
        Number(
          session.createdAt,
        ) || 0
      ) >
      SECRET_REALM_MAX_AGE
  ) {
    await client.db.set(
      key(
        guildId,
        userId,
      ),
      null,
    );

    return null;
  }

  return {
    ...session,

    loot:
      normalizeLoot(
        session.loot,
      ),
  };
}

async function saveSecretRealmSession(
  client,
  session,
) {
  session.updatedAt =
    Date.now();

  await client.db.set(
    key(
      session.guildId,
      session.userId,
    ),
    session,
  );

  return session;
}

export async function clearSecretRealmSession(
  client,
  guildId,
  userId,
) {
  await client.db.set(
    key(
      guildId,
      userId,
    ),
    null,
  );
}

/**
 * =========================================================
 * RANDOM REALM
 * =========================================================
 */

export function rollSecretRealm() {
  const realms =
    Object.values(
      SECRET_REALMS,
    );

  return randomItem(
    realms,
  );
}

/**
 * =========================================================
 * START
 * =========================================================
 */

export async function startSecretRealm(
  client,
  guildId,
  userId,
  realmId,
) {
  const realm =
    SECRET_REALMS[
      realmId
    ];

  if (!realm) {
    return {
      ok: false,

      reason:
        'invalid_realm',
    };
  }

  const profile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const session = {
    version:
      1,

    guildId,
    userId,

    realmId,

    floor:
      1,

    state:
      'floor',

    loot:
      createEmptyLoot(),

    monster:
      null,

    createdAt:
      Date.now(),

    updatedAt:
      Date.now(),
  };

  await saveSecretRealmSession(
    client,
    session,
  );


  return {
    ok: true,

    realm,

    session,

    profile,
  };
}

/**
 * =========================================================
 * FLOOR MONSTER
 * =========================================================
 */

function createFloorMonster(
  session,
) {
  const base =
    randomItem(
      SECRET_MONSTERS,
    );

  const floor =
    Math.max(
      1,
      Number(
        session.floor,
      ) || 1,
    );

  return {
    ...base,

    floor,

    danger:
      Math.min(
        5,
        1 +
          floor,
      ),

    baseChance:
      Math.max(
        0.34,
        0.78 -
          (
            floor -
            1
          ) *
            0.09,
      ),

    cultivationMin:
      80 +
      floor *
        55,

    cultivationMax:
      140 +
      floor *
        85,

    stonesMin:
      25 +
      floor *
        20,

    stonesMax:
      50 +
      floor *
        35,

    lossMin:
      35 +
      floor *
        25,

    lossMax:
      70 +
      floor *
        40,
  };
}

/**
 * =========================================================
 * ENTER FLOOR
 * =========================================================
 */

export async function enterSecretRealmFloor(
  client,
  guildId,
  userId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const session =
        await getSecretRealmSession(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        ![
          'floor',
          'cleared',
        ].includes(
          session.state,
        )
      ) {
        return {
          ok: false,

          reason:
            'session_expired',
        };
      }

      if (
        session.floor >
        MAX_FLOOR
      ) {
        return {
          ok: false,

          reason:
            'completed',
        };
      }

      const monster =
        createFloorMonster(
          session,
        );

      session.monster =
        monster;

      session.state =
        'combat';

      await saveSecretRealmSession(
        client,
        session,
      );

      return {
        ok: true,

        realm:
          SECRET_REALMS[
            session.realmId
          ],

        session,

        monster,

        loot:
          session.loot,
      };
    },
  );
}

/**
 * =========================================================
 * COMBAT INFO
 * =========================================================
 */

export async function getSecretRealmCombatInfo(
  client,
  guildId,
  userId,
  {
    petAssist = false,
  } = {},
) {
  const session =
    await getSecretRealmSession(
      client,
      guildId,
      userId,
    );

  if (
    !session ||
    session.state !==
      'combat' ||
    !session.monster
  ) {
    return {
      ok: false,

      reason:
        'session_expired',
    };
  }

  const profile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const equipment =
    getEquippedEquipment(
      profile,
    );

  const technique =
    getActiveTechnique(
      profile,
    );

  const pet =
    getActivePet(
      profile,
    );

  let chance =
    Number(
      session.monster
        .baseChance,
    ) || 0.5;

  chance +=
    Math.min(
      0.14,

      (
        Number(
          profile.realmIndex,
        ) || 0
      ) *
        0.014,
    );

  if (equipment) {
    chance +=
      0.05;
  }

  if (technique) {
    chance +=
      0.05;
  }

  if (
    petAssist &&
    pet
  ) {
    chance +=
      0.10;
  }

  chance =
    clamp(
      chance,
      0.20,
      0.90,
    );

  return {
    ok: true,

    session,
    profile,

    monster:
      session.monster,

    equipment,
    technique,
    pet,

    petAssist,

    winChance:
      chance,
  };
}

/**
 * =========================================================
 * LOOT
 * =========================================================
 */

function rollFloorItem(
  floor,
) {
  const roll =
    Math.random();

  if (
    floor >= 5 &&
    roll <
      0.08
  ) {
    return {
      itemId:
        'vo_danh_kiem_pho',

      quantity:
        1,
    };
  }

  if (
    roll <
    0.28
  ) {
    return {
      itemId:
        'tu_khi_dan',

      quantity:
        1,
    };
  }

  if (
    roll <
    0.60
  ) {
    return {
      itemId:
        'huyen_thiet',

      quantity:
        randomInt(
          1,
          Math.min(
            3,
            1 +
              Math.floor(
                floor /
                  2,
              ),
          ),
        ),
    };
  }

  return {
    itemId:
      'thien_linh_thao',

    quantity:
      randomInt(
        1,
        Math.min(
          3,
          1 +
            Math.floor(
              floor /
                2,
            ),
        ),
      ),
  };
}

function addLootItem(
  loot,
  itemId,
  quantity,
) {
  loot.items[
    itemId
  ] =
    Math.max(
      0,

      Number(
        loot.items[
          itemId
        ],
      ) || 0,
    ) +
    quantity;
}

/**
 * =========================================================
 * FIGHT
 * =========================================================
 */

export async function fightSecretRealmMonster(
  client,
  guildId,
  userId,
  {
    petAssist = false,
  } = {},
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const combat =
        await getSecretRealmCombatInfo(
          client,
          guildId,
          userId,
          {
            petAssist,
          },
        );

      if (!combat.ok) {
        return combat;
      }

      const session =
        combat.session;

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const monster =
        combat.monster;

      profile.stats.monsterEncounters =
        Math.max(
          0,

          Number(
            profile.stats
              ?.monsterEncounters,
          ) || 0,
        ) + 1;

      const success =
        Math.random() <
        combat.winChance;

      /**
       * =====================================================
       * THẮNG
       * =====================================================
       */

      if (success) {
        const cultivation =
          randomInt(
            monster.cultivationMin,
            monster.cultivationMax,
          );

        const stones =
          randomInt(
            monster.stonesMin,
            monster.stonesMax,
          );

        session.loot.cultivation +=
          cultivation;

        session.loot.stones +=
          stones;

        let droppedItem =
          null;

        if (
          Math.random() <
          0.55
        ) {
          droppedItem =
            rollFloorItem(
              session.floor,
            );

          addLootItem(
            session.loot,
            droppedItem.itemId,
            droppedItem.quantity,
          );
        }

        session.state =
          'cleared';

        session.monster =
          null;

        const clearedFloor =
          session.floor;

        await saveSecretRealmSession(
          client,
          session,
        );

        return {
          ok: true,

          success: true,

          clearedFloor,

          maxFloor:
            MAX_FLOOR,

          monster,

          petAssist,

          pet:
            combat.pet,

          winChance:
            combat.winChance,

          floorCultivation:
            cultivation,

          floorStones:
            stones,

          droppedItem,

          loot:
            session.loot,

          completed:
            clearedFloor >=
            MAX_FLOOR,
        };
      }

      /**
       * =====================================================
       * THẤT BẠI
       * =====================================================
       */

      const cultivationLoss =
        Math.min(
          profile.cultivation,

          randomInt(
            monster.lossMin,
            monster.lossMax,
          ),
        );

      const staminaLoss =
        Math.min(
          profile.stamina,

          randomInt(
            6,
            12 +
              session.floor *
                2,
          ),
        );

      profile.cultivation =
        Math.max(
          0,

          profile.cultivation -
            cultivationLoss,
        );

      profile.stamina =
        Math.max(
          0,

          profile.stamina -
            staminaLoss,
        );

      /**
       * Chỉ giữ 40% chiến lợi phẩm
       * đã tích lũy.
       */

      const keptLoot = {
        cultivation:
          Math.floor(
            session.loot
              .cultivation *
              0.40,
          ),

        stones:
          Math.floor(
            session.loot
              .stones *
              0.40,
          ),

        items: {},
      };

      for (
        const [
          itemId,
          quantity,
        ] of Object.entries(
          session.loot.items,
        )
      ) {
        const kept =
          Math.floor(
            quantity *
              0.40,
          );

        if (
          kept >
          0
        ) {
          keptLoot.items[
            itemId
          ] =
            kept;
        }
      }

      const lostLoot = {
        cultivation:
          session.loot
            .cultivation -
          keptLoot.cultivation,

        stones:
          session.loot
            .stones -
          keptLoot.stones,

        items: {},
      };

      for (
        const [
          itemId,
          quantity,
        ] of Object.entries(
          session.loot.items,
        )
      ) {
        lostLoot.items[
          itemId
        ] =
          quantity -
          (
            keptLoot.items[
              itemId
            ] || 0
          );
      }

      applyLootToProfile(
        profile,
        keptLoot,
      );

      await finishSecretRealm(
        client,
        profile,
        session.floor,
      );

      await clearSecretRealmSession(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        success: false,

        floor:
          session.floor,

        monster,

        cultivationLoss,

        staminaLoss,

        keptLoot,
        lostLoot,
      };
    },
  );
}

/**
 * =========================================================
 * NEXT FLOOR
 * =========================================================
 */

export async function continueSecretRealm(
  client,
  guildId,
  userId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const session =
        await getSecretRealmSession(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'cleared'
      ) {
        return {
          ok: false,

          reason:
            'session_expired',
        };
      }

      if (
        session.floor >=
        MAX_FLOOR
      ) {
        return {
          ok: false,

          reason:
            'max_floor',
        };
      }

      session.floor +=
        1;

      session.state =
        'floor';

      session.monster =
        null;

      await saveSecretRealmSession(
        client,
        session,
      );

      return {
        ok: true,

        session,

        realm:
          SECRET_REALMS[
            session.realmId
          ],

        loot:
          session.loot,
      };
    },
  );
}

/**
 * =========================================================
 * APPLY LOOT
 * =========================================================
 */

function applyLootToProfile(
  profile,
  loot,
) {
  const cultivation =
    Math.max(
      0,
      Math.round(
        loot.cultivation ||
          0,
      ),
    );

  const stones =
    Math.max(
      0,
      Math.round(
        loot.stones ||
          0,
      ),
    );

  profile.cultivation +=
    cultivation;

  profile.totalCultivation +=
    cultivation;

  profile.spiritStones +=
    stones;

  for (
    const [
      itemId,
      quantity,
    ] of Object.entries(
      loot.items || {},
    )
  ) {
    if (
      !CULTIVATION_ITEMS[
        itemId
      ] ||
      quantity <=
        0
    ) {
      continue;
    }

    addInventoryItem(
      profile,
      itemId,
      quantity,
    );
  }
}

/**
 * =========================================================
 * FINISH
 * =========================================================
 */

async function finishSecretRealm(
  client,
  profile,
  floor,
) {
  profile.stats.adventureCount =
    Math.max(
      0,

      Number(
        profile.stats
          ?.adventureCount,
      ) || 0,
    ) + 1;

  /**
   * Không thêm stat mới vào profile
   * ở V2.9.3 để tránh phải migrate.
   */

  profile.cooldowns.adventureAt =
    Date.now() +
    CULTIVATION_CONFIG
      .gameplay
      .adventureCooldownMs;

  return saveCultivationProfile(
    client,
    profile,
  );
}

/**
 * =========================================================
 * CASH OUT
 * =========================================================
 */

export async function leaveSecretRealm(
  client,
  guildId,
  userId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const session =
        await getSecretRealmSession(
          client,
          guildId,
          userId,
        );

      if (!session) {
        return {
          ok: false,

          reason:
            'session_expired',
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      applyLootToProfile(
        profile,
        session.loot,
      );

      const saved =
        await finishSecretRealm(
          client,
          profile,
          session.floor,
        );

      const result = {
        ok: true,

        floor:
          session.floor,

        loot:
          session.loot,

        profile:
          saved,

        required:
          getCultivationRequired(
            saved,
          ),
      };

      await clearSecretRealmSession(
        client,
        guildId,
        userId,
      );

      return result;
    },
  );
}
