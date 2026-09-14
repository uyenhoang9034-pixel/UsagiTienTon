import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  buyDungeonShopItem,
  challengeDungeonFloor,
  getDungeonLeaderboard,
  getDungeonSnapshot,
  leaveDungeonRun,
  startDungeonRun,
} from '../../services/cultivationDungeon.js';

import {
  buildDungeonFailureEmbed,
  buildDungeonFailureRows,
  buildDungeonFloorEmbed,
  buildDungeonFloorRows,
  buildDungeonLeaderboardEmbed,
  buildDungeonLeaderboardRows,
  buildDungeonMainEmbed,
  buildDungeonMainRows,
  buildDungeonShopEmbed,
  buildDungeonShopRows,
  buildDungeonSuccessEmbed,
  buildDungeonSuccessRows,
} from '../../services/cultivationDungeonUI.js';

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
  if (interaction.user.id === ownerId) return false;

  await replyEphemeral(
    interaction,
    'Đây là Bí Cảnh của một đạo hữu khác. Dùng `/tutien` để mở Tiên Lộ của riêng bạn.',
  );

  return true;
}

async function enforceCultivationThread(interaction) {
  const isMainChannel = interaction.channelId === CULTIVATION_CONFIG.channelId;
  const isCultivationThread =
    interaction.channel?.isThread?.() &&
    interaction.channel.parentId === CULTIVATION_CONFIG.channelId;

  if (isMainChannel || isCultivationThread) return true;

  await replyEphemeral(
    interaction,
    `Bí Cảnh chỉ có thể mở trong Tiên Lộ tại <#${CULTIVATION_CONFIG.channelId}>.`,
  );

  return false;
}

function isAdmin(interaction) {
  const roleId = CULTIVATION_CONFIG.adminRoleId;
  if (!roleId) return false;

  if (interaction.member?.roles?.cache?.has?.(roleId)) {
    return true;
  }

  if (Array.isArray(interaction.member?.roles)) {
    return interaction.member.roles.includes(roleId);
  }

  return false;
}

async function snapshot(interaction, client) {
  return getDungeonSnapshot(
    client,
    interaction.guildId,
    interaction.user.id,
    { isAdmin: isAdmin(interaction) },
  );
}

async function showMain(interaction, client, ownerId, notice = null) {
  const data = await snapshot(interaction, client);

  return interaction.update({
    embeds: [buildDungeonMainEmbed(interaction.user, data, notice)],
    components: buildDungeonMainRows(ownerId, data),
  });
}

async function start(interaction, client, ownerId) {
  const result = await startDungeonRun(
    client,
    interaction.guildId,
    interaction.user.id,
    { isAdmin: isAdmin(interaction) },
  );

  if (!result.ok && result.reason === 'daily_limit') {
    return interaction.update({
      embeds: [
        buildDungeonMainEmbed(
          interaction.user,
          result,
          '⏳ **Đạo hữu đã dùng hết 3 lượt Bí Cảnh hôm nay.** Lượt sẽ tự làm mới vào ngày kế tiếp.',
        ),
      ],
      components: buildDungeonMainRows(ownerId, result),
    });
  }

  return interaction.update({
    embeds: [buildDungeonFloorEmbed(interaction.user, result)],
    components: buildDungeonFloorRows(ownerId),
  });
}

async function showFloor(interaction, client, ownerId) {
  const data = await snapshot(interaction, client);

  if (!data.state.activeRun) {
    return interaction.update({
      embeds: [
        buildDungeonMainEmbed(
          interaction.user,
          data,
          'Bí Cảnh hiện không có lượt đang tiến hành. Hãy **Tiến Vào Bí Cảnh** để bắt đầu một lượt mới.',
        ),
      ],
      components: buildDungeonMainRows(ownerId, data),
    });
  }

  return interaction.update({
    embeds: [buildDungeonFloorEmbed(interaction.user, data)],
    components: buildDungeonFloorRows(ownerId),
  });
}

