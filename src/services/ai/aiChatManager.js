import { AttachmentBuilder, EmbedBuilder } from 'discord.js';
import { AI_CONFIG } from './aiConfig.js';
import { aiHistoryManager } from './aiHistoryManager.js';
import { isImageGenerationRequest, generateAIImage } from './imageService.js';
import { generateAIResponse } from './aiTextService.js';
import { logger } from '../../utils/logger.js';
import { getColor, getCommandPrefix } from '../../config/bot.js';

/**
 * Chia văn bản thành các đoạn nhỏ dưới 1950 ký tự để phù hợp giới hạn Discord
 */
function splitDiscordMessage(text, maxLength = 1950) {
  if (!text || text.length <= maxLength) {
    return [text || ''];
  }

  const chunks = [];
  let currentChunk = '';

  const lines = text.split('\n');

  for (const line of lines) {
    if ((currentChunk + '\n' + line).length > maxLength) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      if (line.length > maxLength) {
        // Nếu 1 dòng đơn lẻ dài hơn maxLength (hiếm gặp), cắt theo câu hoặc ký tự
        let remaining = line;
        while (remaining.length > maxLength) {
          chunks.push(remaining.slice(0, maxLength));
          remaining = remaining.slice(maxLength);
        }
        currentChunk = remaining;
      } else {
        currentChunk = line;
      }
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n${line}` : line;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Xử lý tin nhắn trong kênh AI chuyên dụng
 */
export async function handleAIChatMessage(message, client) {
  if (!message || !message.guild || message.author?.bot) {
    return false;
  }

  const targetChannelId =
    process.env.AI_CHAT_CHANNEL_ID || AI_CONFIG.channelId || '1542899821189267516';

  // Chỉ kích hoạt trong đúng kênh được chỉ định
  if (message.channelId !== targetChannelId) {
    return false;
  }

  const content = String(message.content || '').trim();
  if (!content) {
    return false;
  }

  // Bỏ qua nếu tin nhắn bắt đầu bằng prefix lệnh bot
  const prefix = getCommandPrefix();
  if (prefix && content.startsWith(prefix)) {
    return false;
  }

  // Bật typing indicator liên tục trong quá trình bot suy nghĩ
  let typingInterval = null;
  const startTyping = async () => {
    try {
      await message.channel.sendTyping();
      typingInterval = setInterval(() => {
        message.channel.sendTyping().catch(() => {});
      }, 4000);
    } catch {}
  };

  const stopTyping = () => {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  };

  try {
    await startTyping();

    // 1. KIỂM TRA Ý ĐỊNH THIẾT KẾ / VẼ ẢNH
    if (isImageGenerationRequest(content)) {
      logger.info(`[AI Channel] User ${message.author.tag} requested image design: "${content}"`);

      const imageResult = await generateAIImage(content);

      if (imageResult.success && imageResult.buffer) {
        const attachment = new AttachmentBuilder(imageResult.buffer, {
          name: imageResult.fileName,
        });

        const imageEmbed = new EmbedBuilder()
          .setColor(getColor('primary'))
          .setTitle('🎨 Bức ảnh của bạn đã được thiết kế xong nè!')
          .setDescription(
            `> **Yêu cầu:** ${content}\n\n*Được vẽ và thiết kế bởi Em bot Usagi múp rụp 🐰✨*`,
          )
          .setImage(`attachment://${imageResult.fileName}`)
          .setFooter({
            text: 'Usagi AI Studio • Sáng tạo không giới hạn',
            iconURL: client.user?.displayAvatarURL?.() || null,
          })
          .setTimestamp();

        stopTyping();
        await message.reply({
          embeds: [imageEmbed],
          files: [attachment],
          allowedMentions: { repliedUser: false },
        });

        try {
          await message.react('🎨');
        } catch {}

        return true;
      } else {
        stopTyping();
        await message.reply({
          content:
            'Dạ Usagi gặp chút sự cố khi tải hình ảnh từ máy chủ vẽ tranh, bạn thử miêu tả lại rõ hơn giúp Usagi nhé~ 🐰💦',
          allowedMentions: { repliedUser: false },
        });
        return true;
      }
    }

    // 2. XỬ LÝ CÂU HỎI & TRÒ CHUYỆN AI (TEXT)
    const history = aiHistoryManager.getHistory(message.channelId, message.author.id);

    const aiResult = await generateAIResponse(content, history);
    const replyText = aiResult.text || AI_CONFIG.refusalMessage;

    // Lưu vào bộ nhớ ngữ cảnh hội thoại
    aiHistoryManager.addUserMessage(message.channelId, message.author.id, content);
    aiHistoryManager.addAssistantMessage(message.channelId, message.author.id, replyText);

    // Chia nhỏ tin nhắn nếu dài quá 1950 ký tự
    const chunks = splitDiscordMessage(replyText, AI_CONFIG.discordMaxMessageLength);

    stopTyping();

    // Gửi đoạn đầu tiên bằng reply
    if (chunks.length > 0) {
      await message.reply({
        content: chunks[0],
        allowedMentions: { repliedUser: false },
      });

      // Các đoạn tiếp theo gửi tiếp vào kênh
      for (let i = 1; i < chunks.length; i++) {
        await message.channel.send({
          content: chunks[i],
        });
      }
    }

    try {
      await message.react('🐰');
    } catch {}

    return true;
  } catch (error) {
    stopTyping();
    logger.error('[AI Chat] Error processing message in AI channel:', error);

    try {
      await message.reply({
        content:
          'Dạ Usagi gặp một chút trục trặc khi suy nghĩ câu trả lời rồi, bạn nhắn lại câu khác giúp Usagi nhé~ 🐰💔',
        allowedMentions: { repliedUser: false },
      });
    } catch {}

    return true;
  } finally {
    stopTyping();
  }
}
