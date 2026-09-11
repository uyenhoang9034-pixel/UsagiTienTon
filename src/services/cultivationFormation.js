import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

const FORMATION_KEY_PREFIX = 'games:cultivation:formation:';
const COMPREHEND_COOLDOWN_MS = 10 * 60 * 1000;
const MAX_FORMATION_LEVEL = 10;
const MAX_SLOT_LEVEL = 10;

export const FORMATION_ELEMENTS = {
  metal: { id: 'metal', name: 'Kim', tier: 'basic', emoji: '<a:ttkim:1547830384589545553>' },
  wood: { id: 'wood', name: 'Mộc', tier: 'basic', emoji: '<a:ttmoc:1547831914402938961>' },
  water: { id: 'water', name: 'Thủy', tier: 'basic', emoji: '<a:ttthuy:1547831344178921544>' },
  fire: { id: 'fire', name: 'Hỏa', tier: 'basic', emoji: '<a:tthoa:1547830861368533074>' },
  earth: { id: 'earth', name: 'Thổ', tier: 'basic', emoji: '<a:tttho:1547830124840362024>' },
  wind: { id: 'wind', name: 'Phong', tier: 'variant', emoji: '<a:ttphong:1547835094503268462>' },
  lightning: { id: 'lightning', name: 'Lôi', tier: 'variant', emoji: '<a:ttloi:1547835063406698496>' },
  ice: { id: 'ice', name: 'Băng', tier: 'variant', emoji: '<a:ttbang:1547835499484291173>' },
  yin_yang: { id: 'yin_yang', name: 'Âm Dương', tier: 'rare', emoji: '<a:ttamduong:1547842274753515581>' },
  spirit: { id: 'spirit', name: 'Tinh Thần', tier: 'rare', emoji: '<a:tttinhthan:1547842316499423293>' },
  chaos: { id: 'chaos', name: 'Hỗn Độn', tier: 'rare', emoji: '<a:tthondon:1547842242885066793>' },
};

export const FORMATION_EYE_ELEMENT_IDS = [
  'spirit',
  'chaos',
];

export const FORMATION_DEFINITIONS = {
  five_elements: {
    id: 'five_elements',
    name: 'Tiểu Ngũ Hành Trận',
    rarity: 'Phàm',
    unlockInsight: 0,
    slots: 5,
    pattern: ['metal', 'water', 'wood', 'fire', 'earth'],
    effect: 'Tăng hiệu quả Tu Luyện khi Ngũ Hành vận chuyển hoàn chỉnh.',
  },
  wind_lightning: {
    id: 'wind_lightning',
    name: 'Phong Lôi Dẫn Thiên Trận',
    rarity: 'Hoàng',
    unlockInsight: 100,
    slots: 4,
    pattern: ['wind', 'lightning', 'wind', 'lightning'],
    effect: 'Tăng khả năng ứng biến trong Thám Hiểm và Bí Cảnh.',
  },
  frozen_spirit: {
    id: 'frozen_spirit',
    name: 'Huyền Băng Tỏa Linh Trận',
    rarity: 'Huyền',
    unlockInsight: 250,
    slots: 4,
    pattern: ['water', 'ice', 'ice', 'water'],
    effect: 'Ổn định linh lực, thiên về tiết kiệm Thể Lực.',
  },
  yin_yang: {
    id: 'yin_yang',
    name: 'Âm Dương Lưỡng Nghi Trận',
    rarity: 'Địa',
    unlockInsight: 500,
    slots: 4,
    pattern: ['yin_yang', 'spirit', 'spirit', 'yin_yang'],
    effect: 'Điều hòa Âm Dương, hỗ trợ Đột Phá và lĩnh ngộ.',
  },
  chaos_unity: {
    id: 'chaos_unity',
    name: 'Hỗn Độn Quy Nhất Trận',
    rarity: 'Thiên',
    unlockInsight: 1000,
    slots: 5,
    pattern: ['metal', 'wood', 'chaos', 'water', 'fire'],
    effect: 'Hỗn Độn làm mắt trận, khuếch đại các cộng hưởng đang vận hành.',
  },
};

