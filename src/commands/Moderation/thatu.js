import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
  getPrisonRecord,
  releaseMember,
  buildPrisonReleasedPayloadV2,
  PRISON_CHANNEL_ID,
  PRISON_ROLE_ID,
} from '../../services/prisonService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('thatu')
    .setDescription('Thả một phạm nhân khỏi Nhà Tù và khôi phục role cũ.')
    .addUserOption(option =>
      option.setName('thanhvien').setDescription('Phạm nhân cần thả').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  category: 'moderation',

  async execute(interaction, config, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const user = interaction.options.getUser('thanhvien');
      const member = (user ? await interaction.guild.members.fetch({ user: user.id, force: true }).catch(() => null) : null)
        || interaction.options.getMember('thanhvien');

      if (!member || !user) {
        return InteractionHelper.safeEditReply(interaction, {
          content: 'Không tìm thấy thành viên này trong server.',
        });
      }

      const record = await getPrisonRecord(client, interaction.guildId, user.id);
      const hasPrisonRole = member.roles.cache.has(PRISON_ROLE_ID);

      if (!record?.active && !hasPrisonRole) {
        return InteractionHelper.safeEditReply(interaction, {
          content: `<@${user.id}> hiện không ở trong Nhà Tù.`,
        });
      }

      // Chuẩn bị record giải phóng: ưu tiên lấy originalRoleIds đã lưu từ trước
      const releaseRecord = (record && record.active)
        ? record
        : {
            active: true,
            guildId: interaction.guildId,
            userId: user.id,
            originalRoleIds: record?.originalRoleIds || [],
            totalLabor: record?.totalLabor || 0,
            completedLabor: record?.completedLabor || 0,
            remainingLabor: 0,
            reason: record?.reason || 'Thả tù thủ công',
            jailedAt: record?.jailedAt || Date.now(),
          };

      const released = await releaseMember(client, member, releaseRecord);

      const channel = await interaction.guild.channels.fetch(PRISON_CHANNEL_ID).catch(() => null);

      const payload = buildPrisonReleasedPayloadV2({
        userId: user.id,
        reason: released.reason,
        restoredRoleCount: released.restoredRoleCount,
      });

      if (channel?.isTextBased()) {
        await channel.send(payload).catch(() => {});
      }

      return InteractionHelper.safeEditReply(interaction, {
        content: `✅ Đã thả <@${user.id}> thành công.${released.restoredRoleCount > 0 ? ` (Đã khôi phục ${released.restoredRoleCount} role)` : ''}`,
      });
    } catch (error) {
      logger.error('Error executing /thatu command:', error);
      return InteractionHelper.safeEditReply(interaction, {
        content: `❌ Không thể thả tù: ${error.message || error}`,
      });
    }
  },
};
