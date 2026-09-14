import { MessageFlags } from 'discord.js';

import {
  attackWorldBoss,
  getWorldBossState,
} from '../../services/cultivationWorldBoss.js';

import {
  buildWorldBossEmbed,
  buildWorldBossRows,
} from '../../services/cultivationWorldBossUI.js';

import {
  deliverPendingWorldBossRewardsForGuild,
} from '../../services/cultivationWorldBossScheduler.js';

import {
  getCultivationProfile,
} from '../../services/cultivationService.js';

import {
  buildDashboardEmbed,
  buildDashboardRows,
} from '../../services/cultivationUIV2.js';

async function deny(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }
  return interaction.reply(payload);
}

export default {
  name: 'tutien_world_boss',

  async execute(interaction, client, args = []) {
    const [ownerId, action = 'open'] = args;
    if (!ownerId || interaction.user.id !== ownerId) {
      return deny(interaction, 'Đây là chiến trường Yêu Vương của một đạo hữu khác.');
    }

    const runtimeClient = client || interaction.client;

    if (action === 'dashboard') {
      const profile = await getCultivationProfile(
        runtimeClient,
        interaction.guildId,
        ownerId,
      );

      return interaction.update({
        embeds: [buildDashboardEmbed(interaction.user, profile)],
        components: buildDashboardRows(ownerId, interaction.guild),
      });
    }

    if (action === 'attack') {
      const result = await attackWorldBoss(
        runtimeClient,
        interaction.guildId,
        ownerId,
      );

      let notice = null;
      if (result.ok) {
        notice = `⚔️ Đạo hữu gây **${new Intl.NumberFormat('vi-VN').format(result.damage)} sát thương** lên Yêu Vương.${result.defeated ? '\n<a:trangtrig31:1546905996893626440> **Yêu Vương đã bị trảm sát!**' : ''}`;
      } else if (result.reason === 'limit') {
        notice = 'Đạo hữu đã dùng hết **2 / 2 lượt khiêu chiến** hôm nay.';
      } else if (result.reason === 'ended') {
        notice = 'Kỳ Thế Giới Boss hôm nay đã kết thúc.';
      } else {
        notice = 'Không thể khiêu chiến Yêu Vương lúc này.';
      }

      const state = result.state || await getWorldBossState(
        runtimeClient,
        interaction.guildId,
      );

      await interaction.update({
        embeds: [buildWorldBossEmbed(interaction.user, state, notice)],
        components: buildWorldBossRows(ownerId, state),
      });

      // Boss chết do chính cú đánh này: phát thông báo thưởng ngay,
      // không chờ scheduler 60 giây. Nếu gửi lỗi, scheduler vẫn retry sau.
      if (result.ok && result.defeated && interaction.guild) {
        try {
          await deliverPendingWorldBossRewardsForGuild(
            runtimeClient,
            interaction.guild,
          );
        } catch (error) {
          console.warn(
            '[WORLD BOSS REWARD DELIVERY ERROR]',
            error,
          );
        }
      }

      return;
    }

    const state = await getWorldBossState(
      runtimeClient,
      interaction.guildId,
    );

    return interaction.update({
      embeds: [buildWorldBossEmbed(interaction.user, state)],
      components: buildWorldBossRows(ownerId, state),
    });
  },
};