const EMPTY_CRYSTALS = Object.fromEntries(
  Object.keys(FORMATION_ELEMENTS).map((id) => [id, 0]),
);

const DEFAULT_STATE = {
  version: 2,
  insight: 0,
  formationEssence: 30,
  lastComprehendAt: null,
  activeFormationId: 'five_elements',
  unlockedFormationIds: ['five_elements'],
  formationLevels: { five_elements: 1 },
  layouts: { five_elements: ['metal', 'water', 'wood', 'fire', 'earth'] },
  slotLevels: { five_elements: [1, 1, 1, 1, 1] },
  formationFragments: {},
  elementCrystals: { ...EMPTY_CRYSTALS },
  formationEyes: {
    five_elements: { elementId: 'spirit', level: 1 },
  },
};

function stateKey(guildId, userId) {
  return `${FORMATION_KEY_PREFIX}${guildId}:${userId}`;
}

function normalizeLevelArray(value, length) {
  const raw = Array.isArray(value) ? value : [];
  return Array.from({ length }, (_, index) => Math.max(
    1,
    Math.min(MAX_SLOT_LEVEL, Math.floor(Number(raw[index]) || 1)),
  ));
}

function normalizeState(data) {
  const state = {
    ...DEFAULT_STATE,
    ...(data && typeof data === 'object' ? data : {}),
  };

  state.version = 2;
  state.insight = Math.max(0, Number(state.insight) || 0);
  state.formationEssence = Math.max(0, Number(state.formationEssence) || 0);
  state.unlockedFormationIds = Array.from(new Set([
    'five_elements',
    ...(Array.isArray(state.unlockedFormationIds) ? state.unlockedFormationIds : []),
  ])).filter((id) => FORMATION_DEFINITIONS[id]);

  state.formationLevels = {
    ...DEFAULT_STATE.formationLevels,
    ...(state.formationLevels || {}),
  };

  state.layouts = {
    ...DEFAULT_STATE.layouts,
    ...(state.layouts || {}),
  };

  state.slotLevels = {
    ...(state.slotLevels || {}),
  };

  state.formationFragments = {
    ...(state.formationFragments || {}),
  };

  state.elementCrystals = {
    ...EMPTY_CRYSTALS,
    ...(state.elementCrystals || {}),
  };

  state.formationEyes = {
    ...DEFAULT_STATE.formationEyes,
    ...(state.formationEyes || {}),
  };

  for (const formation of Object.values(FORMATION_DEFINITIONS)) {
    const id = formation.id;
    state.formationLevels[id] = Math.max(
      1,
      Math.min(MAX_FORMATION_LEVEL, Math.floor(Number(state.formationLevels[id]) || 1)),
    );

    const layout = state.layouts[id];
    if (!Array.isArray(layout) || layout.length !== formation.slots) {
      state.layouts[id] = [...formation.pattern];
    } else {
      state.layouts[id] = layout.map((elementId, index) =>
        FORMATION_ELEMENTS[elementId] ? elementId : formation.pattern[index],
      );
    }

    state.slotLevels[id] = normalizeLevelArray(
      state.slotLevels[id],
      formation.slots,
    );

    state.formationFragments[id] = Math.max(
      0,
      Math.floor(Number(state.formationFragments[id]) || 0),
    );

    const eye = state.formationEyes[id];
    state.formationEyes[id] = {
      elementId: FORMATION_ELEMENTS[eye?.elementId] ? eye.elementId : 'spirit',
      level: Math.max(1, Math.min(10, Math.floor(Number(eye?.level) || 1))),
    };
  }

  for (const elementId of Object.keys(FORMATION_ELEMENTS)) {
    state.elementCrystals[elementId] = Math.max(
      0,
      Math.floor(Number(state.elementCrystals[elementId]) || 0),
    );
  }

  if (!FORMATION_DEFINITIONS[state.activeFormationId]) {
    state.activeFormationId = 'five_elements';
  }

  if (!state.unlockedFormationIds.includes(state.activeFormationId)) {
    state.activeFormationId = state.unlockedFormationIds[0] || 'five_elements';
  }

  return state;
}

