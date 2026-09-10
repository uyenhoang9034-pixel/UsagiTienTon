export const SPIRIT_ROOT_QUALITY_EMOJI =
  '<a:ttphamchat:1547688807179096094>';

export const SPIRIT_ROOT_QUALITY_TIERS = [
  {
    minRealmIndex: 0,
    name: 'Phàm',
  },
  {
    minRealmIndex: 1,
    name: 'Lương',
  },
  {
    minRealmIndex: 2,
    name: 'Ưu',
  },
  {
    minRealmIndex: 3,
    name: 'Hiếm',
  },
  {
    minRealmIndex: 4,
    name: 'Cực Phẩm',
  },
  {
    minRealmIndex: 5,
    name: 'Thiên Phẩm',
  },
  {
    minRealmIndex: 6,
    name: 'Tiên Phẩm',
  },
];

export function getSpiritRootQualityByRealmIndex(
  realmIndex,
) {
  const safeRealmIndex =
    Math.max(
      0,
      Math.floor(
        Number(realmIndex) || 0,
      ),
    );

  let quality =
    SPIRIT_ROOT_QUALITY_TIERS[0];

  for (
    const tier of
      SPIRIT_ROOT_QUALITY_TIERS
  ) {
    if (
      safeRealmIndex >=
      tier.minRealmIndex
    ) {
      quality = tier;
    }
  }

  return quality;
}

export function getSpiritRootQuality(
  profile,
) {
  return getSpiritRootQualityByRealmIndex(
    profile?.realmIndex,
  );
}

export function getSpiritRootQualityUpgradeAfterBreakthrough(
  profile,
) {
  if (
    !profile ||
    Number(profile.stageIndex) !== 0 ||
    Number(profile.realmIndex) <= 0
  ) {
    return null;
  }

  const current =
    getSpiritRootQualityByRealmIndex(
      profile.realmIndex,
    );

  const previous =
    getSpiritRootQualityByRealmIndex(
      Number(profile.realmIndex) - 1,
    );

  if (
    current.name === previous.name
  ) {
    return null;
  }

  return {
    previous,
    current,
  };
}
