import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  addInventoryItem,
  getAdventureCooldownRemaining,
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
 * V2.9 · THÁM HIỂM TƯƠNG TÁC
 * =========================================================
 */

const SESSION_PREFIX =
  'games:cultivation:adventureV2:';

const SESSION_MAX_AGE =
  15 * 60 * 1000;

/**
 * =========================================================
 * LOCATIONS
 * =========================================================
 */

export const ADVENTURE_V2_LOCATIONS = {
  thanh_van_son: {
    id: 'thanh_van_son',
    name: 'THANH VÂN SƠN',

    description:
      'Mây trắng phủ đỉnh núi, linh khí theo gió len qua từng khe đá.',

    choices: [
      {
        id: 'spirit_path',
        label: 'Đi theo linh khí',
        emoji: '1547485632971149442',
      },
      {
        id: 'monster_path',
        label: 'Tiến về tiếng gầm',
        emoji: '1547477368820469780',
      },
    ],
  },

  u_minh_coc: {
    id: 'u_minh_coc',
    name: 'U MINH CỐC',

    description:
      'Âm phong lướt qua khe núi, màn sương đen che kín con đường phía trước.',

    choices: [
      {
        id: 'black_mist',
        label: 'Đi vào màn sương',
        emoji: '1547485663065014335',
      },
      {
        id: 'abyss',
        label: 'Dò xét vực sâu',
        emoji: '1547481470690660433',
      },
    ],
  },

  xich_viem_dong: {
    id: 'xich_viem_dong',
    name: 'XÍCH VIÊM ĐỘNG',

    description:
      'Dung nham cuộn chảy dưới lòng đất, hỏa linh khí nồng đậm đến mức không khí cũng rung động.',

    choices: [
      {
        id: 'mine',
        label: 'Khai thác khoáng mạch',
        emoji: '1547448560818065498',
      },
      {
        id: 'deep_cave',
        label: 'Tiến sâu vào động',
        emoji: '1547477368820469780',
      },
    ],
  },

  dao_hoa_coc: {
    id: 'dao_hoa_coc',
    name: 'ĐÀO HOA CỐC',

    description:
      'Hoa đào phủ kín sơn cốc, hương thơm nhè nhẹ khiến đạo tâm dần tĩnh lặng.',

    choices: [
      {
        id: 'herbs',
        label: 'Thu thập linh thảo',
        emoji: '1547464708318167122',
      },
      {
        id: 'pavilion',
        label: 'Tiến tới cổ đình',
        emoji: '1547491636077142056',
      },
    ],
  },

  loi_vuc: {
    id: 'loi_vuc',
    name: 'LÔI VỰC',

    description:
      'Thiên lôi xé trời, từng tia điện quang chạy dọc mặt đất.',

    choices: [
      {
        id: 'thunder_ore',
        label: 'Thu lấy lôi khoáng',
        emoji: '1547489755724382249',
      },
      {
        id: 'follow_pet',
        label: 'Đi theo Linh Thú',
        emoji: '1547478815452954654',
      },
    ],
  },

  thuong_co_di_tich: {
    id: 'thuong_co_di_tich',
    name: 'THƯỢNG CỔ DI TÍCH',

    description:
      'Tàn tích cổ xưa chìm trong bụi thời gian, từng đạo cổ văn vẫn còn phát sáng yếu ớt.',

    choices: [
      {
        id: 'stone_gate',
        label: 'Phá giải phong ấn',
        emoji: '1547491949945028669',
      },
      {
        id: 'stone_tablet',
        label: 'Quan sát bia đá',
        emoji: '1547491781845717062',
      },
    ],
  },
};

/**
 * =========================================================
 * MONSTERS
 * =========================================================
 */

