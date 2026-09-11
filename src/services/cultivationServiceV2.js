import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import * as baseService from './cultivationService.js';

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

    const finalProfile =
      cultivation.bonus > 0 ||
      stones.bonus > 0
        ? await saveProfile(
            client,
            savedProfile,
          )
        : savedProfile;

    return {
      ...result,
      profile: finalProfile,
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

  if (formationBonus <= 0) {
    return baseService.breakthrough(
      client,
      guildId,
      userId,
    );
  }

  const profile =
    await baseService.getCultivationProfile(
      client,
      guildId,
      userId,
    );

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

    return {
      ...result,
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
