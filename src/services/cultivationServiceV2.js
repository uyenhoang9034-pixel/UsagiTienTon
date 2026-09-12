import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import * as baseService from './cultivationService.js';

import {
  getActivePet,
  getPetEffectValue,
} from './cultivationPet.js';

import {
  applyFormationCultivationBonus,
  applyFormationSpiritStoneBonus,
  applyFormationStaminaReduction,
  getFormationGameplayBonus,
} from './cultivationFormationGameplay.js';

export * from './cultivationService.js';

async function saveProfile(client, profile) {
  return baseService.saveCultivationProfile(
    client,
    profile,
  );
}

function getWrapperCultivationPetBonus(profile) {
  const pet = getActivePet(profile);

  if (!pet) return 0;

  // Thanh Phong Linh Hồ vẫn được base service xử lý đúng +3%.
  if (pet.id === 'thanh_phong_linh_ho') {
    return 0;
  }

  return Math.max(
    0,
    Number(
      getPetEffectValue(
        profile,
        'cultivation_bonus',
      ),
    ) || 0,
  );
}

function getPetStaminaRefund(profile) {
  return Math.min(
    0.95,
    Math.max(
      0,
      Number(
        getPetEffectValue(
          profile,
          'stamina_cost_refund',
        ),
      ) || 0,
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
    (fraction > 0 && Math.random() < fraction
      ? 1
      : 0);
}

export async function cultivate(
  client,
  guildId,
  userId,
) {
  const formation =
    await getFormationGameplayBonus(
      client,
      guildId,
      userId,
    );

  const effects =
    formation.effects || {};

  const profile =
    await baseService.getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const cooldown =
    baseService.getCultivateCooldownRemaining(
      profile,
    );

  if (cooldown > 0) {
    return baseService.cultivate(
      client,
      guildId,
      userId,
    );
  }

  const activePet = getActivePet(profile);
  const petCultivationPercent =
    getWrapperCultivationPetBonus(profile);
  const petStaminaRefundPercent =
    getPetStaminaRefund(profile);

  const baseStaminaCost =
    CULTIVATION_CONFIG.gameplay
      .cultivateStaminaCost;

  const stamina =
    applyFormationStaminaReduction(
      baseStaminaCost,
      effects,
    );

  const petStaminaRefund =
    petStaminaRefundPercent > 0
      ? Math.min(
          stamina.total,
          rollFractionalAmount(
            stamina.total,
            petStaminaRefundPercent,
          ),
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
      formationStaminaReduction:
        Number(effects.staminaReduction) || 0,
      petStaminaRefund,
      petStaminaRefundPercent,
      activePet,
    };
  }

  const originalStamina =
    Number(profile.stamina) || 0;
  const originalActivePetId =
    profile.pets?.active || null;

  // Hậu Thổ Kim Long trước đây bị hard-code +20% Tu Vi trong base service.
  // Phiên bản cân bằng mới không còn buff Tu Luyện, nên tạm ẩn pet khỏi base.
  const suppressLegacyCultivationPet =
    originalActivePetId === 'hau_tho_kim_long';

  let preCreditApplied = false;

  try {
    const totalPreCredit =
      Math.max(0, stamina.saved) +
      Math.max(0, petStaminaRefund);

    if (totalPreCredit > 0 || suppressLegacyCultivationPet) {
      profile.stamina =
        originalStamina + totalPreCredit;

      if (suppressLegacyCultivationPet) {
        profile.pets ||= { owned: {}, active: null };
        profile.pets.active = null;
      }

      await saveProfile(
        client,
        profile,
      );

      preCreditApplied = true;
    }

    const result =
      await baseService.cultivate(
        client,
        guildId,
        userId,
      );

    if (!result.ok) {
      if (preCreditApplied) {
        const latest =
          await baseService.getCultivationProfile(
            client,
            guildId,
            userId,
          );

        latest.stamina = originalStamina;
        latest.pets ||= { owned: {}, active: null };
        latest.pets.active = originalActivePetId;

        await saveProfile(
          client,
          latest,
        );
      }

      return result;
    }

    const cultivation =
      applyFormationCultivationBonus(
        result.cultivationDelta,
        effects,
      );

    const stones =
      applyFormationSpiritStoneBonus(
        result.stoneDelta,
        effects,
      );

    const savedProfile = result.profile;
    savedProfile.pets ||= { owned: {}, active: null };
    savedProfile.pets.active = originalActivePetId;

    const petCultivationBonus =
      petCultivationPercent > 0 &&
      result.cultivationDelta > 0
        ? Math.max(
            1,
            Math.round(
              result.cultivationDelta *
                petCultivationPercent,
            ),
          )
        : 0;

    if (cultivation.bonus > 0) {
      savedProfile.cultivation +=
        cultivation.bonus;

      savedProfile.totalCultivation +=
        cultivation.bonus;
    }

    if (stones.bonus > 0) {
      savedProfile.spiritStones +=
        stones.bonus;
    }

    if (petCultivationBonus > 0) {
      savedProfile.cultivation +=
        petCultivationBonus;

      savedProfile.totalCultivation +=
        petCultivationBonus;
    }

    const finalProfile = await saveProfile(
      client,
      savedProfile,
    );

    return {
      ...result,
      profile: finalProfile,
      activePet,
      extraPetCultivationBonus:
        petCultivationBonus,
      extraPetCultivationPercent:
        petCultivationPercent,
      formationCultivationBonus:
        cultivation.bonus,
      formationCultivationPercent:
        Number(effects.cultivationBonus) || 0,
      formationStoneBonus:
        stones.bonus,
      formationStonePercent:
        Number(effects.spiritStoneBonus) || 0,
      staminaCost: effectiveStaminaCost,
      baseStaminaCost,
      formationStaminaSaved:
        stamina.saved,
      formationStaminaReduction:
        Number(effects.staminaReduction) || 0,
      petStaminaRefund,
      petStaminaRefundPercent,
      formationResonanceLines:
        formation.lines || [],
    };
  } catch (error) {
    if (preCreditApplied) {
      try {
        const latest =
          await baseService.getCultivationProfile(
            client,
            guildId,
            userId,
          );

        latest.stamina = originalStamina;
        latest.pets ||= { owned: {}, active: null };
        latest.pets.active = originalActivePetId;

        await saveProfile(
          client,
          latest,
        );
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
  const profile =
    await baseService.getCultivationProfile(
      client,
      guildId,
      userId,
    );

  if (baseService.isMaxRealm(profile)) {
    return baseService.breakthrough(
      client,
      guildId,
      userId,
    );
  }

  const required =
    baseService.getCultivationRequired(
      profile,
    );

  if (profile.cultivation < required) {
    return baseService.breakthrough(
      client,
      guildId,
      userId,
    );
  }

  const baseChance =
    baseService.getBreakthroughChance(
      profile,
    );

  const breakthroughPillBonus =
    Math.max(
      0,
      Number(
        profile.effects
          ?.nextBreakthroughBonus,
      ) || 0,
    );

  const oldRealm =
    baseService.getRealmDisplay(
      profile,
    );

  profile.effects ||= {};
  profile.effects.nextBreakthroughBonus = 0;
  profile.cultivation -= required;

  const { CULTIVATION_STAGES } =
    await import(
      '../config/cultivationGame.js'
    );

  if (
    profile.stageIndex <
    CULTIVATION_STAGES.length - 1
  ) {
    profile.stageIndex += 1;
  } else {
    profile.stageIndex = 0;
    profile.realmIndex += 1;
  }

  profile.stats ||= {};
  profile.stats.breakthroughSuccess =
    Math.max(
      0,
      Number(
        profile.stats
          .breakthroughSuccess,
      ) || 0,
    ) + 1;

  const saved =
    await saveProfile(
      client,
      profile,
    );

  return {
    ok: true,
    success: true,
    chance: 1,
    baseChance,
    breakthroughPillBonus,
    techniqueBreakthroughBonus: 0,
    petBreakthroughBonus: 1,
    formationBreakthroughBonus:
      formationBonus,
    guaranteedByPet: true,
    activePet,
    oldRealm,
    newRealm:
      baseService.getRealmDisplay(
        saved,
      ),
    profile: saved,
    formationResonanceLines:
      formationLines || [],
  };
}

export async function breakthrough(
  client,
  guildId,
  userId,
) {
  const formation =
    await getFormationGameplayBonus(
      client,
      guildId,
      userId,
    );

  const formationBonus =
    Math.max(
      0,
      Number(
        formation.effects
          ?.breakthroughBonus,
      ) || 0,
    );

  const profile =
    await baseService.getCultivationProfile(
      client,
      guildId,
      userId,
    );

  const activePet = getActivePet(profile);
  const petBreakthroughBonus = Math.max(
    0,
    Number(
      getPetEffectValue(
        profile,
        'breakthrough_bonus',
      ),
    ) || 0,
  );
  const petLossReduction = Math.min(
    0.95,
    Math.max(
      0,
      Number(
        getPetEffectValue(
          profile,
          'breakthrough_loss_reduction',
        ),
      ) || 0,
    ),
  );

  if (
    getPetEffectValue(
      profile,
      'guaranteed_breakthrough',
    ) > 0
  ) {
    return guaranteedBreakthrough(
      client,
      guildId,
      userId,
      formationBonus,
      formation.lines || [],
      activePet,
    );
  }

  const originalActivePetId =
    profile.pets?.active || null;
  const originalPillBonus = Math.max(
    0,
    Number(
      profile.effects?.nextBreakthroughBonus,
    ) || 0,
  );

  profile.effects ||= {};
  profile.pets ||= { owned: {}, active: null };

  // Tạm ẩn Linh Thú để vô hiệu hóa các bonus hard-code cũ trong base service.
  profile.pets.active = null;
  profile.effects.nextBreakthroughBonus =
    originalPillBonus +
    formationBonus +
    petBreakthroughBonus;

  await saveProfile(
    client,
    profile,
  );

  try {
    const result =
      await baseService.breakthrough(
        client,
        guildId,
        userId,
      );

    const latest =
      result?.profile ||
      await baseService.getCultivationProfile(
        client,
        guildId,
        userId,
      );

    latest.pets ||= { owned: {}, active: null };
    latest.pets.active = originalActivePetId;
    latest.effects ||= {};

    if (!result?.ok) {
      latest.effects.nextBreakthroughBonus =
        originalPillBonus;

      const restored = await saveProfile(
        client,
        latest,
      );

      return {
        ...result,
        profile: restored,
        activePet,
      };
    }

    latest.effects.nextBreakthroughBonus = 0;

    let petLossSaved = 0;

    if (
      !result.success &&
      petLossReduction > 0
    ) {
      petLossSaved = Math.max(
        0,
        Math.round(
          (Number(result.originalLoss) || 0) *
            petLossReduction,
        ),
      );

      if (petLossSaved > 0) {
        latest.cultivation += petLossSaved;
        result.loss = Math.max(
          0,
          (Number(result.loss) || 0) -
            petLossSaved,
        );
      }
    }

    const saved = await saveProfile(
      client,
      latest,
    );

    return {
      ...result,
      profile: saved,
      activePet,
      breakthroughPillBonus:
        originalPillBonus,
      petBreakthroughBonus,
      petLossReduction,
      petLossSaved,
      formationBreakthroughBonus:
        formationBonus,
      formationResonanceLines:
        formation.lines || [],
    };
  } catch (error) {
    try {
      const latest =
        await baseService.getCultivationProfile(
          client,
          guildId,
          userId,
        );

      latest.pets ||= { owned: {}, active: null };
      latest.pets.active = originalActivePetId;
      latest.effects ||= {};
      latest.effects.nextBreakthroughBonus =
        originalPillBonus;

      await saveProfile(
        client,
        latest,
      );
    } catch {
      // Do not hide the original error.
    }

    throw error;
  }
}
