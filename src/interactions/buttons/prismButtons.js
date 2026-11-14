/**
 * prismButtons.js
 * Handlers cho toàn bộ các nút bấm tương tác của mini-game "Sắc Màu Định Mệnh".
 */

import {
  handlePrismClaimRole,
  handlePrismStartJourney,
  handlePrismHubAction,
  handlePrismStoryChoice,
  handlePrismStoryNext,
  handlePrismOutfitSubmit,
  handlePrismCrushOpenModal,
  handlePrismSpinRoll,
  handlePrismQuestsClaimAll,
} from '../../services/prismHandler.js';
import { logger } from '../../utils/logger.js';

function createSafeButtonHandler(name, fn) {
  return {
    name,
    async execute(interaction, client, args) {
      try {
        await fn(interaction, client, args);
      } catch (error) {
        logger.error(`[PrismButton:${name}] Error:`, error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: '❌ Đã có lỗi xảy ra khi xử lý tương tác này. Vui lòng thử lại!',
              ephemeral: true,
            })
            .catch(() => {});
        }
      }
    },
  };
}

export default [
  // BƯỚC 2: Nhận Role & Tạo Thread
  createSafeButtonHandler('prism_claim_role', (interaction, client) =>
    handlePrismClaimRole(interaction, client),
  ),

  // BƯỚC 3: Bắt Đầu Hành Trình
  createSafeButtonHandler('prism_start_journey', (interaction, client, args) =>
    handlePrismStartJourney(interaction, client, args),
  ),

  // BƯỚC 4: Các nút bấm trên Bảng Game Tổng Hợp
  createSafeButtonHandler('prism_mg_story', (interaction, client) =>
    handlePrismHubAction(interaction, client, 'prism_mg_story'),
  ),
  createSafeButtonHandler('prism_mg_outfit', (interaction, client) =>
    handlePrismHubAction(interaction, client, 'prism_mg_outfit'),
  ),
  createSafeButtonHandler('prism_mg_chat', (interaction, client) =>
    handlePrismHubAction(interaction, client, 'prism_mg_chat'),
  ),
  createSafeButtonHandler('prism_mg_spin', (interaction, client) =>
    handlePrismHubAction(interaction, client, 'prism_mg_spin'),
  ),

  // Hàng 3: Túi Đồ | Cửa Hàng | Nhiệm Vụ Ngày
  createSafeButtonHandler('prism_bag', (interaction, client) =>
    handlePrismHubAction(interaction, client, 'prism_bag'),
  ),
  createSafeButtonHandler('prism_shop', (interaction, client) =>
    handlePrismHubAction(interaction, client, 'prism_shop'),
  ),
  createSafeButtonHandler('prism_quests', (interaction, client) =>
    handlePrismHubAction(interaction, client, 'prism_quests'),
  ),
  createSafeButtonHandler('prism_quests_claim_all', (interaction, client) =>
    handlePrismQuestsClaimAll(interaction, client),
  ),

  // Hàng 4: Xem Điểm & BXH
  createSafeButtonHandler('prism_leaderboard', (interaction, client) =>
    handlePrismHubAction(interaction, client, 'prism_leaderboard'),
  ),

  // Tình Huống Khó Đỡ (Mini-game 1)
  createSafeButtonHandler('prism_story_pick', (interaction, client, args) =>
    handlePrismStoryChoice(interaction, client, args),
  ),
  createSafeButtonHandler('prism_story_next', (interaction) =>
    handlePrismStoryNext(interaction),
  ),

  // Sàn Diễn Outfit (Mini-game 2)
  createSafeButtonHandler('prism_outfit_submit', (interaction, client, args) =>
    handlePrismOutfitSubmit(interaction, client, args),
  ),

  // Chat Chit Cùng Crush (Mini-game 3)
  createSafeButtonHandler('prism_crush_open', (interaction, client, args) =>
    handlePrismCrushOpenModal(interaction, args),
  ),

  // Vòng Quay Định Mệnh (Mini-game 4)
  createSafeButtonHandler('prism_spin_roll', (interaction, client) =>
    handlePrismSpinRoll(interaction, client),
  ),
];
