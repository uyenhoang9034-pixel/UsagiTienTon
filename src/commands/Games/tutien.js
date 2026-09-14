import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getDatabaseValue,
  setDatabaseValue,
} from '../../utils/database.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildDashboardEmbed,
  buildDashboardRows,
} from '../../services/cultivationUIV2.js';

import {
  getDailyQuestCompletedCount,
  rollDailyQuests,
  setDailyQuestMessageId,
} from '../../services/cultivationDailyQuest.js';

import {
  buildDailyQuestEmbed,
  buildDailyQuestRows,
} from '../../services/cultivationDailyQuestUI.js';

import {
  CULTIVATION_MAINTENANCE_MESSAGE,
  isCultivationMaintenance,
} from '../../services/cultivationMaintenance.js';

const CULTIVATION_ROLE_ID =
  '1547581204759318579';

function getThreadKey(
  guildId,
  userId,
) {
  return `games:cultivation:thread:${guildId}:${userId}`;
}

async function replyEphemeral(
  interaction,
  content,
) {
  return interaction.reply({
    content,
    flags:
      MessageFlags.Ephemeral,
  });
}

async function replyCommandError(
  interaction,
  error,
) {
  console.error(
    '[TU TIEN COMMAND ERROR]',
    error,
  );

  const content =
    'Tiên Lộ đang gặp lỗi khi mở hồ sơ. Thử lại sau một chút nhé.';

  if (
    interaction.deferred ||
    interaction.replied
  ) {
    return interaction.editReply({
      content,
      embeds: [],
      components: [],
    });
  }

  return replyEphemeral(
    interaction,
    content,
  );
}

async function hasExistingMessage(
  interaction,
  messageId,
) {
  if (!messageId) {
    return false;
  }

  try {
    const message =
      await interaction.channel.messages.fetch(
        messageId,
      );

    return Boolean(message);
  } catch {
    return false;
  }
}

async function deleteMessageIfExists(
  interaction,
  messageId,
) {
  if (!messageId) {
    return;
  }

  try {
    const message =
      await interaction.channel.messages.fetch(
        messageId,
      );

    await message.delete();
  } catch {
    // Message đã mất hoặc không thể xóa thì bỏ qua.
  }
}

async function ensureDailyQuestPanel(
  interaction,
  runtimeClient,
  threadData,
) {
  const existingId =
    threadData?.dailyQuestMessageId ||
    null;

  // Nhật Nhiệm bây giờ được tự động tạo mỗi ngày.
  // /tutien chỉ đồng bộ đúng bộ nhiệm vụ hiện tại, không còn panel "Nhận Nhiệm Vụ".
  const questState =
    await rollDailyQuests(
      runtimeClient,
      interaction.guildId,
      interaction.user.id,
    );

  const total =
    Array.isArray(
      questState?.quests,
    )
      ? questState.quests.length
      : 0;

  const allDone =
    questState?.rolled &&
    total > 0 &&
    getDailyQuestCompletedCount(
      questState,
    ) >= total;

  if (allDone) {
    await deleteMessageIfExists(
      interaction,
      existingId,
    );

    await setDailyQuestMessageId(
      runtimeClient,
      interaction.guildId,
      interaction.user.id,
      null,
    );

    return null;
  }

  const payload = {
    embeds: [
      buildDailyQuestEmbed(
        interaction.user,
        questState,
      ),
    ],
    components:
      buildDailyQuestRows(
        interaction.user.id,
        questState,
      ),
  };

  if (
    await hasExistingMessage(
      interaction,
      existingId,
    )
  ) {
    try {
      const message =
        await interaction.channel.messages.fetch(
          existingId,
        );

      await message.edit(payload);

      await setDailyQuestMessageId(
        runtimeClient,
        interaction.guildId,
        interaction.user.id,
        existingId,
      );

      return existingId;
    } catch {
      // Nếu panel cũ biến mất giữa lúc kiểm tra và edit, gửi panel mới bên dưới.
    }
  }

  const message =
    await interaction.channel.send(
      payload,
    );

  await setDailyQuestMessageId(
    runtimeClient,
    interaction.guildId,
    interaction.user.id,
    message.id,
  );

  return message.id;
}

