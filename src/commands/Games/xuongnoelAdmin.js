import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { ROLE_HIERARCHY } from '../../config/roleHierarchy.js';
import {
  setSantaEventRole,
  setSantaAnnounceChannel,
} from '../../services/santaWorkshopService.js';
import { logger } from '../../utils/logger.js';

function hasOwnerRole(member, guild, userId) {
  if (guild?.ownerId && String(guild.ownerId) === String(userId)) return true;
  if (!member) return false;
  if (member.roles?.cache?.has?.(ROLE_HIERARCHY.OWNER)) return true;
  if (Array.isArray(member._roles) && member._roles.includes(ROLE_HIERARCHY.OWNER)) return true;
  if (Array.isArray(member.roles) && member.roles.includes(ROLE_HIERARCHY.OWNER)) return true;
  return false;
}

export default {
  data: new SlashCommandBuilder()
    .setName('xuongnoel-admin')
    .setDescription('🎅 Quản trị Xưởng Quà Ông Già Noel (Chỉ Role Owner)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('setrole')
        .setDescription('Chọn Role sự kiện Noel giới hạn để đổi trong Shop')
        .addRoleOption((opt) =>
          opt
            .setName('role')
            .setDescription('Role sự kiện Giáng Sinh')
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('setkenh')
        .setDescription('Chọn kênh Discord để bot Usagi báo tin Jackpot & Cây Thông')
        .addChannelOption((opt) =>
          opt
            .setName('kenh')
            .setDescription('Kênh chat nhận thông báo vinh danh Xưởng Noel')
            .setRequired(true),
        ),
    ),

  category: 'Games',

  async execute(interaction, _guildConfig, client) {
    const botClient = client || interaction.client;

    try {
      const guildId = interaction.guildId || 'global';
      if (!hasOwnerRole(interaction.member, interaction.guild, interaction.user?.id)) {
        return interaction.reply({
          content: `❌ Lệnh này chỉ dành riêng cho <@&${ROLE_HIERARCHY.OWNER}>!`,
          ephemeral: !interaction._isPrefixCommand,
        });
      }

      const sub = interaction.options?.getSubcommand?.(false);

      if (sub === 'setrole') {
        const role = interaction.options.getRole('role');
        await setSantaEventRole(botClient, guildId, role.id);
        return interaction.reply({
          content: `🎄 Đã đặt Role sự kiện Xưởng Quà Noel thành <@&${role.id}>! Người chơi có thể dùng Xu Tuyết đổi trong Shop.`,
          ephemeral: !interaction._isPrefixCommand,
        });
      }

      if (sub === 'setkenh') {
        const channel = interaction.options.getChannel('kenh');
        await setSantaAnnounceChannel(botClient, guildId, channel.id);
        return interaction.reply({
          content: `📢 Đã chọn <#${channel.id}> làm kênh vinh danh Jackpot, Thành Tựu & Cây Thông Server!`,
          ephemeral: !interaction._isPrefixCommand,
        });
      }

      return interaction.reply({
        content: 'Hãy chọn `/xuongnoel-admin setrole` hoặc `/xuongnoel-admin setkenh` nhé!',
        ephemeral: !interaction._isPrefixCommand,
      });
    } catch (error) {
      logger.error('[Command:XuongNoelAdmin] Lỗi thực thi:', error);
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: '❌ Có lỗi khi cấu hình Xưởng Quà Noel, thử lại sau nhé!',
          ephemeral: true,
        });
      }
    }
  },
};
