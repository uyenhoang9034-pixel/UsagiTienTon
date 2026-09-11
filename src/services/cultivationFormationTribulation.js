import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

import { Mutex } from '../utils/mutex.js';

import {
  FORMATION_DEFINITIONS,
  getActiveFormation,
  getFormationEye,
  getFormationLevel,
  getFormationSlotLevels,
  getFormationState,
  saveFormationState,
} from './cultivationFormation.js';

import { getFormationGameplayBonus } from './cultivationFormationGameplay.js';
import { getCultivationProfile } from './cultivationService.js';

const TRIBULATION_KEY_PREFIX = 'games:cultivation:formationTribulation:';
export const FORMATION_TRIBULATION_COOLDOWN_MS = 30 * 60 * 1000;

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

export const FORMATION_TRIBULATION_ORDER = [
  'five_elements_earth',
  'wind_lightning_heaven',
  'frozen_spirit_calamity',
  'yin_yang_heart',
  'chaos_annihilation',
];

function tribulationKey(guildId, userId) {
  return `${TRIBULATION_KEY_PREFIX}${guildId}:${userId}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function average(values = []) {
  if (!Array.isArray(values) || values.length === 0) return 1;
  return values.reduce(
    (sum, value) => sum + Math.max(1, Number(value) || 1),
    0,
  ) / values.length;
}

function randomInt(min, max) {
  const safeMin = Math.ceil(Number(min) || 0);
  const safeMax = Math.max(safeMin, Math.floor(Number(max) || safeMin));
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function unlockEligibleFormations(state) {
  const unlockedNow = [];
  state.unlockedFormationIds ||= [];
  state.formationLevels ||= {};
  state.layouts ||= {};
  state.slotLevels ||= {};
  state.formationFragments ||= {};
  state.formationEyes ||= {};

  for (const formation of Object.values(FORMATION_DEFINITIONS)) {
    if (
      Number(state.insight) < Number(formation.unlockInsight) ||
      state.unlockedFormationIds.includes(formation.id)
    ) {
      continue;
    }

    state.unlockedFormationIds.push(formation.id);
    state.formationLevels[formation.id] ||= 1;
    state.layouts[formation.id] ||= [...formation.pattern];
    state.slotLevels[formation.id] ||= Array(formation.slots).fill(1);
    state.formationFragments[formation.id] ||= 0;
    state.formationEyes[formation.id] ||= { elementId: 'spirit', level: 1 };
    unlockedNow.push(formation);
  }

  return unlockedNow;
}

function normalizeTribulationStatus(raw) {
  const clears = {};
  for (const id of FORMATION_TRIBULATION_ORDER) {
    clears[id] = Math.max(0, Math.floor(Number(raw?.clears?.[id]) || 0));
  }

  return {
    lastAttemptAt: Math.max(0, Number(raw?.lastAttemptAt) || 0),
    totalAttempts: Math.max(0, Math.floor(Number(raw?.totalAttempts) || 0)),
    totalWins: Math.max(0, Math.floor(Number(raw?.totalWins) || 0)),
    clears,
  };
}

export async function getFormationTribulationStatus(client, guildId, userId) {
  const stored = await getDatabaseValue(
    client,
    tribulationKey(guildId, userId),
    null,
  );
  return normalizeTribulationStatus(stored);
}

export async function resetFormationTribulationStatus(client, guildId, userId) {
  const status = normalizeTribulationStatus(null);
  await setDatabaseValue(client, tribulationKey(guildId, userId), status);
  return status;
}

export async function resetFormationTribulationCooldown(client, guildId, userId) {
  const status = await getFormationTribulationStatus(client, guildId, userId);
  status.lastAttemptAt = 0;
  await setDatabaseValue(client, tribulationKey(guildId, userId), status);
  return status;
}

export function getFormationTribulationCooldownRemaining(status) {
  const lastAttemptAt = Math.max(0, Number(status?.lastAttemptAt) || 0);
  if (!lastAttemptAt) return 0;
  return Math.max(
    0,
    FORMATION_TRIBULATION_COOLDOWN_MS - (Date.now() - lastAttemptAt),
  );
}

export function getFormationTribulation(id) {
  return FORMATION_TRIBULATIONS[id] || null;
}

export function isFormationTribulationUnlocked(status, tribulationId) {
  const index = FORMATION_TRIBULATION_ORDER.indexOf(tribulationId);
  if (index < 0) return false;
  if (index === 0) return true;
  const previousId = FORMATION_TRIBULATION_ORDER[index - 1];
  return (Number(status?.clears?.[previousId]) || 0) > 0;
}

export async function getFormationTribulationPreview(
  client,
  guildId,
  userId,
  tribulationId,
  { ignoreProgression = false } = {},
) {
  const tribulation = getFormationTribulation(tribulationId);
  if (!tribulation) return { ok: false, reason: 'invalid_tribulation' };

  const [state, profile, gameplayBonus, status] = await Promise.all([
    getFormationState(client, guildId, userId),
    getCultivationProfile(client, guildId, userId),
    getFormationGameplayBonus(client, guildId, userId),
    getFormationTribulationStatus(client, guildId, userId),
  ]);

  const progressionUnlocked = isFormationTribulationUnlocked(
    status,
    tribulationId,
  );

  if (!ignoreProgression && !progressionUnlocked) {
    return {
      ok: false,
      reason: 'locked',
      tribulation,
      status,
      progressionUnlocked: false,
    };
  }

  const formation = getActiveFormation(state);
  const formationLevel = getFormationLevel(state, formation.id);
  const slotLevels = getFormationSlotLevels(state, formation.id);
  const averageSlotLevel = average(slotLevels);
  const eye = getFormationEye(state, formation.id);
  const formationMatch = formation.id === tribulation.recommendedFormationId;

  const realmBonus = Math.min(
    0.12,
    Math.max(0, Number(profile.realmIndex) || 0) * 0.012,
  );
  const formationLevelBonus = Math.max(0, formationLevel - 1) * 0.012;
  const slotLevelBonus = Math.max(0, averageSlotLevel - 1) * 0.006;
  const eyeLevelBonus = Math.max(0, (Number(eye.level) || 1) - 1) * 0.004;
  const matchingFormationBonus = formationMatch ? 0.12 : 0;
  const spiritSynergyBonus = gameplayBonus?.spiritSynergy?.active ? 0.02 : 0;
  const resonanceBonus = Math.min(
    0.08,
    (
      Math.max(0, Number(gameplayBonus?.effects?.cultivationBonus) || 0) +
      Math.max(0, Number(gameplayBonus?.effects?.adventureBonus) || 0) +
      Math.max(0, Number(gameplayBonus?.effects?.breakthroughBonus) || 0)
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
    status,
    progressionUnlocked,
    firstClear: (Number(status.clears?.[tribulationId]) || 0) === 0,
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

export async function attemptFormationTribulation(
  client,
  guildId,
  userId,
  tribulationId,
  {
    ignoreCooldown = false,
    ignoreProgression = false,
  } = {},
) {
  const lockKey = `cultivation:formationTribulation:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const preview = await getFormationTribulationPreview(
      client,
      guildId,
      userId,
      tribulationId,
      { ignoreProgression },
    );

    if (!preview.ok) return preview;

    const status = preview.status;
    const remainingMs = getFormationTribulationCooldownRemaining(status);

    if (!ignoreCooldown && remainingMs > 0) {
      return {
        ok: false,
        reason: 'cooldown',
        remainingMs,
        status,
        preview,
      };
    }

    const success = Math.random() < preview.winChance;
    const firstClear = preview.firstClear;
    let reward = null;
    let state = preview.state;

    if (success) {
      const difficulty = Math.max(
        1,
        Number(preview.tribulation.difficulty) || 1,
      );

      const insightGain = randomInt(
        20 + difficulty * 10,
        30 + difficulty * 15,
      ) + (firstClear ? 15 * difficulty : 0);

      const essenceGain = randomInt(
        10 + difficulty * 8,
        18 + difficulty * 12,
      ) + (firstClear ? 10 * difficulty : 0);

      const fragmentGain =
        (difficulty >= 4 ? 2 : 1) + (firstClear ? 1 : 0);

      const crystalGain =
        (difficulty >= 5 ? 3 : difficulty >= 3 ? 2 : 1) +
        (firstClear ? 1 : 0);

      const recommendedFormation =
        FORMATION_DEFINITIONS[preview.tribulation.recommendedFormationId];
      const crystalPool = Array.from(
        new Set(recommendedFormation?.pattern || []),
      );
      const crystalId = crystalPool.length
        ? crystalPool[Math.floor(Math.random() * crystalPool.length)]
        : 'spirit';

      state.insight = Math.max(0, Number(state.insight) || 0) + insightGain;
      state.formationEssence =
        Math.max(0, Number(state.formationEssence) || 0) + essenceGain;

      state.formationFragments ||= {};
      state.formationFragments[preview.tribulation.recommendedFormationId] =
        Math.max(
          0,
          Number(
            state.formationFragments?.[
              preview.tribulation.recommendedFormationId
            ],
          ) || 0,
        ) + fragmentGain;

      state.elementCrystals ||= {};
      state.elementCrystals[crystalId] =
        Math.max(0, Number(state.elementCrystals?.[crystalId]) || 0) +
        crystalGain;

      const unlockedNow = unlockEligibleFormations(state);
      state = await saveFormationState(client, guildId, userId, state);

      reward = {
        insightGain,
        essenceGain,
        fragmentGain,
        crystalId,
        crystalGain,
        formationId: preview.tribulation.recommendedFormationId,
        unlockedNow,
        firstClear,
      };
    }

    const nextStatus = normalizeTribulationStatus(status);
    nextStatus.lastAttemptAt = Date.now();
    nextStatus.totalAttempts += 1;

    if (success) {
      nextStatus.totalWins += 1;
      nextStatus.clears[tribulationId] =
        (Number(nextStatus.clears?.[tribulationId]) || 0) + 1;
    }

    await setDatabaseValue(
      client,
      tribulationKey(guildId, userId),
      nextStatus,
    );

    const currentIndex = FORMATION_TRIBULATION_ORDER.indexOf(tribulationId);
    const nextTribulationId = success
      ? FORMATION_TRIBULATION_ORDER[currentIndex + 1] || null
      : null;

    return {
      ok: true,
      success,
      firstClear: success && firstClear,
      nextTribulationId,
      preview,
      state,
      reward,
      status: nextStatus,
      cooldownMs: FORMATION_TRIBULATION_COOLDOWN_MS,
    };
  });
}
