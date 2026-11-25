import {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from 'discord.js';
import {
  getOrCreateSantaPlayer,
  getSantaGuildConfig,
  setSantaEventRole,
  setSantaAnnounceChannel,
} from '../../services/santaWorkshopService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('xuongnoel')
    .setDescription('🎅 Xưởng Quà Của Ông Già Noel — Thu thập nguyên liệu, chế tạo & đổi quà!')
    .addSubcommand((sub) =>
      sub
        .setName('choi')
        .setDescription('Mở game Xưởng Quà Ông Già Noel (Discord Activity / Web)'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('hoso')
        .setDescription('Xem nhanh Xu Tuyết, Danh Vọng và cấp Xưởng Noel của bạn'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('setrole')
        .setDescription('[Admin] Chọn Role sự kiện Noel giới hạn để đổi trong Shop')
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
        .setDescription('[Admin] Chọn kênh Discord để bot Usagi báo tin Jackpot & Cây Thông')
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
      const sub = interaction.options?.getSubcommand?.(false) || 'choi';
      const guildId = interaction.guildId || 'global';

      if (sub === 'setrole') {
        if (!interaction.memberPermissions?.has?.(PermissionFlagsBits.Administrator)) {
          return interaction.reply({
            content: '❌ Chỉ Quản trị viên mới được cài đặt Role sự kiện Xưởng Noel!',
            ephemeral: !interaction._isPrefixCommand,
          });
        }
        const role = interaction.options.getRole('role');
        await setSantaEventRole(botClient, guildId, role.id);
        return interaction.reply({
          content: `🎄 Đã đặt Role sự kiện Xưởng Quà Noel thành <@&${role.id}>! Người chơi có thể dùng Xu Tuyết đổi trong Shop.`,
          ephemeral: !interaction._isPrefixCommand,
        });
      }

      if (sub === 'setkenh') {
        if (!interaction.memberPermissions?.has?.(PermissionFlagsBits.Administrator)) {
          return interaction.reply({
            content: '❌ Chỉ Quản trị viên mới được cài đặt kênh thông báo Xưởng Noel!',
            ephemeral: !interaction._isPrefixCommand,
          });
        }
        const channel = interaction.options.getChannel('kenh');
        await setSantaAnnounceChannel(botClient, guildId, channel.id);
        return interaction.reply({
          content: `📢 Đã chọn <#${channel.id}> làm kênh vinh danh Jackpot, Thành Tựu & Cây Thông Server!`,
          ephemeral: !interaction._isPrefixCommand,
        });
      }

      if (sub === 'hoso') {
        const player = await getOrCreateSantaPlayer(botClient, {
          userId: interaction.user.id,
          username: interaction.user.globalName || interaction.user.username,
          avatarUrl: interaction.user.displayAvatarURL?.({ size: 128 }),
          guildId,
        });
        const cfg = await getSantaGuildConfig(botClient, guildId);

        const embed = new EmbedBuilder()
          .setColor(0xe63946)
          .setTitle('🎅 Hồ Sơ Yêu Tinh — Xưởng Quà Ông Già Noel')
          .setThumbnail(interaction.user.displayAvatarURL?.({ size: 128 }) || null)
          .addFields(
            { name: '🏠 Cấp Xưởng', value: `Cấp ${player.workshopLevel}`, inline: true },
            { name: '❄️ Xu Tuyết', value: `${player.snowCoins}`, inline: true },
            { name: '⭐ Danh Vọng', value: `${player.reputation}`, inline: true },
            { name: '📦 Đơn đã giao', value: `${player.totalDelivered || 0} đơn`, inline: true },
            { name: '🎟️ Vé Quay Số', value: `${player.luckyTickets || 0} vé`, inline: true },
            {
              name: '👑 Role Sự Kiện',
              value: cfg.eventRoleId ? `<@&${cfg.eventRoleId}>` : 'Chưa cấu hình',
              inline: true,
            },
          )
          .setFooter({ text: 'Dùng /xuongnoel choi để mở game trên PC & Điện thoại!' });

        return interaction.reply({ embeds: [embed] });
      }

      // sub === 'choi'
      if (typeof interaction.launchActivity === 'function' && !interaction._isPrefixCommand) {
        try {
          await interaction.launchActivity();
          return;
        } catch (launchErr) {
          logger.debug('[Command:XuongNoel] launchActivity chưa khả dụng, fallback sang embed link:', launchErr?.message);
        }
      }

      const publicBaseUrl = (process.env.PUBLIC_WEB_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '').trim();
      const activityUrl = publicBaseUrl
        ? `${publicBaseUrl.startsWith('http') ? publicBaseUrl : `https://${publicBaseUrl}`}/activity`
        : null;

      const embed = new EmbedBuilder()
        .setColor(0x2a9d8f)
        .setTitle('🎄 Xưởng Quà Của Ông Già Noel')
        .setDescription(
          [
            'Hóa thân thành **Yêu Tinh (Elf)** chăm chỉ: thu thập **Gỗ thông, Vải đỏ, Bụi phép, Ruy băng**, chế tạo đồ chơi và giao hàng kiếm **Xu Tuyết** đổi quà!',
            '',
            activityUrl
              ? `👉 **Chơi ngay trên Web (PC & Mobile):** ${activityUrl}`
              : '👉 Mở từ **App Launcher (Nút Tên Lửa 🚀)** trong kênh chat/voice Discord để chơi ngay trên PC & Điện thoại!',
          ].join('\n'),
        );

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      logger.error('[Command:XuongNoel] Lỗi thực thi:', error);
      if (!interaction.replied && !interaction.deferred) {
        return interaction.reply({
          content: '❌ Có lỗi khi mở Xưởng Quà Noel, thử lại sau nhé!',
          ephemeral: true,
        });
      }
    }
  },
};
