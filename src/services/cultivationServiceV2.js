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

  // Hai Linh Thú cũ này đã được base cultivationService.js xử lý sẵn.
  // Chỉ cộng tại wrapper cho các Linh Thú mới để tránh nhân đôi hiệu quả cũ.
  if (
    pet.id === 'thanh_phong_linh_ho' ||
    pet.id === 'hau_tho_kim_long'
  ) {
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

  const baseStaminaCost =
    CULTIVATION_CONFIG.gameplay
      .cultivateStaminaCost;

  const stamina =
    applyFormationStaminaReduction(
      baseStaminaCost,
      effects,
    );

  if (profile.stamina < stamina.total) {
    return {
      ok: false,
      reason: 'stamina',
      profile,
      staminaCost: stamina.total,
      baseStaminaCost,
      formationStaminaSaved:
        stamina.saved,
      formationStaminaReduction:
        Number(
          effects.staminaReduction,
        ) || 0,
    };
  }

  const originalStamina =
    Number(profile.stamina) || 0;

  let staminaCreditApplied = false;

  try {
    if (stamina.saved > 0) {
      profile.stamina =
        originalStamina +
        stamina.saved;

      await saveProfile(
        client,
        profile,
      );

      staminaCreditApplied = true;
    }

    const result =
      await baseService.cultivate(
        client,
        guildId,
        userId,
      );

    if (!result.ok) {
      if (staminaCreditApplied) {
        const latest =
          await baseService.getCultivationProfile(
            client,
            guildId,
            userId,
          );

        latest.stamina =
          originalStamina;

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

    const savedProfile =
      result.profile;

    const activePet =
      getActivePet(
        savedProfile,
      );

    const petCultivationPercent =
      getWrapperCultivationPetBonus(
        savedProfile,
      );

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

    const finalProfile =
      cultivation.bonus > 0 ||
      stones.bonus > 0 ||
      petCultivationBonus > 0
        ? await saveProfile(
            client,
            savedProfile,
          )
        : savedProfile;

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
        Number(
          effects.cultivationBonus,
        ) || 0,
      formationStoneBonus:
        stones.bonus,
      formationStonePercent:
        Number(
          effects.spiritStoneBonus,
        ) || 0,
      staminaCost:
        stamina.total,
      baseStaminaCost,
      formationStaminaSaved:
        stamina.saved,
      formationStaminaReduction:
        Number(
          effects.staminaReduction,
        ) || 0,
      formationResonanceLines:
        formation.lines || [],
    };
  } catch (error) {
    if (staminaCreditApplied) {
      try {
        const latest =
          await baseService.getCultivationProfile(
            client,
            guildId,
            userId,
          );

        latest.stamina =
          originalStamina;

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

  const activePet =
    getActivePet(
      saved,
    );

  return {
    ok: true,
    success: true,
    chance: 1,
    baseChance,
    breakthroughPillBonus,
    techniqueBreakthroughBonus: 0,
    petBreakthroughBonus: 0,
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

  const preProfile =
    await baseService.getCultivationProfile(
      client,
      guildId,
      userId,
    );

  if (
    getPetEffectValue(
      preProfile,
      'guaranteed_breakthrough',
    ) > 0
  ) {
    return guaranteedBreakthrough(
      client,
      guildId,
      userId,
      formationBonus,
      formation.lines || [],
    );
  }

  if (formationBonus <= 0) {
    const result =
      await baseService.breakthrough(
        client,
        guildId,
        userId,
      );

    if (
      result?.ok &&
      !result.success &&
      getActivePet(result.profile)?.id ===
        'bach_giac_linh_loc'
    ) {
      const refund = Math.max(
        0,
        Math.round(
          (Number(result.originalLoss) || 0) *
            0.10,
        ),
      );

      if (refund > 0) {
        result.profile.cultivation += refund;
        result.profile = await saveProfile(
          client,
          result.profile,
        );
        result.petLossReduction = 0.10;
        result.petLossSaved = refund;
        result.loss = Math.max(
          0,
          (Number(result.loss) || 0) - refund,
        );
      }
    }

    return {
      ...result,
      activePet:
        getActivePet(
          result?.profile || preProfile,
        ),
    };
  }

  const profile =
    preProfile;

  if (
    baseService.isMaxRealm(
      profile,
    ) ||
    profile.cultivation <
      baseService.getCultivationRequired(
        profile,
      )
  ) {
    return baseService.breakthrough(
      client,
      guildId,
      userId,
    );
  }

  const originalPillBonus =
    Math.max(
      0,
      Number(
        profile.effects
          ?.nextBreakthroughBonus,
      ) || 0,
    );

  profile.effects ||= {};
  profile.effects.nextBreakthroughBonus =
    originalPillBonus +
    formationBonus;

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

    if (!result.ok) {
      const latest =
        await baseService.getCultivationProfile(
          client,
          guildId,
          userId,
        );

      latest.effects ||= {};
      latest.effects.nextBreakthroughBonus =
        originalPillBonus;

      await saveProfile(
        client,
        latest,
      );

      return result;
    }

    if (
      !result.success &&
      getActivePet(result.profile)?.id ===
        'bach_giac_linh_loc'
    ) {
      const refund = Math.max(
        0,
        Math.round(
          (Number(result.originalLoss) || 0) *
            0.10,
        ),
      );

      if (refund > 0) {
        result.profile.cultivation += refund;
        result.profile = await saveProfile(
          client,
          result.profile,
        );
        result.petLossReduction = 0.10;
        result.petLossSaved = refund;
        result.loss = Math.max(
          0,
          (Number(result.loss) || 0) - refund,
        );
      }
    }

    return {
      ...result,
      activePet:
        getActivePet(
          result.profile,
        ),
      breakthroughPillBonus:
        originalPillBonus,
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