export async function getFormationState(client, guildId, userId) {
  const stored = await getDatabaseValue(client, stateKey(guildId, userId), null);
  const state = normalizeState(stored);
  if (!stored || Number(stored.version) !== 2) {
    await setDatabaseValue(client, stateKey(guildId, userId), state);
  }
  return state;
}

export async function saveFormationState(client, guildId, userId, state) {
  const normalized = normalizeState(state);
  await setDatabaseValue(client, stateKey(guildId, userId), normalized);
  return normalized;
}

export function getActiveFormation(state) {
  return FORMATION_DEFINITIONS[state?.activeFormationId] || FORMATION_DEFINITIONS.five_elements;
}

export function getFormationLevel(state, formationId = state?.activeFormationId) {
  return Math.max(1, Number(state?.formationLevels?.[formationId]) || 1);
}

export function getFormationLayout(state, formationId = state?.activeFormationId) {
  const formation = FORMATION_DEFINITIONS[formationId];
  if (!formation) return [];
  const current = state?.layouts?.[formationId];
  if (Array.isArray(current) && current.length === formation.slots) return current;
  return [...formation.pattern];
}

export function getFormationSlotLevels(state, formationId = state?.activeFormationId) {
  const formation = FORMATION_DEFINITIONS[formationId];
  if (!formation) return [];
  return normalizeLevelArray(state?.slotLevels?.[formationId], formation.slots);
}

export function getFormationEye(state, formationId = state?.activeFormationId) {
  const eye = state?.formationEyes?.[formationId];
  return {
    elementId: FORMATION_ELEMENTS[eye?.elementId] ? eye.elementId : 'spirit',
    level: Math.max(1, Math.min(10, Math.floor(Number(eye?.level) || 1))),
  };
}

export function getFormationResonance(state) {
  const formation = getActiveFormation(state);
  const layout = getFormationLayout(state, formation.id);
  const slotLevels = getFormationSlotLevels(state, formation.id);
  const level = getFormationLevel(state, formation.id);
  const eye = getFormationEye(state, formation.id);
  const exact = formation.pattern.every((elementId, index) => layout[index] === elementId);
  const unique = new Set(layout);
  const lines = [];

  const effects = {
    cultivationBonus: 0,
    adventureBonus: 0,
    staminaReduction: 0,
    breakthroughBonus: 0,
    spiritStoneBonus: 0,
    insightBonus: 0,
  };

  const avgSlotLevel = slotLevels.length
    ? slotLevels.reduce((sum, value) => sum + value, 0) / slotLevels.length
    : 1;
  const progressionMultiplier =
    1 +
    (level - 1) * 0.03 +
    Math.max(0, avgSlotLevel - 1) * 0.01;
  let multiplier = progressionMultiplier;

  const pairKey = (a, b) => `${a}>${b}`;
  const activePairs = new Set();
  for (let index = 0; index < layout.length; index += 1) {
    activePairs.add(pairKey(layout[index], layout[(index + 1) % layout.length]));
  }

  if (activePairs.has('metal>water')) {
    lines.push('Kim Sinh Thủy');
    effects.cultivationBonus += 0.03;
  }
  if (activePairs.has('water>wood')) {
    lines.push('Thủy Sinh Mộc');
    effects.staminaReduction += 0.03;
  }
  if (activePairs.has('wood>fire')) {
    lines.push('Mộc Sinh Hỏa');
    effects.adventureBonus += 0.04;
  }
  if (activePairs.has('fire>earth')) {
    lines.push('Hỏa Sinh Thổ');
    effects.spiritStoneBonus += 0.05;
  }
  if (activePairs.has('earth>metal')) {
    lines.push('Thổ Sinh Kim');
    effects.breakthroughBonus += 0.03;
  }

  const fiveBasic = ['metal', 'wood', 'water', 'fire', 'earth'];
  if (fiveBasic.every((id) => unique.has(id))) {
    lines.push('Ngũ Hành Tuần Hoàn');
    multiplier += 0.12;
    effects.cultivationBonus += 0.12;
    effects.spiritStoneBonus += 0.08;
    effects.staminaReduction += 0.05;
  }

  if (unique.has('wind') && unique.has('lightning')) {
    lines.push('Phong Lôi Đồng Hành');
    multiplier += 0.08;
    effects.adventureBonus += 0.08;
  }

  if (unique.has('water') && unique.has('ice')) {
    lines.push('Hàn Triều Tỏa Linh');
    multiplier += 0.08;
    effects.staminaReduction += 0.08;
  }

  if (layout.filter((id) => id === 'yin_yang').length >= 2) {
    lines.push('Lưỡng Nghi Đối Ứng');
    multiplier += 0.10;
    effects.breakthroughBonus += 0.10;
  }

  if (unique.has('spirit')) {
    lines.push('Tinh Thần Diễn Pháp');
    multiplier += 0.05;
    effects.insightBonus += 0.05;
  }

  if (unique.has('chaos')) {
    lines.push('Hỗn Độn Quy Nhất');
    multiplier += 0.15;
    for (const key of Object.keys(effects)) {
      effects[key] *= 1.15;
    }
  }

  if (eye.elementId === 'spirit') effects.insightBonus += 0.02 * eye.level;
  if (eye.elementId === 'chaos') {
    for (const key of Object.keys(effects)) effects[key] *= 1 + 0.02 * eye.level;
  }

  if (exact) {
    lines.push('Trận Đồ Hoàn Chỉnh');
    multiplier += 0.10;
  }

  for (const key of Object.keys(effects)) {
    effects[key] *= progressionMultiplier;
    effects[key] = Math.max(0, Math.min(0.75, effects[key]));
  }

  return {
    exact,
    lines: Array.from(new Set(lines)),
    multiplier,
    effects,
    avgSlotLevel,
    eye,
  };
}

