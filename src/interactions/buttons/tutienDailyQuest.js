import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getDailyQuestCompletedCount,
  getDailyQuestState,
  rollDailyQuests,
} from '../../services/cultivationDailyQuest.js';

import {
  buildDailyQuestEmbed,
  buildDailyQuestIntroEmbed,
  buildDailyQuestRows,
} from '../../services/cultivationDailyQuestUI.js';

async function replyEphemeral(
  interaction,
  content,
) {
  const payload = {
    content,
    flags:
      MessageFlags.Ephemeral,
  };

  if (
    interaction.replied ||
    interaction.deferred
  ) {
    return interaction.followUp(
      payload,
    );
  }

  return interaction.reply(
    payload,
  );
}

async function enforceChannel(
  interaction,
) {
  if (
    CULTIVATION_CONFIG.channelId &&
    interaction.channelId !==
      CULTIVATION_CONFIG.channelId
  ) {
    await replyEphemeral(
      interaction,
      `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,
    );

    return false;
  }

  return true;
}

function isAllDailyQuestsDone(
  state,
) {
  const total =
    Array.isArray(
      state?.quests,
    )
      ? state.quests.length
      : 0;

  return Boolean(
    state?.rolled &&
    total > 0 &&
    getDailyQuestCompletedCount(
      state,
    ) >= total
  );
}

async function hideCurrentQuestPanel(
  interaction,
) {
  try {
    if (
      !interaction.deferred &&
      !interaction.replied
    ) {
      await interaction.deferUpdate();
    }

    await interaction.message?.delete();
  } catch (error) {
    console.warn(
      '[TU TIEN DAILY QUEST CLEANUP WARNING]',
      error,
    );
  }
}

export default {
  name:
    'tutien_daily_quest',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
      action = 'open',
    ] = args;

    if (
      !ownerId ||
      interaction.user.id !==
        ownerId
    ) {
      return replyEphemeral(
        interaction,
        'Đây là Nhật Nhiệm của một đạo hữu khác.',
      );
    }

    if (
      !(await enforceChannel(
        interaction,
      ))
    ) {
      return;
    }

    const runtimeClient =
      client ||
      interaction.client;

    try {
      if (
        action === 'roll'
      ) {
        const state =
          await rollDailyQuests(
            runtimeClient,
            interaction.guildId,
            interaction.user.id,
          );

        if (
          isAllDailyQuestsDone(
            state,
          )
        ) {
          return hideCurrentQuestPanel(
            interaction,
          );
        }

        return interaction.update({
          embeds: [
            buildDailyQuestEmbed(
              interaction.user,
              state,
            ),
          ],
          components:
            buildDailyQuestRows(
              ownerId,
              state,
            ),
        });
      }

      const state =
        await getDailyQuestState(
          runtimeClient,
          interaction.guildId,
          interaction.user.id,
          {
            sync: true,
          },
        );

      if (
        isAllDailyQuestsDone(
          state,
        )
      ) {
        return hideCurrentQuestPanel(
          interaction,
        );
      }

      return interaction.update({
        embeds: [
          state.rolled
            ? buildDailyQuestEmbed(
                interaction.user,
                state,
              )
            : buildDailyQuestIntroEmbed(
                interaction.user,
              ),
        ],
        components:
          buildDailyQuestRows(
            ownerId,
            state,
          ),
      });
    } catch (error) {
      console.error(
        '[TU TIEN DAILY QUEST ERROR]',
        error,
      );

      return replyEphemeral(
        interaction,
        `Nhiệm Vụ Tiên Lộ đang gặp lỗi: \`${error?.message || 'Unknown error'}\``,
      );
    }
  },
};