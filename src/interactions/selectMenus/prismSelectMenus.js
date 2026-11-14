/**
 * prismSelectMenus.js
 * Handlers cho toàn bộ Select Menus của "Sắc Màu Định Mệnh".
 */

import {
  handlePrismSelectIdentity,
  handlePrismOutfitSelect,
  handlePrismBagUseItem,
  handlePrismBagGiftCrush,
  handlePrismShopBuyItem,
  handlePrismShopBuyGift,
} from '../../services/prismHandler.js';
import { logger } from '../../utils/logger.js';

function createSafeSelectHandler(name, fn) {
  return {
    name,
    async execute(interaction, client, args) {
      try {
        await fn(interaction, client, args);
      } catch (error) {
        logger.error(`[PrismSelect:${name}] Error:`, error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: '❌ Đã có lỗi xảy ra khi cập nhật lựa chọn. Vui lòng thử lại!',
              ephemeral: true,
            })
            .catch(() => {});
        }
      }
    },
  };
}

export default [
  // BƯỚC 3: Chọn bản dạng / xu hướng tính dục
  createSafeSelectHandler('prism_select_identity', (interaction) =>
    handlePrismSelectIdentity(interaction),
  ),

  // Mini-game 2: Chọn Áo
  createSafeSelectHandler('prism_outfit_top', (interaction, client, args) =>
    handlePrismOutfitSelect(interaction, 'top', args),
  ),

  // Mini-game 2: Chọn Quần / Váy
  createSafeSelectHandler('prism_outfit_bot', (interaction, client, args) =>
    handlePrismOutfitSelect(interaction, 'bot', args),
  ),

  // Mini-game 2: Chọn Phụ Kiện
  createSafeSelectHandler('prism_outfit_acc', (interaction, client, args) =>
    handlePrismOutfitSelect(interaction, 'acc', args),
  ),

  // Túi Đồ: Dùng vật phẩm
  createSafeSelectHandler('prism_bag_use_item', (interaction, client) =>
    handlePrismBagUseItem(interaction, client),
  ),

  // Túi Đồ: Tặng quà Crush
  createSafeSelectHandler('prism_bag_gift_crush', (interaction, client) =>
    handlePrismBagGiftCrush(interaction, client),
  ),

  // Cửa Hàng: Mua Vật Phẩm Kỷ Niệm / Bùa / Hộp Mù
  createSafeSelectHandler('prism_shop_buy_item', (interaction, client) =>
    handlePrismShopBuyItem(interaction, client),
  ),

  // Cửa Hàng: Mua Quà Tặng Crush
  createSafeSelectHandler('prism_shop_buy_gift', (interaction, client) =>
    handlePrismShopBuyGift(interaction, client),
  ),
];
