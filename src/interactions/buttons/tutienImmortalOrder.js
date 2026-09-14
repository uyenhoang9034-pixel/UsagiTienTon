import { MessageFlags } from 'discord.js';
import { claimImmortalOrderMilestone, getImmortalOrderSnapshot } from '../../services/cultivationImmortalOrder.js';
import { buildImmortalOrderMainEmbed, buildImmortalOrderMainRows, buildImmortalOrderQuestEmbed, buildImmortalOrderRewardEmbed, buildImmortalOrderSubRows } from '../../services/cultivationImmortalOrderUI.js';
import { buildDashboardEmbed, buildDashboardRows } from '../../services/cultivationUIV2.js';

async function ephemeral(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };
  return interaction.replied || interaction.deferred ? interaction.followUp(payload) : interaction.reply(payload);
}

export default {
  name: 'tutien_immortal_order',
  async execute(interaction, client, args = []) {
    const [ownerId, action = 'main', value = null] = args;
    if (!ownerId || interaction.user.id !== ownerId) return ephemeral(interaction, 'Đây là Tiên Lệnh của một đạo hữu khác.');
    const runtimeClient = client || interaction.client;

    if (action === 'dashboard') {
      const snapshot = await getImmortalOrderSnapshot(runtimeClient, interaction.guildId, ownerId);
      return interaction.update({ embeds: [buildDashboardEmbed(interaction.user, snapshot.profile || null)], components: buildDashboardRows(ownerId, interaction.guild) });
    }

    if (action === 'claim') {
      const result = await claimImmortalOrderMilestone(runtimeClient, interaction.guildId, ownerId, value);
      const snapshot = await getImmortalOrderSnapshot(runtimeClient, interaction.guildId, ownerId);
      const notice = result.ok ? `✅ Đã nhận thưởng mốc **${new Intl.NumberFormat('vi-VN').format(result.milestone.points)} Tiên Lệnh Điểm**.` : result.reason === 'already_claimed' ? 'Mốc thưởng này đã được nhận trước đó.' : result.reason === 'not_reached' ? 'Tiên Lệnh Điểm chưa đủ để nhận mốc này.' : 'Không thể nhận phần thưởng lúc này.';
      return interaction.update({ embeds: [buildImmortalOrderRewardEmbed(interaction.user, snapshot, notice)], components: buildImmortalOrderSubRows(ownerId, snapshot, 'rewards') });
    }

    const snapshot = await getImmortalOrderSnapshot(runtimeClient, interaction.guildId, ownerId);
    if (action === 'quests') return interaction.update({ embeds: [buildImmortalOrderQuestEmbed(interaction.user, snapshot)], components: buildImmortalOrderSubRows(ownerId, snapshot, 'quests') });
    if (action === 'rewards') return interaction.update({ embeds: [buildImmortalOrderRewardEmbed(interaction.user, snapshot)], components: buildImmortalOrderSubRows(ownerId, snapshot, 'rewards') });
    return interaction.update({ embeds: [buildImmortalOrderMainEmbed(interaction.user, snapshot)], components: buildImmortalOrderMainRows(ownerId) });
  },
};
