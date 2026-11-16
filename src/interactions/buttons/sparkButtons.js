import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle, MessageFlags,
} from 'discord.js';
import {
  beginSparkRegistration, reviewSparkProfile, closeSparkMatchAfterFeedback,
  respondSparkInvite, submitSparkRevealVote, submitSparkConnectionVote,
  endSparkAnonymousChat, getSparkMatches, submitSparkProfile, createSparkMatch,
} from '../../services/sparkMatchingService.js';


async function resolveGuildForMatch(client, matchId) {
  for (const guild of client.guilds.cache.values()) {
    const matches = await getSparkMatches(guild.id);
    if (matches.some((item) => item.matchId === String(matchId))) return guild;
  }
  return null;
}

function replyError(interaction, content) {
  return interaction.reply({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
}

function basicRegistrationModal() {
  return new ModalBuilder().setCustomId('spark_register_basic').setTitle('SPARK MATCHING · HỒ SƠ 1/2')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('age').setLabel('Bạn hiện bao nhiêu tuổi?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gender').setLabel('Giới tính của bạn?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('matchGender').setLabel('Bạn muốn tìm Sparkmate giới tính nào?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('area').setLabel('Khu vực bạn đang sinh sống?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('intention').setLabel('Bạn mong muốn điều gì ở kết nối này?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500)),
    );
}

function aboutRegistrationModal() {
  return new ModalBuilder().setCustomId('spark_register_about').setTitle('SPARK MATCHING · HỒ SƠ 2/2')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('about').setLabel('Giới thiệu về bản thân (tối đa 150 từ)').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hobbies').setLabel('Bạn thích làm gì khi rảnh?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(600)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('relationshipHappy').setLabel('Điều gì khiến bạn vui trong một mối quan hệ?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(600)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('traits').setLabel('Tính cách Sparkmate bạn mong muốn?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(600)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ageRange').setLabel('Độ tuổi Sparkmate mong muốn?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100)),
    );
}

