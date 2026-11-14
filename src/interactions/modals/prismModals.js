/**
 * prismModals.js
 * Handlers cho Modals của "Sắc Màu Định Mệnh".
 */

import { handlePrismCrushModalSubmit } from '../../services/prismHandler.js';
import { logger } from '../../utils/logger.js';

function createSafeModalHandler(name, fn) {
  return {
    name,
    async execute(interaction, client, args) {
      try {
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

