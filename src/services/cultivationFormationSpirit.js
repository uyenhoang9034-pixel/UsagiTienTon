import {
  getActivePet,
} from './cultivationPet.js';

const EMPTY_EFFECTS = Object.freeze({
  cultivationBonus: 0,
  adventureBonus: 0,
  staminaReduction: 0,
  breakthroughBonus: 0,
  spiritStoneBonus: 0,
  insightBonus: 0,
});

export const FORMATION_SPIRIT_SYNERGIES = {
  thanh_phong_linh_ho: {
    petId: 'thanh_phong_linh_ho',
    name: 'Thanh Phong Linh Hồ',
    type: 'insight',
    label: 'Thanh Phong Diễn Trận',
    description: 'Thanh phong trợ trận, thiên về Lĩnh Ngộ Trận Đạo.',
    effects: {
      insightBonus: 0.03,
    },
  },

  xich_viem_hoa_dieu: {
    petId: 'xich_viem_hoa_dieu',
    name: 'Xích Viêm Hỏa Điểu',
    type: 'spirit_stone',
    label: 'Xích Viêm Tụ Linh',
    description: 'Hỏa linh dẫn tài khí, thiên về Linh Thạch.',
    effects: {
      spiritStoneBonus: 0.03,
    },
  },

  huyen_giap_linh_quy: {
    petId: 'huyen_giap_linh_quy',
    name: 'Huyền Giáp Linh Quy',
    type: 'stamina',
    label: 'Huyền Giáp Trấn Trận',
    description: 'Huyền giáp ổn định trận mạch, thiên về giảm tiêu hao Thể Lực.',
    effects: {
      staminaReduction: 0.03,
    },
  },

  thien_loi_bach_ho: {
    petId: 'thien_loi_bach_ho',
    name: 'Thiên Lôi Bạch Hổ',
    type: 'adventure',
    label: 'Thiên Lôi Phá Trận',
    description: 'Lôi uy dẫn trận thế, thiên về Thám Hiểm.',
    effects: {
      adventureBonus: 0.04,
    },
  },

  hau_tho_kim_long: {
    petId: 'hau_tho_kim_long',
    name: 'Hậu Thổ Kim Long',
    type: 'five_elements',
    label: 'Hậu Thổ Trấn Ngũ Hành',
    description: 'Hậu Thổ thần lực ổn định Ngũ Hành, thiên về khuếch đại Ngũ Hành Tuần Hoàn.',
    requiredFormationId: 'five_elements',
    effects: {
      cultivationBonus: 0.03,
      spiritStoneBonus: 0.02,
      staminaReduction: 0.02,
    },
  },

  tam_linh_mieu: {
    petId: 'tam_linh_mieu',
    name: 'Tầm Linh Miêu',
    type: 'adventure',
    label: 'Tầm Linh Dẫn Trận',
    description: 'Linh miêu cảm ứng linh khí, giúp trận thế truy tìm cơ duyên trong Thám Hiểm.',
    effects: {
      adventureBonus: 0.03,
    },
  },

  nguyet_quang_linh_tho: {
    petId: 'nguyet_quang_linh_tho',
    name: 'Nguyệt Quang Linh Thố',
    type: 'stamina',
    label: 'Nguyệt Hoa Dưỡng Trận',
    description: 'Nguyệt hoa ôn dưỡng trận mạch, giúp giảm tiêu hao Thể Lực.',
    effects: {
      staminaReduction: 0.03,
    },
  },

  han_ngoc_linh_xa: {
    petId: 'han_ngoc_linh_xa',
    name: 'Hàn Ngọc Linh Xà',
    type: 'cultivation',
    label: 'Hàn Ngọc Tụ Khí',
    description: 'Hàn ngọc linh tức hội tụ trong trận, hỗ trợ Tu Luyện.',
    effects: {
      cultivationBonus: 0.04,
    },
  },

  u_minh_huyen_xa: {
    petId: 'u_minh_huyen_xa',
    name: 'U Minh Huyền Xà',
    type: 'adventure',
    label: 'U Minh Hộ Trận',
    description: 'U minh chi khí bao phủ trận thế, hỗ trợ hành tẩu Thám Hiểm và Bí Cảnh.',
    effects: {
      adventureBonus: 0.04,
    },
  },

  bach_giac_linh_loc: {
    petId: 'bach_giac_linh_loc',
    name: 'Bạch Giác Linh Lộc',
    type: 'breakthrough',
    label: 'Bạch Giác Hộ Đạo',
    description: 'Bạch giác linh quang ổn định trận tâm, hỗ trợ Đột Phá.',
    effects: {
      breakthroughBonus: 0.04,
    },
  },

  thai_am_cuu_vi_ho: {
    petId: 'thai_am_cuu_vi_ho',
    name: 'Thái Âm Cửu Vĩ Hồ',
    type: 'insight',
    label: 'Thái Âm Diễn Pháp',
    description: 'Thái Âm chi lực diễn hóa trận đạo, đồng thời trợ giúp Tu Luyện.',
    effects: {
      insightBonus: 0.05,
      cultivationBonus: 0.03,
    },
  },

  tu_dien_ky_lan: {
    petId: 'tu_dien_ky_lan',
    name: 'Tử Điện Kỳ Lân',
    type: 'breakthrough',
    label: 'Tử Điện Trấn Trận',
    description: 'Tử điện thiên uy gia cố trận thế, tăng khả năng phá cảnh.',
    effects: {
      breakthroughBonus: 0.06,
      insightBonus: 0.03,
    },
  },

  niet_ban_phuong_hoang: {
    petId: 'niet_ban_phuong_hoang',
    name: 'Niết Bàn Phượng Hoàng',
    type: 'adventure',
    label: 'Niết Bàn Sinh Trận',
    description: 'Niết Bàn chi hỏa tái sinh trận lực, khuếch đại cơ duyên trong Thám Hiểm và Bí Cảnh.',
    effects: {
      adventureBonus: 0.06,
      spiritStoneBonus: 0.03,
    },
  },

  bach_vu_phong_lang: {
    petId: 'bach_vu_phong_lang',
    name: 'Bạch Vũ Phong Lang',
    type: 'mythic',
    label: 'Bạch Vũ Thần Trận',
    description: 'Thần lang dẫn phong nhập trận, đồng thời khuếch đại Tu Luyện và hành trình Thám Hiểm.',
    effects: {
      cultivationBonus: 0.08,
      adventureBonus: 0.08,
    },
  },

  hu_khong_con_bang: {
    petId: 'hu_khong_con_bang',
    name: 'Hư Không Côn Bằng',
    type: 'mythic',
    label: 'Hư Không Chí Trận',
    description: 'Hư Không chi lực phá vỡ giới hạn trận đạo, khuếch đại Lĩnh Ngộ và khả năng Đột Phá.',
    effects: {
      insightBonus: 0.10,
      breakthroughBonus: 0.10,
    },
  },
};

