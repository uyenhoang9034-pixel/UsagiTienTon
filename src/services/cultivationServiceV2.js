import {
  CULTIVATION_CONFIG,
  CULTIVATION_REALMS,
} from '../config/cultivationGame.js';

import * as baseService from './cultivationService.js';

import {
  getActivePet,
  getPetEffectValue,
} from './cultivationPet.js';

import {
  consumeEquippedEquipmentUse,
} from './cultivationEquipment.js';

import {
  applyFormationCultivationBonus,
  applyFormationSpiritStoneBonus,
  applyFormationStaminaReduction,
  getFormationGameplayBonus,
} from './cultivationFormationGameplay.js';

import {
  getCultivationRealmRewardMultipliers,
  scalePositiveRealmReward,
} from './cultivationRealmRewards.js';

export * from './cultivationService.js';

const CHAN_TIEN_REALM_INDEX = Math.max(
  0,
  CULTIVATION_REALMS.indexOf('Chân Tiên'),
);
const IMMORTAL_BASE_CULTIVATION_GAIN = 200_000;

async function saveProfile(client, profile) {
  return baseService.saveCultivationProfile(client, profile);
}

function getWrapperCultivationPetBonus(profile) {
  const pet = getActivePet(profile);
  if (!pet) return 0;

  // Thanh Phong Linh Hồ vẫn được base service xử lý đúng +3%.
  if (pet.id === 'thanh_phong_linh_ho') return 0;

  return Math.max(
    0,
    Number(getPetEffectValue(profile, 'cultivation_bonus')) || 0,
  );
}

function getPetStaminaRefund(profile) {
  return Math.min(
    0.95,
    Math.max(
      0,
      Number(getPetEffectValue(profile, 'stamina_cost_refund')) || 0,
    ),
  );
}

function rollFractionalAmount(baseAmount, percent) {
  const raw =
    Math.max(0, Number(baseAmount) || 0) *
    Math.max(0, Number(percent) || 0);
  const whole = Math.floor(raw);
  const fraction = raw - whole;

  return whole +
    (fraction > 0 && Math.random() < fraction ? 1 : 0);
}

