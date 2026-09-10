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
  Mutex,
} from '../utils/mutex.js';

/**
 * =========================================================
 * V2.9.4 · THƯƠNG NHÂN + THIÊN ĐẠO CƠ DUYÊN
 * =========================================================
 */

const SESSION_PREFIX =
  'games:cultivation:adventureV2:';

/**
 * Một chuyến gặp thương nhân chỉ mua được 1 món.
 */
export const ADVENTURE_MERCHANT_STOCK = [
  {
    itemId:
      'tu_khi_dan',

    price:
      120,
  },

  {
    itemId:
      'hoi_nguyen_dan',

    price:
      100,
  },

  {
    itemId:
      'pha_canh_dan',

    price:
      220,
  },
];

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
      Number(min) ||
        0,
    );

  const safeMax =
    Math.floor(
      Number(max) ||
        safeMin,
    );

  return (
    Math.floor(
      Math.random() *
        (
          safeMax -
          safeMin +
          1
        ),
    ) +
    safeMin
  );
}

async function getSession(
  client,
  guildId,
  userId,
) {
  const session =
    await client.db.get(
      getSessionKey(
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

async function clearSession(
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

async function finishAdventure(
  client,
  profile,
) {
  profile.stats ??= {};
  profile.cooldowns ??= {};

  profile.stats.adventureCount =
    Math.max(
      0,
      Number(
        profile.stats
          .adventureCount,
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

function getMerchantStock() {
  return ADVENTURE_MERCHANT_STOCK
    .map(
      entry => {
        const item =
          CULTIVATION_ITEMS[
            entry.itemId
          ];

        if (!item) {
          return null;
        }

        return {
          ...entry,
          item,
        };
      },
    )
    .filter(Boolean);
}

/**
 * =========================================================
 * ROLL · CỔ ĐÌNH
 * =========================================================
 *
 * 30% gặp Thương Nhân
 * 8% Thiên Đạo Cơ Duyên
 * 62% Cổ Đình bình thường
 */

export function rollPavilionSpecialEvent() {
  const roll =
    Math.random();

  if (
    roll <
    0.30
  ) {
    return 'merchant';
  }

  if (
    roll <
    0.38
  ) {
    return 'heavenly_fortune';
  }

  return 'normal';
}

/**
 * =========================================================
 * THƯƠNG NHÂN XUẤT HIỆN
 * =========================================================
 */

export async function startAdventureMerchant(
  client,
  guildId,
  userId,
) {
  /**
   * Không lock ở đây.
   *
   * Hàm này được gọi từ resolveAdventureV2Choice(),
   * nơi Mutex cultivation:user đã được giữ sẵn.
   */

  const session =
    await getSession(
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

  const profile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  session.state =
    'merchant';

  session.merchant = {
    createdAt:
      Date.now(),

    purchased:
      false,
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
      'merchant',

    profile,

    stock:
      getMerchantStock(),
  };
}

/**
 * =========================================================
 * MUA VẬT PHẨM
 * =========================================================
 */

export async function buyAdventureMerchantItem(
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
      const session =
        await getSession(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'merchant' ||
        !session.merchant
      ) {
        return {
          ok: false,

          reason:
            'session_expired',
        };
      }

      if (
        session.merchant
          .purchased
      ) {
        return {
          ok: false,

          reason:
            'already_purchased',
        };
      }

      const stock =
        getMerchantStock();

      const offer =
        stock.find(
          entry =>
            entry.itemId ===
            itemId,
        );

      if (!offer) {
        return {
          ok: false,

          reason:
            'invalid_item',
        };
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const stones =
        Math.max(
          0,
          Number(
            profile
              .spiritStones,
          ) || 0,
        );

      if (
        stones <
        offer.price
      ) {
        return {
          ok: false,

          reason:
            'not_enough_stones',

          profile,
          offer,
          stock,
        };
      }

      profile.spiritStones =
        stones -
        offer.price;

      addInventoryItem(
        profile,
        offer.itemId,
        1,
      );

      profile.stats ??= {};

      profile.stats.itemsFound =
        Math.max(
          0,
          Number(
            profile.stats
              .itemsFound,
          ) || 0,
        ) + 1;

      session.merchant.purchased =
        true;

      const saved =
        await finishAdventure(
          client,
          profile,
        );

      await clearSession(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        type:
          'merchant_purchase',

        offer,

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
 * RỜI THƯƠNG NHÂN
 * =========================================================
 */

export async function leaveAdventureMerchant(
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
        await getSession(
          client,
          guildId,
          userId,
        );

      if (
        !session ||
        session.state !==
          'merchant'
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

      await clearSession(
        client,
        guildId,
        userId,
      );

      return {
        ok: true,

        type:
          'merchant_leave',

        profile:
          saved,
      };
    },
  );
}

/**
 * =========================================================
 * THIÊN ĐẠO CƠ DUYÊN
 * =========================================================
 */

export async function resolveHeavenlyFortune(
  client,
  guildId,
  userId,
) {
  /**
   * QUAN TRỌNG:
   *
   * Không dùng Mutex.runExclusive() ở đây.
   *
   * Hàm này được gọi trực tiếp từ
   * resolveAdventureV2Choice(), mà hàm đó
   * đã giữ cùng cultivation lock.
   *
   * Nếu lock thêm lần nữa sẽ deadlock.
   */

  const session =
    await getSession(
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

  const profile =
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const cultivation =
    randomInt(
      260,
      460,
    );

  const stones =
    randomInt(
      90,
      170,
    );

  profile.cultivation =
    Math.max(
      0,
      Number(
        profile
          .cultivation,
      ) || 0,
    ) +
    cultivation;

  profile.totalCultivation =
    Math.max(
      0,
      Number(
        profile
          .totalCultivation,
      ) || 0,
    ) +
    cultivation;

  profile.spiritStones =
    Math.max(
      0,
      Number(
        profile
          .spiritStones,
      ) || 0,
    ) +
    stones;

  profile.stats ??= {};

  profile.stats.greatFortunes =
    Math.max(
      0,
      Number(
        profile.stats
          .greatFortunes,
      ) || 0,
    ) + 1;

  let droppedItem =
    null;

  /**
   * 35% nhận thêm Cổ Phù.
   */
  if (
    Math.random() <
      0.35 &&
    CULTIVATION_ITEMS
      .co_phu
  ) {
    addInventoryItem(
      profile,
      'co_phu',
      1,
    );

    profile.stats.itemsFound =
      Math.max(
        0,
        Number(
          profile.stats
            .itemsFound,
        ) || 0,
      ) + 1;

    droppedItem = {
      itemId:
        'co_phu',

      item:
        CULTIVATION_ITEMS
          .co_phu,

      quantity:
        1,
    };
  }

  const saved =
    await finishAdventure(
      client,
      profile,
    );

  await clearSession(
    client,
    guildId,
    userId,
  );

  return {
    ok: true,

    type:
      'heavenly_fortune',

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
