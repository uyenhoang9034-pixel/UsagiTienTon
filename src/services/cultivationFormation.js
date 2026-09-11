import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

const FORMATION_KEY_PREFIX = 'games:cultivation:formation:';
const COMPREHEND_COOLDOWN_MS = 30 * 60 * 1000;

export const FORMATION_ELEMENTS = {
  metal: {
    id: 'metal',
    name: 'Kim',
    tier: 'basic',
    emoji: '<a:ttkim:1547830384589545553>',
  },
  wood: {
    id: 'wood',
    name: 'Mộc',
    tier: 'basic',
    emoji: '<a:ttmoc:1547831914402938961>',
  },
  water: {
    id: 'water',
    name: 'Thủy',
    tier: 'basic',
    emoji: '<a:ttthuy:1547831344178921544>',
  },
  fire: {
    id: 'fire',
    name: 'Hỏa',
    tier: 'basic',
    emoji: '<a:tthoa:1547830861368533074>',
  },
  earth: {
    id: 'earth',
    name: 'Thổ',
    tier: 'basic',
    emoji: '<a:tttho:1547830124840362024>',
  },
  wind: {
    id: 'wind',
    name: 'Phong',
    tier: 'variant',
    emoji: '<a:ttphong:1547835094503268462>',
  },
  lightning: {
    id: 'lightning',
    name: 'Lôi',
    tier: 'variant',
    emoji: '<a:ttloi:1547835063406698496>',
  },
  ice: {
    id: 'ice',
    name: 'Băng',
    tier: 'variant',
    emoji: '<a:ttbang:1547835499484291173>',
  },
  yin_yang: {
    id: 'yin_yang',
    name: 'Âm Dương',
    tier: 'rare',
    emoji: '<a:ttamduong:1547842274753515581>',
  },
  spirit: {
    id: 'spirit',
    name: 'Tinh Thần',
    tier: 'rare',
    emoji: '<a:tttinhthan:1547842316499423293>',
  },
  chaos: {
    id: 'chaos',
    name: 'Hỗn Độn',
    tier: 'rare',
    emoji: '<a:tthondon:1547842242885066793>',
  },
};

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

const DEFAULT_STATE = {
  insight: 0,
  formationEssence: 30,
  lastComprehendAt: null,
  activeFormationId: 'five_elements',
  unlockedFormationIds: ['five_elements'],
  formationLevels: {
    five_elements: 1,
  },
  layouts: {
    five_elements: ['metal', 'water', 'wood', 'fire', 'earth'],
  },
};

function stateKey(guildId, userId) {
  return `${FORMATION_KEY_PREFIX}${guildId}:${userId}`;
}

function normalizeState(data) {
  const state = {
    ...DEFAULT_STATE,
    ...(data && typeof data === 'object' ? data : {}),
  };

  state.unlockedFormationIds = Array.from(
    new Set([
      'five_elements',
      ...(Array.isArray(state.unlockedFormationIds)
        ? state.unlockedFormationIds
        : []),
    ]),
  );

  state.formationLevels = {
    ...DEFAULT_STATE.formationLevels,
    ...(state.formationLevels || {}),
  };

  state.layouts = {
    ...DEFAULT_STATE.layouts,
    ...(state.layouts || {}),
  };

  if (!FORMATION_DEFINITIONS[state.activeFormationId]) {
    state.activeFormationId = 'five_elements';
  }

  return state;
}

export async function getFormationState(client, guildId, userId) {
  const stored = await getDatabaseValue(
    client,
    stateKey(guildId, userId),
    null,
  );

  const state = normalizeState(stored);

  if (!stored) {
    await setDatabaseValue(
      client,
      stateKey(guildId, userId),
      state,
    );
  }

  return state;
}

export async function saveFormationState(client, guildId, userId, state) {
  const normalized = normalizeState(state);

  await setDatabaseValue(
    client,
    stateKey(guildId, userId),
    normalized,
  );

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
  if (Array.isArray(current) && current.length === formation.slots) {
    return current;
  }

  return [...formation.pattern];
}

