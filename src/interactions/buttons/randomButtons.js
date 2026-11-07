import { MessageFlags } from 'discord.js';
import {
  getRandomInteger,
  buildNumberPayloadV2,
  buildChoicePayloadV2,
  getChoiceSession,
  extractChoicesFromMessage,
} from '../../services/randomService.js';
import { logger } from '../../utils/logger.js';

export default [
  {
    name: 'rd_reroll_num',
    async execute(interaction, client, args) {
      try {
        const min = parseInt(args?.[0] || '1', 10);
        const max = parseInt(args?.[1] || '100', 10);
        const originalUserId = args?.[2] || interaction.user.id;

        if (interaction.user.id !== originalUserId) {
          return interaction.reply({
            content: `❌ Chỉ người tạo lượt quay random (<@${originalUserId}>) mới có thể bấm nút này nha!`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const newResult = getRandomInteger(min, max);
        const payload = buildNumberPayloadV2(newResult, min, max, originalUserId);

        await interaction.update(payload);
        logger.debug(
          `[RandomButtons] ${interaction.user.tag} đã quay lại số: ${newResult} (${min} - ${max})`,
        );
      } catch (error) {
        logger.error('Error executing rd_reroll_num button:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: '❌ Đã có lỗi xảy ra khi quay lại số.',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
      }
    },
  },
  {
    name: 'rd_reroll_choice',
    async execute(interaction, client, args) {
      try {
        const sessionId = args?.[0];
        let session = sessionId ? getChoiceSession(sessionId) : null;

        // Fallback: nếu session trong bộ nhớ bị mất (do bot restart), parse lại từ tin nhắn Discord
        if (!session) {
          const fallbackData = extractChoicesFromMessage(interaction.message);
          if (fallbackData) {
            session = fallbackData;
          }
        }

        if (!session || !session.items || session.items.length < 2) {
          return interaction.reply({
            content: '❌ Danh sách lựa chọn đã hết hạn. Chị vui lòng gõ lệnh random mới nha!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const originalUserId = session.userId || interaction.user.id;
        if (interaction.user.id !== originalUserId) {
          return interaction.reply({
            content: `❌ Chỉ người tạo lượt quay random (<@${originalUserId}>) mới có thể bấm nút này nha!`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const chosenIndex = getRandomInteger(0, session.items.length - 1);
        const chosen = session.items[chosenIndex];
        const payload = buildChoicePayloadV2(
          chosen,
          session.items,
          originalUserId,
          sessionId,
        );

        await interaction.update(payload);
        logger.debug(
          `[RandomButtons] ${interaction.user.tag} đã chọn lại mục: "${chosen}"`,
        );
      } catch (error) {
        logger.error('Error executing rd_reroll_choice button:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: '❌ Đã có lỗi xảy ra khi chọn lại mục ngẫu nhiên.',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
      }
    },
  },
];