const MONSTERS = {
  thanh_van_son: [
    {
      id: 'huyet_nhan_ma_lang',
      name: 'Huyết Nhãn Ma Lang',
      danger: 3,
      baseChance: 0.70,

      cultivationMin: 120,
      cultivationMax: 220,

      stonesMin: 30,
      stonesMax: 65,

      lossMin: 55,
      lossMax: 110,
    },
  ],

  u_minh_coc: [
    {
      id: 'u_minh_doc_hạt',
      name: 'U Minh Độc Hạt',
      danger: 3,
      baseChance: 0.66,

      cultivationMin: 130,
      cultivationMax: 230,

      stonesMin: 35,
      stonesMax: 70,

      lossMin: 60,
      lossMax: 120,
    },
  ],

  xich_viem_dong: [
    {
      id: 'xich_viem_ma_tich',
      name: 'Xích Viêm Ma Tích',
      danger: 4,
      baseChance: 0.60,

      cultivationMin: 160,
      cultivationMax: 280,

      stonesMin: 45,
      stonesMax: 90,

      lossMin: 75,
      lossMax: 145,
    },
  ],

  loi_vuc: [
    {
      id: 'loi_giac_thu',
      name: 'Lôi Giác Thú',
      danger: 4,
      baseChance: 0.58,

      cultivationMin: 170,
      cultivationMax: 300,

      stonesMin: 50,
      stonesMax: 100,

      lossMin: 80,
      lossMax: 150,
    },
  ],

  thuong_co_di_tich: [
    {
      id: 'co_thi_khoi_loi',
      name: 'Cổ Thi Khôi Lỗi',
      danger: 5,
      baseChance: 0.53,

      cultivationMin: 210,
      cultivationMax: 360,

      stonesMin: 65,
      stonesMax: 130,

      lossMin: 100,
      lossMax: 180,
    },
  ],

  default: [
    {
      id: 'son_lam_yeu_thu',
      name: 'Sơn Lâm Yêu Thú',
      danger: 2,
      baseChance: 0.75,

      cultivationMin: 90,
      cultivationMax: 170,

      stonesMin: 20,
      stonesMax: 50,

      lossMin: 40,
      lossMax: 90,
    },
  ],
};

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function getSessionKey(
  guildId,
  userId,
) {
  return `${SESSION_PREFIX}${guildId}:${userId}`;
}

function randomInt(
  min,
  max,
) {
  const safeMin =
    Math.ceil(
      Number(min) || 0,
    );

  const safeMax =
    Math.floor(
      Number(max) || safeMin,
    );

  return Math.floor(
    Math.random() *
      (
        safeMax -
        safeMin +
        1
      ),
  ) + safeMin;
}

function randomItem(
  items,
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return null;
  }

  return items[
    Math.floor(
      Math.random() *
        items.length,
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

function getLocation(
  locationId,
) {
  return (
    ADVENTURE_V2_LOCATIONS[
      locationId
    ] || null
  );
}

function getMonster(
  locationId,
) {
  return randomItem(
    MONSTERS[locationId] ||
      MONSTERS.default,
  );
}

function getRootCultivationBonus(
  profile,
) {
  return Math.max(
    0,
    Number(
      profile?.spiritRoot
        ?.cultivateBonus,
    ) || 0,
  );
}

/**
 * =========================================================
 * SESSION
 * =========================================================
 */

export async function getAdventureV2Session(
  client,
  guildId,
  userId,
) {
  const key =
    getSessionKey(
      guildId,
      userId,
    );

  const session =
    await client.db.get(
      key,
    );

  if (
    !session ||
    typeof session !==
      'object'
  ) {
    return null;
  }

  const createdAt =
    Number(
      session.createdAt,
    ) || 0;

  if (
    !createdAt ||
    Date.now() -
      createdAt >
      SESSION_MAX_AGE
  ) {
    await client.db.set(
      key,
      null,
    );

    return null;
  }

  return session;
}

async function saveSession(
  client,
  session,
) {
  await client.db.set(
    getSessionKey(
      session.guildId,
      session.userId,
    ),
    session,
  );

  return session;
}

export async function clearAdventureV2Session(
  client,
  guildId,
  userId,
) {
  await client.db.set(
    getSessionKey(
      guildId,
      userId,
    ),
    null,
  );
}

/**
 * =========================================================
 * PREVIEW
 * =========================================================
 */

export async function getAdventureV2Preview(
  client,
  guildId,
  userId,
) {
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

  return {
    ok:
      cooldown <= 0,

    reason:
      cooldown > 0
        ? 'cooldown'
        : null,

    cooldownRemaining:
      cooldown,

    profile,

    equipment:
      getEquippedEquipment(
        profile,
      ),

    technique:
      getActiveTechnique(
        profile,
      ),

    pet:
      getActivePet(
        profile,
      ),
  };
}

/**
 * =========================================================
 * START
 * =========================================================
 */

export async function startAdventureV2(
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

      const locations =
        Object.values(
          ADVENTURE_V2_LOCATIONS,
        );

      const location =
        randomItem(
          locations,
        );

      const session = {
        version: 1,

        guildId,
        userId,

        locationId:
          location.id,

        state:
          'location',

        monster:
          null,

        createdAt:
          Date.now(),

        updatedAt:
          Date.now(),
      };

      await saveSession(
        client,
        session,
      );

      return {
        ok: true,

        session,
        location,
        profile,
      };
    },
  );
}

