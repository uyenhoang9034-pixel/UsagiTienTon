import { Mutex } from '../utils/mutex.js';
import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';

const PROFILE_PREFIX = 'games:cultivation:profile:';
const STAMINA_REGEN_MS = 60_000;
const NGUYET_QUANG_LINH_THO_ID = 'nguyet_quang_linh_tho';
const NGUYET_QUANG_STAMINA_BONUS = 3;

function getProfileKey(guildId, userId) {
  return `${PROFILE_PREFIX}${guildId}:${userId}`;
}

export async function regenerateCultivationStamina(
  client,
  guildId,
  userId,
) {
  if (!client?.db || !guildId || !userId) {
    return null;
  }

  const lockKey = `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(lockKey, async () => {
    const key = getProfileKey(guildId, userId);
    const raw = await client.db.get(key, null);

    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const now = Date.now();
    const maxStamina = Math.max(
      1,
      Number(raw.maxStamina) || CULTIVATION_CONFIG.gameplay.maxStamina,
    );
    const currentStamina = Math.max(
      0,
      Math.min(maxStamina, Number(raw.stamina) || 0),
    );

    const previousRegenAt = Math.max(
      0,
      Number(raw.lastStaminaRegenAt) ||
        Number(raw.updatedAt) ||
        now,
    );

    if (currentStamina >= maxStamina) {
      if (
        raw.stamina !== maxStamina ||
        raw.lastStaminaRegenAt !== now
      ) {
        const updated = {
          ...raw,
          stamina: maxStamina,
          lastStaminaRegenAt: now,
        };

        await client.db.set(key, updated);
        return updated;
      }

      return raw;
    }

    const elapsed = Math.max(0, now - previousRegenAt);
    const recovered = Math.floor(elapsed / STAMINA_REGEN_MS);

    if (recovered <= 0) {
      if (!raw.lastStaminaRegenAt) {
        const updated = {
          ...raw,
          lastStaminaRegenAt: previousRegenAt,
        };

        await client.db.set(key, updated);
        return updated;
      }

      return raw;
    }

    const hasNguyetQuangLinhTho =
      raw.pets?.active === NGUYET_QUANG_LINH_THO_ID &&
      raw.pets?.owned?.[NGUYET_QUANG_LINH_THO_ID] === true;

    const staminaPerTick =
      1 +
      (hasNguyetQuangLinhTho
        ? NGUYET_QUANG_STAMINA_BONUS
        : 0);

    const nextStamina = Math.min(
      maxStamina,
      currentStamina + recovered * staminaPerTick,
    );

    const nextRegenAt =
      nextStamina >= maxStamina
        ? now
        : previousRegenAt + recovered * STAMINA_REGEN_MS;

    const updated = {
      ...raw,
      stamina: nextStamina,
      maxStamina,
      lastStaminaRegenAt: nextRegenAt,
    };

    await client.db.set(key, updated);
    return updated;
  });
}
