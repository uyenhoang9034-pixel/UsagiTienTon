import { MessageFlags } from 'discord.js';
import {
  getSparkProfiles, getSparkMatches, getSparkAdminMatchSelection,
  updateSparkAdminMatchSelection, isSparkAdmin, syncSparkProfileStatuses,
  cancelSparkMatchByAdmin,
} from '../../services/sparkMatchingService.js';
import { buildSparkAdminMatchPickerPayload } from '../../services/sparkMatchingUI.js';

async function handlePick(interaction, field) {
  if (!isSparkAdmin(interaction.member)) {
    return interaction.reply({ content: 'Bạn không có quyền ghép đôi.', flags: MessageFlags.Ephemeral });
  }
  const userId = interaction.values?.[0];
  const [profiles, matches] = await Promise.all([
    syncSparkProfileStatuses(interaction.guildId),
    getSparkMatches(interaction.guildId),
  ]);
  const profile = profiles.find((item) => item.userId === userId && item.status === 'approved');
  if (!profile) {
    return interaction.reply({ content: 'Hồ sơ này không còn đủ điều kiện ghép đôi. Hãy mở lại dashboard để tải danh sách mới.', flags: MessageFlags.Ephemeral });
  }

  const current = await getSparkAdminMatchSelection(interaction.guildId, interaction.user.id);
  const patch = { [field]: userId };

  if (field === 'userAId' || field === 'maleId') {
    patch.userAId = userId;
    patch.maleId = userId;
    if (current.userBId === userId || current.femaleId === userId) {
      patch.userBId = null;
      patch.femaleId = null;
    }
  } else if (field === 'userBId' || field === 'femaleId') {
    patch.userBId = userId;
    patch.femaleId = userId;
    if (current.userAId === userId || current.maleId === userId) {
      patch.userAId = null;
      patch.maleId = null;
    }
  }

  const selection = await updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, patch);
  const latestProfiles = await syncSparkProfileStatuses(interaction.guildId);
  return interaction.update(buildSparkAdminMatchPickerPayload(latestProfiles, selection, matches));
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
  {
    name: 'spark_admin_pick_user_a',
    async execute(interaction) {
      return handlePick(interaction, 'userAId');
    },
  },
  {
    name: 'spark_admin_pick_user_b',
    async execute(interaction) {
      return handlePick(interaction, 'userBId');
    },
  },
  {
    name: 'spark_admin_cancel_match_select',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) {
        return interaction.reply({ content: 'Bạn không có quyền quản trị Spark Matching.', flags: MessageFlags.Ephemeral });
      }
      const matchId = interaction.values?.[0];
      if (!matchId) return;

      const result = await cancelSparkMatchByAdmin(interaction.guild, matchId, interaction.user.id, { force: true });
      if (!result.ok) {
        return interaction.reply({
          content: `Không thể hủy lượt ghép đôi **${matchId}**: ${result.code || 'Lỗi không xác định'}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      await syncSparkProfileStatuses(interaction.guildId);
      return interaction.reply({
        content: `✅ Đã kết thúc và hủy thành công lượt ghép đôi **${matchId}**! Hồ sơ của hai thành viên đã được giải phóng và sẵn sàng ghép đôi lại.`,
        flags: MessageFlags.Ephemeral,
      });
    },
  },
];
