import { MessageFlags } from 'discord.js';

import {
  claimWorldBossReward,
} from '../../services/cultivationWorldBoss.js';

async function replyEphemeral(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(payload);
  }
  return interaction.reply(payload);
}

export default {
  name: 'tutien_world_boss_reward',

  async execute(interaction, client, args = []) {
    const [ownerId, eventId] = args;

    if (!ownerId || interaction.user.id !== ownerId) {
      return replyEphemeral(
        interaction,
        'Đây là Chiến Lợi Phẩm của một đạo hữu khác.',
      );
    }

    const result = await claimWorldBossReward(
      client || interaction.client,
      interaction.guildId,
      eventId,
      ownerId,
    );

    if (!result.ok) {
      if (result.reason === 'already_claimed') {
        try {
          await interaction.deferUpdate();
          await interaction.message?.delete();
        } catch {}
        return;
      }

      return replyEphemeral(
        interaction,
        'Không tìm thấy Chiến Lợi Phẩm hoặc phần thưởng không còn khả dụng.',
      );
    }

    try {
      await interaction.deferUpdate();
      await interaction.message?.delete();
    } catch {}
  },
};
