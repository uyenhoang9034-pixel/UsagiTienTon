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

const SESSION_PREFIX =
  'games:cultivation:adventureV2:';

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
          getPetWeight(pet) > 0 &&
          Number(pet.encounterChance) > 0,
      );

  if (
    available.length === 0
  ) {
    return null;
  }

  const mythicEncounterBonus = Math.max(
    0,
    Number(
      getPetEffectValue(
        profile,
        'mythic_pet_encounter_bonus',
      ),
    ) || 0,
  );

  const immortalEncounterBonus = Math.max(
    0,
    Number(
      getPetEffectValue(
        profile,
        'immortal_pet_encounter_bonus',
      ),
    ) || 0,
  );

  const successfulCandidates = available.filter(
    pet => {
      let bonus = 0;

      if (pet.rarity === 'Thần Thoại') {
        bonus += mythicEncounterBonus;
      }

      if (pet.rarity === 'Tiên Phẩm') {
        bonus += immortalEncounterBonus;
      }

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

  if (successfulCandidates.length === 0) {
    return null;
  }

  return weightedPick(successfulCandidates) || successfulCandidates[0];
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

  const availableCount = getCultivationPetList().filter(
    pet =>
      pet.encounterEnabled !== false &&
      Number(pet.encounterChance) > 0 &&
      !getOwnedPets(profile).some(owned => owned.id === pet.id),
  ).length;

  if (availableCount <= 0) {
    return {
      ok: false,
      reason: 'all_pets_owned',
      profile,
    };
  }

  const pet =
    rollAvailablePet(
      profile,
    );

  if (!pet) {
    // Adventure V2 đã có nhánh thưởng fallback cho reason này.
    // Dùng cùng reason để một lượt roll không gặp pet vẫn kết thúc tự nhiên.
    return {
      ok: false,
      reason: 'all_pets_owned',
      profile,
      noPetEncounter: true,
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