export async function comprehendFormation(client, guildId, userId) {
  const state = await getFormationState(client, guildId, userId);
  const now = Date.now();
  const last = Number(state.lastComprehendAt) || 0;
  const remainingMs = Math.max(0, COMPREHEND_COOLDOWN_MS - (now - last));

  if (last && remainingMs > 0) {
    return { ok: false, reason: 'cooldown', remainingMs, state };
  }

  const resonance = getFormationResonance(state);
  const insightBase = 20 + Math.floor(Math.random() * 16);
  const essenceGain = 6 + Math.floor(Math.random() * 7);
  const insightGain = Math.max(1, Math.round(insightBase * (1 + resonance.effects.insightBonus)));
  const before = new Set(state.unlockedFormationIds);

  const crystalIds = Object.keys(FORMATION_ELEMENTS);
  const crystalId = crystalIds[Math.floor(Math.random() * crystalIds.length)];
  const crystalGain = 1 + (Math.random() < 0.20 ? 1 : 0);

  state.insight += insightGain;
  state.formationEssence += essenceGain;
  state.elementCrystals[crystalId] += crystalGain;
  state.lastComprehendAt = now;

  for (const formation of Object.values(FORMATION_DEFINITIONS)) {
    if (state.insight >= formation.unlockInsight) {
      state.unlockedFormationIds.push(formation.id);
      state.formationLevels[formation.id] ||= 1;
      state.layouts[formation.id] ||= [...formation.pattern];
      state.slotLevels[formation.id] ||= Array(formation.slots).fill(1);
      state.formationEyes[formation.id] ||= { elementId: 'spirit', level: 1 };
    }
  }

  state.unlockedFormationIds = Array.from(new Set(state.unlockedFormationIds));
  const unlockedNow = state.unlockedFormationIds
    .filter((id) => !before.has(id))
    .map((id) => FORMATION_DEFINITIONS[id])
    .filter(Boolean);

  for (const formation of unlockedNow) {
    state.formationFragments[formation.id] = Math.max(
      0,
      Number(state.formationFragments[formation.id]) || 0,
    ) + 1;
  }

  await saveFormationState(client, guildId, userId, state);

  return {
    ok: true,
    insightGain,
    essenceGain,
    crystalId,
    crystalGain,
    unlockedNow,
    state,
  };
}

