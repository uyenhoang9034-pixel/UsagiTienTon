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
    effects: { insightBonus: 0.03 },
  },

  tam_linh_mieu: {
    petId: 'tam_linh_mieu',
    name: 'Tầm Linh Miêu',
    type: 'adventure',
    label: 'Tầm Linh Dẫn Trận',
    description: 'Linh miêu cảm ứng linh khí, giúp trận thế truy tìm cơ duyên.',
    effects: { adventureBonus: 0.03 },
  },

  nguyet_quang_linh_tho: {
    petId: 'nguyet_quang_linh_tho',
    name: 'Nguyệt Quang Linh Thố',
    type: 'stamina',
    label: 'Nguyệt Hoa Dưỡng Trận',
    description: 'Nguyệt hoa ôn dưỡng trận mạch, giúp giảm tiêu hao Thể Lực.',
    effects: { staminaReduction: 0.03 },
  },

  tam_bao_linh_thu: {
    petId: 'tam_bao_linh_thu',
    name: 'Tầm Bảo Linh Thử',
    type: 'spirit_stone',
    label: 'Tầm Bảo Tụ Trận',
    description: 'Tầm bảo linh giác dẫn tài khí hội tụ quanh trận thế.',
    effects: { spiritStoneBonus: 0.03 },
  },

  thanh_vu_linh_tuoc: {
    petId: 'thanh_vu_linh_tuoc',
    name: 'Thanh Vũ Linh Tước',
    type: 'adventure',
    label: 'Thanh Vũ Dẫn Phong',
    description: 'Thanh vũ dẫn phong nhập trận, trợ hành tẩu Thám Hiểm và Bí Cảnh.',
    effects: { adventureBonus: 0.03 },
  },

  hoa_nhung_linh_tho: {
    petId: 'hoa_nhung_linh_tho',
    name: 'Hỏa Nhung Linh Thố',
    type: 'stamina',
    label: 'Hỏa Nhung Dưỡng Mạch',
    description: 'Hỏa nhung ôn dưỡng kinh mạch, giảm tiêu hao khi vận chuyển trận lực.',
    effects: { staminaReduction: 0.03 },
  },

  huyen_giap_linh_quy: {
    petId: 'huyen_giap_linh_quy',
    name: 'Huyền Giáp Linh Quy',
    type: 'stamina',
    label: 'Huyền Giáp Trấn Trận',
    description: 'Huyền giáp ổn định trận mạch, thiên về giảm tiêu hao Thể Lực.',
    effects: { staminaReduction: 0.05 },
  },

  u_minh_huyen_xa: {
    petId: 'u_minh_huyen_xa',
    name: 'U Minh Huyền Xà',
    type: 'adventure',
    label: 'U Minh Hộ Trận',
    description: 'U minh chi khí bao phủ trận thế, hỗ trợ hành tẩu Thám Hiểm và Bí Cảnh.',
    effects: { adventureBonus: 0.05 },
  },

  han_ngoc_linh_xa: {
    petId: 'han_ngoc_linh_xa',
    name: 'Hàn Ngọc Linh Xà',
    type: 'cultivation',
    label: 'Hàn Ngọc Tụ Khí',
    description: 'Hàn ngọc linh tức hội tụ trong trận, hỗ trợ Tu Luyện.',
    effects: { cultivationBonus: 0.05 },
  },

  bach_giac_linh_loc: {
    petId: 'bach_giac_linh_loc',
    name: 'Bạch Giác Linh Lộc',
    type: 'insight',
    label: 'Bạch Giác Diễn Trận',
    description: 'Bạch giác cảm ứng trận văn thiên địa, trợ Lĩnh Ngộ Trận Đạo.',
    effects: { insightBonus: 0.05 },
  },

  tran_nhac_linh_hung: {
    petId: 'tran_nhac_linh_hung',
    name: 'Trấn Nhạc Linh Hùng',
    type: 'adventure',
    label: 'Trấn Nhạc Hộ Trận',
    description: 'Trấn Nhạc chi lực gia cố trận thế, trợ đạo hữu khi đối mặt hiểm chiến.',
    effects: { adventureBonus: 0.05 },
  },

  kim_vu_linh_ung: {
    petId: 'kim_vu_linh_ung',
    name: 'Kim Vũ Linh Ưng',
    type: 'spirit_stone',
    label: 'Kim Vũ Tụ Tài',
    description: 'Kim vũ dẫn linh tài nhập trận, tăng khả năng hội tụ Linh Thạch.',
    effects: { spiritStoneBonus: 0.05 },
  },

  thai_am_cuu_vi_ho: {
    petId: 'thai_am_cuu_vi_ho',
    name: 'Thái Âm Cửu Vĩ Hồ',
    type: 'cultivation',
    label: 'Thái Âm Diễn Pháp',
    description: 'Thái Âm chi lực diễn hóa trận đạo, đồng thời trợ giúp Tu Luyện.',
    effects: {
      cultivationBonus: 0.06,
      insightBonus: 0.04,
    },
  },

  xich_viem_hoa_dieu: {
    petId: 'xich_viem_hoa_dieu',
    name: 'Xích Viêm Hỏa Điểu',
    type: 'spirit_stone',
    label: 'Xích Viêm Tụ Linh',
    description: 'Hỏa linh dẫn tài khí, thiên về Linh Thạch.',
    effects: { spiritStoneBonus: 0.06 },
  },

  u_anh_linh_mieu: {
    petId: 'u_anh_linh_mieu',
    name: 'U Ảnh Linh Miêu',
    type: 'adventure',
    label: 'U Ảnh Tiềm Trận',
    description: 'U ảnh ẩn nhập trận thế, giúp hành tẩu hiểm địa càng thêm linh hoạt.',
    effects: { adventureBonus: 0.06 },
  },

  bich_ngoc_tien_loc: {
    petId: 'bich_ngoc_tien_loc',
    name: 'Bích Ngọc Tiên Lộc',
    type: 'stamina',
    label: 'Bích Ngọc Sinh Cơ',
    description: 'Bích ngọc sinh cơ lưu chuyển trong trận, giảm tiêu hao Thể Lực.',
    effects: { staminaReduction: 0.06 },
  },

  tu_dien_ky_lan: {
    petId: 'tu_dien_ky_lan',
    name: 'Tử Điện Kỳ Lân',
    type: 'breakthrough',
    label: 'Tử Điện Trấn Trận',
    description: 'Tử điện thiên uy gia cố trận thế, tăng khả năng phá cảnh và lĩnh ngộ.',
    effects: {
      breakthroughBonus: 0.08,
      insightBonus: 0.05,
    },
  },

  thien_loi_bach_ho: {
    petId: 'thien_loi_bach_ho',
    name: 'Thiên Lôi Bạch Hổ',
    type: 'breakthrough',
    label: 'Thiên Lôi Phá Trận',
    description: 'Thiên lôi nhập trận, tăng uy lực phá cảnh.',
    effects: { breakthroughBonus: 0.08 },
  },

  niet_ban_phuong_hoang: {
    petId: 'niet_ban_phuong_hoang',
    name: 'Niết Bàn Phượng Hoàng',
    type: 'adventure',
    label: 'Niết Bàn Sinh Trận',
    description: 'Niết Bàn chi hỏa tái sinh trận lực, khuếch đại cơ duyên trong Thám Hiểm và Bí Cảnh.',
    effects: {
      adventureBonus: 0.08,
      spiritStoneBonus: 0.05,
    },
  },

  xich_lan_hoa_mang: {
    petId: 'xich_lan_hoa_mang',
    name: 'Xích Lân Hỏa Mãng',
    type: 'adventure',
    label: 'Xích Lân Liệt Trận',
    description: 'Xích lân hỏa lực bùng phát, tăng uy thế của trận pháp trong hiểm chiến.',
    effects: { adventureBonus: 0.08 },
  },

  kim_diem_toan_nghe: {
    petId: 'kim_diem_toan_nghe',
    name: 'Kim Diễm Toan Nghê',
    type: 'insight',
    label: 'Kim Diễm Trấn Pháp',
    description: 'Kim diễm luyện trận, đồng thời trợ Tu Luyện và Lĩnh Ngộ.',
    effects: {
      cultivationBonus: 0.08,
      insightBonus: 0.08,
    },
  },

  hau_tho_kim_long: {
    petId: 'hau_tho_kim_long',
    name: 'Hậu Thổ Kim Long',
    type: 'five_elements',
    label: 'Hậu Thổ Trấn Ngũ Hành',
    description: 'Hậu Thổ thần lực ổn định Ngũ Hành, thiên về hộ đạo và phá cảnh.',
    requiredFormationId: 'five_elements',
    effects: {
      breakthroughBonus: 0.08,
      staminaReduction: 0.05,
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

  bach_vu_phong_lang: {
    petId: 'bach_vu_phong_lang',
    name: 'Bạch Vũ Phong Lang',
    type: 'mythic',
    label: 'Bạch Vũ Thần Trận',
    description: 'Thần lang dẫn phong nhập trận, khuếch đại Tu Luyện và hành trình Thám Hiểm.',
    effects: {
      cultivationBonus: 0.08,
      adventureBonus: 0.08,
    },
  },

  thai_co_long_tuong: {
    petId: 'thai_co_long_tuong',
    name: 'Thái Cổ Long Tượng',
    type: 'mythic',
    label: 'Long Tượng Trấn Giới',
    description: 'Long Tượng thần lực trấn áp trận cơ, thiên về phòng hộ và phá cảnh.',
    effects: {
      staminaReduction: 0.10,
      breakthroughBonus: 0.10,
    },
  },

  thai_hu_tien_hac: {
    petId: 'thai_hu_tien_hac',
    name: 'Thái Hư Tiên Hạc',
    type: 'immortal',
    label: 'Thái Hư Tiên Trận',
    description: 'Tiên khí Thái Hư hòa vào trận mạch, tạo cộng hưởng cao nhất giữa Linh Thú và Trận Đạo.',
    effects: {
      cultivationBonus: 0.15,
      insightBonus: 0.15,
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

  if (!Array.isArray(layout)) return false;

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

  if (!pet) return null;

  const synergy = FORMATION_SPIRIT_SYNERGIES[pet.id];
  if (!synergy) return null;

  const activeFormationId = formationState?.activeFormationId || null;
  const matchesRequiredFormation =
    !synergy.requiredFormationId ||
    synergy.requiredFormationId === activeFormationId;
  const matchesSpecialCondition =
    synergy.type !== 'five_elements' ||
    hasFiveElementCycle(formationState);
  const active =
    matchesRequiredFormation && matchesSpecialCondition;

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