export default {
  category:
    'Games',

  data:
    new SlashCommandBuilder()
      .setName(
        'tutien',
      )
      .setDescription(
        'Mở Tiên Lộ và bắt đầu hành trình tu tiên cùng Usagi.',
      ),

  async execute(
    interaction,
    _guildConfig,
    client,
  ) {
    try {
      if (
        !interaction.guildId ||
        !interaction.guild
      ) {
        return replyEphemeral(
          interaction,
          'Tiên Lộ chỉ có thể được sử dụng trong server.',
        );
      }

      const member =
        await interaction.guild.members.fetch(
          interaction.user.id,
        );

      const isCultivationAdmin =
        Boolean(
          CULTIVATION_CONFIG.adminRoleId &&
          member.roles.cache.has(
            CULTIVATION_CONFIG.adminRoleId,
          ),
        );

      if (
        !CULTIVATION_CONFIG.enabled &&
        !isCultivationAdmin
      ) {
        return replyEphemeral(
          interaction,
          'Tiên Lộ hiện đang tạm đóng.',
        );
      }

      const runtimeClient =
        client ||
        interaction.client;

      if (
        !runtimeClient?.db
      ) {
        throw new Error(
          'Cultivation database is not available.',
        );
      }

      if (
        !isCultivationAdmin &&
        await isCultivationMaintenance(
          runtimeClient,
          interaction.guildId,
        )
      ) {
        return replyEphemeral(
          interaction,
          CULTIVATION_MAINTENANCE_MESSAGE,
        );
      }

      if (
        !member.roles.cache.has(
          CULTIVATION_ROLE_ID,
        )
      ) {
        return replyEphemeral(
          interaction,
          '🌸 Đạo hữu chưa có Role Tu Tiên nên chưa thể khai mở Tiên Lộ.',
        );
      }

      if (
        !interaction.channel?.isThread?.() ||
        interaction.channel.parentId !==
          CULTIVATION_CONFIG.channelId
      ) {
        return replyEphemeral(
          interaction,
          `🌸 Đạo hữu hãy tiến vào **chủ đề Tiên Lộ của riêng mình** bên trong <#${CULTIVATION_CONFIG.channelId}> rồi dùng \`/tutien\` tại đó.`,
        );
      }

      const threadKey =
        getThreadKey(
          interaction.guildId,
          interaction.user.id,
        );

      const threadData =
        await getDatabaseValue(
          runtimeClient,
          threadKey,
          null,
        );

      if (
        !threadData?.threadId ||
        threadData.threadId !==
          interaction.channelId
      ) {
        return replyEphemeral(
          interaction,
          '🌸 Đây không phải Tiên Lộ của đạo hữu. Hãy sử dụng `/tutien` trong đúng chủ đề riêng của mình.',
        );
      }

      const hasDashboard =
        await hasExistingMessage(
          interaction,
          threadData.dashboardMessageId,
        );

      if (hasDashboard) {
        const profile =
          await getCultivationProfile(
            runtimeClient,
            interaction.guildId,
            interaction.user.id,
            {
              create: true,
            },
          );

        try {
          const dashboardMessage =
            await interaction.channel.messages.fetch(
              threadData.dashboardMessageId,
            );

          await dashboardMessage.edit({
            embeds: [
              buildDashboardEmbed(
                interaction.user,
                profile,
              ),
            ],
            components:
              buildDashboardRows(
                interaction.user.id,
                interaction.guild,
              ),
          });
        } catch (error) {
          console.error(
            '[TU TIEN DASHBOARD REFRESH ERROR]',
            error,
          );
        }

        const dailyQuestMessageId =
          await ensureDailyQuestPanel(
            interaction,
            runtimeClient,
            threadData,
          );

        if (
          dailyQuestMessageId !==
          threadData.dailyQuestMessageId
        ) {
          await setDatabaseValue(
            runtimeClient,
            threadKey,
            {
              ...threadData,
              dailyQuestMessageId,
              updatedAt:
                Date.now(),
            },
          );
        }

        return replyEphemeral(
          interaction,
          `🌸 Đạo hữu đã có một giao diện Tiên Lộ đang mở trong chủ đề này. Giao diện đã được làm mới, hãy tiếp tục tu luyện trên panel cũ.`,
        );
      }

      await interaction.deferReply();

      const existingProfile =
        await getCultivationProfile(
          runtimeClient,
          interaction.guildId,
          interaction.user.id,
          {
            create:
              false,
          },
        );

      const profile =
        existingProfile ||
        await getCultivationProfile(
          runtimeClient,
          interaction.guildId,
          interaction.user.id,
          {
            create:
              true,
          },
        );

      const dashboardMessage =
        await interaction.editReply({
          embeds: [
            buildDashboardEmbed(
              interaction.user,
              profile,
              {
                isNew:
                  !existingProfile,
              },
            ),
          ],

          components:
            buildDashboardRows(
              interaction.user.id,
              interaction.guild,
            ),
        });

      const dailyQuestMessageId =
        await ensureDailyQuestPanel(
          interaction,
          runtimeClient,
          threadData,
        );

      await setDatabaseValue(
        runtimeClient,
        threadKey,
        {
          ...threadData,
          threadId:
            interaction.channelId,
          dashboardMessageId:
            dashboardMessage.id,
          dailyQuestMessageId,
          userId:
            interaction.user.id,
          updatedAt:
            Date.now(),
        },
      );

      return dashboardMessage;
    } catch (error) {
      return replyCommandError(
        interaction,
        error,
      );
    }
  },
};