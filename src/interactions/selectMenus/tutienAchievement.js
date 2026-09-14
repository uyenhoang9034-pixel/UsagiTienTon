import { MessageFlags } from 'discord.js';

import {
  getAchievementSnapshot,
  setAchievementTitle,
} from '../../services/cultivationAchievement.js';

import {
  buildAchievementCategoryEmbed,
  buildAchievementCategoryRows,
  buildAchievementTitlesEmbed,
  buildAchievementTitlesRows,
} from '../../services/cultivationAchievementUI.js';

async function deny(interaction) {
  const payload = {
    content: 'Đây là Tiên Đồ của một đạo hữu khác.',
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }
  return interaction.reply(payload);
}

const categoryHandler = {
  name: 'tutien_achievement_category',

  async execute(interaction, client, args = []) {
    const [ownerId] = args;
    if (!ownerId || interaction.user.id !== ownerId) return deny(interaction);

    const category = interaction.values?.[0] || 'cultivation';
    const snapshot = await getAchievementSnapshot(
      client || interaction.client,
      interaction.guildId,
      ownerId,
    );

    return interaction.update({
      embeds: [
        buildAchievementCategoryEmbed(
          interaction.user,
          snapshot,
          category,
        ),
      ],
      components: buildAchievementCategoryRows(ownerId, snapshot, category),
    });
  },
};

const titleHandler = {
  name: 'tutien_achievement_title',

  async execute(interaction, client, args = []) {
    const [ownerId] = args;
    if (!ownerId || interaction.user.id !== ownerId) return deny(interaction);

    const title = interaction.values?.[0] || null;
    const result = await setAchievementTitle(
      client || interaction.client,
      interaction.guildId,
      ownerId,
      title,
    );

    const snapshot = await getAchievementSnapshot(
      client || interaction.client,
      interaction.guildId,
      ownerId,
    );

    return interaction.update({
      embeds: [
        buildAchievementTitlesEmbed(
          interaction.user,
          snapshot,
          result.ok
            ? `Đã trang bị danh hiệu **「 ${title} 」**.`
            : 'Không thể trang bị danh hiệu này.',
        ),
      ],
      components: buildAchievementTitlesRows(ownerId, snapshot),
    });
  },
};

export default [categoryHandler, titleHandler];
