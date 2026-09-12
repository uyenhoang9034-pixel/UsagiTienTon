export const CULTIVATION_REALM_REWARD_MULTIPLIERS = [
  1,
  3,
  8,
  25,
  80,
  250,
  800,
  2500,
  8000,
  25000,
  80000,
  250000,
  800000,
];

function getRealmIndex(profile) {
  const raw = Math.floor(Number(profile?.realmIndex) || 0);
  return Math.max(
    0,
    Math.min(
      raw,
      CULTIVATION_REALM_REWARD_MULTIPLIERS.length - 1,
    ),
  );
}

export function getRealmBaseRewardMultiplier(profile) {
  return CULTIVATION_REALM_REWARD_MULTIPLIERS[
    getRealmIndex(profile)
  ] || 1;
}

export function getCultivationRealmRewardMultipliers(profile) {
  const base = getRealmBaseRewardMultiplier(profile);

  return {
    base,
    cultivation: base,
    spiritStones: Math.max(1, Math.round(base * 0.30)),
  };
}

export function getAdventureRealmRewardMultipliers(profile) {
  const base = getRealmBaseRewardMultiplier(profile);

  return {
    base,
    cultivation: Math.max(1, Math.round(base * 0.60)),
    spiritStones: base,
  };
}

export function scalePositiveRealmReward(amount, multiplier) {
  const safeAmount = Number(amount) || 0;

  if (safeAmount <= 0) {
    return safeAmount;
  }

  return Math.max(
    safeAmount,
    Math.round(
      safeAmount * Math.max(1, Number(multiplier) || 1),
    ),
  );
}
