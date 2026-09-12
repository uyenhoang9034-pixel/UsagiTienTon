import {
  MessageFlags,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  collectSpiritVein,
  getSpiritVeinSnapshot,
  upgradeSpiritVein,
} from '../../services/cultivationSpiritVein.js';

import {
  buildSpiritVeinEmbed,
  buildSpiritVeinNotice,
  buildSpiritVeinRows,
} from '../../services/cultivationSpiritVeinUI.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildDashboardEmbed,
  buildDashboardRows,
} from '../../services/cultivationUI.js';

import {
  appendFormationButton,
} from '../../services/cultivationFormationUI.js';

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
    'Đây là Linh Mạch của một đạo hữu khác.',
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
    `Linh Mạch chỉ có thể vận hành trong Tiên Lộ tại <#${CULTIVATION_CONFIG.channelId}>.`,
  );

  return false;
}

async function showMain(interaction, client, ownerId, notice = null) {
  const snapshot = await getSpiritVeinSnapshot(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [buildSpiritVeinEmbed(interaction.user, snapshot, notice)],
    components: buildSpiritVeinRows(ownerId, snapshot),
  });
}

async function collect(interaction, client, ownerId) {
  const result = await collectSpiritVein(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [
      buildSpiritVeinEmbed(
        interaction.user,
        result,
        buildSpiritVeinNotice(result),
      ),
    ],
    components: buildSpiritVeinRows(ownerId, result),
  });
}

async function upgrade(interaction, client, ownerId) {
  const result = await upgradeSpiritVein(
    client,
    interaction.guildId,
    interaction.user.id,
  );

  return interaction.update({
    embeds: [
      buildSpiritVeinEmbed(
        interaction.user,
        result,
        buildSpiritVeinNotice(result),
      ),
    ],
    components: buildSpiritVeinRows(ownerId, result),
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
    components: appendFormationButton(
      buildDashboardRows(ownerId),
      ownerId,
      interaction.guild,
    ),
  });
}

export default {
  name: 'tutien_spirit_vein',

  async execute(interaction, client, args = []) {
    const [ownerId, action] = args;

    if (!ownerId || !action) return;
    if (await rejectWrongPlayer(interaction, ownerId)) return;
    if (!(await enforceCultivationThread(interaction))) return;

    try {
      if (action === 'main') {
        return showMain(interaction, client, ownerId);
      }

      if (action === 'collect') {
        return collect(interaction, client, ownerId);
      }

      if (action === 'upgrade') {
        return upgrade(interaction, client, ownerId);
      }

      if (action === 'dashboard') {
        return showDashboard(interaction, client, ownerId);
      }

      return showMain(interaction, client, ownerId);
    } catch (error) {
      console.error('[LINH MACH ERROR]', error);

      return replyEphemeral(
        interaction,
        'Linh Mạch đang phát sinh dị tượng, tạm thời chưa thể vận chuyển.',
      );
    }
  },
};
