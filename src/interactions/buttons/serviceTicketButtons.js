import {
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  MAX_OPEN_SERVICE_TICKETS_PER_USER,
  SERVICE_BUY_MODAL_PROMPT,
  SERVICE_SUPPORT_MODAL_PROMPT,
} from '../../config/serviceTicketConfig.js';
import {
  buildServiceTosPayloadsV2,
  countOpenServiceTicketsForUser,
  deleteServiceTicket,
  getServiceTicketRecord,
  IS_COMPONENTS_V2,
  isServiceTicketChannel,
  isServiceTicketStaff,
} from '../../services/serviceTicketService.js';
import { logger } from '../../utils/logger.js';

export default [
  // 1. Nút Điều Khoản Dịch Vụ (màu xám, không emoji) -> Gửi 3 card TOS dạng Ephemeral
  {
    name: 'st_tos',
    async execute(interaction) {
      try {
        const payloads = buildServiceTosPayloadsV2();
        await interaction.reply({
          ...payloads[0],
          flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
        });

        for (let i = 1; i < payloads.length; i += 1) {
          await interaction.followUp({
            ...payloads[i],
            flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
          });
        }
      } catch (err) {
        logger.error('[ServiceTicketButtons] Lỗi mở Điều Khoản Dịch Vụ:', err);
        if (!interaction.replied && !interaction.deferred) {
          await interaction
            .reply({
              content: '❌ Không thể hiển thị Điều khoản dịch vụ lúc này. Vui lòng thử lại sau.',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
      }
    },
  },

  // 2. Nút Mua Hàng -> Kiểm tra giới hạn 2 ticket & mở Modal chọn keyword dịch vụ
  {
    name: 'st_open_buy',
    async execute(interaction, client) {
      try {
        if (!interaction.guild) {
          return interaction.reply({
            content: '❌ Vui lòng thực hiện thao tác này trong server!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const openCount = await countOpenServiceTicketsForUser(
          client,
          interaction.guild,
          interaction.user.id,
        );
        if (openCount >= MAX_OPEN_SERVICE_TICKETS_PER_USER) {
          return interaction.reply({
            content: `❌ Bạn đang mở **${openCount}/${MAX_OPEN_SERVICE_TICKETS_PER_USER}** ticket dịch vụ rồi ạ! Vui lòng hoàn tất hoặc đóng bớt ticket cũ trước khi mở thêm nhé.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('st_modal_buy')
          .setTitle('Mở Ticket Mua Hàng / Dịch Vụ')
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(SERVICE_BUY_MODAL_PROMPT),
          )
          .addLabelComponents(
            new LabelBuilder()
              .setLabel('Từ khóa & nội dung dịch vụ')
              .setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId('service_input')
                  .setStyle(TextInputStyle.Paragraph)
                  .setPlaceholder('Ví dụ: chinese (hoặc: codebot - cần làm bot thông báo)')
                  .setRequired(true)
                  .setMaxLength(500),
              ),
          );

        await interaction.showModal(modal);
      } catch (err) {
        logger.error('[ServiceTicketButtons] Lỗi mở modal Mua Hàng:', err);
      }
    },
  },

  // 3. Nút Hỗ Trợ -> Kiểm tra giới hạn 2 ticket & mở Modal nhập vấn đề cần hỗ trợ
  {
    name: 'st_open_support',
    async execute(interaction, client) {
      try {
        if (!interaction.guild) {
          return interaction.reply({
            content: '❌ Vui lòng thực hiện thao tác này trong server!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const openCount = await countOpenServiceTicketsForUser(
          client,
          interaction.guild,
          interaction.user.id,
        );
        if (openCount >= MAX_OPEN_SERVICE_TICKETS_PER_USER) {
          return interaction.reply({
            content: `❌ Bạn đang mở **${openCount}/${MAX_OPEN_SERVICE_TICKETS_PER_USER}** ticket dịch vụ rồi ạ! Vui lòng hoàn tất hoặc đóng bớt ticket cũ trước khi mở thêm nhé.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('st_modal_support')
          .setTitle('Mở Ticket Hỗ Trợ')
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(SERVICE_SUPPORT_MODAL_PROMPT),
          )
          .addLabelComponents(
            new LabelBuilder()
              .setLabel('Vấn đề cần hỗ trợ')
              .setTextInputComponent(
                new TextInputBuilder()
                  .setCustomId('support_input')
                  .setStyle(TextInputStyle.Paragraph)
                  .setPlaceholder('Nhập câu hỏi, yêu cầu bảo hành hoặc vấn đề bạn đang gặp phải...')
                  .setRequired(true)
                  .setMaxLength(1000),
              ),
          );

        await interaction.showModal(modal);
      } catch (err) {
        logger.error('[ServiceTicketButtons] Lỗi mở modal Hỗ Trợ:', err);
      }
    },
  },

  // 4. Nút Xóa ticket (st_delete:feedback hoặc st_delete:close)
  {
    name: 'st_delete',
    async execute(interaction, client, args) {
      try {
        if (!interaction.guild || !interaction.channel) {
          return interaction.reply({
            content: '❌ Không xác định được kênh ticket!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const ticket = await getServiceTicketRecord(
          client,
          interaction.guild.id,
          interaction.channel.id,
        );

        if (!isServiceTicketChannel(interaction.channel, ticket)) {
          return interaction.reply({
            content: '❌ Nút này chỉ sử dụng bên trong kênh ticket dịch vụ!',
            flags: MessageFlags.Ephemeral,
          });
        }

        const mode = args?.[0] || (ticket?.status === 'feedback_received' ? 'feedback' : 'close');
        const isStaff = isServiceTicketStaff(interaction.member, interaction.user.id, client);
        const isCreator = ticket?.userId && String(ticket.userId) === String(interaction.user.id);

        if (mode === 'feedback') {
          if (!isStaff && !isCreator) {
            return interaction.reply({
              content: '❌ Chỉ chủ ticket hoặc `@SP Ticket` mới có quyền xóa ticket này!',
              flags: MessageFlags.Ephemeral,
            });
          }
        } else if (!isStaff) {
          return interaction.reply({
            content: '❌ Chỉ `@SP Ticket` hoặc Admin mới có quyền xóa ticket đã đóng!',
            flags: MessageFlags.Ephemeral,
          });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});

        const sendDmTranscript = mode === 'feedback' || ticket?.status === 'feedback_received';

        await interaction
          .editReply({
            content: sendDmTranscript
              ? '🗑️ Đang gửi bản lưu Transcript vào DM của bạn, lưu log Admin và xóa kênh ticket trong giây lát...'
              : '🗑️ Đang lưu Transcript vào kênh log Admin và xóa kênh ticket trong giây lát...',
          })
          .catch(() => {});

        await deleteServiceTicket({
          channel: interaction.channel,
          executor: interaction.user,
          client,
          sendDmTranscript,
          reason: sendDmTranscript
            ? 'Khách hàng xóa ticket sau khi gửi feedback'
            : 'Xóa ticket đã đóng (không phát sinh đơn hàng)',
        });
      } catch (err) {
        logger.error('[ServiceTicketButtons] Lỗi nút st_delete:', err);
        if (interaction.deferred && !interaction.replied) {
          await interaction
            .editReply({ content: '❌ Đã xảy ra lỗi khi xóa ticket.' })
            .catch(() => {});
        } else if (!interaction.replied) {
          await interaction
            .reply({
              content: '❌ Đã xảy ra lỗi khi xóa ticket.',
              flags: MessageFlags.Ephemeral,
            })
            .catch(() => {});
        }
      }
    },
  },
];
