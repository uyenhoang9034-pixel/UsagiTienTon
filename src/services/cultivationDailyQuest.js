import {
  addInventoryItem,
  getCultivationProfile,
  saveCultivationProfile,
} from './cultivationService.js';

import {
  Mutex,
} from '../utils/mutex.js';

const DAILY_QUEST_PREFIX =
  'games:cultivation:dailyQuest:';

const TIME_ZONE =
  'Asia/Ho_Chi_Minh';

const QUEST_MIN = 2;
const QUEST_MAX = 5;

function getQuestKey(
  guildId,
  userId,
) {
  return `${DAILY_QUEST_PREFIX}${guildId}:${userId}`;
}

function getDateKey(
  date = new Date(),
) {
  const parts =
    new Intl.DateTimeFormat(
      'en-US',
      {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
    ).formatToParts(
      date,
    );

  const values =
    Object.fromEntries(
      parts.map(
        part => [
          part.type,
          part.value,
        ],
      ),
    );

  return `${values.year}-${values.month}-${values.day}`;
}

function randomInt(
  min,
  max,
) {
  return (
    Math.floor(
      Math.random() *
        (
          max -
          min +
          1
        ),
    ) +
    min
  );
}

function shuffle(
  items,
) {
  const array = [
    ...items,
  ];

  for (
    let i =
      array.length - 1;
    i > 0;
    i -= 1
  ) {
    const j =
      Math.floor(
        Math.random() *
          (
            i + 1
          ),
      );

    [
      array[i],
      array[j],
    ] = [
      array[j],
      array[i],
    ];
  }

  return array;
}

function safeStat(
  profile,
  name,
) {
  return Math.max(
    0,
    Number(
      profile?.stats?.[
        name
      ],
    ) || 0,
  );
}

function getBreakthroughAttempts(
  profile,
) {
  return (
    safeStat(
      profile,
      'breakthroughSuccess',
    ) +
    safeStat(
      profile,
      'breakthroughFail',
    )
  );
}

function buildCounterSnapshot(
  profile,
) {
  return {
    cultivate:
      safeStat(
        profile,
        'cultivateCount',
      ),

    adventure:
      safeStat(
        profile,
        'adventureCount',
      ),

    alchemy:
      safeStat(
        profile,
        'alchemyCount',
      ),

    forge:
      safeStat(
        profile,
        'forgeCount',
      ),

    use_item:
      safeStat(
        profile,
        'itemsUsed',
      ),

    breakthrough:
      getBreakthroughAttempts(
        profile,
      ),
  };
}

function buildReward(
  type,
  target,
) {
  if (
    type === 'cultivate'
  ) {
    return {
      spiritStones:
        60 +
        target * 30,
      cultivation: 0,
    };
  }

  if (
    type === 'adventure'
  ) {
    return {
      spiritStones: 0,
      cultivation:
        80 +
        target * 60,
    };
  }

  if (
    type === 'alchemy'
  ) {
    return {
      spiritStones: 120,
      cultivation: 60,
    };
  }

  if (
    type === 'forge'
  ) {
    return {
      spiritStones: 140,
      cultivation: 60,
    };
  }

  if (
    type === 'use_item'
  ) {
    return {
      spiritStones: 90,
      cultivation: 50,
    };
  }

  return {
    spiritStones: 120,
    cultivation: 180,
  };
}

const QUEST_TEMPLATES = [
  {
    type: 'cultivate',
    name:
      'Tĩnh Tâm Tu Hành',
    minTarget: 1,
    maxTarget: 3,
  },

  {
    type: 'adventure',
    name:
      'Du Lịch Tiên Sơn',
    minTarget: 1,
    maxTarget: 2,
  },

  {
    type: 'alchemy',
    name:
      'Đan Hỏa Sơ Minh',
    minTarget: 1,
    maxTarget: 1,
  },

  {
    type: 'forge',
    name:
      'Khí Hỏa Tôi Luyện',
    minTarget: 1,
    maxTarget: 1,
  },

  {
    type: 'use_item',
    name:
      'Dược Khí Nhập Thể',
    minTarget: 1,
    maxTarget: 1,
  },

  {
    type: 'breakthrough',
    name:
      'Phá Vỡ Bình Cảnh',
    minTarget: 1,
    maxTarget: 1,
  },
];

function createEmptyState(
  guildId,
  userId,
  dateKey = getDateKey(),
) {
  return {
    version: 1,
    guildId,
    userId,
    dateKey,
    rolled: false,
    questCount: 0,
    quests: [],
    baseline: null,
    createdAt:
      Date.now(),
    updatedAt:
      Date.now(),
  };
}

function createQuest(
  template,
) {
  const target =
    randomInt(
      template.minTarget,
      template.maxTarget,
    );

  return {
    id:
      `${template.type}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
    type:
      template.type,
    name:
      template.name,
    target,
    progress: 0,
    completed: false,
    claimed: false,
    reward:
      buildReward(
        template.type,
        target,
      ),
  };
}

async function getFreshState(
  client,
  guildId,
  userId,
) {
  const key =
    getQuestKey(
      guildId,
      userId,
    );

  const today =
    getDateKey();

  const raw =
    await client.db.get(
      key,
      null,
    );

  if (
    !raw ||
    typeof raw !== 'object' ||
    raw.dateKey !== today
  ) {
    const state =
      createEmptyState(
        guildId,
        userId,
        today,
      );

    await client.db.set(
      key,
      state,
    );

    return state;
  }

  return {
    ...createEmptyState(
      guildId,
      userId,
      today,
    ),
    ...raw,
    guildId,
    userId,
    dateKey: today,
    quests:
      Array.isArray(
        raw.quests,
      )
        ? raw.quests
        : [],
  };
}

async function saveQuestState(
  client,
  state,
) {
  const saved = {
    ...state,
    updatedAt:
      Date.now(),
  };

  await client.db.set(
    getQuestKey(
      saved.guildId,
      saved.userId,
    ),
    saved,
  );

  return saved;
}

function applyReward(
  profile,
  reward,
) {
  const spiritStones =
    Math.max(
      0,
      Math.round(
        Number(
          reward?.spiritStones,
        ) || 0,
      ),
    );

  const cultivation =
    Math.max(
      0,
      Math.round(
        Number(
          reward?.cultivation,
        ) || 0,
      ),
    );

  if (
    spiritStones > 0
  ) {
    profile.spiritStones =
      Math.max(
        0,
        Number(
          profile.spiritStones,
        ) || 0,
      ) +
      spiritStones;
  }

  if (
    cultivation > 0
  ) {
    profile.cultivation =
      Math.max(
        0,
        Number(
          profile.cultivation,
        ) || 0,
      ) +
      cultivation;

    profile.totalCultivation =
      Math.max(
        0,
        Number(
          profile.totalCultivation,
        ) || 0,
      ) +
      cultivation;
  }

  if (
    reward?.itemId &&
    reward?.quantity
  ) {
    addInventoryItem(
      profile,
      reward.itemId,
      reward.quantity,
    );
  }
}

function syncQuestProgress(
  state,
  profile,
) {
  if (
    !state.rolled ||
    !Array.isArray(
      state.quests,
    )
  ) {
    return {
      changed: false,
      rewardsGranted: 0,
    };
  }

  const current =
    buildCounterSnapshot(
      profile,
    );

  const baseline =
    state.baseline || {};

  let changed = false;
  let rewardsGranted = 0;

  for (
    const quest of
      state.quests
  ) {
    const before =
      Math.max(
        0,
        Number(
          baseline[
            quest.type
          ],
        ) || 0,
      );

    const now =
      Math.max(
        0,
        Number(
          current[
            quest.type
          ],
        ) || 0,
      );

    const progress =
      Math.min(
        quest.target,
        Math.max(
          0,
          now - before,
        ),
      );

    if (
      progress !==
      quest.progress
    ) {
      quest.progress =
        progress;
      changed = true;
    }

    const completed =
      progress >=
      quest.target;

    if (
      completed !==
      quest.completed
    ) {
      quest.completed =
        completed;
      changed = true;
    }

    if (
      completed &&
      !quest.claimed
    ) {
      applyReward(
        profile,
        quest.reward,
      );

      quest.claimed = true;
      rewardsGranted += 1;
      changed = true;
    }
  }

  return {
    changed,
    rewardsGranted,
  };
}

export async function getDailyQuestState(
  client,
  guildId,
  userId,
  {
    sync = true,
  } = {},
) {
  if (!sync) {
    return getFreshState(
      client,
      guildId,
      userId,
    );
  }

  return syncDailyQuests(
    client,
    guildId,
    userId,
  );
}

export async function rollDailyQuests(
  client,
  guildId,
  userId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,
    async () => {
      let state =
        await getFreshState(
          client,
          guildId,
          userId,
        );

      if (
        state.rolled
      ) {
        const profile =
          await getCultivationProfile(
            client,
            guildId,
            userId,
          );

        const syncResult =
          syncQuestProgress(
            state,
            profile,
          );

        if (
          syncResult.rewardsGranted >
          0
        ) {
          await saveCultivationProfile(
            client,
            profile,
          );
        }

        if (
          syncResult.changed
        ) {
          state =
            await saveQuestState(
              client,
              state,
            );
        }

        return state;
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const questCount =
        randomInt(
          QUEST_MIN,
          QUEST_MAX,
        );

      const selected =
        shuffle(
          QUEST_TEMPLATES,
        ).slice(
          0,
          questCount,
        );

      state = {
        ...state,
        rolled: true,
        questCount,
        quests:
          selected.map(
            createQuest,
          ),
        baseline:
          buildCounterSnapshot(
            profile,
          ),
        rolledAt:
          Date.now(),
      };

      return saveQuestState(
        client,
        state,
      );
    },
  );
}

export async function syncDailyQuests(
  client,
  guildId,
  userId,
) {
  const lockKey =
    `cultivation:${guildId}:${userId}`;

  return Mutex.runExclusive(
    lockKey,
    async () => {
      let state =
        await getFreshState(
          client,
          guildId,
          userId,
        );

      if (
        !state.rolled
      ) {
        return state;
      }

      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      const result =
        syncQuestProgress(
          state,
          profile,
        );

      if (
        result.rewardsGranted >
        0
      ) {
        await saveCultivationProfile(
          client,
          profile,
        );
      }

      if (
        result.changed
      ) {
        state =
          await saveQuestState(
            client,
            state,
          );
      }

      return state;
    },
  );
}

export function getDailyQuestCompletedCount(
  state,
) {
  return (
    state?.quests || []
  ).filter(
    quest =>
      quest.completed,
  ).length;
}

export function getDailyQuestTimeZone() {
  return TIME_ZONE;
}
