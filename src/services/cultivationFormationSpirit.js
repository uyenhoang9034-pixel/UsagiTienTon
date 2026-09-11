import {
  getActivePet,
} from './cultivationPet.js';

export const FORMATION_SPIRIT_SYNERGIES = {
  thanh_phong_linh_ho: {
    petId: 'thanh_phong_linh_ho',
    name: 'Thanh Phong Linh Hồ',
    type: 'insight',
    label: 'Thanh Phong Diễn Trận',
    description: 'Thanh phong trợ trận, thiên về Lĩnh Ngộ Trận Đạo.',
  },

  xich_viem_hoa_dieu: {
    petId: 'xich_viem_hoa_dieu',
    name: 'Xích Viêm Hỏa Điểu',
    type: 'spirit_stone',
    label: 'Xích Viêm Tụ Linh',
    description: 'Hỏa linh dẫn tài khí, thiên về Linh Thạch.',
  },

  huyen_giap_linh_quy: {
    petId: 'huyen_giap_linh_quy',
    name: 'Huyền Giáp Linh Quy',
    type: 'stamina',
    label: 'Huyền Giáp Trấn Trận',
    description: 'Huyền giáp ổn định trận mạch, thiên về giảm tiêu hao Thể Lực.',
  },

  thien_loi_bach_ho: {
    petId: 'thien_loi_bach_ho',
    name: 'Thiên Lôi Bạch Hổ',
    type: 'adventure',
    label: 'Thiên Lôi Phá Trận',
    description: 'Lôi uy dẫn trận thế, thiên về Thám Hiểm và giao chiến.',
  },

  hau_tho_kim_long: {
    petId: 'hau_tho_kim_long',
    name: 'Hậu Thổ Kim Long',
    type: 'five_elements',
    label: 'Hậu Thổ Trấn Ngũ Hành',
    description: 'Hậu Thổ thần lực ổn định Ngũ Hành, thiên về khuếch đại Ngũ Hành Tuần Hoàn.',
  },
};

export function getFormationSpiritSynergy(profile) {
  const pet = getActivePet(profile);

  if (!pet) {
    return null;
  }

  const synergy = FORMATION_SPIRIT_SYNERGIES[pet.id];

  if (!synergy) {
    return null;
  }

  return {
    ...synergy,
    pet,
  };
}
