import { handleCustomerSpendingPage } from "../../services/customerSpendingService.js";
import { logger } from "../../utils/logger.js";

export default [{
  name: "csp_page",
  async execute(interaction, client, args) {
    try {
      await handleCustomerSpendingPage(interaction, client, args);
    } catch (error) {
      logger.error("[CustomerSpending] Pagination error:", error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Không thể tải trang lịch sử lúc này. Vui lòng thử lại.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
}];
