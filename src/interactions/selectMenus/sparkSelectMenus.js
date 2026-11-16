import { MessageFlags } from 'discord.js';
import {
  getSparkProfiles, getSparkAdminMatchSelection, updateSparkAdminMatchSelection, isSparkAdmin,
} from '../../services/sparkMatchingService.js';
import { buildSparkAdminMatchPickerPayload } from '../../services/sparkMatchingUI.js';

async function handlePick(interaction, field) {
  if (!isSparkAdmin(interaction.member)) {
    return interaction.reply({ content: 'Bạn không có quyền ghép đôi.', flags: MessageFlags.Ephemeral });
  }
  const userId = interaction.values?.[0];
  const profiles = await getSparkProfiles(interaction.guildId);
  const profile = profiles.find((item) => item.userId === userId && item.status === 'approved');
  if (!profile) {
    return interaction.reply({ content: 'Hồ sơ này không còn đủ điều kiện ghép đôi. Hãy mở lại dashboard để tải danh sách mới.', flags: MessageFlags.Ephemeral });
  }
  const selection = await updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, { [field]: userId });
  const latestProfiles = await getSparkProfiles(interaction.guildId);
  return interaction.update(buildSparkAdminMatchPickerPayload(latestProfiles, selection));
}

export default [
  {
    name: 'spark_admin_pick_male',
    async execute(interaction) {
      return handlePick(interaction, 'maleId');
    },
  },
  {
    name: 'spark_admin_pick_female',
    async execute(interaction) {
      return handlePick(interaction, 'femaleId');
    },
  },
];
