import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle, MessageFlags,
} from 'discord.js';
import {
  beginSparkRegistration, reviewSparkProfile, closeSparkMatchAfterFeedback,
  respondSparkInvite, submitSparkRevealVote, submitSparkConnectionVote,
  endSparkAnonymousChat, getSparkMatches, submitSparkProfile, createSparkMatch,
  getSparkProfiles, getSparkHistory, getSparkConfig, isSparkAdmin,
  getSparkAdminMatchSelection, updateSparkAdminMatchSelection,
} from '../../services/sparkMatchingService.js';


async function resolveGuildForMatch(client, matchId) {
  for (const guild of client.guilds.cache.values()) {
    const matches = await getSparkMatches(guild.id);
    if (matches.some((item) => item.matchId === String(matchId))) return guild;
  }
  return null;
}

function replyError(interaction, content) {
  if (interaction.deferred || interaction.replied) {
    return interaction.followUp({ content, flags: MessageFlags.Ephemeral }).catch(() => {});
  }
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
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền duyệt hồ sơ Spark Matching.');
      const profileId = args[0];
      const result = await reviewSparkProfile(interaction.guild, profileId, interaction.user.id, 'approve');
      if (!result.ok) return replyError(interaction, 'Hồ sơ này không còn ở trạng thái chờ duyệt.');
      return interaction.reply({ content: 'Đã duyệt hồ sơ ' + profileId + '.', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_profile_reject',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền duyệt hồ sơ Spark Matching.');
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
      if (!result.ok && result.code === 'FEEDBACK_REQUIRED') {
        return interaction.reply({ content: SPARK_FEEDBACK_REQUIRED });
      }
      if (!result.ok) return replyError(interaction, messages[result.code] || 'Không thể đóng thread.');
      return interaction.reply({ content: 'Cupid đã đóng thread. Cảm ơn hai bạn đã tham gia Spark Matching!', flags: MessageFlags.Ephemeral });
    },
  },

  {
    name: 'spark_invite_accept',
    async execute(interaction, client) {
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return replyError(interaction, 'Không tìm thấy lượt ghép đôi này.');
      const result = await respondSparkInvite(guild, matchId, interaction.user.id, true);
      if (!result.ok) return replyError(interaction, result.code === 'INVITE_NOT_READY' ? 'Cupid vẫn đang chuẩn bị lời mời. Bạn thử nhấn lại sau một chút nhé!' : 'Lời mời này đã hết hạn hoặc không còn hợp lệ.');
      return interaction.reply({ content: result.started ? 'Cả hai đã đồng ý! Cupid đã mở cuộc trò chuyện ẩn danh qua DM.' : 'Cupid đã ghi nhận câu trả lời. Đang chờ Sparkmate phản hồi nhé!', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_invite_decline',
    async execute(interaction, client) {
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return replyError(interaction, 'Không tìm thấy lượt ghép đôi này.');
      const result = await respondSparkInvite(guild, matchId, interaction.user.id, false);
      if (!result.ok) return replyError(interaction, result.code === 'INVITE_NOT_READY' ? 'Cupid vẫn đang chuẩn bị lời mời. Bạn thử nhấn lại sau một chút nhé!' : 'Lời mời này đã hết hạn hoặc không còn hợp lệ.');
      return interaction.reply({ content: 'Cupid đã ghi nhận lời từ chối. Cảm ơn bạn đã phản hồi nhé!', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_reveal_yes',
    async execute(interaction, client) {
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
    async execute(interaction, client) {
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const result = await endSparkAnonymousChat(guild, matchId, interaction.user.id);
      if (!result.ok) return interaction.editReply({ content: 'Cuộc trò chuyện này đã kết thúc hoặc không còn hợp lệ.' });
      return interaction.editReply({ content: 'Cupid đã kết thúc cuộc trò chuyện ẩn danh.' });
    },
  },


  {
    name: 'spark_register_submit',
    async execute(interaction) {
      const result = await submitSparkProfile(interaction.guild, interaction.user);
      if (!result.ok) return replyError(interaction, result.code === 'REVIEW_CHANNEL_UNAVAILABLE' ? 'Cupid chưa gửi được hồ sơ vì kênh xét duyệt đang thiếu hoặc bot chưa có quyền gửi tin nhắn. Bạn hãy báo admin kiểm tra cấu hình nhé!' : 'Cupid chưa thể gửi hồ sơ: ' + result.code);
      return interaction.update({ content: 'Cupid đã gửi hồ sơ của bạn đến khu vực xét duyệt riêng tư. Hãy kiên nhẫn chờ thông báo qua DM nhé! Bạn không thể tạo hồ sơ mới khi hồ sơ hiện tại còn hiệu lực.', components: [] });
    },
  },
  {
    name: 'spark_request_specific',
    async execute(interaction) {
      const modal = new ModalBuilder().setCustomId('spark_request_specific').setTitle('THÔNG TIN BỔ SUNG')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('orientation').setLabel('Xu hướng tính dục / bản dạng giới (tùy chọn)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(150),
          new TextInputBuilder().setCustomId('requestedUserId').setLabel('Discord User ID người bạn muốn ghép đôi').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(25),
          new TextInputBuilder().setCustomId('otherRequirements').setLabel('Yêu cầu khác (tùy chọn)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500),
        ));
      return interaction.showModal(modal);
    },
  },
  {
    name: 'spark_request_approve',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền duyệt hồ sơ Spark Matching.');
      const profileId = args[0];
      const { getSparkProfiles } = await import('../../services/sparkMatchingService.js');
      const profiles = await getSparkProfiles(interaction.guildId);
      const profile = profiles.find((item) => item.profileId === profileId && item.status === 'pending');
      if (!profile || !profile.data?.requestedUserId) return replyError(interaction, 'Yêu cầu ghép đôi không còn hợp lệ.');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const approved = await reviewSparkProfile(interaction.guild, profileId, interaction.user.id, 'approve');
      if (!approved.ok) return interaction.editReply({ content: 'Không thể duyệt hồ sơ này.' });
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
        return interaction.editReply({ content: messages[result.code] || 'Hồ sơ đã duyệt nhưng chưa thể gửi lời mời.' });
      }
      return interaction.editReply({ content: 'Đã duyệt yêu cầu cụ thể và gửi lời mời DM đến thành viên được chỉ định. Thành viên đó vẫn cần tự đồng ý.' });
    },
  },


  {
    name: 'spark_profile_reject_retry',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền duyệt hồ sơ Spark Matching.');
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
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền duyệt hồ sơ Spark Matching.');
      const modal = new ModalBuilder().setCustomId('spark_profile_reject_final:' + args[0]).setTitle('TỪ CHỐI HỒ SƠ')
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('reason').setLabel('Lý do từ chối').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500),
        ));
      return interaction.showModal(modal);
    },
  },


  {
    name: 'spark_admin_pending',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền xem khu vực quản trị.');
      const profiles = await getSparkProfiles(interaction.guildId);
      const items = profiles.filter((profile) => profile.status === 'pending').slice(0, 20);
      const body = items.length
        ? items.map((profile) => '• **' + profile.profileId + '** · <@' + profile.userId + '> · ' + (profile.data?.gender || 'Chưa rõ') + ' · ' + (profile.data?.age || '?') + ' tuổi').join('\n')
        : 'Hiện không có hồ sơ nào đang chờ duyệt.';
      return interaction.reply({ content: '**HỒ SƠ CHỜ DUYỆT**\n' + body, flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_admin_requests',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền xem khu vực quản trị.');
      const profiles = await getSparkProfiles(interaction.guildId);
      const items = profiles.filter((profile) => profile.status === 'pending' && profile.data?.requestedUserId).slice(0, 20);
      const body = items.length
        ? items.map((profile) => '• **' + profile.profileId + '** · Người đăng ký: <@' + profile.userId + '> · Người được yêu cầu: <@' + profile.data.requestedUserId + '>').join('\n')
        : 'Hiện không có yêu cầu ghép đôi cụ thể đang chờ duyệt.';
      return interaction.reply({ content: '**YÊU CẦU GHÉP ĐÔI CỤ THỂ**\n' + body + '\n\nAdmin có thể duyệt trực tiếp tại bài hồ sơ trong kênh xét duyệt riêng.', flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_admin_active',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền xem khu vực quản trị.');
      const matches = (await getSparkMatches(interaction.guildId)).filter((match) => match.status !== 'closed').slice(-20).reverse();
      const body = matches.length
        ? matches.map((match) => '• **' + match.matchId + '** · <@' + match.userAId + '> × <@' + match.userBId + '> · ' + match.status + (match.test ? ' · TEST' : '') + (match.threadId ? ' · <#' + match.threadId + '>' : '')).join('\n')
        : 'Không có cặp đôi nào đang hoạt động.';
      return interaction.reply({ content: '**CẶP ĐÔI ĐANG HOẠT ĐỘNG**\n' + body, flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_admin_history',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền xem khu vực quản trị.');
      const history = (await getSparkHistory(interaction.guildId)).slice(-20).reverse();
      const body = history.length
        ? history.map((match) => '• **' + match.matchId + '** · <@' + match.userAId + '> × <@' + match.userBId + '> · ' + (match.matchType || 'admin') + ' · ' + (match.endedReason || 'closed')).join('\n')
        : 'Chưa có lịch sử ghép đôi.';
      return interaction.reply({ content: '**LỊCH SỬ SPARK MATCHING**\n' + body, flags: MessageFlags.Ephemeral });
    },
  },
  {
    name: 'spark_admin_settings',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền xem khu vực quản trị.');
      const config = await getSparkConfig(interaction.guildId);
      return interaction.reply({
        content: [
          '**CÀI ĐẶT SPARK MATCHING**',
          '• Hồ sơ nam: ' + (config.maleReviewChannelId ? '<#' + config.maleReviewChannelId + '>' : 'Chưa cấu hình'),
          '• Hồ sơ nữ: ' + (config.femaleReviewChannelId ? '<#' + config.femaleReviewChannelId + '>' : 'Chưa cấu hình'),
          '• Feedback: <#' + config.feedbackChannelId + '>',
          '• Thread riêng: <#' + config.threadParentChannelId + '>',
          '• Role thành viên: <@&' + config.memberRoleId + '>',
          '• Anonymous: ' + Math.round(config.anonymousChatDurationMs / 3600000) + ' giờ',
          '• Thread: ' + Math.round(config.publicThreadDurationMs / 3600000) + ' giờ',
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
      });
    },
  },
  {
    name: 'spark_admin_match',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const profiles = await getSparkProfiles(interaction.guildId);
      const selection = await getSparkAdminMatchSelection(interaction.guildId, interaction.user.id);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.reply(buildSparkAdminMatchPickerPayload(profiles, selection));
    },
  },


  {
    name: 'spark_admin_male_page',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const page = Math.max(0, Number(args[0]) || 0);
      const selection = await updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, { malePage: page });
      const profiles = await getSparkProfiles(interaction.guildId);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.update(buildSparkAdminMatchPickerPayload(profiles, selection));
    },
  },
  {
    name: 'spark_admin_female_page',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const page = Math.max(0, Number(args[0]) || 0);
      const selection = await updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, { femalePage: page });
      const profiles = await getSparkProfiles(interaction.guildId);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.update(buildSparkAdminMatchPickerPayload(profiles, selection));
    },
  },
  {
    name: 'spark_admin_match_confirm',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const selection = await getSparkAdminMatchSelection(interaction.guildId, interaction.user.id);
      if (!selection.maleId || !selection.femaleId) return replyError(interaction, 'Bạn cần chọn đủ hồ sơ nam và nữ.');

      await interaction.deferUpdate().catch(() => {});

      const result = await createSparkMatch(interaction.guild, selection.maleId, selection.femaleId);
      const { buildSparkAdminMatchSuccessPayload, buildSparkAdminMatchErrorPayload } = await import('../../services/sparkMatchingUI.js');

      if (!result.ok) {
        const errorMsg = result.code === 'USER_BUSY'
          ? 'Một trong hai thành viên đang có lượt ghép đôi khác.'
          : result.code === 'DM_UNAVAILABLE'
            ? 'Cupid chưa thể gửi lời mời qua DM vì có thành viên khóa tin nhắn riêng.'
            : 'Không thể tạo lượt ghép đôi từ hai hồ sơ này.';
        return interaction.editReply(buildSparkAdminMatchErrorPayload(errorMsg)).catch(() => {});
      }

      await updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, { maleId: null, femaleId: null });
      return interaction.editReply(buildSparkAdminMatchSuccessPayload(result.match.matchId)).catch(() => {});
    },
  },

];

const SPARK_FEEDBACK_REQUIRED = '<a:bang2:1546891483250954290> Bạn ơi quên feedback cho bé Cupid rồi kìaaa huhu... Feedback giùm bé nha rồi mới đóng thread được nè!!!!';
