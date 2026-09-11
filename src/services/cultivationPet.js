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
    weight: 50,
    encounterEnabled: true,
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
    captureChance: 0.20,
    weight: 15,
    encounterEnabled: true,
  },

  huyen_giap_linh_quy: {
    id: 'huyen_giap_linh_quy',
    name: 'Huyền Giáp Linh Quy',
    emoji: '<:tthuyengiaplinhquy:1547460356371259452>',
    rarity: 'Lương Phẩm',
    description: 'Linh quy cổ xưa, huyền giáp ẩn chứa khí tức hộ đạo.',
    effect: 'Giảm 10% Tu Vi mất khi Đột Phá thất bại',
    effectType: 'breakthrough_loss_reduction',
    effectValue: 0.10,
    captureChance: 0.30,
    weight: 25,
    encounterEnabled: true,
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
    captureChance: 0.08,
    weight: 9.9,
    encounterEnabled: true,
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
    encounterEnabled: true,
  },

  tam_linh_mieu: {
    id: 'tam_linh_mieu',
    name: 'Tầm Linh Miêu',
    emoji: '<:tttamlinhmieu:1548015689158365195>',
    rarity: 'Phàm',
    description: 'Linh miêu nhạy bén với linh khí của thiên tài địa bảo.',
    effect: '+3% tỷ lệ nhặt được nguyên liệu khi Thám Hiểm',
    effectType: 'adventure_material_find_bonus',
    effectValue: 0.03,
    captureChance: 0.70,
    encounterChance: 0.40,
    weight: 40,
    encounterEnabled: true,
  },

  nguyet_quang_linh_tho: {
    id: 'nguyet_quang_linh_tho',
    name: 'Nguyệt Quang Linh Thố',
    emoji: '<:ttnguyetquanglinhtho:1548015629905170462>',
    rarity: 'Phàm',
    description: 'Linh thố hấp thu nguyệt hoa, khí tức ôn hòa giúp chủ nhân hồi phục thể lực.',
    effect: '+3 Thể Lực mỗi lần hồi phục tự nhiên',
    effectType: 'stamina_regen_flat_bonus',
    effectValue: 3,
    captureChance: 0.65,
    encounterChance: 0.40,
    weight: 40,
    encounterEnabled: true,
  },

  han_ngoc_linh_xa: {
    id: 'han_ngoc_linh_xa',
    name: 'Hàn Ngọc Linh Xà',
    emoji: '<:tthanngoclinhxa:1548015722855276594>',
    rarity: 'Lương Phẩm',
    description: 'Linh xà kết sinh từ hàn ngọc, khí tức tinh thuần giúp tu hành càng thêm viên mãn.',
    effect: '+10% Tu Vi khi Tu Luyện',
    effectType: 'cultivation_bonus',
    effectValue: 0.10,
    captureChance: 0.50,
    encounterChance: 0.30,
    weight: 30,
    encounterEnabled: true,
  },

  u_minh_huyen_xa: {
    id: 'u_minh_huyen_xa',
    name: 'U Minh Huyền Xà',
    emoji: '<:ttuminhhuyenxa:1548015758217445497>',
    rarity: 'Lương Phẩm',
    description: 'Huyền xà sinh trong u minh, có khả năng che chở chiến lợi phẩm giữa hiểm cảnh.',
    effect: '+10% cơ hội giữ thêm chiến lợi phẩm khi Bí Cảnh thất bại',
    effectType: 'secret_realm_loot_keep_chance',
    effectValue: 0.10,
    captureChance: 0.50,
    encounterChance: 0.25,
    weight: 25,
    encounterEnabled: true,
  },

  bach_giac_linh_loc: {
    id: 'bach_giac_linh_loc',
    name: 'Bạch Giác Linh Lộc',
    emoji: '<:ttbachgiaclinhloc:1548015814257549314>',
    rarity: 'Lương Phẩm',
    description: 'Linh lộc mang bạch giác hộ đạo, giúp giảm phản phệ lúc phá cảnh.',
    effect: 'Giảm 10% Tu Vi mất khi Đột Phá thất bại',
    effectType: 'breakthrough_loss_reduction',
    effectValue: 0.10,
    captureChance: 0.50,
    encounterChance: 0.20,
    weight: 20,
    encounterEnabled: true,
  },

  thai_am_cuu_vi_ho: {
    id: 'thai_am_cuu_vi_ho',
    name: 'Thái Âm Cửu Vĩ Hồ',
    emoji: '<:ttthaiamcuuviho:1548015907924742335>',
    rarity: 'Hiếm',
    description: 'Cửu vĩ hồ hấp thu Thái Âm chi lực, vừa trợ tu hành vừa dẫn duyên với linh thú cao giai.',
    effect: '+30% Tu Vi khi Tu Luyện · +5% tỷ lệ gặp Linh Thú Hiếm trở lên',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      cultivation_bonus: 0.30,
      rare_pet_encounter_bonus: 0.05,
    },
    captureChance: 0.20,
    encounterChance: 0.10,
    weight: 10,
    encounterEnabled: true,
  },

  tu_dien_ky_lan: {
    id: 'tu_dien_ky_lan',
    name: 'Tử Điện Kỳ Lân',
    emoji: '<:tttudienkylan:1548016000707076156>',
    rarity: 'Cực Hiếm',
    description: 'Kỳ lân mang tử điện thiên uy, đặc biệt tương hợp với Trận Kiếp.',
    effect: '+30% tỷ lệ thắng Trận Kiếp · +30% phần thưởng Trận Kiếp',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      formation_tribulation_success_bonus: 0.30,
      formation_tribulation_reward_bonus: 0.30,
    },
    captureChance: 0.05,
    encounterChance: 0.05,
    weight: 5,
    encounterEnabled: true,
  },

  niet_ban_phuong_hoang: {
    id: 'niet_ban_phuong_hoang',
    name: 'Niết Bàn Phượng Hoàng',
    emoji: '<:ttnietbanphuonghoang:1548017090357633144>',
    rarity: 'Cực Hiếm',
    description: 'Phượng hoàng niết bàn mang sinh cơ bất tận, khuếch đại mọi cơ duyên trong Thám Hiểm.',
    effect: '+30% toàn bộ phần thưởng khi Thám Hiểm',
    effectType: 'adventure_all_reward_bonus',
    effectValue: 0.30,
    captureChance: 0.05,
    encounterChance: 0.05,
    weight: 5,
    encounterEnabled: true,
  },

  bach_vu_phong_lang: {
    id: 'bach_vu_phong_lang',
    name: 'Bạch Vũ Phong Lang',
    emoji: '<:ttbachvuphonglang:1548015846763274310>',
    rarity: 'Thần Thoại',
    description: 'Thần lang bạch vũ chỉ giáng thế theo tiên duyên đặc biệt, không thể gặp hay thu phục tự nhiên.',
    effect: '+100% Tu Vi khi Tu Luyện · +100% toàn bộ phần thưởng khi Thám Hiểm',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      cultivation_bonus: 1.00,
      adventure_all_reward_bonus: 1.00,
    },
    captureChance: 0,
    encounterChance: 0,
    weight: 0,
    encounterEnabled: false,
    adminOnly: true,
  },

  hu_khong_con_bang: {
    id: 'hu_khong_con_bang',
    name: 'Hư Không Côn Bằng',
    emoji: '<:tthukhongconbang:1548017240497070202>',
    rarity: 'Thần Thoại',
    description: 'Côn Bằng vượt hư không, một khi nhận chủ liền phá vỡ quy tắc phàm tục.',
    effect: 'Đột Phá chắc chắn thành công · Giao chiến Thám Hiểm chắc chắn thắng · +100% Trận Văn khi Lĩnh Ngộ Trận Pháp',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      guaranteed_breakthrough: 1,
      guaranteed_adventure_combat_win: 1,
      formation_essence_bonus: 1.00,
    },
    captureChance: 0.000001,
    encounterChance: 0.90,
    weight: 90,
    encounterEnabled: true,
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

export function hasPetEffect(profile, effectType) {
  return getPetEffectValue(profile, effectType) > 0;
}

export function rollPetEncounter(chance = 0.10, profile = null) {
  if (Math.random() > chance) {
    return null;
  }

  const pets = getCultivationPetList().filter(pet => {
    if (pet.encounterEnabled === false) return false;
    if (profile && ownsPet(profile, pet.id)) return false;
    return Math.max(0, Number(pet.weight) || 0) > 0;
  });

  const totalWeight = pets.reduce(
    (total, pet) => total + Math.max(0, Number(pet.weight) || 0),
    0,
  );

  if (totalWeight <= 0) {
    return null;
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

    if (pet.encounterEnabled === false || pet.captureChance <= 0) {
      return { ok: false, reason: 'not_capturable', pet };
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