export async function cultivate(client, guildId, userId) {
  const formation = await getFormationGameplayBonus(
    client,
    guildId,
    userId,
  );
  const effects = formation.effects || {};

  const profile = await baseService.getCultivationProfile(
    client,
    guildId,
    userId,
  );

  const cooldown = baseService.getCultivateCooldownRemaining(profile);
  if (cooldown > 0) {
    return baseService.cultivate(client, guildId, userId);
  }

  const immortalCultivationBase =
    Number(profile.realmIndex) >= CHAN_TIEN_REALM_INDEX;
  const originalCultivation = Math.max(
    0,
    Number(profile.cultivation) || 0,
  );
  const originalTotalCultivation = Math.max(
    0,
    Number(profile.totalCultivation) || 0,
  );

  const realmRewards = getCultivationRealmRewardMultipliers(profile);
  const activePet = getActivePet(profile);
  const petCultivationPercent = getWrapperCultivationPetBonus(profile);
  const petStaminaRefundPercent = getPetStaminaRefund(profile);

  const baseStaminaCost = CULTIVATION_CONFIG.gameplay.cultivateStaminaCost;
  const stamina = applyFormationStaminaReduction(
    baseStaminaCost,
    effects,
  );

  const petStaminaRefund =
    petStaminaRefundPercent > 0
      ? Math.min(
          stamina.total,
          rollFractionalAmount(stamina.total, petStaminaRefundPercent),
        )
      : 0;

  const effectiveStaminaCost = Math.max(
    0,
    stamina.total - petStaminaRefund,
  );

  if (profile.stamina < effectiveStaminaCost) {
    return {
      ok: false,
      reason: 'stamina',
      profile,
      staminaCost: effectiveStaminaCost,
      baseStaminaCost,
      formationStaminaSaved: stamina.saved,
      formationStaminaReduction: Number(effects.staminaReduction) || 0,
      petStaminaRefund,
      petStaminaRefundPercent,
      activePet,
    };
  }

  const originalStamina = Number(profile.stamina) || 0;
  const originalActivePetId = profile.pets?.active || null;
  const suppressLegacyCultivationPet =
    originalActivePetId === 'hau_tho_kim_long';

  let preCreditApplied = false;

  try {
    const totalPreCredit =
      Math.max(0, stamina.saved) +
      Math.max(0, petStaminaRefund);

    if (totalPreCredit > 0 || suppressLegacyCultivationPet) {
      profile.stamina = originalStamina + totalPreCredit;

      if (suppressLegacyCultivationPet) {
        profile.pets ||= { owned: {}, active: null };
        profile.pets.active = null;
      }

      await saveProfile(client, profile);
      preCreditApplied = true;
    }

    const result = await baseService.cultivate(
      client,
      guildId,
      userId,
    );

    if (!result.ok) {
      if (preCreditApplied) {
        const latest = await baseService.getCultivationProfile(
          client,
          guildId,
          userId,
        );
        latest.stamina = originalStamina;
        latest.pets ||= { owned: {}, active: null };
        latest.pets.active = originalActivePetId;
        await saveProfile(client, latest);
      }
      return result;
    }

    let rawCultivationDelta = Number(result.cultivationDelta) || 0;
    const rawStoneDelta = Number(result.stoneDelta) || 0;

    const rawEquipmentCultivationBonus = Math.max(
      0,
      Number(result.equipmentCultivationBonus) || 0,
    );
    const rawTechniqueCultivationBonus = Math.max(
      0,
      Number(result.techniqueCultivationBonus) || 0,
    );
    const rawLegacyPetCultivationBonus = Math.max(
      0,
      Number(result.petCultivationBonus) || 0,
    );
    const rawCultivationPillBonus = Math.max(
      0,
      Number(result.cultivationPillBonus) || 0,
    );

    const scaledStoneDelta = scalePositiveRealmReward(
      rawStoneDelta,
      realmRewards.spiritStones,
    );
    const realmStoneBonus = Math.max(
      0,
      scaledStoneDelta - rawStoneDelta,
    );

    const savedProfile = result.profile;
    savedProfile.pets ||= { owned: {}, active: null };
    savedProfile.pets.active = originalActivePetId;

    let cultivationFailureLoss = 0;
    if (rawCultivationDelta < 0) {
      const rawLoss = Math.abs(rawCultivationDelta);
      const targetLoss = immortalCultivationBase
        ? IMMORTAL_BASE_CULTIVATION_GAIN
        : scalePositiveRealmReward(
            rawLoss,
            realmRewards.cultivation,
          );

      cultivationFailureLoss = Math.min(
        originalCultivation,
        Math.max(0, Math.round(targetLoss)),
      );

      savedProfile.cultivation = Math.max(
        0,
        originalCultivation - cultivationFailureLoss,
      );

      rawCultivationDelta = -cultivationFailureLoss;
      result.cultivationDelta = rawCultivationDelta;
    }

    result.stoneDelta = scaledStoneDelta;
    result.equipmentStoneBonus = scalePositiveRealmReward(
      Number(result.equipmentStoneBonus) || 0,
      realmRewards.spiritStones,
    );
    result.techniqueStoneBonus = scalePositiveRealmReward(
      Number(result.techniqueStoneBonus) || 0,
      realmRewards.spiritStones,
    );

    if (immortalCultivationBase && rawCultivationDelta > 0) {
      const baseGain = IMMORTAL_BASE_CULTIVATION_GAIN;
      const rootPercent = Math.max(
        0,
        Number(profile.spiritRoot?.cultivateBonus) || 0,
      );
      const equipmentPercent = Math.max(
        0,
        Number(result.equipmentCultivationPercent) || 0,
      );
      const techniquePercent = Math.max(
        0,
        Number(result.techniqueCultivationPercent) || 0,
      );
      const legacyPetPercent = Math.max(
        0,
        Number(result.petCultivationPercent) || 0,
      );
      const pillPercent = Math.max(
        0,
        Number(result.cultivationPillPercent) || 0,
      );
      const formationPercent = Math.max(
        0,
        Number(effects.cultivationBonus) || 0,
      );

      const rootBonus = Math.round(baseGain * rootPercent);
      const equipmentCultivationBonus = Math.round(
        baseGain * equipmentPercent,
      );
      const techniqueCultivationBonus = Math.round(
        baseGain * techniquePercent,
      );
      const legacyPetCultivationBonus = Math.round(
        baseGain * legacyPetPercent,
      );
      const cultivationPillBonus = Math.round(
        baseGain * pillPercent,
      );
      const formationCultivationBonus = Math.round(
        baseGain * formationPercent,
      );
      const extraPetCultivationBonus = Math.round(
        baseGain * petCultivationPercent,
      );

      const totalCultivationGain =
        baseGain +
        rootBonus +
        equipmentCultivationBonus +
        techniqueCultivationBonus +
        legacyPetCultivationBonus +
        cultivationPillBonus +
        formationCultivationBonus +
        extraPetCultivationBonus;

      savedProfile.cultivation =
        originalCultivation + totalCultivationGain;
      savedProfile.totalCultivation =
        originalTotalCultivation + totalCultivationGain;

      if (realmStoneBonus > 0) {
        savedProfile.spiritStones += realmStoneBonus;
      }

      const stones = applyFormationSpiritStoneBonus(
        result.stoneDelta,
        effects,
      );

      if (stones.bonus > 0) {
        savedProfile.spiritStones += stones.bonus;
      }

      result.cultivationDelta = baseGain + rootBonus;
      result.equipmentCultivationBonus = equipmentCultivationBonus;
      result.techniqueCultivationBonus = techniqueCultivationBonus;
      result.petCultivationBonus = legacyPetCultivationBonus;
      result.cultivationPillBonus = cultivationPillBonus;

      let equipmentUse = null;
      if (equipmentCultivationBonus > 0) {
        equipmentUse = consumeEquippedEquipmentUse(
          savedProfile,
          'cultivation_bonus',
        );
      } else if (Number(result.equipmentStoneBonus) > 0) {
        equipmentUse = consumeEquippedEquipmentUse(
          savedProfile,
          'spirit_stone_bonus',
        );
      }

      const finalProfile = await saveProfile(client, savedProfile);

      return {
        ...result,
        profile: finalProfile,
        activePet,
        equipmentUse,
        realmRewardBaseMultiplier: realmRewards.base,
        realmCultivationMultiplier: 1,
        realmStoneMultiplier: realmRewards.spiritStones,
        realmCultivationBonus: 0,
        realmBaseCultivationBonus: 0,
        realmAuxCultivationBonus: 0,
        realmStoneBonus,
        spiritRootCultivationBonus: rootBonus,
        spiritRootCultivationPercent: rootPercent,
        extraPetCultivationBonus,
        extraPetCultivationPercent: petCultivationPercent,
        formationCultivationBonus,
        formationCultivationPercent: formationPercent,
        formationStoneBonus: stones.bonus,
        formationStonePercent: Number(effects.spiritStoneBonus) || 0,
        staminaCost: effectiveStaminaCost,
        baseStaminaCost,
        formationStaminaSaved: stamina.saved,
        formationStaminaReduction: Number(effects.staminaReduction) || 0,
        petStaminaRefund,
        petStaminaRefundPercent,
        formationResonanceLines: formation.lines || [],
        fixedImmortalCultivation: true,
        fixedImmortalCultivationGain: baseGain,
        totalImmortalCultivationGain: totalCultivationGain,
        cultivationFailureLoss: 0,
      };
    }

    const scaledCultivationDelta = scalePositiveRealmReward(
      rawCultivationDelta,
      realmRewards.cultivation,
    );
    const scaledEquipmentCultivationBonus = scalePositiveRealmReward(
      rawEquipmentCultivationBonus,
      realmRewards.cultivation,
    );
    const scaledTechniqueCultivationBonus = scalePositiveRealmReward(
      rawTechniqueCultivationBonus,
      realmRewards.cultivation,
    );
    const scaledLegacyPetCultivationBonus = scalePositiveRealmReward(
      rawLegacyPetCultivationBonus,
      realmRewards.cultivation,
    );
    const scaledCultivationPillBonus = scalePositiveRealmReward(
      rawCultivationPillBonus,
      realmRewards.cultivation,
    );

    const realmCultivationBonus = Math.max(
      0,
      scaledCultivationDelta - rawCultivationDelta,
    );

    const realmAuxCultivationBonus =
      Math.max(
        0,
        scaledEquipmentCultivationBonus - rawEquipmentCultivationBonus,
      ) +
      Math.max(
        0,
        scaledTechniqueCultivationBonus - rawTechniqueCultivationBonus,
      ) +
      Math.max(
        0,
        scaledLegacyPetCultivationBonus - rawLegacyPetCultivationBonus,
      ) +
      Math.max(
        0,
        scaledCultivationPillBonus - rawCultivationPillBonus,
      );

    const totalRealmCultivationBonus =
      realmCultivationBonus + realmAuxCultivationBonus;

    if (totalRealmCultivationBonus > 0) {
      savedProfile.cultivation += totalRealmCultivationBonus;
      savedProfile.totalCultivation += totalRealmCultivationBonus;
    }

    if (realmStoneBonus > 0) {
      savedProfile.spiritStones += realmStoneBonus;
    }

    result.cultivationDelta = scaledCultivationDelta;
    result.equipmentCultivationBonus = scaledEquipmentCultivationBonus;
    result.techniqueCultivationBonus = scaledTechniqueCultivationBonus;
    result.petCultivationBonus = scaledLegacyPetCultivationBonus;
    result.cultivationPillBonus = scaledCultivationPillBonus;

    const cultivation = applyFormationCultivationBonus(
      result.cultivationDelta,
      effects,
    );
    const stones = applyFormationSpiritStoneBonus(
      result.stoneDelta,
      effects,
    );

    const petCultivationBonus =
      petCultivationPercent > 0 && result.cultivationDelta > 0
        ? Math.max(
            1,
            Math.round(result.cultivationDelta * petCultivationPercent),
          )
        : 0;

    if (cultivation.bonus > 0) {
      savedProfile.cultivation += cultivation.bonus;
      savedProfile.totalCultivation += cultivation.bonus;
    }

    if (stones.bonus > 0) {
      savedProfile.spiritStones += stones.bonus;
    }

    if (petCultivationBonus > 0) {
      savedProfile.cultivation += petCultivationBonus;
      savedProfile.totalCultivation += petCultivationBonus;
    }

    let equipmentUse = null;
    if (Number(result.equipmentCultivationBonus) > 0) {
      equipmentUse = consumeEquippedEquipmentUse(
        savedProfile,
        'cultivation_bonus',
      );
    } else if (Number(result.equipmentStoneBonus) > 0) {
      equipmentUse = consumeEquippedEquipmentUse(
        savedProfile,
        'spirit_stone_bonus',
      );
    }

    const finalProfile = await saveProfile(client, savedProfile);

    return {
      ...result,
      profile: finalProfile,
      activePet,
      equipmentUse,
      realmRewardBaseMultiplier: realmRewards.base,
      realmCultivationMultiplier: realmRewards.cultivation,
      realmStoneMultiplier: realmRewards.spiritStones,
      realmCultivationBonus: totalRealmCultivationBonus,
      realmBaseCultivationBonus: realmCultivationBonus,
      realmAuxCultivationBonus,
      realmStoneBonus,
      extraPetCultivationBonus: petCultivationBonus,
      extraPetCultivationPercent: petCultivationPercent,
      formationCultivationBonus: cultivation.bonus,
      formationCultivationPercent: Number(effects.cultivationBonus) || 0,
      formationStoneBonus: stones.bonus,
      formationStonePercent: Number(effects.spiritStoneBonus) || 0,
      staminaCost: effectiveStaminaCost,
      baseStaminaCost,
      formationStaminaSaved: stamina.saved,
      formationStaminaReduction: Number(effects.staminaReduction) || 0,
      petStaminaRefund,
      petStaminaRefundPercent,
      formationResonanceLines: formation.lines || [],
      cultivationFailureLoss,
      fixedImmortalCultivationLoss:
        immortalCultivationBase && cultivationFailureLoss > 0,
      fixedImmortalCultivationLossAmount:
        immortalCultivationBase && cultivationFailureLoss > 0
          ? cultivationFailureLoss
          : 0,
    };
  } catch (error) {
    if (preCreditApplied) {
      try {
        const latest = await baseService.getCultivationProfile(
          client,
          guildId,
          userId,
        );
        latest.stamina = originalStamina;
        latest.pets ||= { owned: {}, active: null };
        latest.pets.active = originalActivePetId;
        await saveProfile(client, latest);
      } catch {
        // Do not hide the original error.
      }
    }
    throw error;
  }
}