/**
 * =========================================================
 * FINISH NORMAL ADVENTURE
 * =========================================================
 */

async function finishAdventure(
  client,
  profile,
) {
  profile.stats.adventureCount =
    Math.max(
      0,
      Number(
        profile.stats
          ?.adventureCount,
      ) || 0,
    ) + 1;

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
 * REWARD
 * =========================================================
 */

function applyCultivationReward(
  profile,
  baseAmount,
) {
  const rootBonus =
    getRootCultivationBonus(
      profile,
    );

  const amount =
    Math.max(
      0,
      Math.round(
        baseAmount *
          (
            1 +
            rootBonus
          ),
      ),
    );

  profile.cultivation +=
    amount;

  profile.totalCultivation +=
    amount;

  return amount;
}

function applyStoneReward(
  profile,
  amount,
) {
  const safeAmount =
    Math.max(
      0,
      Math.round(
        amount,
      ),
    );

  profile.spiritStones +=
    safeAmount;

  return safeAmount;
}

function giveItem(
  profile,
  itemId,
  quantity = 1,
) {
  const item =
    CULTIVATION_ITEMS[
      itemId
    ];

  if (!item) {
    return null;
  }

  addInventoryItem(
    profile,
    itemId,
    quantity,
  );

  return {
    itemId,
    item,
    quantity,
  };
}

/**
 * =========================================================
 * LOCATION CHOICE
 * =========================================================
 */

export async function resolveAdventureV2Choice(
  client,
  guildId,
  userId,
  choiceId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,

    async () => {
      const session =
        await getAdventureV2Session(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'location'
      ) {
        return {
          ok: false,
          reason:
            'session_expired',
        };
      }

      const location =
        getLocation(
          session.locationId,
        );

      if (!location) {
        return {
          ok: false,
          reason:
            'invalid_location',
        };
      }

      const validChoice =
        location.choices.find(
          choice =>
            choice.id ===
            choiceId,
        );

      if (!validChoice) {
        return {
          ok: false,
          reason:
            'invalid_choice',
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      /**
       * ===============================================
       * V2.9.5 · PHÁP KHÍ / CÔNG PHÁP CỘNG MINH
       * ===============================================
       *
       * 18% cơ hội nếu có Pháp Khí hoặc
       * Công Pháp đang kích hoạt.
       *
       * Không đè:
       * - Cổ Đình / Merchant
       * - Linh Thú
       * - Cổng Đá
       * - Bia Đá
       */

      if (
        ![
          'pavilion',
          'follow_pet',
          'stone_gate',
          'stone_tablet',
        ].includes(
          choiceId,
        )
      ) {
        const {
          rollAdventureResonance,
          resolveEquipmentResonance,
          resolveTechniqueResonance,
        } = await import(
          './cultivationAdventureV295.js'
        );

        const resonance =
          rollAdventureResonance(
            profile,
          );

        if (
          resonance?.type ===
          'equipment_resonance'
        ) {
          return resolveEquipmentResonance(
            client,
            guildId,
            userId,
          );
        }

        if (
          resonance?.type ===
          'technique_resonance'
        ) {
          return resolveTechniqueResonance(
            client,
            guildId,
            userId,
          );
        }
      }

      /**
       * ===============================================
       * THANH VÂN SƠN · LINH KHÍ
       * ===============================================
       */

      if (
        choiceId ===
        'spirit_path'
      ) {
        const cultivation =
          applyCultivationReward(
            profile,
            randomInt(
              110,
              190,
            ),
          );

        const stones =
          applyStoneReward(
            profile,
            randomInt(
              15,
              40,
            ),
          );

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,
          type:
            'spirit_fortune',

          location,

          cultivationDelta:
            cultivation,

          stoneDelta:
            stones,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      /**
       * ===============================================
       * U MINH · MÀN SƯƠNG
       * ===============================================
       */

      if (
        choiceId ===
        'black_mist'
      ) {
        const cultivation =
          applyCultivationReward(
            profile,
            randomInt(
              80,
              160,
            ),
          );

        const stones =
          applyStoneReward(
            profile,
            randomInt(
              25,
              55,
            ),
          );

        let droppedItem =
          null;

        if (
          Math.random() <
          0.40
        ) {
          droppedItem =
            giveItem(
              profile,
              'tu_khi_dan',
              1,
            );
        }

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,
          type:
            'black_mist',

          location,

          cultivationDelta:
            cultivation,

          stoneDelta:
            stones,

          droppedItem,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      /**
       * ===============================================
       * XÍCH VIÊM · KHOÁNG MẠCH
       * ===============================================
       */

      if (
        choiceId ===
        'mine'
      ) {
        const stones =
          applyStoneReward(
            profile,
            randomInt(
              45,
              90,
            ),
          );

        const quantity =
          randomInt(
            1,
            2,
          );

        const droppedItem =
          giveItem(
            profile,
            'huyen_thiet',
            quantity,
          );

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,
          type:
            'ore',

          location,

          cultivationDelta:
            0,

          stoneDelta:
            stones,

          droppedItem,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      /**
       * ===============================================
       * ĐÀO HOA · LINH THẢO
       * ===============================================
       */

      if (
        choiceId ===
        'herbs'
      ) {
        const quantity =
          randomInt(
            1,
            3,
          );

        const droppedItem =
          giveItem(
            profile,
            'thien_linh_thao',
            quantity,
          );

        const cultivation =
          applyCultivationReward(
            profile,
            randomInt(
              55,
              110,
            ),
          );

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,
          type:
            'herb',

          location,

          cultivationDelta:
            cultivation,

          stoneDelta:
            0,

          droppedItem,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      /**
       * ===============================================
       * ĐÀO HOA · CỔ ĐÌNH
       * ===============================================
       */

      if (
        choiceId ===
        'pavilion'
      ) {
        const {
          rollPavilionSpecialEvent,
          startAdventureMerchant,
          resolveHeavenlyFortune,
        } = await import(
          './cultivationAdventureV294.js'
        );

        const specialEvent =
          rollPavilionSpecialEvent();

        /**
         * 30% · THƯƠNG NHÂN THẦN BÍ
         */

        if (
          specialEvent ===
          'merchant'
        ) {
          return startAdventureMerchant(
            client,
            guildId,
            userId,
          );
        }

        /**
         * 8% · THIÊN ĐẠO CƠ DUYÊN
         */

        if (
          specialEvent ===
          'heavenly_fortune'
        ) {
          return resolveHeavenlyFortune(
            client,
            guildId,
            userId,
          );
        }

        /**
         * CỔ ĐÌNH BÌNH THƯỜNG
         */

        const cultivation =
          applyCultivationReward(
            profile,
            randomInt(
              140,
              240,
            ),
          );

        const stones =
          applyStoneReward(
            profile,
            randomInt(
              20,
              50,
            ),
          );

        profile.stats.fortunes =
          Math.max(
            0,
            Number(
              profile.stats
                ?.fortunes,
            ) || 0,
          ) + 1;

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,

          type:
            'pavilion',

          location,

          cultivationDelta:
            cultivation,

          stoneDelta:
            stones,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      /**
       * ===============================================
       * LÔI VỰC · LÔI KHOÁNG
       * ===============================================
       */

      if (
        choiceId ===
        'thunder_ore'
      ) {
        const stones =
          applyStoneReward(
            profile,
            randomInt(
              55,
              105,
            ),
          );

        const droppedItem =
          giveItem(
            profile,
            'huyen_thiet',
            randomInt(
              1,
              2,
            ),
          );

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,
          type:
            'thunder_ore',

          location,

          cultivationDelta:
            0,

          stoneDelta:
            stones,

          droppedItem,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      /**
       * ===============================================
       * V2.9.5 · LÔI VỰC · LINH THÚ
       * ===============================================
       */

      if (
        choiceId ===
        'follow_pet'
      ) {
        const {
          startAdventurePetEncounter,
        } = await import(
          './cultivationAdventureV295.js'
        );

        const petResult =
          await startAdventurePetEncounter(
            client,
            guildId,
            userId,
          );

        /**
         * Đã có đủ 4 Linh Thú.
         * Giữ fallback reward cũ.
         */

        if (
          !petResult.ok &&
          petResult.reason ===
            'all_pets_owned'
        ) {
          const cultivation =
            applyCultivationReward(
              profile,
              randomInt(
                100,
                180,
              ),
            );

          const stones =
            applyStoneReward(
              profile,
              randomInt(
                30,
                65,
              ),
            );

          const saved =
            await finishAdventure(
              client,
              profile,
            );

          await clearAdventureV2Session(
            client,
            guildId,
            userId,
          );

          return {
            ok: true,

            type:
              'pet_trail_empty',

            location,

            cultivationDelta:
              cultivation,

            stoneDelta:
              stones,

            profile:
              saved,

            required:
              getCultivationRequired(
                saved,
              ),
          };
        }

        if (
          !petResult.ok
        ) {
          return petResult;
        }

        return {
          ...petResult,
          location,
        };
      }

      /**
       * ===============================================
       * DI TÍCH · BIA ĐÁ
       * ===============================================
       */

      if (
        choiceId ===
        'stone_tablet'
      ) {
        session.state =
          'stone_tablet';

        session.updatedAt =
          Date.now();

        await saveSession(
          client,
          session,
        );

        return {
          ok: true,

          type:
            'stone_tablet',

          location,
        };
      }

      /**
       * ===============================================
       * DI TÍCH · CỔNG ĐÁ
       * ===============================================
       */

      if (
        choiceId ===
        'stone_gate'
      ) {
        session.state =
          'stone_gate';

        session.updatedAt =
          Date.now();

        await saveSession(
          client,
          session,
        );

        return {
          ok: true,

          type:
            'stone_gate',

          location,
        };
      }

      /**
       * ===============================================
       * VỰC SÂU · CƠ HỘI XUẤT HIỆN BÍ CẢNH
       * ===============================================
       */

      if (
        choiceId ===
        'abyss'
      ) {
        /**
         * 35% phát hiện Bí Cảnh.
         */

        if (
          Math.random() <
          0.35
        ) {
          const {
            rollSecretRealm,
          } = await import(
            './cultivationSecretRealm.js'
          );

          const secretRealm =
            rollSecretRealm();

          session.state =
            'secret_realm_found';

          session.secretRealmId =
            secretRealm.id;

          session.updatedAt =
            Date.now();

          await saveSession(
            client,
            session,
          );

          return {
            ok: true,

            type:
              'secret_realm',

            secretRealm,

            location,
          };
        }

        return createMonsterEncounter(
          client,
          session,
          location,
        );
      }

      /**
       * ===============================================
       * HƯỚNG NGUY HIỂM KHÁC
       * ===============================================
       */

      if (
        [
          'monster_path',
          'deep_cave',
        ].includes(
          choiceId,
        )
      ) {
        return createMonsterEncounter(
          client,
          session,
          location,
        );
      }

      return {
        ok: false,

        reason:
          'invalid_choice',
      };
    },
  );
}

/**
 * =========================================================
 * CREATE MONSTER
 * =========================================================
 */

async function createMonsterEncounter(
  client,
  session,
  location,
) {
  const monster =
    getMonster(
      location.id,
    );

  session.state =
    'monster';

  session.monster =
    monster;

  session.updatedAt =
    Date.now();

  await saveSession(
    client,
    session,
  );

  return {
    ok: true,

    type:
      'monster',

    location,
    monster,
  };
}

/**
 * =========================================================
 * COMBAT CHANCE
 * =========================================================
 */

export async function getAdventureV2CombatInfo(
  client,
  guildId,
  userId,
  {
    petAssist = false,
  } = {},
) {
  const session =
    await getAdventureV2Session(
      client,
      guildId,
      userId,
    );

  if (
    !session ||
    session.state !==
      'monster' ||
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
    ) || 0.60;

  chance +=
    Math.min(
      0.12,
      (
        Number(
          profile.realmIndex,
        ) || 0
      ) * 0.012,
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
      0.25,
      0.92,
    );

  return {
    ok: true,

    session,

    monster:
      session.monster,

    profile,

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
 * FIGHT
 * =========================================================
 */

export async function fightAdventureV2Monster(
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
        await getAdventureV2CombatInfo(
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

      const {
        monster,
      } = combat;

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

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

      if (success) {
        const cultivation =
          applyCultivationReward(
            profile,
            randomInt(
              monster.cultivationMin,
              monster.cultivationMax,
            ),
          );

        const stones =
          applyStoneReward(
            profile,
            randomInt(
              monster.stonesMin,
              monster.stonesMax,
            ),
          );

        let droppedItem =
          null;

        if (
          Math.random() <
          0.45
        ) {
          const lootPool = [
            'thien_linh_thao',
            'huyen_thiet',
            'tu_khi_dan',
          ];

          const itemId =
            randomItem(
              lootPool,
            );

          droppedItem =
            giveItem(
              profile,
              itemId,
              1,
            );
        }

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,

          type:
            'combat',

          success: true,

          monster,

          winChance:
            combat.winChance,

          petAssist,

          pet:
            combat.pet,

          cultivationDelta:
            cultivation,

          stoneDelta:
            stones,

          droppedItem,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      const requestedLoss =
        randomInt(
          monster.lossMin,
          monster.lossMax,
        );

      const cultivationLoss =
        Math.min(
          profile.cultivation,
          requestedLoss,
        );

      const staminaLoss =
        Math.min(
          profile.stamina,
          randomInt(
            5,
            15,
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

      const saved =
        await finishAdventure(
          client,
          profile,
        );

      await clearAdventureV2Session(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        type:
          'combat',

        success: false,

        monster,

        winChance:
          combat.winChance,

        petAssist,

        pet:
          combat.pet,

        cultivationDelta:
          -cultivationLoss,

        staminaDelta:
          -staminaLoss,

        stoneDelta:
          0,

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
 * RETREAT
 * =========================================================
 */

export async function retreatAdventureV2(
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
        await getAdventureV2Session(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'monster'
      ) {
        return {
          ok: false,

          reason:
            'session_expired',
        };
      }

      const success =
        Math.random() <
        0.75;

      if (!success) {
        return {
          ok: true,

          type:
            'retreat',

          success: false,

          monster:
            session.monster,
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const saved =
        await finishAdventure(
          client,
          profile,
        );

      await clearAdventureV2Session(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        type:
          'retreat',

        success: true,

        profile:
          saved,
      };
    },
  );
}

/**
 * =========================================================
 * V2.9.2 · THƯỢNG CỔ BIA ĐÁ
 * =========================================================
 */

export async function comprehendAncientTablet(
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
        await getAdventureV2Session(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'stone_tablet'
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

      const success =
        Math.random() <
        0.72;

      if (!success) {
        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,

          type:
            'insight_failed',

          success: false,

          cultivationDelta:
            0,

          stoneDelta:
            0,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      const cultivation =
        applyCultivationReward(
          profile,
          randomInt(
            150,
            270,
          ),
        );

      profile.stats.fortunes =
        Math.max(
          0,
          Number(
            profile.stats
              ?.fortunes,
          ) || 0,
        ) + 1;

      let droppedItem =
        null;

      if (
        Math.random() <
        0.12
      ) {
        droppedItem =
          giveItem(
            profile,
            'vo_danh_kiem_pho',
            1,
          );
      }

      const saved =
        await finishAdventure(
          client,
          profile,
        );

      await clearAdventureV2Session(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        type:
          'insight_success',

        success: true,

        cultivationDelta:
          cultivation,

        stoneDelta:
          0,

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
 * V2.9.2 · PHÁ GIẢI CỔNG ĐÁ
 * =========================================================
 */

export async function openAncientStoneGate(
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
        await getAdventureV2Session(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'stone_gate'
      ) {
        return {
          ok: false,

          reason:
            'session_expired',
        };
      }

      const opened =
        Math.random() <
        0.75;

      if (!opened) {
        if (
          Math.random() <
          0.45
        ) {
          const location =
            getLocation(
              session.locationId,
            );

          return createMonsterEncounter(
            client,
            session,
            location,
          );
        }

        const profile =
          await getCultivationProfile(
            client,
            guildId,
            userId,
          );

        const cultivationLoss =
          Math.min(
            profile.cultivation,
            randomInt(
              30,
              80,
            ),
          );

        profile.cultivation =
          Math.max(
            0,
            profile.cultivation -
              cultivationLoss,
          );

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,

          type:
            'gate_failed',

          success: false,

          cultivationDelta:
            -cultivationLoss,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      session.state =
        'ancient_chest';

      session.chest = {
        trapped:
          Math.random() <
          0.28,

        inspected:
          false,

        createdAt:
          Date.now(),
      };

      session.updatedAt =
        Date.now();

      await saveSession(
        client,
        session,
      );

      return {
        ok: true,

        type:
          'ancient_chest',

        success: true,

        chest:
          session.chest,
      };
    },
  );
}

/**
 * =========================================================
 * V2.9.2 · KIỂM TRA RƯƠNG
 * =========================================================
 */

export async function inspectAncientChest(
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
        await getAdventureV2Session(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'ancient_chest' ||
        !session.chest
      ) {
        return {
          ok: false,

          reason:
            'session_expired',
        };
      }

      session.chest.inspected =
        true;

      session.updatedAt =
        Date.now();

      await saveSession(
        client,
        session,
      );

      return {
        ok: true,

        type:
          'chest_inspected',

        trapped:
          Boolean(
            session.chest
              .trapped,
          ),
      };
    },
  );
}

/**
 * =========================================================
 * V2.9.2 · MỞ RƯƠNG
 * =========================================================
 */

export async function openAncientChest(
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
        await getAdventureV2Session(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'ancient_chest' ||
        !session.chest
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

      if (
        session.chest.trapped
      ) {
        const cultivationLoss =
          Math.min(
            profile.cultivation,
            randomInt(
              45,
              100,
            ),
          );

        const staminaLoss =
          Math.min(
            profile.stamina,
            randomInt(
              5,
              12,
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

        const saved =
          await finishAdventure(
            client,
            profile,
          );

        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return {
          ok: true,

          type:
            'chest_trap',

          success: false,

          cultivationDelta:
            -cultivationLoss,

          staminaDelta:
            -staminaLoss,

          profile:
            saved,

          required:
            getCultivationRequired(
              saved,
            ),
        };
      }

      const stones =
        applyStoneReward(
          profile,
          randomInt(
            80,
            170,
          ),
        );

      const cultivation =
        applyCultivationReward(
          profile,
          randomInt(
            70,
            150,
          ),
        );

      const lootRoll =
        Math.random();

      let droppedItem =
        null;

      if (
        lootRoll <
        0.08
      ) {
        droppedItem =
          giveItem(
            profile,
            'vo_danh_kiem_pho',
            1,
          );
      } else if (
        lootRoll <
        0.30
      ) {
        droppedItem =
          giveItem(
            profile,
            'tu_khi_dan',
            1,
          );
      } else if (
        lootRoll <
        0.65
      ) {
        droppedItem =
          giveItem(
            profile,
            'huyen_thiet',
            randomInt(
              1,
              2,
            ),
          );
      } else {
        droppedItem =
          giveItem(
            profile,
            'thien_linh_thao',
            randomInt(
              1,
              2,
            ),
          );
      }

      profile.stats.fortunes =
        Math.max(
          0,
          Number(
            profile.stats
              ?.fortunes,
          ) || 0,
        ) + 1;

      const saved =
        await finishAdventure(
          client,
          profile,
        );

      await clearAdventureV2Session(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        type:
          'chest_opened',

        success: true,

        cultivationDelta:
          cultivation,

        stoneDelta:
          stones,

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
 * V2.9.2 · GỠ CẤM CHẾ RƯƠNG
 * =========================================================
 */

export async function disarmAncientChest(
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
        await getAdventureV2Session(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'ancient_chest' ||
        !session.chest ||
        !session.chest.trapped
      ) {
        return {
          ok: false,

          reason:
            'session_expired',
        };
      }

      const success =
        Math.random() <
        0.75;

      if (success) {
        session.chest.trapped =
          false;

        session.chest.disarmed =
          true;

        session.updatedAt =
          Date.now();

        await saveSession(
          client,
          session,
        );

        return {
          ok: true,

          type:
            'chest_disarmed',

          success: true,
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const cultivationLoss =
        Math.min(
          profile.cultivation,
          randomInt(
            35,
            85,
          ),
        );

      const staminaLoss =
        Math.min(
          profile.stamina,
          randomInt(
            4,
            10,
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

      const saved =
        await finishAdventure(
          client,
          profile,
        );

      await clearAdventureV2Session(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        type:
          'chest_disarm_failed',

        success: false,

        cultivationDelta:
          -cultivationLoss,

        staminaDelta:
          -staminaLoss,

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
 * V2.9.2 · BỎ QUA RƯƠNG
 * =========================================================
 */

export async function leaveAncientChest(
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
        await getAdventureV2Session(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'ancient_chest'
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

      const saved =
        await finishAdventure(
          client,
          profile,
        );

      await clearAdventureV2Session(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        type:
          'chest_left',

        profile:
          saved,
      };
    },
  );
}
