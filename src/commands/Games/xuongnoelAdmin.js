import {
  SlashCommandBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import { ROLE_HIERARCHY } from '../../config/roleHierarchy.js';
import {
  setSantaEventRole,
  setSantaAnnounceChannel,
  cleanupGuestSantaData,
  grantSantaSnowCoins,
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
    )
    .addSubcommand((sub) =>
      sub
        .setName('dondep')
        .setDescription('Xóa toàn bộ dữ liệu khách ẩn danh (Yêu Tinh Noel cũ) khỏi Bảng Xếp Hạng'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('tangtuyet')
        .setDescription('Tặng Xu Tuyết ❄️ cho thành viên (hiện thông báo khi họ mở Activity)')
        .addUserOption((opt) =>
          opt
            .setName('nguoinhan')
            .setDescription('Thành viên được tặng Xu Tuyết')
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName('soluong')
            .setDescription('Số lượng Xu Tuyết muốn tặng')
            .setMinValue(1)
            .setMaxValue(1000000)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('loinhan')
            .setDescription('Lời nhắn gửi kèm (tùy chọn)')
            .setMaxLength(140)
            .setRequired(false),
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

      if (sub === 'dondep') {
        const { deletedPlayers, cleanedBoards } = await cleanupGuestSantaData(botClient);
        return interaction.reply({
          content: `🧹 Đã dọn sạch **${deletedPlayers}** dữ liệu khách ẩn danh và **${cleanedBoards}** bảng xếp hạng cũ! Giờ chỉ giữ lại người chơi có ID Discord thật thôi ạ.`,
          ephemeral: !interaction._isPrefixCommand,
        });
      }

      if (sub === 'tangtuyet') {
        const targetUser = interaction.options.getUser('nguoinhan');
        const amount = interaction.options.getInteger('soluong');
        const note = interaction.options.getString('loinhan') || '';

        if (!targetUser || targetUser.bot) {
          return interaction.reply({
            content: '❌ Không thể tặng Xu Tuyết cho bot!',
            ephemeral: !interaction._isPrefixCommand,
          });
        }

        await grantSantaSnowCoins(botClient, {
          guildId,
          targetUser,
          amount,
          adminUser: interaction.member?.displayName
            ? { username: interaction.member.displayName }
            : interaction.user,
          note,
        });

        const noteText = note ? `\n💌 Lời nhắn: *${note}*` : '';
        return interaction.reply({
          content: `❄️ Đã tặng **+${amount} Xu Tuyết** cho <@${targetUser.id}>! Khi bạn ấy mở game Xưởng Quà Noel sẽ hiện thông báo nhận quà ngay.${noteText}`,
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