export async function cycleActiveFormation(client, guildId, userId) {
  const state = await getFormationState(client, guildId, userId);
  const unlocked = state.unlockedFormationIds.filter((id) => FORMATION_DEFINITIONS[id]);
  const currentIndex = Math.max(0, unlocked.indexOf(state.activeFormationId));
  state.activeFormationId = unlocked[(currentIndex + 1) % unlocked.length] || 'five_elements';
  await saveFormationState(client, guildId, userId, state);
  return state;
}

export async function arrangeActiveFormation(client, guildId, userId) {
  const state = await getFormationState(client, guildId, userId);
  const formation = getActiveFormation(state);
  state.layouts[formation.id] = [...formation.pattern];
  await saveFormationState(client, guildId, userId, state);
  return state;
}

export async function setFormationSlotElement(client, guildId, userId, slotIndex, elementId) {
  const state = await getFormationState(client, guildId, userId);
  const formation = getActiveFormation(state);
  const index = Math.floor(Number(slotIndex));
  const element = FORMATION_ELEMENTS[elementId];

  if (!element || index < 0 || index >= formation.slots) {
    return { ok: false, reason: 'invalid_slot', state };
  }

  const layout = getFormationLayout(state, formation.id);
  if (layout[index] === elementId) {
    return { ok: true, unchanged: true, state, slotIndex: index, elementId };
  }

  const essenceCost = element.tier === 'rare' ? 20 : element.tier === 'variant' ? 12 : 6;
  const crystalCost = element.tier === 'rare' ? 3 : element.tier === 'variant' ? 2 : 1;

  if (state.formationEssence < essenceCost) {
    return { ok: false, reason: 'not_enough_essence', state, essenceCost, crystalCost };
  }

  if ((state.elementCrystals[elementId] || 0) < crystalCost) {
    return { ok: false, reason: 'not_enough_crystal', state, essenceCost, crystalCost, elementId };
  }

  state.formationEssence -= essenceCost;
  state.elementCrystals[elementId] -= crystalCost;
  state.layouts[formation.id][index] = elementId;
  await saveFormationState(client, guildId, userId, state);

  return {
    ok: true,
    state,
    slotIndex: index,
    elementId,
    essenceCost,
    crystalCost,
  };
}

export async function refineFormationSlot(client, guildId, userId, slotIndex) {
  const state = await getFormationState(client, guildId, userId);
  const formation = getActiveFormation(state);
  const index = Math.floor(Number(slotIndex));

  if (index < 0 || index >= formation.slots) {
    return { ok: false, reason: 'invalid_slot', state };
  }

  const layout = getFormationLayout(state, formation.id);
  const levels = getFormationSlotLevels(state, formation.id);
  const elementId = layout[index];
  const level = levels[index];

  if (level >= MAX_SLOT_LEVEL) {
    return { ok: false, reason: 'max_level', state, level };
  }

  const essenceCost = 10 + level * 10;
  const crystalCost = Math.max(1, Math.ceil(level / 2));

  if (state.formationEssence < essenceCost) {
    return { ok: false, reason: 'not_enough_essence', state, essenceCost, crystalCost, elementId };
  }

  if ((state.elementCrystals[elementId] || 0) < crystalCost) {
    return { ok: false, reason: 'not_enough_crystal', state, essenceCost, crystalCost, elementId };
  }

  state.formationEssence -= essenceCost;
  state.elementCrystals[elementId] -= crystalCost;
  state.slotLevels[formation.id][index] = level + 1;
  await saveFormationState(client, guildId, userId, state);

  return {
    ok: true,
    state,
    slotIndex: index,
    level: level + 1,
    elementId,
    essenceCost,
    crystalCost,
  };
}