async function guaranteedBreakthrough(
  client,
  guildId,
  userId,
  formationBonus,
  formationLines,
  activePet,
) {
  const profile = await baseService.getCultivationProfile(
    client,
    guildId,
    userId,
  );

  if (baseService.isMaxRealm(profile)) {
    return baseService.breakthrough(client, guildId, userId);
  }

  const required = baseService.getCultivationRequired(profile);
  if (profile.cultivation < required) {
    return baseService.breakthrough(client, guildId, userId);
  }

  const baseChance = baseService.getBreakthroughChance(profile);
  const breakthroughPillBonus = Math.max(
    0,
    Number(profile.effects?.nextBreakthroughBonus) || 0,
  );
  const oldRealm = baseService.getRealmDisplay(profile);

  profile.effects ||= {};
  profile.effects.nextBreakthroughBonus = 0;
  profile.cultivation -= required;

  const { CULTIVATION_STAGES } = await import(
    '../config/cultivationGame.js'
  );

  if (profile.stageIndex < CULTIVATION_STAGES.length - 1) {
    profile.stageIndex += 1;
  } else {
    profile.stageIndex = 0;
    profile.realmIndex += 1;
  }

  profile.stats ||= {};
  profile.stats.breakthroughSuccess = Math.max(
    0,
    Number(profile.stats.breakthroughSuccess) || 0,
  ) + 1;

  const saved = await saveProfile(client, profile);

  return {
    ok: true,
    success: true,
    chance: 1,
    baseChance,
    breakthroughPillBonus,
    techniqueBreakthroughBonus: 0,
    petBreakthroughBonus: 1,
    formationBreakthroughBonus: formationBonus,
    guaranteedByPet: true,
    activePet,
    oldRealm,
    newRealm: baseService.getRealmDisplay(saved),
    profile: saved,
    formationResonanceLines: formationLines || [],
  };
}

