import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { endSparkMatchFromThread } from '../../services/sparkMatchingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ketthuc')
    .setDescription('Kết thúc sớm hành trình Spark Matching trong thread hiện tại'),
  category: 'Games',
  async execute(interaction) {
    if (!interaction.channel?.isThread?.()) {
      return interaction.reply({ content: 'Lệnh /ketthuc chỉ dùng được bên trong thread Spark Matching.', flags: MessageFlags.Ephemeral });
    }
    const result = await endSparkMatchFromThread(interaction.guild, interaction.channelId, interaction.user.id);
    const messages = {
      MATCH_NOT_FOUND: 'Không tìm thấy lượt Spark Matching đang hoạt động trong thread này.',
      NOT_PARTICIPANT: 'Chỉ hai thành viên của cặp đôi mới có thể kết thúc hành trình.',
      ALREADY_ENDING: 'Cupid đã gửi thông báo kết thúc và đang chờ feedback rồi nè.',
    };
    if (!result.ok) {
      return interaction.reply({ content: messages[result.code] || 'Không thể kết thúc lượt ghép đôi.', flags: MessageFlags.Ephemeral });
    }
    return interaction.reply({ content: 'Cupid đã ghi nhận yêu cầu. Cuộc trò chuyện đã được tạm khóa; hai bạn hãy gửi feedback theo cú pháp `+1 sparked` tại kênh được liên kết nhé!', flags: MessageFlags.Ephemeral });
  },
};
