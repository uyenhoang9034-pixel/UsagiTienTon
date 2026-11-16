/**
 * prismModals.js
 * Handlers cho Modals của "Sắc Màu Định Mệnh".
 */

import { PermissionFlagsBits, MessageFlags } from 'discord.js';
import { handlePrismCrushModalSubmit, isPrismEnabled } from '../../services/prismHandler.js';
import { logger } from '../../utils/logger.js';

function createSafeModalHandler(name, fn) {
  return {
    name,
    async execute(interaction, client, args) {
      try {
        if (!isPrismEnabled()) {
          const isAdmin =
            interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
            interaction.member?.permissions?.has(PermissionFlagsBits.Administrator) ||
            String(interaction.guild?.ownerId || '') === String(interaction.user.id);

          if (!isAdmin) {
            const disabledNotice = {
              content: '⏸️ Tính năng mini-game "Sắc Màu Định Mệnh" hiện đang tạm thời đóng để bảo trì/cập nhật. Vui lòng quay lại sau nhé!',
              flags: MessageFlags.Ephemeral,
            };
            if (interaction.replied || interaction.deferred) {
              return interaction.followUp(disabledNotice).catch(() => {});
            }
            return interaction.reply(disabledNotice).catch(() => {});
          }
        }

        await fn(interaction, client, args);
      } catch (error) {
        logger.error(`[PrismModal:${name}] Error:`, error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: '❌ Đã có lỗi xảy ra khi gửi tin nhắn cho Crush. Vui lòng thử lại!',
              ephemeral: true,
            })
            .catch(() => {});
        }
      }
    },
  };
}

export default [
  // Mini-game 3: Submit modal nhắn tin Crush
  createSafeModalHandler('prism_crush_modal', (interaction, client, args) =>
    handlePrismCrushModalSubmit(interaction, client, args),
  ),
];

