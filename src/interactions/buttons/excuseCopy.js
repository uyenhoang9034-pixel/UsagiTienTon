import { MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';

export default {
  name: 'excuse_copy',

  async execute(interaction, client, args) {
    try {
      const embed = interaction.message?.embeds?.[0];
      const desc = embed?.description || '';

      // Tách bỏ dòng header 'Tone: ...' nếu có, lấy từ đoạn 'Kính gửi...'
      let cleanText = desc;
      const lines = desc.split('\n');
      const startIdx = lines.findIndex((l) =>
        l.trim().toLowerCase().startsWith('kính gửi'),
      );
      if (startIdx !== -1) {
        cleanText = lines.slice(startIdx).join('\n');
      }

      await interaction.reply({
        content:
          `📋 **ĐÃ TRÍCH XUẤT NỘI DUNG ĐƠN XIN NGHỈ:**\n` +
          `\`\`\`text\n${cleanText.trim()}\n\`\`\`\n` +
          `*Bạn có thể bấm giữ tin nhắn trên điện thoại hoặc click biểu tượng copy ở góc phải khung chữ trên máy tính để gửi cho sếp nha!* 🚀`,
        flags: MessageFlags.Ephemeral,
      });

      logger.debug(
        `[ExcuseCopy] ${interaction.user.tag} đã copy nội dung đơn xin nghỉ phép.`,
      );
    } catch (error) {
      logger.error('Error executing excuse_copy button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: '❌ Đã có lỗi xảy ra khi trích xuất đơn xin nghỉ.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  },
};
