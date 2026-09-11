import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

import { Mutex } from '../utils/mutex.js';

import {
  FORMATION_DEFINITIONS,
  saveFormationState,
} from './cultivationFormation.js';

import {
  FORMATION_TRIBULATION_COOLDOWN_MS,
  FORMATION_TRIBULATION_ORDER,
  getFormationTribulationCooldownRemaining,
  getFormationTribulationPreview as getBasePreview,
} from './cultivationFormationTribulation.js';

import {
  getCultivationProfile,
} from './cultivationService.js';

import {
  getActivePet,
  getPetEffectValue,
} from './cultivationPet.js';

export * from './cultivationFormationTribulation.js';

const TRIBULATION_KEY_PREFIX =
  'games:cultivation:formationTribulation:';

function tribulationKey(guildId, userId) {
  return `${TRIBULATION_KEY_PREFIX}${guildId}:${userId}`;
}

function randomInt(min, max) {
  const safeMin = Math.ceil(Number(min) || 0);
  const safeMax = Math.max(safeMin, Math.floor(Number(max) || safeMin));
  return Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
}

function normalizeStatus(raw) {
  const clears = {};

  for (const id of FORMATION_TRIBULATION_ORDER) {
    clears[id] = Math.max(
      0,
      Math.floor(Number(raw?.clears?.[id]) || 0),
    );
  }

  return {
    lastAttemptAt: Math.max(0, Number(raw?.lastAttemptAt) || 0),
    totalAttempts: Math.max(0, Math.floor(Number(raw?.totalAttempts) || 0)),
    totalWins: Math.max(0, Math.floor(Number(raw?.totalWins) || 0)),
    clears,
  };
}

function scaleDiscreteReward(value, multiplier) {
  const raw = Math.max(0, Number(value) || 0) * Math.max(1, Number(multiplier) || 1);
  const whole = Math.floor(raw);
  const fraction = raw - whole;
  return whole + (fraction > 0 && Math.random() < fraction ? 1 : 0);
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
    state.formationEyes[formation.id] ||= {
      elementId: 'spirit',
      level: 1,
    };
    unlockedNow.push(formation);
  }

  return unlockedNow;
}

export async function getFormationTribulationPreview(
  client,
  guildId,
  userId,
  tribulationId,
  options = {},
) {
  const preview = await getBasePreview(
    client,
    guildId,
    userId,
    tribulationId,
    options,
  );

  if (!preview?.ok) return preview;

  const profile =
    preview.profile ||
    await getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const petSuccessBonus = Math.max(
    0,
    Number(
      getPetEffectValue(
        profile,
        'formation_tribulation_success_bonus',
      ),
    ) || 0,
  );

  const petRewardBonus = Math.max(
    0,
    Number(
      getPetEffectValue(
        profile,
        'formation_tribulation_reward_bonus',
      ),
    ) || 0,
  );

  return {
    ...preview,
    baseWinChance: preview.winChance,
    winChance: Math.min(
      1,
      Math.max(
        0,
        Number(preview.winChance) || 0,
      ) + petSuccessBonus,
    ),
    activePet: getActivePet(profile),
    petTribulationSuccessBonus: petSuccessBonus,
    petTribulationRewardBonus: petRewardBonus,
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
  const lockKey =
    `cultivation:formationTribulation:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const preview = await getFormationTribulationPreview(
      client,
      guildId,
      userId,
      tribulationId,
      { ignoreProgression },
    );

    if (!preview.ok) return preview;

    const status = normalizeStatus(preview.status);
    const remainingMs =
      getFormationTribulationCooldownRemaining(status);

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
    const rewardMultiplier =
      1 + Math.max(
        0,
        Number(preview.petTribulationRewardBonus) || 0,
      );

    let reward = null;
    let state = preview.state;

    if (success) {
      const difficulty = Math.max(
        1,
        Number(preview.tribulation.difficulty) || 1,
      );

      const baseInsightGain =
        randomInt(
          20 + difficulty * 10,
          30 + difficulty * 15,
        ) +
        (firstClear ? 15 * difficulty : 0);

      const baseEssenceGain =
        randomInt(
          10 + difficulty * 8,
          18 + difficulty * 12,
        ) +
        (firstClear ? 10 * difficulty : 0);

      const baseFragmentGain =
        (difficulty >= 4 ? 2 : 1) +
        (firstClear ? 1 : 0);

      const baseCrystalGain =
        (difficulty >= 5 ? 3 : difficulty >= 3 ? 2 : 1) +
        (firstClear ? 1 : 0);

      const insightGain = scaleDiscreteReward(
        baseInsightGain,
        rewardMultiplier,
      );
      const essenceGain = scaleDiscreteReward(
        baseEssenceGain,
        rewardMultiplier,
      );
      const fragmentGain = scaleDiscreteReward(
        baseFragmentGain,
        rewardMultiplier,
      );
      const crystalGain = scaleDiscreteReward(
        baseCrystalGain,
        rewardMultiplier,
      );

      const recommendedFormation =
        FORMATION_DEFINITIONS[
          preview.tribulation.recommendedFormationId
        ];

      const crystalPool = Array.from(
        new Set(recommendedFormation?.pattern || []),
      );

      const crystalId = crystalPool.length
        ? crystalPool[
            Math.floor(
              Math.random() * crystalPool.length,
            )
          ]
        : 'spirit';

      state.insight =
        Math.max(0, Number(state.insight) || 0) + insightGain;

      state.formationEssence =
        Math.max(0, Number(state.formationEssence) || 0) +
        essenceGain;

      state.formationFragments ||= {};
      state.formationFragments[
        preview.tribulation.recommendedFormationId
      ] =
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
        Math.max(
          0,
          Number(state.elementCrystals?.[crystalId]) || 0,
        ) + crystalGain;

      const unlockedNow = unlockEligibleFormations(state);
      state = await saveFormationState(
        client,
        guildId,
        userId,
        state,
      );

      reward = {
        insightGain,
        essenceGain,
        fragmentGain,
        crystalId,
        crystalGain,
        formationId:
          preview.tribulation.recommendedFormationId,
        unlockedNow,
        firstClear,
        baseInsightGain,
        baseEssenceGain,
        baseFragmentGain,
        baseCrystalGain,
        petRewardBonus:
          Math.max(
            0,
            Number(preview.petTribulationRewardBonus) || 0,
          ),
      };
    }

    const nextStatus = normalizeStatus(status);
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

    const currentIndex =
      FORMATION_TRIBULATION_ORDER.indexOf(tribulationId);

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
      activePet: preview.activePet,
      petTribulationSuccessBonus:
        preview.petTribulationSuccessBonus,
      petTribulationRewardBonus:
        preview.petTribulationRewardBonus,
    };
  });
}
