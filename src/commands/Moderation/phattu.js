import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
  jailMember,
  buildPrisonJailedPayloadV2,
  PRISON_CHANNEL_ID,
  PRISON_ROLE_ID,
} from '../../services/prisonService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('phattu')
    .setDescription('Phạt một thành viên vào Nhà Tù.')
    .addUserOption(option =>
      option.setName('thanhvien').setDescription('Thành viên bị phạt').setRequired(true))
    .addIntegerOption(option =>
      option.setName('solan').setDescription('Số lần phải lau dọn').setMinValue(1).setMaxValue(10000).setRequired(true))
    .addStringOption(option =>
      option.setName('lydo').setDescription('Lý do phạt tù').setMaxLength(500).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  category: 'moderation',

  async execute(interaction, config, client) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const user = interaction.options.getUser('thanhvien');
      const member = interaction.options.getMember('thanhvien') || (user ? await interaction.guild.members.fetch(user.id).catch(() => null) : null);
      const laborRequired = interaction.options.getInteger('solan');
      const reason = interaction.options.getString('lydo');

      if (!member || !user) {
        return InteractionHelper.safeEditReply(interaction, { content: 'Không tìm thấy thành viên này trong server.' });
      }
      if (user.id === interaction.user.id || user.id === client.user.id) {
        return InteractionHelper.safeEditReply(interaction, { content: 'Không thể phạt tù người này.' });
      }
      if (member.id === interaction.guild.ownerId) {
        return InteractionHelper.safeEditReply(interaction, { content: 'Không thể phạt tù chủ server.' });
      }

      const prisonRole = interaction.guild.roles.cache.get(PRISON_ROLE_ID) || await interaction.guild.roles.fetch(PRISON_ROLE_ID).catch(() => null);
      if (!prisonRole) {
        return InteractionHelper.safeEditReply(interaction, { content: 'Không tìm thấy role Tù Nhân.' });
      }

      const channel = await interaction.guild.channels.fetch(PRISON_CHANNEL_ID).catch(() => null);
      if (!channel?.isTextBased()) {
        return InteractionHelper.safeEditReply(interaction, { content: 'Không tìm thấy kênh Nhà Tù.' });
      }

      const record = await jailMember(client, member, {
        laborRequired,
        reason,
        moderatorId: interaction.user.id,
      });

      const payload = buildPrisonJailedPayloadV2({
        userId: user.id,
        reason,
        remainingLabor: record.remainingLabor,
      });

      await channel.send(payload);
      await InteractionHelper.safeEditReply(interaction, {
        content: `Đã phạt tù <@${user.id}>. Thông báo đã gửi tại <#${PRISON_CHANNEL_ID}>.`,
      });
    } catch (error) {
      logger.error('Error executing /phattu command:', error);
      return InteractionHelper.safeEditReply(interaction, {
        content: `❌ Không thể phạt tù thành viên: ${error.message || error}`,
      });
    }
  },
};
