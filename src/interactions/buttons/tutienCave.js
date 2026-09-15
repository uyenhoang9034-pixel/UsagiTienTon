import { collectCave, getCaveSnapshot, upgradeCaveBuilding } from '../../services/cultivationCave.js';
import { buildCaveBuildingEmbed, buildCaveBuildingRows, buildCaveMainEmbed, buildCaveMainRows } from '../../services/cultivationCaveUI.js';

export default {
  name: 'tutien_cave',
  async execute(interaction, client, args = []) {
    const [ownerId, action = 'main', value = null] = args;
    if (!ownerId || interaction.user.id !== ownerId) {
      await interaction.reply({ content: 'Đây không phải Động Phủ của đạo hữu.', ephemeral: true }).catch(() => null);
      return;
    }
    await interaction.deferUpdate();
    const guildId = interaction.guildId;
    if (action === 'collect') {
      const result = await collectCave(client, guildId, ownerId);
      const s = result.ok ? result : await getCaveSnapshot(client, guildId, ownerId);
      const embed = buildCaveMainEmbed(s);
      const data = embed.toJSON();
      const note = result.ok ? `\n\n<a:ttruongco:1547493008914653245> **Thu hoạch +${result.collected} Thiên Linh Thảo.**` : '\n\n<a:ttlinhthao:1547464708318167122> **Linh Điền hiện chưa có gì để thu hoạch.**';
      embed.setDescription(`${data.description || ''}${note}`);
      await interaction.editReply({ embeds: [embed], components: buildCaveMainRows(ownerId) });
      return;
    }
    if (action === 'upgrade') {
      const result = await upgradeCaveBuilding(client, guildId, ownerId, value);
      const s = result.profile ? result : await getCaveSnapshot(client, guildId, ownerId);
      let notice = result.ok ? `**Nâng cấp thành công: Lv.${result.oldLevel} → Lv.${result.newLevel}**` : null;
      if (!result.ok && result.reason === 'not_enough_stones') notice = '**Không đủ Linh Thạch để nâng cấp.**';
      if (!result.ok && result.reason === 'not_enough_ore') notice = '**Không đủ Huyền Thiết để nâng cấp.**';
      if (!result.ok && result.reason === 'max_level') notice = '**Công trình đã đạt Lv.10.**';
      await interaction.editReply({ embeds: [buildCaveBuildingEmbed(s, value, notice)], components: buildCaveBuildingRows(ownerId, value, s.state.buildings[value]) });
      return;
    }
    const s = await getCaveSnapshot(client, guildId, ownerId);
    if (action === 'building' && value) {
      await interaction.editReply({ embeds: [buildCaveBuildingEmbed(s, value)], components: buildCaveBuildingRows(ownerId, value, s.state.buildings[value]) });
      return;
    }
    await interaction.editReply({ embeds: [buildCaveMainEmbed(s)], components: buildCaveMainRows(ownerId) });
  },
};