export async function breakthrough(client, guildId, userId) {
  const formation = await getFormationGameplayBonus(
    client,
    guildId,
    userId,
  );

  const formationBonus = Math.max(
    0,
    Number(formation.effects?.breakthroughBonus) || 0,
  );

  const profile = await baseService.getCultivationProfile(
    client,
    guildId,
    userId,
  );

  const activePet = getActivePet(profile);
  const petBreakthroughBonus = Math.max(
    0,
    Number(getPetEffectValue(profile, 'breakthrough_bonus')) || 0,
  );
  const petLossReduction = Math.min(
    0.95,
    Math.max(
      0,
      Number(getPetEffectValue(profile, 'breakthrough_loss_reduction')) || 0,
    ),
  );

  if (getPetEffectValue(profile, 'guaranteed_breakthrough') > 0) {
    return guaranteedBreakthrough(
      client,
      guildId,
      userId,
      formationBonus,
      formation.lines || [],
      activePet,
    );
  }

  const originalActivePetId = profile.pets?.active || null;
  const originalPillBonus = Math.max(
    0,
    Number(profile.effects?.nextBreakthroughBonus) || 0,
  );

  profile.effects ||= {};
  profile.pets ||= { owned: {}, active: null };
  profile.pets.active = null;
  profile.effects.nextBreakthroughBonus =
    originalPillBonus + formationBonus + petBreakthroughBonus;

  await saveProfile(client, profile);

  try {
    const result = await baseService.breakthrough(
      client,
      guildId,
      userId,
    );

    const latest =
      result?.profile ||
      await baseService.getCultivationProfile(client, guildId, userId);

    latest.pets ||= { owned: {}, active: null };
    latest.pets.active = originalActivePetId;
    latest.effects ||= {};

    if (!result?.ok) {
      latest.effects.nextBreakthroughBonus = originalPillBonus;
      const restored = await saveProfile(client, latest);
      return {
        ...result,
        profile: restored,
        activePet,
      };
    }

    latest.effects.nextBreakthroughBonus = 0;

    let petLossSaved = 0;
    if (!result.success && petLossReduction > 0) {
      const actualLoss = Math.max(0, Number(result.loss) || 0);
      const requestedPetLossSaved = Math.max(
        0,
        Math.round((Number(result.originalLoss) || 0) * petLossReduction),
      );

      petLossSaved = Math.min(actualLoss, requestedPetLossSaved);
      if (petLossSaved > 0) {
        latest.cultivation += petLossSaved;
        result.loss = Math.max(0, actualLoss - petLossSaved);
      }
    }

    let equipmentUse = null;
    if (
      !result.success &&
      Number(result.equipmentLossSaved) > 0 &&
      !result.talismanProtected
    ) {
      equipmentUse = consumeEquippedEquipmentUse(
        latest,
        'breakthrough_loss_reduction',
      );
    }

    const saved = await saveProfile(client, latest);

    return {
      ...result,
      profile: saved,
      activePet,
      equipmentUse,
      breakthroughPillBonus: originalPillBonus,
      petBreakthroughBonus,
      petLossReduction,
      petLossSaved,
      formationBreakthroughBonus: formationBonus,
      formationResonanceLines: formation.lines || [],
    };
  } catch (error) {
    try {
      const latest = await baseService.getCultivationProfile(
        client,
        guildId,
        userId,
      );
      latest.pets ||= { owned: {}, active: null };
      latest.pets.active = originalActivePetId;
      latest.effects ||= {};
      latest.effects.nextBreakthroughBonus = originalPillBonus;
      await saveProfile(client, latest);
    } catch {
      // Do not hide the original error.
    }

    throw error;
  }
}
