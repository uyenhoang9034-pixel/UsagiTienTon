/**
 * prismAdmin.js
 * Slash command /prism-admin - Dành riêng cho Administrator.
 * Quản trị mini-game Sắc Màu Định Mệnh: Bật/Tắt (Enable/Disable), Làm mới giao diện thread (Reload), và Xem trạng thái (Status).
 */

import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import {
  isPrismEnabled,
  setPrismEnabled,
  refreshAllMemberHubs,
  ensurePrismTable,
} from '../../services/prismHandler.js';
import { buildPrismSetupPayload } from '../../services/prismUI.js';
import { logger } from '../../utils/logger.js';
import pgDb from '../../utils/postgresDatabase.js';

export default {
  data: new SlashCommandBuilder()
    .setName('prism-admin')
    .setDescription('Quản trị mini-game Sắc Màu Định Mệnh (Chỉ dành cho Administrator)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) =>
      sub
        .setName('disable')
        .setDescription('Vô hiệu hóa mini-game (thành viên không thể ấn nút hay mở menu)'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('enable')
        .setDescription('Bật lại mini-game & tự động xóa bảng tổng cũ ở từng thread rồi gửi lại bảng mới'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('reload')
        .setDescription('Xóa bảng tổng cũ ở từng thread và gửi lại bảng mới nhất (không đổi trạng thái bật/tắt)'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('status')
        .setDescription('Kiểm tra trạng thái hoạt động hiện tại của mini-game'),
    )
    .addSubcommand((sub) =>
      sub
        .setName('setup')
        .setDescription('Lắp đặt bảng Nhận Role tại kênh hiện tại'),
    ),
  category: 'Games',

  async execute(interaction, config, client) {
    try {
      // 1. Kiểm tra quyền Administrator
      const isAdmin =
        interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
        interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
        String(interaction.guild?.ownerId || '') === String(interaction.user.id);

      if (!isAdmin) {
        return interaction.reply({
          content: '❌ Bạn không có quyền Administrator để sử dụng lệnh quản trị này!',
          flags: MessageFlags.Ephemeral,
        });
      }

      await ensurePrismTable();
      const subcommand = interaction.options.getSubcommand();

      // SUBCOMMAND: DISABLE
      if (subcommand === 'disable') {
        await setPrismEnabled(false);
        return interaction.reply({
          content:
            '⏸️ **Đã vô hiệu hóa mini-game "Sắc Màu Định Mệnh"!**\n' +
            'Thành viên sẽ không thể tương tác với các nút bấm hay menu trong game cho đến khi bạn bật lại bằng `/prism-admin enable`.',
          flags: MessageFlags.Ephemeral,
        });
      }

      // SUBCOMMAND: ENABLE
      if (subcommand === 'enable') {
        await setPrismEnabled(true);
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

        // Tự động xóa toàn bộ bảng giao diện tổng ở từng thread của từng member rồi gửi lại bảng mới
        const res = await refreshAllMemberHubs(client);

        return interaction.editReply({
          content:
            '✅ **Đã kích hoạt lại mini-game "Sắc Màu Định Mệnh"!**\n\n' +
            `✨ Đã tự động xóa bảng giao diện cũ và gửi lại bảng mới nhất tại **${res.success}/${res.total}** thread của thành viên.` +
            (res.failed > 0 ? `\n⚠️ Có **${res.failed}** thread không thể làm mới (có thể do thread đã bị xóa hoặc thiếu quyền).` : ''),
        });
      }

      // SUBCOMMAND: RELOAD (Làm mới giao diện không đổi trạng thái)
      if (subcommand === 'reload') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

        const res = await refreshAllMemberHubs(client);

        return interaction.editReply({
          content:
            '🔄 **Đã hoàn tất làm mới Bảng Giao Diện Tổng!**\n\n' +
            `✨ Đã xóa bảng cũ và gửi bảng mới nhất tại **${res.success}/${res.total}** thread của thành viên.` +
            (res.failed > 0 ? `\n⚠️ Có **${res.failed}** thread không thể làm mới (có thể do thread đã bị xóa).` : ''),
        });
      }

      // SUBCOMMAND: STATUS
      if (subcommand === 'status') {
        const pool = pgDb.pool;
        let threadCount = 0;
        if (pool) {
          const res = await pool.query(
            'SELECT COUNT(*) AS total FROM prism_players WHERE thread_id IS NOT NULL;'
          );
          threadCount = res.rows[0]?.total || 0;
        }

        const isEnabled = isPrismEnabled();
        return interaction.reply({
          content:
            '📊 **TRẠNG THÁI HỆ THỐNG "SẮC MÀU ĐỊNH MỆNH":**\n' +
            `- Trạng thái mini-game: **${isEnabled ? '🟢 Đang BẬT (Thành viên chơi bình thường)' : '🔴 Đang TẮT (Tạm ngưng / Bảo trì)'}**\n` +
            `- Tổng số thread người chơi đã mở: **${threadCount}**`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // SUBCOMMAND: SETUP
      if (subcommand === 'setup') {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
        const payload = buildPrismSetupPayload();
        await interaction.channel.send(payload);
        return interaction.editReply({
          content: '✅ Đã lắp đặt Bảng Nhận Role "Sắc Màu Định Mệnh" thành công tại kênh này!',
        });
      }
    } catch (error) {
      logger.error('[PrismAdmin] Error:', error);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: '❌ Đã xảy ra lỗi khi thực thi lệnh: ' + (error.message || error),
        });
      }
      return interaction.reply({
        content: '❌ Đã xảy ra lỗi khi thực thi lệnh: ' + (error.message || error),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
