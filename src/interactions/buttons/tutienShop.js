import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  buyCultivationShopItem,
  getCultivationShopItem,
  getCultivationShopSnapshot,
} from '../../services/cultivationShop.js';

import {
  buildShopCategoryEmbed,
  buildShopCategoryRows,
  buildShopItemEmbed,
  buildShopItemRows,
  buildShopMainEmbed,
  buildShopMainRows,
  buildShopPurchaseEmbed,
  buildShopPurchaseRows,
} from '../../services/cultivationShopUI.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildDashboardEmbed,
  buildDashboardRows,
} from '../../services/cultivationUIV2.js';

async function replyEphemeral(interaction, content) {
  const payload = {
    content,
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }

  return interaction.reply(payload);
}

async function rejectWrongPlayer(interaction, ownerId) {
  if (interaction.user.id === ownerId) {
    return false;
  }

  await replyEphemeral(
    interaction,
    'Đây là Tiên Phường của một đạo hữu khác.',
  );

  return true;
}

async function enforceCultivationThread(interaction) {
  const isMainChannel =
    interaction.channelId === CULTIVATION_CONFIG.channelId;

  const isCultivationThread =
    interaction.channel?.isThread?.() &&
    interaction.channel.parentId === CULTIVATION_CONFIG.channelId;

  if (isMainChannel || isCultivationThread) {
    return true;
  }

  await replyEphemeral(
    interaction,
    `Tiên Phường chỉ mở trong Tiên Lộ tại <#${CULTIVATION_CONFIG.channelId}>.`,
  );

  return false;
}

async function showMain(interaction, client, ownerId) {
  const { profile } = await getCultivationShopSnapshot(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [buildShopMainEmbed(interaction.user, profile)],
    components: buildShopMainRows(ownerId, interaction.guild),
  });
}

async function showCategory(
  interaction,
  client,
  ownerId,
  categoryId,
) {
  const { profile } = await getCultivationShopSnapshot(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [buildShopCategoryEmbed(categoryId, profile)],
    components: buildShopCategoryRows(
      ownerId,
      categoryId,
      interaction.guild,
    ),
  });
}

async function showItem(
  interaction,
  client,
  ownerId,
  itemId,
) {
  const item = getCultivationShopItem(itemId);

  if (!item) {
    return showMain(interaction, client, ownerId);
  }

  const { profile } = await getCultivationShopSnapshot(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [buildShopItemEmbed(itemId, profile)],
    components: buildShopItemRows(
      ownerId,
      itemId,
      interaction.guild,
    ),
  });
}

async function buyItem(
  interaction,
  client,
  ownerId,
  itemId,
) {
  const result = await buyCultivationShopItem(
    client,
    interaction.guildId,
    interaction.user.id,
    itemId,
  );

  return interaction.update({
    embeds: [buildShopPurchaseEmbed(result)],
    components: buildShopPurchaseRows(
      ownerId,
      result,
      interaction.guild,
    ),
  });
}

async function showDashboard(interaction, client, ownerId) {
  const profile = await getCultivationProfile(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [buildDashboardEmbed(interaction.user, profile)],
    components: buildDashboardRows(ownerId, interaction.guild),
  });
}

export default {
  name: 'tutien_shop',

  async execute(interaction, client, args = []) {
    const [ownerId, action, extra] = args;

    if (!ownerId || !action) {
      return;
    }

    if (await rejectWrongPlayer(interaction, ownerId)) {
      return;
    }

    if (!(await enforceCultivationThread(interaction))) {
      return;
    }

    try {
      if (action === 'main') {
        return showMain(interaction, client, ownerId);
      }

      if (action === 'category') {
        return showCategory(
          interaction,
          client,
          ownerId,
          extra,
        );
      }

      if (action === 'item') {
        return showItem(
          interaction,
          client,
          ownerId,
          extra,
        );
      }

      if (action === 'buy') {
        return buyItem(
          interaction,
          client,
          ownerId,
          extra,
        );
      }

      if (action === 'dashboard') {
        return showDashboard(interaction, client, ownerId);
      }

      return showMain(interaction, client, ownerId);
    } catch (error) {
      console.error('[TIEN PHUONG ERROR]', error);

      return replyEphemeral(
        interaction,
        'Tiên Phường đang gặp dị tượng, giao dịch tạm thời chưa thể hoàn tất.',
      );
    }
  },
};
