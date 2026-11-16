import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import {
  saveSparkRegistrationStep, submitSparkProfile, reviewSparkProfile,
  sendSparkAnonymousReply, getSparkMatches,
} from '../../services/sparkMatchingService.js';

const value = (interaction, id) => interaction.fields.getTextInputValue(id).trim();

export default [
  {
    name: 'spark_register_basic',
    async execute(interaction) {
      const data = {
        age: value(interaction, 'age'),
        gender: value(interaction, 'gender'),
        matchGender: value(interaction, 'matchGender'),
        area: value(interaction, 'area'),
        intention: value(interaction, 'intention'),
      };
      const session = await saveSparkRegistrationStep(interaction.guildId, interaction.user.id, data);
      if (!session) return interaction.reply({ content: 'Phiên đăng ký đã hết hạn. Hãy bắt đầu lại bằng /spark.', flags: MessageFlags.Ephemeral });
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('spark_register_continue').setLabel('Tiếp Tục Điền Hồ Sơ').setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({ content: 'Cupid đã lưu phần thông tin cơ bản. Tiếp tục giới thiệu về bản thân nhé!', components: [row], flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_register_about',
    async execute(interaction) {
      const data = {
        about: value(interaction, 'about'),
        hobbies: value(interaction, 'hobbies'),
        relationshipHappy: value(interaction, 'relationshipHappy'),
        traits: value(interaction, 'traits'),
        ageRange: value(interaction, 'ageRange'),
      };
      const session = await saveSparkRegistrationStep(interaction.guildId, interaction.user.id, data);
      if (!session) return interaction.reply({ content: 'Phiên đăng ký đã hết hạn. Hãy bắt đầu lại bằng /spark.', flags: MessageFlags.Ephemeral });
      const result = await submitSparkProfile(interaction.guild, interaction.user);
      if (!result.ok) {
        return interaction.reply({ content: 'Cupid chưa thể gửi hồ sơ: ' + result.code, flags: MessageFlags.Ephemeral });
      }
      return interaction.reply({
        content: 'Cupid đã gửi hồ sơ của bạn đến khu vực xét duyệt riêng tư. Hãy kiên nhẫn chờ thông báo qua DM nhé! Bạn không thể tạo hồ sơ mới khi hồ sơ hiện tại còn hiệu lực.',
        flags: MessageFlags.Ephemeral,
      });
    },
  },
  {
    name: 'spark_profile_reject',
    async execute(interaction, client, args) {
      const result = await reviewSparkProfile(interaction.guild, args[0], interaction.user.id, 'reject', value(interaction, 'reason'));
      if (!result.ok) return interaction.reply({ content: 'Hồ sơ không còn ở trạng thái chờ duyệt.', flags: MessageFlags.Ephemeral });
      return interaction.reply({ content: 'Đã từ chối hồ sơ ' + args[0] + ' và gửi lý do đến thành viên.', flags: MessageFlags.Ephemeral });
    },
  },

  {
    name: 'spark_chat_reply',
    async execute(interaction, client, args) {
      const matchId = args[0];
      let guildId = null;
      for (const guild of client.guilds.cache.values()) {
        const matches = await getSparkMatches(guild.id);
        if (matches.some((match) => match.matchId === String(matchId))) {
          guildId = guild.id;
          break;
        }
      }
      if (!guildId) return interaction.reply({ content: 'Cupid không tìm thấy cuộc trò chuyện này.', flags: MessageFlags.Ephemeral });
      const result = await sendSparkAnonymousReply(guildId, matchId, interaction.user.id, value(interaction, 'message'), client);
      if (!result.ok) return interaction.reply({ content: 'Cuộc trò chuyện đã kết thúc hoặc không thể gửi tin nhắn.', flags: MessageFlags.Ephemeral });
      return interaction.reply({ content: 'Cupid đã chuyển tin nhắn của bạn đến Sparkmate rồi nè!', flags: MessageFlags.Ephemeral });
    },
  },

];
