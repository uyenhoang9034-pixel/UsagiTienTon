import { MessageFlags } from 'discord.js';
import { SERVICE_TICKET_EMOJIS } from '../../config/serviceTicketConfig.js';
import { createServiceTicketFromModal } from '../../services/serviceTicketService.js';
import { logger } from '../../utils/logger.js';

export default [
  // 1. Submit Modal Mua Hàng
  {
    name: 'st_modal_buy',
    async execute(interaction, client) {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

        const rawInput = interaction.fields.getTextInputValue('service_input') || '';
        const result = await createServiceTicketFromModal(interaction, client, {
          mode: 'buy',
          rawInput,
        });

        if (!result.ok) {
          return interaction
            .editReply({
              content: result.errorMessage || '❌ Không thể tạo ticket lúc này.',
            })
            .catch(() => {});
        }

        return interaction
          .editReply({
            content: `${SERVICE_TICKET_EMOJIS.HEART} Ticket của bạn đã được tạo, vui lòng xem ở ${result.channel}.`,
          })
          .catch(() => {});
      } catch (err) {
        logger.error('[ServiceTicketModals] Lỗi tạo ticket Mua Hàng:', err);
        const errorText = '❌ Đã xảy ra lỗi khi tạo ticket. Vui lòng thử lại sau!';
        if (interaction.deferred) {
          await interaction.editReply({ content: errorText }).catch(() => {});
        } else if (!interaction.replied) {
          await interaction
            .reply({ content: errorText, flags: MessageFlags.Ephemeral })
            .catch(() => {});
        }
      }
    },
  },

  // 2. Submit Modal Hỗ Trợ
  {
    name: 'st_modal_support',
    async execute(interaction, client) {
      try {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

        const rawInput = interaction.fields.getTextInputValue('support_input') || '';
        const result = await createServiceTicketFromModal(interaction, client, {
          mode: 'support',
          rawInput,
        });

        if (!result.ok) {
          return interaction
            .editReply({
              content: result.errorMessage || '❌ Không thể tạo ticket lúc này.',
            })
            .catch(() => {});
        }

        return interaction
          .editReply({
            content: `${SERVICE_TICKET_EMOJIS.HEART} Ticket của bạn đã được tạo, vui lòng xem ở ${result.channel}.`,
          })
          .catch(() => {});
      } catch (err) {
        logger.error('[ServiceTicketModals] Lỗi tạo ticket Hỗ Trợ:', err);
        const errorText = '❌ Đã xảy ra lỗi khi tạo ticket. Vui lòng thử lại sau!';
        if (interaction.deferred) {
          await interaction.editReply({ content: errorText }).catch(() => {});
        } else if (!interaction.replied) {
          await interaction
            .reply({ content: errorText, flags: MessageFlags.Ephemeral })
            .catch(() => {});
        }
      }
    },
  },
];