export default [
  {
    name: 'spark_register_start',
    async execute(interaction) {
      const result = await beginSparkRegistration(interaction.guild, interaction.member);
      if (!result.ok) {
        const messages = {
          REGISTRATION_DISABLED: 'Cupid hiện chưa mở đăng ký Spark Matching.',
          PROFILE_EXISTS: 'Bạn đã có hồ sơ đang chờ duyệt hoặc đã được duyệt rồi.',
          ACTIVE_MATCH: 'Bạn đang có một lượt ghép đôi chưa kết thúc.',
          ROLE_NOT_FOUND: 'Không tìm thấy role Spark Matching. Cupid vui lòng báo admin kiểm tra cấu hình role nhé.',
        };
        return replyError(interaction, messages[result.code] || 'Không thể bắt đầu đăng ký.');
      }
      return interaction.showModal(basicRegistrationModal());
    },
  },
  {
    name: 'spark_register_continue',
    async execute(interaction) {
      return interaction.showModal(aboutRegistrationModal());
    },
  },
  {
    name: 'spark_profile_approve',
    async execute(interaction, client, args) {
      const profileId = args[0];
      const result = await reviewSparkProfile(interaction.guild, profileId, interaction.user.id, 'approve');
      if (!result.ok) return replyError(interaction, 'Hồ sơ này không còn ở trạng thái chờ duyệt.');
      return interaction.reply({ content: 'Đã duyệt hồ sơ ' + profileId + '.', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_profile_reject',
    async execute(interaction, client, args) {
      const modal = new ModalBuilder().setCustomId('spark_profile_reject:' + args[0]).setTitle('TỪ CHỐI HỒ SƠ SPARK')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Lý do từ chối').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500),
        ));
      return interaction.showModal(modal);
    },
  },
  {
    name: 'spark_thread_close',
    async execute(interaction, client, args) {
      const result = await closeSparkMatchAfterFeedback(interaction.guild, args[0], interaction.user.id);
      const messages = {
        FEEDBACK_REQUIRED: SPARK_FEEDBACK_REQUIRED,
        NOT_PARTICIPANT: 'Chỉ hai thành viên trong cặp đôi mới có thể đóng thread này.',
        NOT_WAITING_FEEDBACK: 'Thread này hiện không ở trạng thái chờ đóng.',
      };
      if (!result.ok) return replyError(interaction, messages[result.code] || 'Không thể đóng thread.');
      return interaction.reply({ content: 'Cupid đã đóng thread. Cảm ơn hai bạn đã tham gia Spark Matching!', flags: MessageFlags.Ephemeral });
    },
  },

  {
    name: 'spark_invite_accept',
    async execute(interaction) {
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return replyError(interaction, 'Không tìm thấy lượt ghép đôi này.');
      const result = await respondSparkInvite(guild, matchId, interaction.user.id, true);
      if (!result.ok) return replyError(interaction, 'Lời mời này đã hết hạn hoặc không còn hợp lệ.');
      return interaction.reply({ content: result.started ? 'Cả hai đã đồng ý! Cupid đã mở cuộc trò chuyện ẩn danh qua DM.' : 'Cupid đã ghi nhận câu trả lời. Đang chờ Sparkmate phản hồi nhé!', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_invite_decline',
    async execute(interaction) {
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return replyError(interaction, 'Không tìm thấy lượt ghép đôi này.');
      const result = await respondSparkInvite(guild, matchId, interaction.user.id, false);
      if (!result.ok) return replyError(interaction, 'Lời mời này đã hết hạn hoặc không còn hợp lệ.');
      return interaction.reply({ content: 'Cupid đã ghi nhận lời từ chối. Cảm ơn bạn đã phản hồi nhé!', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_reveal_yes',
    async execute(interaction) {
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return replyError(interaction, 'Không tìm thấy lượt ghép đôi này.');
      const result = await submitSparkRevealVote(guild, matchId, interaction.user.id, true);
      if (!result.ok) return replyError(interaction, 'Yêu cầu công khai danh tính không còn hợp lệ.');
      return interaction.reply({ content: result.thread ? 'Cả hai đã đồng ý! Cupid đã tạo thread riêng cho hai bạn.' : 'Cupid đã ghi nhận lựa chọn của bạn và đang chờ Sparkmate.', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_reveal_no',
    async execute(interaction) {
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return replyError(interaction, 'Không tìm thấy lượt ghép đôi này.');
      const result = await submitSparkRevealVote(guild, matchId, interaction.user.id, false);
      if (!result.ok) return replyError(interaction, 'Yêu cầu này không còn hợp lệ.');
      return interaction.reply({ content: 'Cupid đã ghi nhận lựa chọn của bạn.', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_connection_yes',
    async execute(interaction) {
      const result = await submitSparkConnectionVote(interaction.guild, interaction.customId.split(':')[1], interaction.user.id, true);
      if (!result.ok) return replyError(interaction, 'Lượt xác nhận kết nối không còn hợp lệ.');
      return interaction.reply({ content: result.connected ? 'Cả hai đã đồng ý kết nối! Cupid đã gửi thông báo cuối cùng.' : 'Cupid đã ghi nhận lựa chọn của bạn và đang chờ Sparkmate.', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_connection_no',
    async execute(interaction) {
      const result = await submitSparkConnectionVote(interaction.guild, interaction.customId.split(':')[1], interaction.user.id, false);
      if (!result.ok) return replyError(interaction, 'Lượt xác nhận kết nối không còn hợp lệ.');
      return interaction.reply({ content: 'Cupid đã ghi nhận lựa chọn của bạn và gửi thông báo kết thúc.', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_chat_reply',
    async execute(interaction) {
      const matchId = interaction.customId.split(':')[1];
      const modal = new ModalBuilder().setCustomId('spark_chat_reply:' + matchId).setTitle('GỬI TIN NHẮN')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('message').setLabel('Tin nhắn của bạn').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1800),
        ));
      return interaction.showModal(modal);
    },
  },
  {
    name: 'spark_chat_end',
    async execute(interaction, client) {
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return replyError(interaction, 'Cupid không tìm thấy máy chủ của lượt ghép đôi.');
      const result = await endSparkAnonymousChat(guild, matchId, interaction.user.id);
      if (!result.ok) return replyError(interaction, 'Cuộc trò chuyện này đã kết thúc hoặc không còn hợp lệ.');
      return interaction.reply({ content: 'Cupid đã kết thúc cuộc trò chuyện ẩn danh.', flags: MessageFlags.Ephemeral });
    },
  },


  {
    name: 'spark_register_submit',
    async execute(interaction) {
      const result = await submitSparkProfile(interaction.guild, interaction.user);
      if (!result.ok) return replyError(interaction, 'Cupid chưa thể gửi hồ sơ: ' + result.code);
      return interaction.update({ content: 'Cupid đã gửi hồ sơ của bạn đến khu vực xét duyệt riêng tư. Hãy kiên nhẫn chờ thông báo qua DM nhé! Bạn không thể tạo hồ sơ mới khi hồ sơ hiện tại còn hiệu lực.', components: [] });
    },
  },
  {
    name: 'spark_request_specific',
    async execute(interaction) {
      const modal = new ModalBuilder().setCustomId('spark_request_specific').setTitle('YÊU CẦU GHÉP ĐÔI CỤ THỂ')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('requestedUserId').setLabel('Discord User ID của người đó?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(25),
        ));
      return interaction.showModal(modal);
    },
  },
  {
    name: 'spark_request_approve',
    async execute(interaction, client, args) {
      const profileId = args[0];
      const { getSparkProfiles } = await import('../../services/sparkMatchingService.js');
      const profiles = await getSparkProfiles(interaction.guildId);
      const profile = profiles.find((item) => item.profileId === profileId && item.status === 'pending');
      if (!profile || !profile.data?.requestedUserId) return replyError(interaction, 'Yêu cầu ghép đôi không còn hợp lệ.');
      const approved = await reviewSparkProfile(interaction.guild, profileId, interaction.user.id, 'approve');
      if (!approved.ok) return replyError(interaction, 'Không thể duyệt hồ sơ này.');
      const result = await createSparkMatch(interaction.guild, profile.userId, profile.data.requestedUserId, {
        requested: true,
        matchType: 'specific_request',
      });
      if (!result.ok) {
        const messages = {
          USER_BUSY: 'Hồ sơ đã được duyệt, nhưng người được yêu cầu hiện đang có một lượt Spark Matching khác.',
          MEMBER_NOT_FOUND: 'Hồ sơ đã được duyệt, nhưng không tìm thấy người được yêu cầu trong máy chủ.',
          DM_UNAVAILABLE: 'Hồ sơ đã được duyệt, nhưng Cupid không thể gửi lời mời qua DM. Người được yêu cầu có thể đã tắt DM.',
        };
        return replyError(interaction, messages[result.code] || 'Hồ sơ đã duyệt nhưng chưa thể gửi lời mời.');
      }
      return interaction.reply({ content: 'Đã duyệt yêu cầu cụ thể và gửi lời mời DM đến thành viên được chỉ định. Thành viên đó vẫn cần tự đồng ý.', flags: MessageFlags.Ephemeral });
    },
  },


  {
    name: 'spark_profile_reject_retry',
    async execute(interaction, client, args) {
      const modal = new ModalBuilder().setCustomId('spark_profile_reject_retry:' + args[0]).setTitle('TỪ CHỐI HỒ SƠ')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Lý do từ chối').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500),
        ));
      return interaction.showModal(modal);
    },
  },
  {
    name: 'spark_profile_reject_final',
    async execute(interaction, client, args) {
      const modal = new ModalBuilder().setCustomId('spark_profile_reject_final:' + args[0]).setTitle('TỪ CHỐI HỒ SƠ')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Lý do từ chối').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500),
        ));
      return interaction.showModal(modal);
    },
  },

];

const SPARK_FEEDBACK_REQUIRED = '<:bang2:1546891483250954290> Bạn ơi quên feedback cho bé Cupid rồi kìaaa huhu... Feedback giùm bé nha rồi mới đóng thread được nè!!!!';
