import {
  FORMATION_DEFINITIONS,
  getFormationState,
  saveFormationState,
} from './cultivationFormation.js';

function clampChance(value) {
  return Math.max(
    0,
    Math.min(
      1,
      Number(value) || 0,
    ),
  );
}

export async function grantFormationFragment(
  client,
  guildId,
  userId,
  {
    formationId = null,
    quantity = 1,
  } = {},
) {
  const state = await getFormationState(
    client,
    guildId,
    userId,
  );

  const targetFormationId =
    formationId ||
    state.activeFormationId;

  const formation =
    FORMATION_DEFINITIONS[
      targetFormationId
    ];

  if (!formation) {
    return {
      ok: false,
      reason: 'invalid_formation',
      state,
    };
  }

  const safeQuantity = Math.max(
    1,
    Math.floor(
      Number(quantity) || 1,
    ),
  );

  state.formationFragments ||= {};
  state.formationFragments[
    targetFormationId
  ] = Math.max(
    0,
    Number(
      state.formationFragments?.[
        targetFormationId
      ],
    ) || 0,
  ) + safeQuantity;

  const savedState =
    await saveFormationState(
      client,
      guildId,
      userId,
      state,
    );

  return {
    ok: true,
    formationId: targetFormationId,
    formation,
    quantity: safeQuantity,
    total:
      savedState
        .formationFragments?.[
          targetFormationId
        ] || 0,
    state: savedState,
  };
}

export async function rollFormationFragmentDrop(
  client,
  guildId,
  userId,
  {
    chance = 0,
    quantity = 1,
    formationId = null,
    random = Math.random,
  } = {},
) {
  const rate =
    clampChance(chance);

  if (
    rate <= 0 ||
    Number(random()) > rate
  ) {
    return {
      ok: true,
      dropped: false,
      chance: rate,
      quantity: 0,
    };
  }

  const granted =
    await grantFormationFragment(
      client,
      guildId,
      userId,
      {
        formationId,
        quantity,
      },
    );

  if (!granted.ok) {
    return {
      ...granted,
      dropped: false,
      chance: rate,
    };
  }

  return {
    ...granted,
    dropped: true,
    chance: rate,
  };
}