export async function setFormationEyeElement(client, guildId, userId, elementId) {
  const state = await getFormationState(client, guildId, userId);
  const formation = getActiveFormation(state);
  const eye = getFormationEye(state, formation.id);

  if (!FORMATION_EYE_ELEMENT_IDS.includes(elementId)) {
    return {
      ok: false,
      reason: 'invalid_eye_element',
      state,
    };
  }

  if (eye.elementId === elementId) {
    return {
      ok: true,
      unchanged: true,
      state,
      elementId,
      level: eye.level,
    };
  }

  const essenceCost =
    elementId === 'chaos'
      ? 60
      : 30;
  const crystalCost =
    elementId === 'chaos'
      ? 6
      : 3;

  if (state.formationEssence < essenceCost) {
    return {
      ok: false,
      reason: 'not_enough_essence',
      state,
      elementId,
      essenceCost,
      crystalCost,
    };
  }

  if ((state.elementCrystals[elementId] || 0) < crystalCost) {
    return {
      ok: false,
      reason: 'not_enough_crystal',
      state,
      elementId,
      essenceCost,
      crystalCost,
    };
  }

  state.formationEssence -= essenceCost;
  state.elementCrystals[elementId] -= crystalCost;
  state.formationEyes[formation.id] = {
    elementId,
    level: eye.level,
  };

  const savedState = await saveFormationState(
    client,
    guildId,
    userId,
    state,
  );

  return {
    ok: true,
    state: savedState,
    elementId,
    level: eye.level,
    essenceCost,
    crystalCost,
  };
}

export async function refineFormationEye(client, guildId, userId) {
  const state = await getFormationState(client, guildId, userId);
  const formation = getActiveFormation(state);
  const eye = getFormationEye(state, formation.id);
  const elementId = eye.elementId;
  const level = eye.level;

  if (level >= MAX_SLOT_LEVEL) {
    return {
      ok: false,
      reason: 'max_level',
      state,
      elementId,
      level,
    };
  }

  const essenceCost = 15 + level * 15;
  const crystalCost = 1 + Math.ceil(level / 2);

  if (state.formationEssence < essenceCost) {
    return {
      ok: false,
      reason: 'not_enough_essence',
      state,
      elementId,
      level,
      essenceCost,
      crystalCost,
    };
  }

  if ((state.elementCrystals[elementId] || 0) < crystalCost) {
    return {
      ok: false,
      reason: 'not_enough_crystal',
      state,
      elementId,
      level,
      essenceCost,
      crystalCost,
    };
  }

  state.formationEssence -= essenceCost;
  state.elementCrystals[elementId] -= crystalCost;
  state.formationEyes[formation.id] = {
    elementId,
    level: level + 1,
  };

  const savedState = await saveFormationState(
    client,
    guildId,
    userId,
    state,
  );

  return {
    ok: true,
    state: savedState,
    elementId,
    level: level + 1,
    essenceCost,
    crystalCost,
  };
}

export async function upgradeActiveFormation(client, guildId, userId) {
  const state = await getFormationState(client, guildId, userId);
  const formation = getActiveFormation(state);
  const currentLevel = getFormationLevel(state, formation.id);
  const essenceCost = 20 + currentLevel * 15;
  const fragmentCost = currentLevel >= 5 ? 2 : 1;
  const currentFragments = Math.max(
    0,
    Number(state.formationFragments?.[formation.id]) || 0,
  );

  if (currentLevel >= MAX_FORMATION_LEVEL) {
    return {
      ok: false,
      reason: 'max_level',
      state,
      cost: 0,
      essenceCost: 0,
      fragmentCost: 0,
    };
  }

  if (state.formationEssence < essenceCost) {
    return {
      ok: false,
      reason: 'not_enough_essence',
      state,
      cost: essenceCost,
      essenceCost,
      fragmentCost,
    };
  }

  if (currentFragments < fragmentCost) {
    return {
      ok: false,
      reason: 'not_enough_fragment',
      state,
      cost: essenceCost,
      essenceCost,
      fragmentCost,
    };
  }

  state.formationEssence -= essenceCost;
  state.formationFragments[formation.id] =
    currentFragments - fragmentCost;
  state.formationLevels[formation.id] = currentLevel + 1;

  const savedState = await saveFormationState(
    client,
    guildId,
    userId,
    state,
  );

  return {
    ok: true,
    state: savedState,
    cost: essenceCost,
    essenceCost,
    fragmentCost,
    level: currentLevel + 1,
  };
}

export function getFormationProgress(state) {
  const locked = Object.values(FORMATION_DEFINITIONS)
    .filter((formation) => !state.unlockedFormationIds.includes(formation.id))
    .sort((a, b) => a.unlockInsight - b.unlockInsight);
  return locked[0] || null;
}
