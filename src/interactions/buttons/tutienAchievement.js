import { MessageFlags } from 'discord.js';

import {
  claimAchievement,
  getAchievementSnapshot,
} from '../../services/cultivationAchievement.js';

import {
  buildAchievementCategoryEmbed,
  buildAchievementCategoryRows,
  buildAchievementMainEmbed,
  buildAchievementMainRows,
  buildAchievementTitlesEmbed,
  buildAchievementTitlesRows,
} from '../../services/cultivationAchievementUI.js';

import {
  buildDashboardEmbed,
  buildDashboardRows,
} from '../../services/cultivationUIV2.js';

async function replyEphemeral(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }
  return interaction.reply(payload);
}

export default {
  name: 'tutien_achievement',

  async execute(interaction, client, args = []) {
    const [ownerId, action = 'main', value = null] = args;

    if (!ownerId || interaction.user.id !== ownerId) {
      return replyEphemeral(interaction, 'Đây là Tiên Đồ của một đạo hữu khác.');
    }

    const runtimeClient = client || interaction.client;

    if (action === 'dashboard') {
      const snapshot = await getAchievementSnapshot(
        runtimeClient,
        interaction.guildId,
        ownerId,
      );

      return interaction.update({
        embeds: [buildDashboardEmbed(interaction.user, snapshot.profile)],
        components: buildDashboardRows(ownerId, interaction.guild),
      });
    }

    if (action === 'claim') {
      const result = await claimAchievement(
        runtimeClient,
        interaction.guildId,
        ownerId,
        value,
      );

      const snapshot = await getAchievementSnapshot(
        runtimeClient,
        interaction.guildId,
        ownerId,
      );

      const item = snapshot.achievements.find(entry => entry.id === value);
      const category = item?.category || 'cultivation';

      let notice = null;
      if (result.ok) {
        notice = `✅ Đã nhận **${new Intl.NumberFormat('vi-VN').format(result.achievement.reward)} Linh Thạch**${result.achievement.title ? ` và mở khóa danh hiệu **「 ${result.achievement.title} 」**` : ''}.`;
      } else if (result.reason === 'already_claimed') {
        notice = 'Phần thưởng thành tựu này đã được nhận trước đó.';
      } else if (result.reason === 'not_completed') {
        notice = 'Thành tựu này vẫn chưa hoàn thành.';
      } else {
        notice = 'Không thể nhận phần thưởng thành tựu lúc này.';
      }

      return interaction.update({
        embeds: [
          buildAchievementCategoryEmbed(
            interaction.user,
            snapshot,
            category,
            notice,
          ),
        ],
        components: buildAchievementCategoryRows(ownerId, snapshot, category),
      });
    }

    const snapshot = await getAchievementSnapshot(
      runtimeClient,
      interaction.guildId,
      ownerId,
    );

    if (action === 'titles') {
      return interaction.update({
        embeds: [buildAchievementTitlesEmbed(interaction.user, snapshot)],
        components: buildAchievementTitlesRows(ownerId, snapshot),
      });
    }

    if (action === 'category' && value) {
      return interaction.update({
        embeds: [
          buildAchievementCategoryEmbed(
            interaction.user,
            snapshot,
            value,
          ),
        ],
        components: buildAchievementCategoryRows(ownerId, snapshot, value),
      });
    }

    return interaction.update({
      embeds: [buildAchievementMainEmbed(interaction.user, snapshot)],
      components: buildAchievementMainRows(ownerId),
    });
  },
};
