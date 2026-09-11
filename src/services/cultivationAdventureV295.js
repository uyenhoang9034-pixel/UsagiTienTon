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
  getPetEffectValue,
} from './cultivationPet.js';

import {
  getEquippedEquipment,
} from './cultivationEquipment.js';

import {
  getActiveTechnique,
} from './cultivationTechnique.js';

/**
 * =========================================================
 * V2.9.5 · LINH THÚ ENCOUNTER + CỘNG MINH
 * =========================================================
 */

const SESSION_PREFIX =
  'games:cultivation:adventureV2:';

const RARE_OR_HIGHER = new Set([
  'Hiếm',
  'Cực Hiếm',
  'Thần Thoại',
]);

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
    typeof session !== 'object'
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
        (max - min + 1),
    ) + min
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
        profile.stats.adventureCount,
      ) || 0,
    ) + 1;

  profile.cooldowns.adventureAt =
    Date.now() +
    CULTIVATION_CONFIG.gameplay.adventureCooldownMs;

  return saveCultivationProfile(
    client,
    profile,
  );
}

/**
 * Giữ nguyên trọng số thập phân của 5 Linh Thú cũ.
 */
function getPetWeight(
  pet,
) {
  return Math.max(
    0,
    Number(
      pet?.weight,
    ) || 0,
  );
}

function weightedPick(pets) {
  if (!Array.isArray(pets) || pets.length === 0) return null;

  const totalWeight = pets.reduce(
    (total, pet) => total + getPetWeight(pet),
    0,
  );

  if (totalWeight <= 0) return null;

  let roll = Math.random() * totalWeight;

  for (const pet of pets) {
    roll -= getPetWeight(pet);
    if (roll <= 0) return pet;
  }

  return pets[pets.length - 1] || null;
}

function rollAvailablePet(
  profile,
) {
  const owned =
    new Set(
      getOwnedPets(
        profile,
      ).map(
        pet => pet.id,
      ),
    );

  const available =
    getCultivationPetList()
      .filter(
        pet =>
          !owned.has(
            pet.id,
          ) &&
          pet.encounterEnabled !== false &&
          getPetWeight(pet) > 0,
      );

  if (
    available.length === 0
  ) {
    return null;
  }

  const rareEncounterBonus = Math.max(
    0,
    Number(
      getPetEffectValue(
        profile,
        'rare_pet_encounter_bonus',
      ),
    ) || 0,
  );

  /**
   * Các Linh Thú mới có encounterChance riêng và được roll độc lập.
   * Vì các tỷ lệ KHÔNG cần cộng thành 100%, nhiều Linh Thú có thể cùng
   * vượt roll trong một lần; khi đó chọn một trong số các ứng viên đã trúng.
   */
  const explicitCandidates = available.filter(
    pet => Number.isFinite(Number(pet.encounterChance)) &&
      Number(pet.encounterChance) > 0,
  );

  const successfulCandidates = explicitCandidates.filter(
    pet => {
      const bonus =
        RARE_OR_HIGHER.has(pet.rarity)
          ? rareEncounterBonus
          : 0;

      const chance = Math.min(
        1,
        Math.max(
          0,
          Number(pet.encounterChance) + bonus,
        ),
      );

      return Math.random() < chance;
    },
  );

  if (successfulCandidates.length > 0) {
    return weightedPick(successfulCandidates) || successfulCandidates[0];
  }

  /**
   * Nếu không ứng viên mới nào vượt roll, vẫn chọn trong toàn bộ Linh Thú
   * chưa sở hữu và được phép xuất hiện. Như vậy không trả nhầm all_pets_owned
   * khi người chơi vẫn còn Linh Thú mới chưa bắt được.
   * Bạch Vũ Phong Lang vẫn không thể lọt vào đây vì encounterEnabled=false.
   */
  return weightedPick(available);
}

export async function startAdventurePetEncounter(
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
    session.state !== 'location'
  ) {
    return {
      ok: false,
      reason: 'session_expired',
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

  if (!pet) {
    return {
      ok: false,
      reason: 'all_pets_owned',
      profile,
    };
  }

  session.state =
    'pet_encounter';

  session.petEncounter = {
    petId: pet.id,
    revealed: false,
    createdAt: Date.now(),
  };

  session.updatedAt =
    Date.now();

  await saveSession(
    client,
    session,
  );

  return {
    ok: true,
    type: 'pet_encounter_unknown',
    petId: pet.id,
    profile,
  };
}

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
    session.state !== 'pet_encounter' ||
    !session.petEncounter
  ) {
    return {
      ok: false,
      reason: 'session_expired',
    };
  }

  const pet =
    getCultivationPetList()
      .find(
        item =>
          item.id ===
          session.petEncounter.petId,
      );

  if (!pet) {
    return {
      ok: false,
      reason: 'invalid_pet',
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
    type: 'pet_encounter_revealed',
    pet,
  };
}

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
    session.state !== 'pet_encounter'
  ) {
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
    profile: saved,
    required:
      getCultivationRequired(
        saved,
      ),
  };
}

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
    session.state !== 'pet_encounter'
  ) {
    return {
      ok: false,
      reason: 'session_expired',
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
    type: 'pet_encounter_leave',
    profile: saved,
  };
}

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

  if (
    Math.random() > 0.18
  ) {
    return null;
  }

  if (
    equipment &&
    technique
  ) {
    return (
      Math.random() < 0.5
        ? {
            type: 'equipment_resonance',
            equipment,
          }
        : {
            type: 'technique_resonance',
            technique,
          }
    );
  }

  if (equipment) {
    return {
      type: 'equipment_resonance',
      equipment,
    };
  }

  return {
    type: 'technique_resonance',
    technique,
  };
}

export async function resolveEquipmentResonance(
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
    session.state !== 'location'
  ) {
    return {
      ok: false,
      reason: 'session_expired',
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
      reason: 'no_equipment',
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
      Number(profile.cultivation) || 0,
    ) + cultivation;

  profile.totalCultivation =
    Math.max(
      0,
      Number(profile.totalCultivation) || 0,
    ) + cultivation;

  profile.spiritStones =
    Math.max(
      0,
      Number(profile.spiritStones) || 0,
    ) + stones;

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
    type: 'equipment_resonance',
    equipment,
    cultivationDelta: cultivation,
    stoneDelta: stones,
    profile: saved,
    required:
      getCultivationRequired(
        saved,
      ),
  };
}

export async function resolveTechniqueResonance(
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
    session.state !== 'location'
  ) {
    return {
      ok: false,
      reason: 'session_expired',
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
      reason: 'no_technique',
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
      Number(profile.cultivation) || 0,
    ) + cultivation;

  profile.totalCultivation =
    Math.max(
      0,
      Number(profile.totalCultivation) || 0,
    ) + cultivation;

  profile.spiritStones =
    Math.max(
      0,
      Number(profile.spiritStones) || 0,
    ) + stones;

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
    type: 'technique_resonance',
    technique,
    cultivationDelta: cultivation,
    stoneDelta: stones,
    profile: saved,
    required:
      getCultivationRequired(
        saved,
      ),
  };
}