async function challenge(interaction, client, ownerId) {
  const result = await challengeDungeonFloor(
    client,
    interaction.guildId,
    interaction.user.id,
    { isAdmin: isAdmin(interaction) },
  );

  if (!result.ok && result.reason === 'no_active_run') {
    return showMain(
      interaction,
      client,
      ownerId,
      'Lượt Bí Cảnh hiện tại đã kết thúc. Hãy bắt đầu một lượt mới.',
    );
  }

  if (!result.success) {
    return interaction.update({
      embeds: [buildDungeonFailureEmbed(result)],
      components: buildDungeonFailureRows(ownerId),
    });
  }

  return interaction.update({
    embeds: [buildDungeonSuccessEmbed(interaction.user, result)],
    components: buildDungeonSuccessRows(ownerId, result),
  });
}

async function leave(interaction, client, ownerId) {
  const result = await leaveDungeonRun(
    client,
    interaction.guildId,
    interaction.user.id,
    { isAdmin: isAdmin(interaction) },
  );

  const notice = result.floor
    ? `Đạo hữu đã chủ động rời Bí Cảnh trước **Tầng ${result.floor}**. Lượt hiện tại đã kết thúc; những phần thưởng đã nhận vẫn được giữ nguyên.`
    : 'Không có lượt Bí Cảnh nào đang tiến hành.';

  return interaction.update({
    embeds: [buildDungeonMainEmbed(interaction.user, result, notice)],
    components: buildDungeonMainRows(ownerId, result),
  });
}

async function showShop(interaction, client, ownerId, notice = null) {
  const data = await snapshot(interaction, client);

  return interaction.update({
    embeds: [buildDungeonShopEmbed(data, notice)],
    components: buildDungeonShopRows(ownerId, data),
  });
}

async function buyShopItem(interaction, client, ownerId, itemId) {
  const result = await buyDungeonShopItem(
    client,
    interaction.guildId,
    interaction.user.id,
    itemId,
    { isAdmin: isAdmin(interaction) },
  );

  if (!result.ok) {
    const notice = result.reason === 'not_enough_essence'
      ? `Không đủ Bí Cảnh Tinh Hoa để đổi **${result.item?.name || 'vật phẩm này'} ×1**.`
      : 'Không tìm thấy vật phẩm cần đổi trong Kho Bí Cảnh.';

    return interaction.update({
      embeds: [buildDungeonShopEmbed(result, notice)],
      components: buildDungeonShopRows(ownerId, result),
    });
  }

  return interaction.update({
    embeds: [
      buildDungeonShopEmbed(
        result,
        `✅ Đã đổi thành công **${result.item.name} ×1** với **${result.item.price} Bí Cảnh Tinh Hoa**.`,
      ),
    ],
    components: buildDungeonShopRows(ownerId, result),
  });
}

async function showLeaderboard(interaction, client, ownerId) {
  const entries = await getDungeonLeaderboard(client, interaction.guildId, 10);

  return interaction.update({
    embeds: [buildDungeonLeaderboardEmbed(entries)],
    components: buildDungeonLeaderboardRows(ownerId),
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
  name: 'tutien_dungeon',

  async execute(interaction, client, args = []) {
    const [ownerId, action] = args;

    if (!ownerId || !action) return;
    if (await rejectWrongPlayer(interaction, ownerId)) return;
    if (!(await enforceCultivationThread(interaction))) return;

    try {
      if (action === 'main') {
        return showMain(interaction, client, ownerId);
      }

      if (action === 'start') {
        return start(interaction, client, ownerId);
      }

      if (action === 'floor') {
        return showFloor(interaction, client, ownerId);
      }

      if (action === 'challenge') {
        return challenge(interaction, client, ownerId);
      }

      if (action === 'leave') {
        return leave(interaction, client, ownerId);
      }

      if (action === 'shop') {
        return showShop(interaction, client, ownerId);
      }

      if (action === 'leaderboard') {
        return showLeaderboard(interaction, client, ownerId);
      }

      if (action === 'dashboard') {
        return showDashboard(interaction, client, ownerId);
      }

      if (action.startsWith('buy_')) {
        return buyShopItem(
          interaction,
          client,
          ownerId,
          action.slice('buy_'.length),
        );
      }

      return showMain(interaction, client, ownerId);
    } catch (error) {
      console.error('[BÍ CẢNH ERROR]', error);

      return replyEphemeral(
        interaction,
        `Bí Cảnh đang phát sinh dị tượng: ${String(error?.message || error || 'Unknown error').slice(0, 500)}`,
      );
    }
  },
};