function normalizeEffects(effects = {}) {
  return {
    ...EMPTY_EFFECTS,
    ...effects,
  };
}

function hasFiveElementCycle(formationState) {
  const layout = formationState?.layouts?.[formationState?.activeFormationId];

  if (!Array.isArray(layout)) {
    return false;
  }

  const unique = new Set(layout);
  return [
    'metal',
    'wood',
    'water',
    'fire',
    'earth',
  ].every((elementId) => unique.has(elementId));
}

export function getFormationSpiritSynergy(profile, formationState = null) {
  const pet = getActivePet(profile);

  if (!pet) {
    return null;
  }

  const synergy = FORMATION_SPIRIT_SYNERGIES[pet.id];

  if (!synergy) {
    return null;
  }

  const activeFormationId = formationState?.activeFormationId || null;
  const matchesRequiredFormation =
    !synergy.requiredFormationId ||
    synergy.requiredFormationId === activeFormationId;
  const matchesSpecialCondition =
    synergy.type !== 'five_elements' ||
    hasFiveElementCycle(formationState);
  const active =
    matchesRequiredFormation &&
    matchesSpecialCondition;

  return {
    ...synergy,
    active,
    pet,
    effects: active
      ? normalizeEffects(synergy.effects)
      : { ...EMPTY_EFFECTS },
    line: active
      ? `${pet.emoji} Trận Linh · **${synergy.label}**`
      : null,
  };
}
