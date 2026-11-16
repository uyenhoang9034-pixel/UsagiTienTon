import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import {
  saveSparkRegistrationStep, submitSparkProfile, reviewSparkProfile, isSparkAdmin,
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
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('spark_register_submit').setLabel('Gửi Hồ Sơ').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('spark_request_specific').setLabel('Thông Tin Bổ Sung').setStyle(ButtonStyle.Secondary),
      );
      return interaction.reply({
        content: 'Thông tin hồ sơ đã hoàn tất. Bạn có thể gửi hồ sơ ngay hoặc bổ sung xu hướng tính dục, bản dạng giới, yêu cầu riêng hay Discord User ID của người bạn muốn ghép đôi.',
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    },
  },
  {
    name: 'spark_profile_reject',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return interaction.reply({ content: 'Bạn không có quyền duyệt hồ sơ Spark Matching.', flags: MessageFlags.Ephemeral });
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


  {
    name: 'spark_request_specific',
    async execute(interaction) {
      const requestedUserId = interaction.fields.getTextInputValue('requestedUserId').trim();
      const orientation = interaction.fields.getTextInputValue('orientation').trim();
      const otherRequirements = interaction.fields.getTextInputValue('otherRequirements').trim();
      if (requestedUserId && !/^\d{17,20}$/.test(requestedUserId)) {
        return interaction.reply({ content: 'Discord User ID không hợp lệ. Bạn hãy sao chép ID người dùng gồm 17–20 chữ số nhé.', flags: MessageFlags.Ephemeral });
      }
      if (requestedUserId === interaction.user.id) {
        return interaction.reply({ content: 'Bạn không thể yêu cầu ghép đôi với chính mình.', flags: MessageFlags.Ephemeral });
      }
      if (requestedUserId) {
        const target = await interaction.guild.members.fetch(requestedUserId).catch(() => null);
        if (!target) {
          return interaction.reply({ content: 'Cupid chỉ có thể gửi lời mời đến thành viên đang ở trong máy chủ này.', flags: MessageFlags.Ephemeral });
        }
      }
      const session = await saveSparkRegistrationStep(interaction.guildId, interaction.user.id, {
        ...(requestedUserId ? { requestedUserId } : {}),
        ...(orientation ? { orientation } : {}),
        ...(otherRequirements ? { otherRequirements } : {}),
      });
      if (!session) return interaction.reply({ content: 'Phiên đăng ký đã hết hạn. Hãy bắt đầu lại bằng /spark.', flags: MessageFlags.Ephemeral });
      const result = await submitSparkProfile(interaction.guild, interaction.user);
      if (!result.ok) return interaction.reply({ content: 'Cupid chưa thể gửi hồ sơ: ' + result.code, flags: MessageFlags.Ephemeral });
      return interaction.reply({
        content: 'Cupid đã gửi hồ sơ đến khu vực xét duyệt riêng tư. Nếu bạn gửi yêu cầu ghép đôi cụ thể, admin sẽ xem xét và Cupid chỉ gửi lời mời khi yêu cầu được duyệt. Người được chọn vẫn có quyền đồng ý hoặc từ chối nhé!',
        flags: MessageFlags.Ephemeral,
      });
    },
  },


  {
    name: 'spark_profile_reject_retry',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return interaction.reply({ content: 'Bạn không có quyền duyệt hồ sơ Spark Matching.', flags: MessageFlags.Ephemeral });
      const result = await reviewSparkProfile(interaction.guild, args[0], interaction.user.id, 'reject', value(interaction, 'reason'), { reapplyAllowed: true });
      if (!result.ok) return interaction.reply({ content: 'Hồ sơ không còn ở trạng thái chờ duyệt.', flags: MessageFlags.Ephemeral });
      return interaction.reply({ content: 'Đã từ chối hồ sơ và cho phép thành viên chỉnh sửa để đăng ký lại.', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_profile_reject_final',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return interaction.reply({ content: 'Bạn không có quyền duyệt hồ sơ Spark Matching.', flags: MessageFlags.Ephemeral });
      const result = await reviewSparkProfile(interaction.guild, args[0], interaction.user.id, 'reject', value(interaction, 'reason'), { reapplyAllowed: false });
      if (!result.ok) return interaction.reply({ content: 'Hồ sơ không còn ở trạng thái chờ duyệt.', flags: MessageFlags.Ephemeral });
      return interaction.reply({ content: 'Đã từ chối hồ sơ và khóa quyền đăng ký lại Spark Matching.', flags: MessageFlags.Ephemeral });
    },
  },

];
