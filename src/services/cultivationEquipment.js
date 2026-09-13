import {
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

import {
  getCultivationProfile,
  removeInventoryItem,
  saveCultivationProfile,
} from './cultivationService.js';

export const CULTIVATION_FORGE_QUANTITIES = [1, 10, 100, 1000];

export const CULTIVATION_EQUIPMENT = {
  thanh_phong_kiem: {
    id: 'thanh_phong_kiem',
    name: 'Thanh Phong Kiếm',
    emoji: '<a:ttkiem:1547448386771222619>',
    ingredientItemId: 'huyen_thiet',
    ingredientAmount: 3,
    successChance: 0.9,
    effect: '+5% Tu Vi khi Tu Luyện',
    effectType: 'cultivation_bonus',
    effectValue: 0.05,
    consumable: true,
  },
  huyen_thiet_ho_phu: {
    id: 'huyen_thiet_ho_phu',
    name: 'Huyền Thiết Hộ Phù',
    emoji: '<a:ttphu:1547448667630207086>',
    ingredientItemId: 'huyen_thiet',
    ingredientAmount: 5,
    successChance: 0.75,
    effect: 'Giảm 20% Tu Vi hao tổn khi Đột Phá thất bại',
    effectType: 'breakthrough_loss_reduction',
    effectValue: 0.2,
    consumable: true,
  },
  tu_linh_boi: {
    id: 'tu_linh_boi',
    name: 'Tụ Linh Bội',
    emoji: '<a:ttboi:1547448623946801152>',
    ingredientItemId: 'huyen_thiet',
    ingredientAmount: 8,
    successChance: 0.55,
    effect: '+10% Linh Thạch nhận được',
    effectType: 'spirit_stone_bonus',
    effectValue: 0.1,
    consumable: true,
  },
};

function normalizeForgeQuantity(quantity) {
  const parsed = Math.floor(Number(quantity) || 1);
  return CULTIVATION_FORGE_QUANTITIES.includes(parsed) ? parsed : 1;
}

export function getEquipment(equipmentId) {
  return CULTIVATION_EQUIPMENT[equipmentId] || null;
}

export function getEquipmentList() {
  return Object.values(CULTIVATION_EQUIPMENT);
}

export function ensureEquipmentData(profile) {
  if (!profile.equipment || typeof profile.equipment !== 'object') {
    profile.equipment = { owned: {}, equipped: null };
  }

  if (!profile.equipment.owned || typeof profile.equipment.owned !== 'object') {
    profile.equipment.owned = {};
  }

  if (typeof profile.equipment.equipped !== 'string') {
    profile.equipment.equipped = null;
  }

  if (!profile.stats || typeof profile.stats !== 'object') {
    profile.stats = {};
  }

  profile.stats.forgeCount = Math.max(0, Number(profile.stats.forgeCount) || 0);
  profile.stats.forgeSuccess = Math.max(0, Number(profile.stats.forgeSuccess) || 0);
  profile.stats.forgeFail = Math.max(0, Number(profile.stats.forgeFail) || 0);

  const equippedId = profile.equipment.equipped;
  if (
    equippedId &&
    Math.max(0, Number(profile.equipment.owned[equippedId]) || 0) <= 0
  ) {
    profile.equipment.equipped = null;
  }

  return profile;
}

export function getOwnedEquipment(profile) {
  ensureEquipmentData(profile);
  return getEquipmentList().filter(
    (equipment) => Number(profile.equipment.owned[equipment.id]) > 0,
  );
}

export function getEquippedEquipment(profile) {
  ensureEquipmentData(profile);
  if (!profile.equipment.equipped) return null;
  return getEquipment(profile.equipment.equipped);
}

export function getEquipmentBonus(profile, effectType) {
  const equipment = getEquippedEquipment(profile);
  if (!equipment || equipment.effectType !== effectType) return 0;
  return Number(equipment.effectValue) || 0;
}

export function consumeEquippedEquipmentUse(profile, effectType = null) {
  ensureEquipmentData(profile);

  const equipmentId = profile.equipment.equipped;
  const equipment = getEquipment(equipmentId);

  if (!equipment || (effectType && equipment.effectType !== effectType)) {
    return null;
  }

  const current = Math.max(
    0,
    Math.floor(Number(profile.equipment.owned[equipmentId]) || 0),
  );

  if (current <= 0) {
    profile.equipment.equipped = null;
    return null;
  }

  const remaining = current - 1;

  if (remaining <= 0) {
    delete profile.equipment.owned[equipmentId];
    profile.equipment.equipped = null;
  } else {
    profile.equipment.owned[equipmentId] = remaining;
  }

  return {
    equipment,
    consumed: 1,
    remaining,
    unequipped: remaining <= 0,
  };
}

export function getOreQuantity(profile) {
  return Math.max(0, Number(profile.inventory?.huyen_thiet) || 0);
}

const forgeLocks = new Map();

async function withForgeLock(key, callback) {
  while (forgeLocks.has(key)) {
    await forgeLocks.get(key);
  }

  let release;
  const lock = new Promise((resolve) => {
    release = resolve;
  });
  forgeLocks.set(key, lock);

  try {
    return await callback();
  } finally {
    forgeLocks.delete(key);
    release();
  }
}

export async function forgeEquipment(
  client,
  guildId,
  userId,
  equipmentId,
  quantity = 1,
) {
  const lockKey = `cultivation:${guildId}:${userId}`;

  return withForgeLock(lockKey, async () => {
    const equipment = getEquipment(equipmentId);
    if (!equipment) {
      return { ok: false, reason: 'invalid_equipment' };
    }

    const forgeQuantity = normalizeForgeQuantity(quantity);
    const profile = await getCultivationProfile(client, guildId, userId);
    ensureEquipmentData(profile);

    const available = getOreQuantity(profile);
    const requiredMaterial = equipment.ingredientAmount * forgeQuantity;

    if (available < requiredMaterial) {
      return {
        ok: false,
        reason: 'not_enough_material',
        equipment,
        quantity: forgeQuantity,
        requiredMaterial,
        available,
        profile,
      };
    }

    const removed = removeInventoryItem(
      profile,
      equipment.ingredientItemId,
      requiredMaterial,
    );

    if (!removed) {
      return {
        ok: false,
        reason: 'consume_failed',
        equipment,
        quantity: forgeQuantity,
        requiredMaterial,
        available,
        profile,
      };
    }

    let successCount = 0;
    for (let index = 0; index < forgeQuantity; index += 1) {
      if (Math.random() < equipment.successChance) {
        successCount += 1;
      }
    }

    const failCount = forgeQuantity - successCount;
    profile.stats.forgeCount += forgeQuantity;
    profile.stats.forgeSuccess += successCount;
    profile.stats.forgeFail += failCount;

    if (successCount > 0) {
      profile.equipment.owned[equipment.id] =
        Math.max(0, Number(profile.equipment.owned[equipment.id]) || 0) +
        successCount;
    }

    const saved = await saveCultivationProfile(client, profile);

    return {
      ok: true,
      success: successCount > 0,
      quantity: forgeQuantity,
      successCount,
      failCount,
      equipment,
      consumed: requiredMaterial,
      requiredMaterial,
      remainingOre: saved.inventory?.huyen_thiet || 0,
      ownedQuantity: saved.equipment?.owned?.[equipment.id] || 0,
      profile: saved,
    };
  });
}

export async function equipCultivationEquipment(
  client,
  guildId,
  userId,
  equipmentId,
) {
  const equipment = getEquipment(equipmentId);
  if (!equipment) {
    return { ok: false, reason: 'invalid_equipment' };
  }

  const profile = await getCultivationProfile(client, guildId, userId);
  ensureEquipmentData(profile);

  const owned = Number(profile.equipment.owned[equipmentId]) || 0;
  if (owned <= 0) {
    return {
      ok: false,
      reason: 'not_owned',
      equipment,
      profile,
    };
  }

  profile.equipment.equipped = equipmentId;
  const saved = await saveCultivationProfile(client, profile);

  return {
    ok: true,
    equipment,
    profile: saved,
  };
}
