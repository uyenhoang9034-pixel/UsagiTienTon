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
    description: 'Lôi uy dẫn trận thế, thiên về Thám Hiểm và giao chiến.',
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
};

function normalizeEffects(effects = {}) {
  return {
    ...EMPTY_EFFECTS,
    ...effects,
  };
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
  const active =
    !synergy.requiredFormationId ||
    synergy.requiredFormationId === activeFormationId;

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
