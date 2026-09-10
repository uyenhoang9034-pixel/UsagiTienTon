import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import {
  getCultivationProfile,
  getCultivationRequired,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  getCultivationPetList,
  getOwnedPets,
} from './cultivationPet.js';

import {
  getEquippedEquipment,
} from './cultivationEquipment.js';

import {
  getActiveTechnique,
} from './cultivationTechnique.js';

/**
 * =========================================================
 * V2.9.5
 * LINH THÚ ENCOUNTER + CỘNG MINH
 * =========================================================
 */

const SESSION_PREFIX =
  'games:cultivation:adventureV2:';

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

/**
 * =========================================================
 * PET
 * =========================================================
 */

function rollAvailablePet(
  profile,
) {
  const owned =
    new Set(
      getOwnedPets(
        profile,
      ).map(
        pet =>
          pet.id,
      ),
    );

  const available =
    getCultivationPetList()
      .filter(
        pet =>
          !owned.has(
            pet.id,
          ),
      );

  if (
    available.length ===
    0
  ) {
    return null;
  }

  const totalWeight =
    available.reduce(
      (
        total,
        pet,
      ) =>
        total +
        Math.max(
          1,
          Number(
            pet.weight,
          ) || 1,
        ),
      0,
    );

  let roll =
    Math.random() *
    totalWeight;

  for (
    const pet of
      available
  ) {
    roll -=
      Math.max(
        1,
        Number(
          pet.weight,
        ) || 1,
      );

    if (
      roll <= 0
    ) {
      return pet;
    }
  }

  return (
    available[
      available.length -
        1
    ] || null
  );
}

/**
 * =========================================================
 * LINH THÚ · KHỞI TẠO ENCOUNTER
 * =========================================================
 *
 * KHÔNG clear session.
 *
 * Session sẽ giữ lại cho tới khi:
 * - Reveal
 * - Thu phục / bỏ qua
 */

export async function startAdventurePetEncounter(
  client,
  guildId,
  userId,
) {
  /**
   * KHÔNG Mutex.
   *
   * Hàm này được gọi từ
   * resolveAdventureV2Choice()
   * đang giữ cultivation lock.
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

  const pet =
    rollAvailablePet(
      profile,
    );

  /**
   * Có đủ Linh Thú rồi.
   */
  if (!pet) {
    return {
      ok: false,
      reason:
        'all_pets_owned',
      profile,
    };
  }

  session.state =
    'pet_encounter';

  session.petEncounter = {
    petId:
      pet.id,

    revealed:
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
      'pet_encounter_unknown',

    petId:
      pet.id,

    profile,
  };
}

/**
 * =========================================================
 * LINH THÚ · REVEAL
 * =========================================================
 */

export async function revealAdventurePet(
  client,
  guildId,
  userId,
) {
  const session =
    await getSession(
      client,
      guildId,
      userId,
    );

  if (
    !session ||
    session.state !==
      'pet_encounter' ||
    !session.petEncounter
  ) {
    return {
      ok: false,
      reason:
        'session_expired',
    };
  }

  const pet =
    getCultivationPetList()
      .find(
        item =>
          item.id ===
          session.petEncounter
            .petId,
      );

  if (!pet) {
    return {
      ok: false,
      reason:
        'invalid_pet',
    };
  }

  session.petEncounter.revealed =
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
      'pet_encounter_revealed',

    pet,
  };
}

/**
 * =========================================================
 * LINH THÚ · KẾT THÚC ENCOUNTER
 * =========================================================
 *
 * Gọi sau khi Thu Phục thành công/thất bại.
 */

export async function finishAdventurePetEncounter(
  client,
  guildId,
  userId,
) {
  const session =
    await getSession(
      client,
      guildId,
      userId,
    );

  if (
    !session ||
    session.state !==
      'pet_encounter'
  ) {
    /**
     * Cho phép cleanup idempotent.
     */
    await clearSession(
      client,
      guildId,
      userId,
    );

    return {
      ok: true,
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

    profile:
      saved,

    required:
      getCultivationRequired(
        saved,
      ),
  };
}

/**
 * =========================================================
 * LINH THÚ · BỎ QUA
 * =========================================================
 */

export async function leaveAdventurePetEncounter(
  client,
  guildId,
  userId,
) {
  const session =
    await getSession(
      client,
      guildId,
      userId,
    );

  if (
    !session ||
    session.state !==
      'pet_encounter'
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
      'pet_encounter_leave',

    profile:
      saved,
  };
}

/**
 * =========================================================
 * CỘNG MINH
 * =========================================================
 *
 * Cộng Minh chỉ có thể xảy ra nếu người chơi
 * đang trang bị Pháp Khí hoặc kích hoạt Công Pháp.
 */

export function rollAdventureResonance(
  profile,
) {
  const equipment =
    getEquippedEquipment(
      profile,
    );

  const technique =
    getActiveTechnique(
      profile,
    );

  if (
    !equipment &&
    !technique
  ) {
    return null;
  }

  /**
   * Tổng xác suất cộng minh: 18%.
   */
  if (
    Math.random() >
    0.18
  ) {
    return null;
  }

  /**
   * Có cả hai:
   * chọn ngẫu nhiên.
   */
  if (
    equipment &&
    technique
  ) {
    return (
      Math.random() <
      0.5
        ? {
            type:
              'equipment_resonance',

            equipment,
          }
        : {
            type:
              'technique_resonance',

            technique,
          }
    );
  }

  if (equipment) {
    return {
      type:
        'equipment_resonance',

      equipment,
    };
  }

  return {
    type:
      'technique_resonance',

    technique,
  };
}

/**
 * =========================================================
 * PHÁP KHÍ CỘNG MINH
 * =========================================================
 */

export async function resolveEquipmentResonance(
  client,
  guildId,
  userId,
) {
  /**
   * Không Mutex.
   *
   * Dùng từ resolveAdventureV2Choice()
   * đang giữ lock.
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

  const equipment =
    getEquippedEquipment(
      profile,
    );

  if (!equipment) {
    return {
      ok: false,
      reason:
        'no_equipment',
    };
  }

  const cultivation =
    randomInt(
      130,
      240,
    );

  const stones =
    randomInt(
      45,
      95,
    );

  profile.cultivation =
    Math.max(
      0,
      Number(
        profile.cultivation,
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
      'equipment_resonance',

    equipment,

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
 * =========================================================
 * CÔNG PHÁP CỘNG MINH
 * =========================================================
 */

export async function resolveTechniqueResonance(
  client,
  guildId,
  userId,
) {
  /**
   * Không Mutex.
   *
   * Dùng từ resolveAdventureV2Choice()
   * đang giữ lock.
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

  const technique =
    getActiveTechnique(
      profile,
    );

  if (!technique) {
    return {
      ok: false,
      reason:
        'no_technique',
    };
  }

  const cultivation =
    randomInt(
      170,
      300,
    );

  const stones =
    randomInt(
      25,
      70,
    );

  profile.cultivation =
    Math.max(
      0,
      Number(
        profile.cultivation,
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
      'technique_resonance',

    technique,

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
