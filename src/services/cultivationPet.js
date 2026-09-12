import {
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  Mutex,
} from '../utils/mutex.js';

const THAI_HU_ANNOUNCEMENT_CHANNEL_ID = '1547890161382072381';
const TIEN_LO_ROLE_ID = '1547581204759318579';

export const CULTIVATION_PET_RARITY_ORDER = {
  'Tiên Phẩm': 6,
  'Thần Thoại': 5,
  'Cực Hiếm': 4,
  'Hiếm': 3,
  'Lương Phẩm': 2,
  'Phàm': 1,
};

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
    captureChance: 0.80,
    encounterChance: 0.60,
    weight: 60,
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
    captureChance: 0.80,
    encounterChance: 0.60,
    weight: 60,
    encounterEnabled: true,
  },

  nguyet_quang_linh_tho: {
    id: 'nguyet_quang_linh_tho',
    name: 'Nguyệt Quang Linh Thố',
    emoji: '<:ttnguyetquanglinhtho:1548015629905170462>',
    rarity: 'Phàm',
    description: 'Linh thố hấp thu nguyệt hoa, khí tức ôn hòa giúp chủ nhân hồi phục thể lực.',
    effect: '+3% Thể Lực mỗi lần hồi phục tự nhiên',
    effectType: 'stamina_regen_percent_bonus',
    effectValue: 0.03,
    captureChance: 0.80,
    encounterChance: 0.60,
    weight: 60,
    encounterEnabled: true,
  },

  tam_bao_linh_thu: {
    id: 'tam_bao_linh_thu',
    name: 'Tầm Bảo Linh Thử',
    emoji: '<:tttambaolinhthu:1548195915649515550>',
    rarity: 'Phàm',
    description: 'Linh thử đặc biệt nhạy cảm với linh thạch ẩn trong núi rừng.',
    effect: '+3% Linh Thạch khi Thám Hiểm',
    effectType: 'adventure_stone_bonus',
    effectValue: 0.03,
    captureChance: 0.80,
    encounterChance: 0.60,
    weight: 60,
    encounterEnabled: true,
  },

  thanh_vu_linh_tuoc: {
    id: 'thanh_vu_linh_tuoc',
    name: 'Thanh Vũ Linh Tước',
    emoji: '<:ttthanhvulinhtuoc:1548196423458234498>',
    rarity: 'Phàm',
    description: 'Thanh tước nhỏ bé nhưng có linh giác cực nhạy trong Bí Cảnh.',
    effect: '+3% toàn bộ phần thưởng khi Bí Cảnh',
    effectType: 'secret_realm_all_reward_bonus',
    effectValue: 0.03,
    captureChance: 0.80,
    encounterChance: 0.60,
    weight: 60,
    encounterEnabled: true,
  },

  hoa_nhung_linh_tho: {
    id: 'hoa_nhung_linh_tho',
    name: 'Hỏa Nhung Linh Thố',
    emoji: '<:tthoanhunglinhtho:1548196617729871933>',
    rarity: 'Phàm',
    description: 'Linh thố mang hỏa nhung ấm áp, giúp đạo hữu giảm hao tổn thể lực.',
    effect: 'Bù lại 3% Thể Lực tiêu hao khi Tu Luyện hoặc Thám Hiểm',
    effectType: 'stamina_cost_refund',
    effectValue: 0.03,
    captureChance: 0.80,
    encounterChance: 0.60,
    weight: 60,
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
    captureChance: 0.60,
    encounterChance: 0.40,
    weight: 40,
    encounterEnabled: true,
  },

  u_minh_huyen_xa: {
    id: 'u_minh_huyen_xa',
    name: 'U Minh Huyền Xà',
    emoji: '<:ttuminhhuyenxa:1548015758217445497>',
    rarity: 'Lương Phẩm',
    description: 'Huyền xà sinh trong u minh, có khả năng che chở chiến lợi phẩm giữa hiểm cảnh.',
    effect: 'Giữ thêm 10% chiến lợi phẩm khi Bí Cảnh thất bại',
    effectType: 'secret_realm_loot_keep_percent',
    effectValue: 0.10,
    captureChance: 0.60,
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
    captureChance: 0.60,
    encounterChance: 0.40,
    weight: 40,
    encounterEnabled: true,
  },

  bach_giac_linh_loc: {
    id: 'bach_giac_linh_loc',
    name: 'Bạch Giác Linh Lộc',
    emoji: '<:ttbachgiaclinhloc:1548015814257549314>',
    rarity: 'Lương Phẩm',
    description: 'Bạch giác cảm ứng trận văn thiên địa, trợ đạo hữu lĩnh ngộ trận đạo.',
    effect: '+10% Trận Văn khi Lĩnh Ngộ Trận Pháp',
    effectType: 'formation_essence_bonus',
    effectValue: 0.10,
    captureChance: 0.60,
    encounterChance: 0.40,
    weight: 40,
    encounterEnabled: true,
  },

  tran_nhac_linh_hung: {
    id: 'tran_nhac_linh_hung',
    name: 'Trấn Nhạc Linh Hùng',
    emoji: '<:ttrannhaclinhhung:1548196381934747729>',
    rarity: 'Lương Phẩm',
    description: 'Linh hùng trấn nhạc, khí thế hùng hậu giúp tăng phần thắng khi giao chiến.',
    effect: '+10% tỷ lệ thắng giao chiến',
    effectType: 'combat_success_bonus',
    effectValue: 0.10,
    captureChance: 0.60,
    encounterChance: 0.40,
    weight: 40,
    encounterEnabled: true,
  },

  kim_vu_linh_ung: {
    id: 'kim_vu_linh_ung',
    name: 'Kim Vũ Linh Ưng',
    emoji: '<:ttkimvulinhung:1548196582631936061>',
    rarity: 'Lương Phẩm',
    description: 'Linh ưng kim vũ có đôi mắt sắc bén, thường tìm thấy linh thạch nơi hiểm địa.',
    effect: '+10% Linh Thạch khi Thám Hiểm',
    effectType: 'adventure_stone_bonus',
    effectValue: 0.10,
    captureChance: 0.60,
    encounterChance: 0.40,
    weight: 40,
    encounterEnabled: true,
  },

  thai_am_cuu_vi_ho: {
    id: 'thai_am_cuu_vi_ho',
    name: 'Thái Âm Cửu Vĩ Hồ',
    emoji: '<:ttthaiamcuuviho:1548015907924742335>',
    rarity: 'Hiếm',
    description: 'Cửu vĩ hồ hấp thu Thái Âm chi lực, trợ chủ nhân tinh tiến tu vi.',
    effect: '+20% Tu Vi khi Tu Luyện',
    effectType: 'cultivation_bonus',
    effectValue: 0.20,
    captureChance: 0.40,
    encounterChance: 0.20,
    weight: 20,
    encounterEnabled: true,
  },

  xich_viem_hoa_dieu: {
    id: 'xich_viem_hoa_dieu',
    name: 'Xích Viêm Hỏa Điểu',
    emoji: '<:ttxichviemhoadieum:1547460192122314803>',
    rarity: 'Hiếm',
    description: 'Hỏa điểu mang Xích Viêm trong huyết mạch, thích tụ linh tài nơi thiên địa.',
    effect: '+20% Linh Thạch khi Thám Hiểm',
    effectType: 'adventure_stone_bonus',
    effectValue: 0.20,
    captureChance: 0.40,
    encounterChance: 0.20,
    weight: 20,
    encounterEnabled: true,
  },

  u_anh_linh_mieu: {
    id: 'u_anh_linh_mieu',
    name: 'U Ảnh Linh Miêu',
    emoji: '<:ttuanhlinhmieu:1548196522561114183>',
    rarity: 'Hiếm',
    description: 'U ảnh vô thanh, có thể che chở chiến lợi phẩm giữa lúc Bí Cảnh thất lợi.',
    effect: 'Giữ thêm 20% chiến lợi phẩm khi Bí Cảnh thất bại',
    effectType: 'secret_realm_loot_keep_percent',
    effectValue: 0.20,
    captureChance: 0.40,
    encounterChance: 0.20,
    weight: 20,
    encounterEnabled: true,
  },

  bich_ngoc_tien_loc: {
    id: 'bich_ngoc_tien_loc',
    name: 'Bích Ngọc Tiên Lộc',
    emoji: '<:ttbichngoctienloc:1548196351894888479>',
    rarity: 'Hiếm',
    description: 'Tiên lộc mang sinh cơ bích ngọc, bù đắp thể lực hao tổn trong hành trình tu tiên.',
    effect: 'Bù lại 20% Thể Lực mất khi Tu Luyện hoặc Thám Hiểm',
    effectType: 'stamina_cost_refund',
    effectValue: 0.20,
    captureChance: 0.40,
    encounterChance: 0.20,
    weight: 20,
    encounterEnabled: true,
  },

  tu_dien_ky_lan: {
    id: 'tu_dien_ky_lan',
    name: 'Tử Điện Kỳ Lân',
    emoji: '<:tttudienkylan:1548016000707076156>',
    rarity: 'Cực Hiếm',
    description: 'Kỳ lân mang tử điện thiên uy, đặc biệt tương hợp với Trận Kiếp.',
    effect: '+50% tỷ lệ thắng Trận Kiếp · +50% phần thưởng Trận Kiếp khi thắng',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      formation_tribulation_success_bonus: 0.50,
      formation_tribulation_reward_bonus: 0.50,
    },
    captureChance: 0.20,
    encounterChance: 0.10,
    weight: 10,
    encounterEnabled: true,
  },

  thien_loi_bach_ho: {
    id: 'thien_loi_bach_ho',
    name: 'Thiên Lôi Bạch Hổ',
    emoji: '<:ttthienloibachho:1547460329972170772>',
    rarity: 'Cực Hiếm',
    description: 'Bạch hổ mang thiên lôi chi lực, uy áp khiến vạn thú phải tránh đường.',
    effect: '+50% tỷ lệ Đột Phá thành công',
    effectType: 'breakthrough_bonus',
    effectValue: 0.50,
    captureChance: 0.20,
    encounterChance: 0.10,
    weight: 10,
    encounterEnabled: true,
  },

  niet_ban_phuong_hoang: {
    id: 'niet_ban_phuong_hoang',
    name: 'Niết Bàn Phượng Hoàng',
    emoji: '<:ttnietbanphuonghoang:1548017090357633144>',
    rarity: 'Cực Hiếm',
    description: 'Phượng hoàng niết bàn mang sinh cơ bất tận, khuếch đại mọi cơ duyên trong Thám Hiểm.',
    effect: '+50% toàn bộ phần thưởng khi Thám Hiểm',
    effectType: 'adventure_all_reward_bonus',
    effectValue: 0.50,
    captureChance: 0.20,
    encounterChance: 0.10,
    weight: 10,
    encounterEnabled: true,
  },

  xich_lan_hoa_mang: {
    id: 'xich_lan_hoa_mang',
    name: 'Xích Lân Hỏa Mãng',
    emoji: '<:ttxichlanhoamang:1548196308010016788>',
    rarity: 'Cực Hiếm',
    description: 'Hỏa mãng khoác xích lân, hung uy bộc phát mạnh nhất giữa giao chiến.',
    effect: '+50% tỷ lệ thắng giao chiến · +50% phần thưởng giao chiến khi thắng',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      combat_success_bonus: 0.50,
      combat_reward_bonus: 0.50,
    },
    captureChance: 0.20,
    encounterChance: 0.10,
    weight: 10,
    encounterEnabled: true,
  },

  kim_diem_toan_nghe: {
    id: 'kim_diem_toan_nghe',
    name: 'Kim Diễm Toan Nghê',
    emoji: '<:ttkimdiemtoannghe:1548195979667439716>',
    rarity: 'Cực Hiếm',
    description: 'Toan Nghê mang kim diễm, vừa trợ tu hành vừa khai mở trận đạo.',
    effect: '+50% Tu Vi khi Tu Luyện · +50% Lĩnh Ngộ khi Lĩnh Ngộ Trận Pháp',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      cultivation_bonus: 0.50,
      formation_insight_bonus: 0.50,
    },
    captureChance: 0.20,
    encounterChance: 0.10,
    weight: 10,
    encounterEnabled: true,
  },

  hau_tho_kim_long: {
    id: 'hau_tho_kim_long',
    name: 'Hậu Thổ Kim Long',
    emoji: '<:tthauthokimlong:1547675174789320734>',
    rarity: 'Cực Hiếm',
    description: 'Kim long mang Hậu Thổ thần lực, giỏi hộ đạo lúc phá cảnh và dẫn duyên với thần thú.',
    effect: 'Bù lại 50% tổn thất khi Đột Phá thất bại · +20% tỷ lệ Đột Phá thành công · +5% tỷ lệ gặp Linh Thú Thần Thoại',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      breakthrough_loss_reduction: 0.50,
      breakthrough_bonus: 0.20,
      mythic_pet_encounter_bonus: 0.05,
    },
    captureChance: 0.20,
    encounterChance: 0.10,
    weight: 10,
    encounterEnabled: true,
  },

  hu_khong_con_bang: {
    id: 'hu_khong_con_bang',
    name: 'Hư Không Côn Bằng',
    emoji: '<:tthukhongconbang:1548017240497070202>',
    rarity: 'Thần Thoại',
    description: 'Côn Bằng vượt hư không, một khi nhận chủ liền trợ lực trên nhiều đại đạo.',
    effect: '+90% tỷ lệ Đột Phá thành công · +100% Lĩnh Ngộ và Trận Văn khi Lĩnh Ngộ Trận Pháp · +20% tỷ lệ thắng giao chiến',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      breakthrough_bonus: 0.90,
      formation_insight_bonus: 1.00,
      formation_essence_bonus: 1.00,
      combat_success_bonus: 0.20,
    },
    captureChance: 0.09,
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
    effect: '+100% Tu Vi khi Tu Luyện · +100% toàn bộ phần thưởng khi Thám Hiểm · +5% tỷ lệ gặp Linh Thú Tiên Phẩm',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      cultivation_bonus: 1.00,
      adventure_all_reward_bonus: 1.00,
      immortal_pet_encounter_bonus: 0.05,
    },
    captureChance: 0,
    encounterChance: 0,
    weight: 0,
    encounterEnabled: false,
    adminOnly: true,
  },

  thai_co_long_tuong: {
    id: 'thai_co_long_tuong',
    name: 'Thái Cổ Long Tượng',
    emoji: '<:ttthaicolongtuong:1548195947098673322>',
    rarity: 'Thần Thoại',
    description: 'Long Tượng thái cổ có thần lực hộ thân, về sau chỉ có thể thỉnh bằng Linh Thạch.',
    effect: 'Bù lại 90% Thể Lực khi Tu Luyện/Thám Hiểm · Bù lại 90% hao tổn khi Đột Phá thất bại · +20% tỷ lệ Đột Phá · +90% tỷ lệ thắng Trận Kiếp',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      stamina_cost_refund: 0.90,
      breakthrough_loss_reduction: 0.90,
      breakthrough_bonus: 0.20,
      formation_tribulation_success_bonus: 0.90,
    },
    captureChance: 0,
    encounterChance: 0,
    weight: 0,
    encounterEnabled: false,
    purchaseOnly: true,
  },

  thai_hu_tien_hac: {
    id: 'thai_hu_tien_hac',
    name: 'Thái Hư Tiên Hạc',
    emoji: '<:ttthaihutienhac:1548196191597105303>',
    rarity: 'Tiên Phẩm',
    description: 'Tiên hạc từ Thái Hư giáng thế, tiên duyên hiếm có đủ khiến thiên địa sinh dị tượng.',
    effect: '+200% Tu Vi khi Tu Luyện · Thám Hiểm luôn tích cực · Đột Phá chắc chắn thành công · +200% Lĩnh Ngộ và Trận Văn · +90% tỷ lệ ra Tinh Thạch Tinh Thần/Hỗn Độn khi Lĩnh Ngộ · +200% thưởng Trận Kiếp',
    effectType: 'multi_bonus',
    effectValue: 0,
    effects: {
      cultivation_bonus: 2.00,
      adventure_always_positive: 1,
      guaranteed_breakthrough: 1,
      formation_insight_bonus: 2.00,
      formation_essence_bonus: 2.00,
      special_crystal_drop_chance: 0.90,
      formation_tribulation_reward_bonus: 2.00,
    },
    captureChance: 0.0000002,
    encounterChance: 0.02,
    weight: 2,
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
    .map(petId => CULTIVATION_PETS[petId])
    .sort((a, b) => {
      const rarityDiff =
        (CULTIVATION_PET_RARITY_ORDER[b.rarity] || 0) -
        (CULTIVATION_PET_RARITY_ORDER[a.rarity] || 0);

      if (rarityDiff !== 0) return rarityDiff;
      return a.name.localeCompare(b.name, 'vi');
    });
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

export async function announceThaiHuTienHacAcquisition(
  client,
  userId,
) {
  try {
    const channel = await client.channels.fetch(
      THAI_HU_ANNOUNCEMENT_CHANNEL_ID,
    );

    if (!channel?.isTextBased?.()) {
      return false;
    }

    await channel.send({
      content: [
        '<a:trangtrig2:1546040703375904801> **THIÊN ĐỊA DỊ TƯỢNG · TIÊN DUYÊN GIÁNG THẾ** <a:trangtrig3:1546040818261954610>',
        '',
        '*Tiên quang xuyên phá cửu tiêu, hạc minh vang vọng thiên địa...*',
        '',
        'Thiên Đạo vừa chứng kiến một đoạn **Tiên Duyên** hiếm có!',
        '',
        `<@${userId}> đã được <:ttthaihutienhac:1548196191597105303> **Thái Hư Tiên Hạc** công nhận, chính thức thu phục Tiên Thú bước ra từ Thái Hư!`,
        '',
        '✨ **Phẩm Chất: Tiên Phẩm**',
        '',
        '*Nhất thanh hạc lệ kinh thiên địa,*',
        '*Nhất niệm tiên duyên động cửu châu.*',
        '',
        'Từ hôm nay, **Thái Hư Tiên Hạc đã có chủ.**',
        '',
        `<@&${TIEN_LO_ROLE_ID}> — **Tiên Lộ chư vị, cùng chứng kiến!**`,
      ].join('\n'),
      allowedMentions: {
        users: [userId],
        roles: [TIEN_LO_ROLE_ID],
      },
    });

    return true;
  } catch (error) {
    console.warn('[THAI HU TIEN HAC ANNOUNCEMENT ERROR]', error);
    return false;
  }
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

    if (petId === 'thai_hu_tien_hac') {
      await announceThaiHuTienHacAcquisition(
        client,
        userId,
      );
    }

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