export function getFormationResonance(state) {
  const formation = getActiveFormation(state);
  const layout = getFormationLayout(state, formation.id);
  const level = getFormationLevel(state, formation.id);
  const exact = formation.pattern.every((elementId, index) => layout[index] === elementId);
  const unique = new Set(layout);
  const lines = [];
  let multiplier = 1 + (level - 1) * 0.03;

  const fiveBasic = ['metal', 'wood', 'water', 'fire', 'earth'];
  if (fiveBasic.every((id) => unique.has(id))) {
    lines.push('Ngũ Hành Tuần Hoàn');
    multiplier += 0.12;
  }

  if (unique.has('wind') && unique.has('lightning')) {
    lines.push('Phong Lôi Đồng Hành');
    multiplier += 0.08;
  }

  if (unique.has('water') && unique.has('ice')) {
    lines.push('Hàn Triều Tỏa Linh');
    multiplier += 0.08;
  }

  if (layout.filter((id) => id === 'yin_yang').length >= 2) {
    lines.push('Lưỡng Nghi Đối Ứng');
    multiplier += 0.1;
  }

  if (unique.has('spirit')) {
    lines.push('Tinh Thần Diễn Pháp');
    multiplier += 0.05;
  }

  if (unique.has('chaos')) {
    lines.push('Hỗn Độn Quy Nhất');
    multiplier += 0.15;
  }

  if (exact) {
    lines.push('Trận Đồ Hoàn Chỉnh');
    multiplier += 0.1;
  }

  return {
    exact,
    lines,
    multiplier,
  };
}

export async function comprehendFormation(client, guildId, userId) {
  const state = await getFormationState(client, guildId, userId);
  const now = Date.now();
  const last = Number(state.lastComprehendAt) || 0;
  const remainingMs = Math.max(0, COMPREHEND_COOLDOWN_MS - (now - last));

  if (last && remainingMs > 0) {
    return {
      ok: false,
      reason: 'cooldown',
      remainingMs,
      state,
    };
  }

  const insightGain = 20 + Math.floor(Math.random() * 16);
  const essenceGain = 6 + Math.floor(Math.random() * 7);
  const before = new Set(state.unlockedFormationIds);

  state.insight += insightGain;
  state.formationEssence += essenceGain;
  state.lastComprehendAt = now;

  for (const formation of Object.values(FORMATION_DEFINITIONS)) {
    if (state.insight >= formation.unlockInsight) {
      state.unlockedFormationIds.push(formation.id);
      state.formationLevels[formation.id] ||= 1;
      state.layouts[formation.id] ||= [...formation.pattern];
    }
  }

  state.unlockedFormationIds = Array.from(new Set(state.unlockedFormationIds));
  const unlockedNow = state.unlockedFormationIds
    .filter((id) => !before.has(id))
    .map((id) => FORMATION_DEFINITIONS[id])
    .filter(Boolean);

  await saveFormationState(client, guildId, userId, state);

  return {
    ok: true,
    insightGain,
    essenceGain,
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

export async function upgradeActiveFormation(client, guildId, userId) {
  const state = await getFormationState(client, guildId, userId);
  const formation = getActiveFormation(state);
  const currentLevel = getFormationLevel(state, formation.id);
  const cost = 20 + currentLevel * 15;

  if (currentLevel >= 10) {
    return { ok: false, reason: 'max_level', state, cost: 0 };
  }

  if (state.formationEssence < cost) {
    return { ok: false, reason: 'not_enough_essence', state, cost };
  }

  state.formationEssence -= cost;
  state.formationLevels[formation.id] = currentLevel + 1;
  await saveFormationState(client, guildId, userId, state);

  return {
    ok: true,
    state,
    cost,
    level: currentLevel + 1,
  };
}

export function getFormationProgress(state) {
  const locked = Object.values(FORMATION_DEFINITIONS)
    .filter((formation) => !state.unlockedFormationIds.includes(formation.id))
    .sort((a, b) => a.unlockInsight - b.unlockInsight);

  return locked[0] || null;
}
