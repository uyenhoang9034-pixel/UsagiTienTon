import {
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  Mutex,
} from '../utils/mutex.js';

export const CULTIVATION_PETS = {
  thanh_phong_linh_ho: {
    id: 'thanh_phong_linh_ho',
    name: 'Thanh Phong Linh Hồ',
    emoji: '<:ttlinhthuthanhphonglinhho:1547460151189962823>',
    rarity: 'Phàm',
    description: 'Linh hồ sinh giữa thanh phong, thân ảnh nhẹ như mây khói.',
    effect: '+3% Tu Vi khi Tu Luyện',
    effectType: 'cultivation_bonus',
    effectValue: 0.03,
    captureChance: 0.40,
    weight: 30,
  },

  xich_viem_hoa_dieu: {
    id: 'xich_viem_hoa_dieu',
    name: 'Xích Viêm Hỏa Điểu',
    emoji: '<:ttxichviemhoadieum:1547460192122314803>',
    rarity: 'Hiếm',
    description: 'Hỏa điểu mang Xích Viêm trong huyết mạch, thích tụ linh tài nơi thiên địa.',
    effect: '+30% Linh Thạch khi Thám Hiểm',
    effectType: 'adventure_stone_bonus',
    effectValue: 0.30,
    captureChance: 0.08,
    weight: 10,
  },

  huyen_giap_linh_quy: {
    id: 'huyen_giap_linh_quy',
    name: 'Huyền Giáp Linh Quy',
    emoji: '<:tthuyengiaplinhquy:1547460356371259452>',
    rarity: 'Phàm',
    description: 'Linh quy cổ xưa, huyền giáp ẩn chứa khí tức hộ đạo.',
    effect: 'Giảm 10% Tu Vi mất khi Đột Phá thất bại',
    effectType: 'breakthrough_loss_reduction',
    effectValue: 0.10,
    captureChance: 0.08,
    weight: 30,
  },

  thien_loi_bach_ho: {
    id: 'thien_loi_bach_ho',
    name: 'Thiên Lôi Bạch Hổ',
    emoji: '<:ttthienloibachho:1547460329972170772>',
    rarity: 'Cực Hiếm',
    description: 'Bạch hổ mang thiên lôi chi lực, uy áp khiến vạn thú phải tránh đường.',
    effect: '+20% tỷ lệ Đột Phá',
    effectType: 'breakthrough_bonus',
    effectValue: 0.20,
    captureChance: 0.10,
    weight: 5,
  },

  hau_tho_kim_long: {
    id: 'hau_tho_kim_long',
    name: 'Hậu Thổ Kim Long',
    emoji: '<:tthauthokimlong:1547675174789320734>',
    rarity: 'Thần Thoại',
    description: 'Kim long mang Hậu Thổ thần lực, long uy trấn áp sơn hà, hộ đạo toàn diện cho chủ nhân.',
    effect: '+20% Tu Vi khi Tu Luyện · Giảm 20% Tu Vi mất khi Đột Phá thất bại · +50% Linh Thạch khi Thám Hiểm · +50% tỷ lệ Đột Phá',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      cultivation_bonus: 0.20,
      breakthrough_loss_reduction: 0.20,
      adventure_stone_bonus: 0.50,
      breakthrough_bonus: 0.50,
    },
    captureChance: 0.01,
    weight: 0.1,
  },
};

export function getCultivationPet(petId) {
  return CULTIVATION_PETS[petId] || null;
}

export function getCultivationPetList() {
  return Object.values(CULTIVATION_PETS);
}

export function ensurePetData(profile) {
  if (!profile.pets || typeof profile.pets !== 'object' || Array.isArray(profile.pets)) {
    profile.pets = {};
  }

  if (!profile.pets.owned || typeof profile.pets.owned !== 'object' || Array.isArray(profile.pets.owned)) {
    profile.pets.owned = {};
  }

  if (typeof profile.pets.active !== 'string') {
    profile.pets.active = null;
  }

  return profile;
}

export function getOwnedPets(profile) {
  ensurePetData(profile);

  return Object.keys(profile.pets.owned)
    .filter(petId => profile.pets.owned[petId] === true && CULTIVATION_PETS[petId])
    .map(petId => CULTIVATION_PETS[petId]);
}

export function ownsPet(profile, petId) {
  ensurePetData(profile);
  return profile.pets.owned[petId] === true;
}

export function getActivePet(profile) {
  ensurePetData(profile);
  const petId = profile.pets.active;

  if (!petId || !ownsPet(profile, petId)) {
    return null;
  }

  return getCultivationPet(petId);
}

export function getPetEffectValue(profile, effectType) {
  const pet = getActivePet(profile);

  if (!pet) {
    return 0;
  }

  if (pet.effects && Object.prototype.hasOwnProperty.call(pet.effects, effectType)) {
    return Math.max(0, Number(pet.effects[effectType]) || 0);
  }

  if (pet.effectType !== effectType) {
    return 0;
  }

  return Math.max(0, Number(pet.effectValue) || 0);
}

export function rollPetEncounter(chance = 0.10) {
  if (Math.random() > chance) {
    return null;
  }

  const pets = getCultivationPetList();
  const totalWeight = pets.reduce(
    (total, pet) => total + Math.max(0, Number(pet.weight) || 0),
    0,
  );

  if (totalWeight <= 0) {
    return pets[0] || null;
  }

  let roll = Math.random() * totalWeight;

  for (const pet of pets) {
    roll -= Math.max(0, Number(pet.weight) || 0);

    if (roll <= 0) {
      return pet;
    }
  }

  return pets[pets.length - 1] || null;
}

export async function captureCultivationPet(
  client,
  guildId,
  userId,
  petId,
) {
  const lockKey = `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const pet = getCultivationPet(petId);

    if (!pet) {
      return { ok: false, reason: 'invalid_pet' };
    }

    const profile = await getCultivationProfile(client, guildId, userId);
    ensurePetData(profile);

    if (ownsPet(profile, petId)) {
      return {
        ok: false,
        reason: 'already_owned',
        pet,
        profile,
      };
    }

    const success = Math.random() <= pet.captureChance;

    if (!success) {
      return {
        ok: false,
        reason: 'capture_failed',
        pet,
        profile,
      };
    }

    profile.pets.owned[petId] = true;

    if (!profile.pets.active) {
      profile.pets.active = petId;
    }

    if (!profile.stats || typeof profile.stats !== 'object') {
      profile.stats = {};
    }

    profile.stats.petsCaptured =
      Math.max(0, Number(profile.stats.petsCaptured) || 0) + 1;

    const saved = await saveCultivationProfile(client, profile);

    return {
      ok: true,
      pet,
      profile: saved,
      autoEquipped: saved.pets.active === petId,
    };
  });
}

export async function setActiveCultivationPet(
  client,
  guildId,
  userId,
  petId,
) {
  const lockKey = `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const pet = getCultivationPet(petId);

    if (!pet) {
      return { ok: false, reason: 'invalid_pet' };
    }

    const profile = await getCultivationProfile(client, guildId, userId);
    ensurePetData(profile);

    if (!ownsPet(profile, petId)) {
      return {
        ok: false,
        reason: 'not_owned',
        pet,
        profile,
      };
    }

    profile.pets.active = petId;
    const saved = await saveCultivationProfile(client, profile);

    return {
      ok: true,
      pet,
      profile: saved,
    };
  });
}
