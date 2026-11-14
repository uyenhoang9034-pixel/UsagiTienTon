/**
 * setupPrism.js
 * Slash command /setup-prism - Chỉ dành cho Administrator.
 * Gửi Bảng Nhận Role cố định tại kênh hiện tại bằng Components V2.
 */

import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { buildPrismSetupPayload } from '../../services/prismUI.js';
import { ensurePrismTable } from '../../services/prismHandler.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-prism')
    .setDescription('Lắp đặt bảng Nhận Role cho mini-game Sắc Màu Định Mệnh (Chỉ Admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  category: 'Games',

  async execute(interaction, config, client) {
    try {
      // Kiểm tra quyền Administrator
      const isAdmin =
        interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
        interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
        String(interaction.guild?.ownerId || '') === String(interaction.user.id);

      if (!isAdmin) {
        return interaction.reply({
          content: '❌ Bạn không có quyền Administrator để sử dụng lệnh này!',
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

      // Đảm bảo table PostgreSQL đã được khởi tạo
      await ensurePrismTable();

      // Gửi bảng nhận role vào kênh hiện tại
      const payload = buildPrismSetupPayload();
      await interaction.channel.send(payload);

      return interaction.editReply({
        content: '✅ Đã lắp đặt Bảng Nhận Role "Sắc Màu Định Mệnh" thành công tại kênh này!',
      });
    } catch (error) {
      logger.error('[Prism] /setup-prism command error:', error);
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: '❌ Đã xảy ra lỗi khi lắp đặt bảng: ' + (error.message || error),
        });
      }
      return interaction.reply({
        content: '❌ Đã xảy ra lỗi khi lắp đặt bảng: ' + (error.message || error),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

