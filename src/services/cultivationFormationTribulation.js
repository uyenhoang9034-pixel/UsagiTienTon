import {
  getActiveFormation,
  getFormationEye,
  getFormationLevel,
  getFormationSlotLevels,
  getFormationState,
} from './cultivationFormation.js';

import {
  getFormationGameplayBonus,
} from './cultivationFormationGameplay.js';

import {
  getCultivationProfile,
} from './cultivationService.js';

export const FORMATION_TRIBULATIONS = {
  five_elements_earth: {
    id: 'five_elements_earth',
    name: 'Ngũ Hành Địa Kiếp',
    recommendedFormationId: 'five_elements',
    difficulty: 1,
    baseChance: 0.68,
    description: 'Địa mạch đảo chuyển, Ngũ Hành linh khí liên tục tương sinh tương khắc.',
  },

  wind_lightning_heaven: {
    id: 'wind_lightning_heaven',
    name: 'Phong Lôi Thiên Kiếp',
    recommendedFormationId: 'wind_lightning',
    difficulty: 2,
    baseChance: 0.62,
    description: 'Phong bạo cuốn thiên lôi giáng xuống, trận mạch phải liên tục biến hóa để chống đỡ.',
  },

  frozen_spirit_calamity: {
    id: 'frozen_spirit_calamity',
    name: 'Huyền Băng Hàn Kiếp',
    recommendedFormationId: 'frozen_spirit',
    difficulty: 3,
    baseChance: 0.56,
    description: 'Hàn khí phong tỏa linh lực, từng tầng băng sát ăn mòn trận văn.',
  },

  yin_yang_heart: {
    id: 'yin_yang_heart',
    name: 'Âm Dương Tâm Kiếp',
    recommendedFormationId: 'yin_yang',
    difficulty: 4,
    baseChance: 0.50,
    description: 'Âm Dương nghịch chuyển, tâm ma và linh niệm đồng thời công kích Trận Nhãn.',
  },

  chaos_annihilation: {
    id: 'chaos_annihilation',
    name: 'Hỗn Độn Diệt Kiếp',
    recommendedFormationId: 'chaos_unity',
    difficulty: 5,
    baseChance: 0.44,
    description: 'Hỗn Độn xé rách trận vực, mọi cộng hưởng đều bị ép tới cực hạn.',
  },
};

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0,
    ),
  );
}

function average(values = []) {
  if (!Array.isArray(values) || values.length === 0) {
    return 1;
  }

  const total = values.reduce(
    (sum, value) => sum + Math.max(1, Number(value) || 1),
    0,
  );

  return total / values.length;
}

export function getFormationTribulation(id) {
  return FORMATION_TRIBULATIONS[id] || null;
}

export async function getFormationTribulationPreview(
  client,
  guildId,
  userId,
  tribulationId,
) {
  const tribulation = getFormationTribulation(
    tribulationId,
  );

  if (!tribulation) {
    return {
      ok: false,
      reason: 'invalid_tribulation',
    };
  }

  const [
    state,
    profile,
    gameplayBonus,
  ] = await Promise.all([
    getFormationState(
      client,
      guildId,
      userId,
    ),
    getCultivationProfile(
      client,
      guildId,
      userId,
    ),
    getFormationGameplayBonus(
      client,
      guildId,
      userId,
    ),
  ]);

  const formation = getActiveFormation(state);
  const formationLevel = getFormationLevel(
    state,
    formation.id,
  );
  const slotLevels = getFormationSlotLevels(
    state,
    formation.id,
  );
  const averageSlotLevel = average(slotLevels);
  const eye = getFormationEye(
    state,
    formation.id,
  );

  const formationMatch =
    formation.id ===
    tribulation.recommendedFormationId;

  const realmBonus = Math.min(
    0.12,
    Math.max(
      0,
      Number(profile.realmIndex) || 0,
    ) * 0.012,
  );

  const formationLevelBonus =
    Math.max(
      0,
      formationLevel - 1,
    ) * 0.012;

  const slotLevelBonus =
    Math.max(
      0,
      averageSlotLevel - 1,
    ) * 0.006;

  const eyeLevelBonus =
    Math.max(
      0,
      (Number(eye.level) || 1) - 1,
    ) * 0.004;

  const matchingFormationBonus =
    formationMatch
      ? 0.12
      : 0;

  const spiritSynergyBonus =
    gameplayBonus?.spiritSynergy?.active
      ? 0.02
      : 0;

  const resonanceBonus = Math.min(
    0.08,
    (
      Math.max(
        0,
        Number(gameplayBonus?.effects?.cultivationBonus) || 0,
      ) +
      Math.max(
        0,
        Number(gameplayBonus?.effects?.adventureBonus) || 0,
      ) +
      Math.max(
        0,
        Number(gameplayBonus?.effects?.breakthroughBonus) || 0,
      )
    ) * 0.15,
  );

  const winChance = clamp(
    tribulation.baseChance +
      realmBonus +
      formationLevelBonus +
      slotLevelBonus +
      eyeLevelBonus +
      matchingFormationBonus +
      spiritSynergyBonus +
      resonanceBonus,
    0.15,
    0.92,
  );

  return {
    ok: true,
    tribulation,
    state,
    profile,
    formation,
    formationMatch,
    formationLevel,
    slotLevels,
    averageSlotLevel,
    eye,
    gameplayBonus,
    winChance,
    bonuses: {
      realmBonus,
      formationLevelBonus,
      slotLevelBonus,
      eyeLevelBonus,
      matchingFormationBonus,
      spiritSynergyBonus,
      resonanceBonus,
    },
  };
}
