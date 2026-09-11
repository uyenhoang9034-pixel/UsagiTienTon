import {
  getFormationState,
  getFormationResonance,
} from './cultivationFormation.js';
import {
  getCultivationProfile,
} from './cultivationService.js';
import {
  getFormationSpiritSynergy,
} from './cultivationFormationSpirit.js';

const EMPTY_EFFECTS = Object.freeze({
  cultivationBonus: 0,
  adventureBonus: 0,
  staminaReduction: 0,
  breakthroughBonus: 0,
  spiritStoneBonus: 0,
  insightBonus: 0,
});

function clamp(value, min = 0, max = 0.75) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function normalizeEffects(effects = {}) {
  return {
    cultivationBonus: clamp(effects.cultivationBonus),
    adventureBonus: clamp(effects.adventureBonus),
    staminaReduction: clamp(effects.staminaReduction),
    breakthroughBonus: clamp(effects.breakthroughBonus),
    spiritStoneBonus: clamp(effects.spiritStoneBonus),
    insightBonus: clamp(effects.insightBonus),
  };
}

function mergeEffects(baseEffects = {}, extraEffects = {}) {
  return normalizeEffects({
    cultivationBonus:
      (Number(baseEffects.cultivationBonus) || 0) +
      (Number(extraEffects.cultivationBonus) || 0),
    adventureBonus:
      (Number(baseEffects.adventureBonus) || 0) +
      (Number(extraEffects.adventureBonus) || 0),
    staminaReduction:
      (Number(baseEffects.staminaReduction) || 0) +
      (Number(extraEffects.staminaReduction) || 0),
    breakthroughBonus:
      (Number(baseEffects.breakthroughBonus) || 0) +
      (Number(extraEffects.breakthroughBonus) || 0),
    spiritStoneBonus:
      (Number(baseEffects.spiritStoneBonus) || 0) +
      (Number(extraEffects.spiritStoneBonus) || 0),
    insightBonus:
      (Number(baseEffects.insightBonus) || 0) +
      (Number(extraEffects.insightBonus) || 0),
  });
}

export async function getFormationGameplayBonus(client, guildId, userId) {
  try {
    const state = await getFormationState(
      client,
      guildId,
      userId,
    );
    const resonance = getFormationResonance(state);
    let spiritSynergy = null;
    let spiritError = null;

    try {
      const profile = await getCultivationProfile(
        client,
        guildId,
        userId,
      );
      spiritSynergy = getFormationSpiritSynergy(
        profile,
        state,
      );
    } catch (error) {
      spiritError = error;
    }

    const effects = mergeEffects(
      resonance.effects,
      spiritSynergy?.effects,
    );
    const lines = Array.isArray(resonance.lines)
      ? [...resonance.lines]
      : [];

    if (spiritSynergy?.active && spiritSynergy.line) {
      lines.push(spiritSynergy.line);
    }

    return {
      ok: true,
      formationId: state.activeFormationId,
      lines,
      effects,
      spiritSynergy,
      spiritError,
    };
  } catch (error) {
    // Formation bonuses must never make the base cultivation game unusable.
    return {
      ok: false,
      formationId: null,
      lines: [],
      effects: { ...EMPTY_EFFECTS },
      spiritSynergy: null,
      spiritError: null,
      error,
    };
  }
}

export function applyFormationCultivationBonus(amount, effects) {
  const base = Number(amount) || 0;
  if (base <= 0) return { total: base, bonus: 0 };

  const bonus = Math.max(
    0,
    Math.round(base * clamp(effects?.cultivationBonus)),
  );

  return { total: base + bonus, bonus };
}

export function applyFormationSpiritStoneBonus(amount, effects) {
  const base = Number(amount) || 0;
  if (base <= 0) return { total: base, bonus: 0 };

  const bonus = Math.max(
    0,
    Math.round(base * clamp(effects?.spiritStoneBonus)),
  );

  return { total: base + bonus, bonus };
}

export function applyFormationStaminaReduction(cost, effects) {
  const base = Math.max(0, Math.floor(Number(cost) || 0));
  if (base <= 0) return { total: 0, saved: 0 };

  const saved = Math.min(
    base,
    Math.max(0, Math.floor(base * clamp(effects?.staminaReduction))),
  );

  return { total: Math.max(0, base - saved), saved };
}

export function applyFormationBreakthroughBonus(chance, effects) {
  const base = Math.max(0, Number(chance) || 0);
  const bonus = clamp(effects?.breakthroughBonus);

  return {
    total: Math.min(0.95, base + bonus),
    bonus,
  };
}

export function getFormationAdventureBonus(effects) {
  return clamp(effects?.adventureBonus);
}

export function getFormationInsightBonus(effects) {
  return clamp(effects?.insightBonus);
}
