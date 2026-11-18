import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle, MessageFlags, StringSelectMenuBuilder,
} from 'discord.js';
import {
  beginSparkRegistration, reviewSparkProfile, closeSparkMatchAfterFeedback,
  respondSparkInvite, submitSparkRevealVote, submitSparkConnectionVote,
  endSparkAnonymousChat, getSparkMatches, submitSparkProfile, createSparkMatch,
  getSparkProfiles, getSparkProfile, getSparkRegistrationSession, getSparkHistory, getSparkConfig, isSparkAdmin,
  getSparkAdminMatchSelection, updateSparkAdminMatchSelection,
} from '../../services/sparkMatchingService.js';
import {
  getSparkBoardPosts,
  saveSparkBoardPosts,
  getSparkBoardSubmissions,
  getSparkBoardDraft,
  clearSparkBoardDraft,
  approveSparkBoardSubmission,
  requestSparkBoardConnection,
  respondSparkBoardConnection,
  deleteSparkBoardPost,
} from '../../services/sparkBoardService.js';


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

function basicRegistrationModal(existingData = null) {
  const d = existingData || {};
  return new ModalBuilder().setCustomId('spark_register_basic').setTitle('SPARK MATCHING · HỒ SƠ 1/2')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('age').setLabel('Bạn hiện bao nhiêu tuổi?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(3).setValue(d.age ? String(d.age).slice(0, 3) : '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('gender').setLabel('Giới tính của bạn?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(80).setValue(d.gender ? String(d.gender).slice(0, 80) : '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('matchGender').setLabel('Bạn muốn tìm Sparkmate giới tính nào?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100).setValue(d.matchGender ? String(d.matchGender).slice(0, 100) : '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('area').setLabel('Khu vực bạn đang sinh sống?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100).setValue(d.area ? String(d.area).slice(0, 100) : '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('intention').setLabel('Bạn mong muốn điều gì ở kết nối này?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(500).setValue(d.intention ? String(d.intention).slice(0, 500) : '')),
    );
}

function aboutRegistrationModal(existingData = null) {
  const d = existingData || {};
  return new ModalBuilder().setCustomId('spark_register_about').setTitle('SPARK MATCHING · HỒ SƠ 2/2')
    .addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('about').setLabel('Giới thiệu về bản thân (tối đa 150 từ)').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000).setValue(d.about ? String(d.about).slice(0, 1000) : '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('hobbies').setLabel('Bạn thích làm gì khi rảnh?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(600).setValue(d.hobbies ? String(d.hobbies).slice(0, 600) : '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('relationshipHappy').setLabel('Điều gì khiến bạn vui trong một mối quan hệ?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(600).setValue(d.relationshipHappy ? String(d.relationshipHappy).slice(0, 600) : '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('traits').setLabel('Tính cách Sparkmate bạn mong muốn?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(600).setValue(d.traits ? String(d.traits).slice(0, 600) : '')),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('ageRange').setLabel('Độ tuổi Sparkmate mong muốn?').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(100).setValue(d.ageRange ? String(d.ageRange).slice(0, 100) : '')),
    );
}

function sparkBoardStep1Modal() {
  return new ModalBuilder()
    .setCustomId('spark_board_modal_step1')
    .setTitle('HỒ SƠ SPARKMATE (BƯỚC 1/2)')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('alias')
          .setLabel('Biệt danh ẩn danh')
          .setPlaceholder('Ví dụ: Mây Trắng, Gió Thu, Cà Phê Sữa...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('age')
          .setLabel('Tuổi / Năm sinh cụ thể (điền chính xác)')
          .setPlaceholder('Ví dụ: 22 tuổi (2004) - Vui lòng nhập số chính xác')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('gender')
          .setLabel('Giới tính của bạn')
          .setPlaceholder('Ví dụ: Nam / Nữ / Phi nhị nguyên...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('seeking')
          .setLabel('Đối tượng đang tìm kiếm')
          .setPlaceholder('Ví dụ: Tìm Nam / Tìm Nữ / Không phân biệt...')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(50),
      ),
    );
}

function sparkBoardStep2Modal(draft = {}) {
  return new ModalBuilder()
    .setCustomId('spark_board_modal_step2')
    .setTitle('HỒ SƠ SPARKMATE (BƯỚC 2/2)')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('about')
          .setLabel('Đôi nét về bản thân')
          .setPlaceholder('Tính cách, sở thích, công việc/học tập hoặc thói quen thường ngày...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
          .setValue(draft.about || ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('relationship')
          .setLabel('Điều trân trọng trong một mối quan hệ')
          .setPlaceholder('Ví dụ: Sự chân thành, biết lắng nghe, tôn trọng không gian riêng...')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
          .setValue(draft.relationship || ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ideal')
          .setLabel('Hình mẫu Sparkmate lý tưởng của bạn')
          .setPlaceholder('Một người có tính cách hay năng lượng như thế nào sẽ khiến bạn muốn mở lòng?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(1000)
          .setValue(draft.ideal || ''),
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('message')
          .setLabel('Lời nhắn gửi / Câu hỏi mở (Tùy chọn)')
          .setPlaceholder('Ví dụ: "Bài hát nào đang lặp lại trong playlist của bạn dạo này?"')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
          .setValue(draft.message || ''),
      ),
    );
}

function parseProfileFromMessage(message, profileIdFallback) {
  const texts = [];
  if (message?.content) texts.push(message.content);
  function collect(components) {
    if (!Array.isArray(components)) return;
    for (const c of components) {
      if (c.content) texts.push(c.content);
      if (c.data?.content) texts.push(c.data.content);
      if (c.text) texts.push(c.text);
      if (c.data?.text) texts.push(c.data.text);
      if (Array.isArray(c.components)) collect(c.components);
    }
  }
  collect(message?.components);

  if (Array.isArray(message?.embeds)) {
    for (const e of message.embeds) {
      if (e.title) texts.push(e.title);
      if (e.description) texts.push(e.description);
      if (Array.isArray(e.fields)) {
        for (const f of e.fields) {
          texts.push(`${f.name}: ${f.value}`);
        }
      }
    }
  }

  const fullText = texts.join('\n');

  const userId = fullText.match(/\*\*Discord ID:\*\*\s*(\d+)/i)?.[1]
    || fullText.match(/Discord ID:\s*(\d+)/i)?.[1]
    || fullText.match(/ID:\s*(\d{17,20})/i)?.[1]
    || fullText.match(/<@!?(\d+)>/)?.[1];
  if (!userId) return null;

  const profileId = fullText.match(/\*\*Mã hồ sơ:\*\*\s*([A-Za-z0-9_#-]+)/i)?.[1]
    || fullText.match(/Mã\s*(?:hồ sơ)?:\s*([A-Za-z0-9_#-]+)/i)?.[1]
    || profileIdFallback
    || `SP-${Date.now().toString(36).toUpperCase()}`;

  const username = fullText.match(/\*\*Tên lúc đăng ký:\*\*\s*([^\n]+)/i)?.[1]?.trim()
    || fullText.match(/Tên lúc đăng ký:\s*([^\n]+)/i)?.[1]?.trim()
    || fullText.match(/Người gửi:\s*([^\n]+)/i)?.[1]?.trim()
    || '';

  const age = fullText.match(/\*\*Tuổi:\*\*\s*([^\n]+)/i)?.[1]?.trim()
    || fullText.match(/Tuổi(?:\s*\/\s*Năm sinh)?:\s*([^\n]+)/i)?.[1]?.trim()
    || '';

  const gender = fullText.match(/\*\*Giới tính:\*\*\s*([^\n]+)/i)?.[1]?.trim()
    || fullText.match(/Giới tính:\s*([^\n]+)/i)?.[1]?.trim()
    || '';

  const orientation = fullText.match(/\*\*Xu hướng tính dục[^\n:]*:\*\*\s*([^\n]+)/i)?.[1]?.trim() || '';
  const matchGender = fullText.match(/\*\*Mong muốn ghép đôi:\*\*\s*([^\n]+)/i)?.[1]?.trim()
    || fullText.match(/Tìm kiếm:\s*([^\n]+)/i)?.[1]?.trim()
    || '';

  const area = fullText.match(/\*\*Khu vực:\*\*\s*([^\n]+)/i)?.[1]?.trim() || '';
  const intention = fullText.match(/\*\*Mục đích:\*\*\s*([^\n]+)/i)?.[1]?.trim() || '';

  const about = fullText.match(/\*\*Giới thiệu:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*Sở thích:\*\*)/i)?.[1]?.trim()
    || fullText.match(/Đôi nét về bản thân:\s*\n([\s\S]*?)(?=\n\n|\n[•\*\!])/i)?.[1]?.trim()
    || '';
  const hobbies = fullText.match(/\*\*Sở thích:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*Điều khiến bạn vui)/i)?.[1]?.trim() || '';
  const relationshipHappy = fullText.match(/\*\*Điều khiến bạn vui[^\n:]*:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*Tính cách Sparkmate)/i)?.[1]?.trim()
    || fullText.match(/Điều trân trọng trong một mối quan hệ:\s*\n([\s\S]*?)(?=\n\n|\n[•\*\!])/i)?.[1]?.trim()
    || '';
  const traits = fullText.match(/\*\*Tính cách Sparkmate[^\n:]*:\*\*\s*\n([\s\S]*?)(?=\n\n\*\*Độ tuổi mong muốn)/i)?.[1]?.trim()
    || fullText.match(/Hình mẫu Sparkmate lý tưởng:\s*\n([\s\S]*?)(?=\n\n|\n[•\*\!])/i)?.[1]?.trim()
    || '';
  const ageRange = fullText.match(/\*\*Độ tuổi mong muốn:\*\*\s*([^\n]+)/i)?.[1]?.trim() || '';
  const otherRequirements = fullText.match(/\*\*Yêu cầu khác:\*\*\s*([^\n]+)/i)?.[1]?.trim() || '';
  const requestedUserId = fullText.match(/\*\*Người muốn ghép đôi cụ thể:\*\*\s*([^\n]+)/i)?.[1]?.trim() || '';

  return {
    profileId,
    userId,
    usernameAtSubmission: username,
    data: {
      age,
      gender,
      orientation,
      matchGender,
      area,
      intention,
      about,
      hobbies,
      relationshipHappy,
      traits,
      ageRange,
      otherRequirements: otherRequirements === 'Không có' ? '' : otherRequirements,
      requestedUserId: requestedUserId === 'Không có' ? '' : requestedUserId,
    },
    status: 'pending',
    submittedAt: Date.now(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    matchId: null,
  };
}

export default [
  {
    name: 'spark_register_start',
    async execute(interaction) {
      const result = await beginSparkRegistration(interaction.guild, interaction.member);
      if (!result.ok) {
        const messages = {
          REGISTRATION_DISABLED: 'Cupid hiện chưa mở đăng ký Spark Matching.',
          PROFILE_PENDING: 'Bạn đang có một hồ sơ đang chờ Cupid xét duyệt rồi nha! Hãy theo dõi thông báo qua DM nhé.',
          ACTIVE_MATCH: 'Bạn đang có một lượt ghép đôi chưa kết thúc.',
          REAPPLY_BLOCKED: 'Theo quyết định của đội ngũ quản trị, bạn tạm thời không thể đăng ký lại Spark Matching.',
          ROLE_NOT_FOUND: 'Không tìm thấy role Spark Matching. Cupid vui lòng báo admin kiểm tra cấu hình role nhé.',
        };
        return replyError(interaction, messages[result.code] || 'Không thể bắt đầu đăng ký.');
      }
      const existingProfile = await getSparkProfile(interaction.guildId, interaction.user.id);
      return interaction.showModal(basicRegistrationModal(existingProfile?.data));
    },
  },
  {
    name: 'spark_register_continue',
    async execute(interaction) {
      const session = await getSparkRegistrationSession(interaction.guildId, interaction.user.id);
      const existingProfile = await getSparkProfile(interaction.guildId, interaction.user.id);
      const initialData = { ...(existingProfile?.data || {}), ...(session?.data || {}) };
      return interaction.showModal(aboutRegistrationModal(initialData));
    },
  },
  {
    name: 'spark_profile_approve',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền duyệt hồ sơ Spark Matching.');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const profileId = args[0];
      const recoveredProfile = parseProfileFromMessage(interaction.message, profileId);
      const result = await reviewSparkProfile(interaction.guild, profileId, interaction.user.id, 'approve', '', { recoveredProfile });
      if (!result.ok) return interaction.editReply({ content: 'Hồ sơ này không còn ở trạng thái chờ duyệt.' }).catch(() => {});

      const targetMention = result.profile?.userId ? `<@${result.profile.userId}>` : profileId;
      if (result.alreadyApproved) {
        return interaction.editReply({
          content: `✅ Hồ sơ của ${targetMention} đã được duyệt và đang sẵn sàng ghép đôi trong hệ thống rồi nhé!`,
        }).catch(() => {});
      }
      return interaction.editReply({
        content: `✅ Đã duyệt ${result.recovered ? '(và khôi phục thành công) ' : ''}hồ sơ ${profileId} của ${targetMention}!`,
      }).catch(() => {});
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
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const matchId = args?.[0] || null;
      const guild = interaction.guild || (interaction.guildId ? await client.guilds.fetch(interaction.guildId).catch(() => null) : null);
      if (!guild) {
        return interaction.editReply({ content: 'Không tìm thấy thông tin máy chủ.' }).catch(() => {});
      }
      const result = await closeSparkMatchAfterFeedback(
        guild,
        matchId,
        interaction.user.id,
        interaction.channelId,
        interaction.member,
      );
      const messages = {
        FEEDBACK_REQUIRED: SPARK_FEEDBACK_REQUIRED,
        NOT_PARTICIPANT: 'Chỉ hai thành viên trong cặp đôi hoặc Admin mới có thể xóa thread này.',
        NOT_WAITING_FEEDBACK: 'Lượt ghép đôi này hiện không ở trạng thái chờ xóa.',
        MATCH_NOT_FOUND: 'Không tìm thấy dữ liệu lượt ghép đôi của thread này.',
      };
      if (!result.ok && result.code === 'FEEDBACK_REQUIRED') {
        return interaction.editReply({ content: SPARK_FEEDBACK_REQUIRED }).catch(() => {});
      }
      if (!result.ok) {
        return interaction.editReply({ content: messages[result.code] || 'Không thể xóa thread.' }).catch(() => {});
      }
      return interaction.editReply({
        content: result.alreadyClosed
          ? 'Thread này đã được xóa hoàn tất rồi nhé!'
          : 'Cupid đã tiếp nhận yêu cầu và đang xóa thread. Cảm ơn hai bạn đã tham gia Spark Matching!',
      }).catch(() => {});
    },
  },

  {
    name: 'spark_invite_accept',
    async execute(interaction, client) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return interaction.editReply({ content: 'Không tìm thấy lượt ghép đôi này.' }).catch(() => {});
      const result = await respondSparkInvite(guild, matchId, interaction.user.id, true);
      if (!result.ok) {
        return interaction.editReply({ content: result.code === 'INVITE_NOT_READY' ? 'Cupid vẫn đang chuẩn bị lời mời. Bạn thử nhấn lại sau một chút nhé!' : 'Lời mời này đã hết hạn hoặc không còn hợp lệ.' }).catch(() => {});
      }
      return interaction.editReply({ content: result.started ? 'Cả hai đã đồng ý! Cupid đã mở cuộc trò chuyện ẩn danh qua DM.' : 'Cupid đã ghi nhận câu trả lời. Đang chờ Sparkmate phản hồi nhé!' }).catch(() => {});
    },
  },
  {
    name: 'spark_invite_decline',
    async execute(interaction, client) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return interaction.editReply({ content: 'Không tìm thấy lượt ghép đôi này.' }).catch(() => {});
      const result = await respondSparkInvite(guild, matchId, interaction.user.id, false);
      if (!result.ok) {
        return interaction.editReply({ content: result.code === 'INVITE_NOT_READY' ? 'Cupid vẫn đang chuẩn bị lời mời. Bạn thử nhấn lại sau một chút nhé!' : 'Lời mời này đã hết hạn hoặc không còn hợp lệ.' }).catch(() => {});
      }
      return interaction.editReply({ content: 'Cupid đã ghi nhận lời từ chối. Cảm ơn bạn đã phản hồi nhé!' }).catch(() => {});
    },
  },
  {
    name: 'spark_reveal_yes',
    async execute(interaction, client) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return interaction.editReply({ content: 'Không tìm thấy lượt ghép đôi này.' }).catch(() => {});
      const result = await submitSparkRevealVote(guild, matchId, interaction.user.id, true);
      if (!result.ok) return interaction.editReply({ content: 'Yêu cầu công khai danh tính không còn hợp lệ.' }).catch(() => {});
      return interaction.editReply({ content: result.thread ? 'Cả hai đã đồng ý! Cupid đã tạo thread riêng cho hai bạn.' : 'Cupid đã ghi nhận lựa chọn của bạn và đang chờ Sparkmate.' }).catch(() => {});
    },
  },
  {
    name: 'spark_reveal_no',
    async execute(interaction, client) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const matchId = interaction.customId.split(':')[1];
      const guild = await resolveGuildForMatch(client, matchId);
      if (!guild) return interaction.editReply({ content: 'Không tìm thấy lượt ghép đôi này.' }).catch(() => {});
      const result = await submitSparkRevealVote(guild, matchId, interaction.user.id, false);
      if (!result.ok) return interaction.editReply({ content: 'Yêu cầu này không còn hợp lệ.' }).catch(() => {});
      return interaction.editReply({ content: 'Cupid đã ghi nhận lựa chọn của bạn.' }).catch(() => {});
    },
  },
  {
    name: 'spark_connection_yes',
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const result = await submitSparkConnectionVote(interaction.guild, interaction.customId.split(':')[1], interaction.user.id, true);
      if (!result.ok) return interaction.editReply({ content: 'Lượt xác nhận kết nối không còn hợp lệ.' }).catch(() => {});
      return interaction.editReply({ content: result.connected ? 'Cả hai đã đồng ý kết nối! Cupid đã gửi thông báo cuối cùng.' : 'Cupid đã ghi nhận lựa chọn của bạn và đang chờ Sparkmate.' }).catch(() => {});
    },
  },
  {
    name: 'spark_connection_no',
    async execute(interaction) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const result = await submitSparkConnectionVote(interaction.guild, interaction.customId.split(':')[1], interaction.user.id, false);
      if (!result.ok) return interaction.editReply({ content: 'Lượt xác nhận kết nối không còn hợp lệ.' }).catch(() => {});
      return interaction.editReply({ content: 'Cupid đã ghi nhận lựa chọn của bạn và gửi thông báo kết thúc.' }).catch(() => {});
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
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('orientation').setLabel('Xu hướng tính dục / bản dạng giới (tùy chọn)').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(150),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('requestedUserId').setLabel('Discord User ID người bạn muốn ghép đôi').setStyle(TextInputStyle.Short).setRequired(false).setMaxLength(25),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('otherRequirements').setLabel('Yêu cầu khác (tùy chọn)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500),
          ),
        );
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
      const approved = await reviewSparkProfile(interaction.guild, profileId, interaction.user.id, 'approve', '', { skipFeed: true });
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

      const components = [];
      if (matches.length > 0) {
        const options = matches.slice(0, 25).map((m) => ({
          label: `Hủy lượt ${m.matchId}`.slice(0, 100),
          value: m.matchId,
          description: `Trạng thái: ${m.status}${m.test ? ' · TEST' : ''}`.slice(0, 100),
        }));
        components.push(new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('spark_admin_cancel_match_select')
            .setPlaceholder('Chọn một cặp đôi để hủy / kết thúc ngay')
            .addOptions(options)
        ));
      }

      return interaction.reply({
        content: '**CẶP ĐÔI ĐANG HOẠT ĐỘNG**\n' + body + (matches.length ? '\n\n💡 *Bạn có thể chọn một cặp đôi trong menu bên dưới để hủy ngay và giải phóng hồ sơ cho hai thành viên:*' : ''),
        components,
        flags: MessageFlags.Ephemeral,
      });
    },
  },
  {
    name: 'spark_admin_all_profiles',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền xem khu vực quản trị.');
      const { isMaleGender, isFemaleGender } = await import('../../services/sparkMatchingService.js');
      const [profiles, matches] = await Promise.all([
        getSparkProfiles(interaction.guildId),
        getSparkMatches(interaction.guildId),
      ]);
      const activeMatches = matches.filter((m) => m.status !== 'closed');
      const activeUserMap = new Map();
      for (const m of activeMatches) {
        if (m.userAId) activeUserMap.set(String(m.userAId), m.matchId);
        if (m.userBId) activeUserMap.set(String(m.userBId));
      }

      if (profiles.length === 0) {
        return interaction.reply({
          content: 'Hiện chưa có hồ sơ nào trong hệ thống.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const lines = profiles.map((p) => {
        const isMale = isMaleGender(p.data?.gender);
        const genderLabel = isMale ? 'Nam' : (isFemaleGender(p.data?.gender) ? 'Nữ' : (p.data?.gender || 'Chưa rõ'));
        const busyMatchId = activeUserMap.get(String(p.userId));
        const statusLabel = busyMatchId
          ? `🔴 Đang ghép (${busyMatchId})`
          : p.status === 'approved'
            ? '🟢 Sẵn sàng'
            : p.status === 'pending'
              ? '🟡 Chờ duyệt'
              : '⚪ Đã từ chối';
        return `• <@${p.userId}> (\`${p.usernameAtSubmission || p.userId}\`) · **Giới tính: ${genderLabel}** (${p.data?.age || '?'}t) · ${statusLabel}`;
      });

      return interaction.reply({
        content: `**DANH SÁCH TẤT CẢ HỒ SƠ (${profiles.length} hồ sơ)**\n\n${lines.join('\n')}\n\n💡 *Nếu bạn nào bị nhầm giới tính, chị có thể đổi lại bằng lệnh:*\n\`/spark-admin set-gender thanh-vien:@user gioi-tinh:Nam\``,
        flags: MessageFlags.Ephemeral,
      });
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
      const components = [];
      const hasTests = history.some((item) => item.test === true || item.matchType === 'admin_test');
      if (hasTests) {
        components.push(new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('spark_admin_clear_test_history').setLabel('Dọn Lịch Sử Test').setStyle(ButtonStyle.Danger)
        ));
      }
      return interaction.reply({
        content: '**LỊCH SỬ SPARK MATCHING**\n' + body + '\n\n💡 *Dùng lệnh `/spark-admin clear-history` để xóa thủ công theo mã hoặc dọn các lượt không thành công.*',
        components,
        flags: MessageFlags.Ephemeral,
      });
    },
  },
  {
    name: 'spark_admin_clear_test_history',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền quản trị Spark Matching.');
      await interaction.deferUpdate().catch(() => {});
      const { deleteSparkHistory } = await import('../../services/sparkMatchingService.js');
      const result = await deleteSparkHistory(interaction.guildId, { scope: 'test_only' });
      return interaction.editReply({
        content: `Đã dọn dẹp thành công **${result.deletedCount || 0}** lượt test khỏi lịch sử và bộ nhớ Spark Matching!\n\n💡 *Dùng lệnh \`/spark-admin clear-history\` để lọc xóa thêm các lượt thất bại khác.*`,
        components: [],
      });
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
      const { syncSparkProfileStatuses } = await import('../../services/sparkMatchingService.js');
      const [profiles, matches] = await Promise.all([
        syncSparkProfileStatuses(interaction.guildId),
        getSparkMatches(interaction.guildId),
      ]);
      const selection = await getSparkAdminMatchSelection(interaction.guildId, interaction.user.id);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.reply(buildSparkAdminMatchPickerPayload(profiles, selection, matches));
    },
  },


  {
    name: 'spark_admin_mode',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const mode = args[0] || 'hetero';
      const { syncSparkProfileStatuses } = await import('../../services/sparkMatchingService.js');
      const selection = await updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, {
        mode,
        userAId: null,
        userBId: null,
        maleId: null,
        femaleId: null,
        pageA: 0,
        pageB: 0,
        malePage: 0,
        femalePage: 0,
      });
      const [profiles, matches] = await Promise.all([
        syncSparkProfileStatuses(interaction.guildId),
        getSparkMatches(interaction.guildId),
      ]);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.update(buildSparkAdminMatchPickerPayload(profiles, selection, matches));
    },
  },
  {
    name: 'spark_admin_page_a',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const page = Math.max(0, Number(args[0]) || 0);
      const { syncSparkProfileStatuses } = await import('../../services/sparkMatchingService.js');
      const [profiles, matches, selection] = await Promise.all([
        syncSparkProfileStatuses(interaction.guildId),
        getSparkMatches(interaction.guildId),
        updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, { pageA: page, malePage: page }),
      ]);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.update(buildSparkAdminMatchPickerPayload(profiles, selection, matches));
    },
  },
  {
    name: 'spark_admin_page_b',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const page = Math.max(0, Number(args[0]) || 0);
      const { syncSparkProfileStatuses } = await import('../../services/sparkMatchingService.js');
      const [profiles, matches, selection] = await Promise.all([
        syncSparkProfileStatuses(interaction.guildId),
        getSparkMatches(interaction.guildId),
        updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, { pageB: page, femalePage: page }),
      ]);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.update(buildSparkAdminMatchPickerPayload(profiles, selection, matches));
    },
  },
  {
    name: 'spark_admin_male_page',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const page = Math.max(0, Number(args[0]) || 0);
      const { syncSparkProfileStatuses } = await import('../../services/sparkMatchingService.js');
      const [profiles, matches, selection] = await Promise.all([
        syncSparkProfileStatuses(interaction.guildId),
        getSparkMatches(interaction.guildId),
        updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, { pageA: page, malePage: page }),
      ]);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.update(buildSparkAdminMatchPickerPayload(profiles, selection, matches));
    },
  },
  {
    name: 'spark_admin_female_page',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const page = Math.max(0, Number(args[0]) || 0);
      const { syncSparkProfileStatuses } = await import('../../services/sparkMatchingService.js');
      const [profiles, matches, selection] = await Promise.all([
        syncSparkProfileStatuses(interaction.guildId),
        getSparkMatches(interaction.guildId),
        updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, { pageB: page, femalePage: page }),
      ]);
      const { buildSparkAdminMatchPickerPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.update(buildSparkAdminMatchPickerPayload(profiles, selection, matches));
    },
  },
  {
    name: 'spark_admin_match_confirm',
    async execute(interaction) {
      if (!isSparkAdmin(interaction.member)) return replyError(interaction, 'Bạn không có quyền ghép đôi.');
      const selection = await getSparkAdminMatchSelection(interaction.guildId, interaction.user.id);
      const mode = selection.mode || 'hetero';
      const userAId = mode === 'hetero' ? (selection.userAId || selection.maleId) : selection.userAId;
      const userBId = mode === 'hetero' ? (selection.userBId || selection.femaleId) : selection.userBId;

      if (!userAId || !userBId || String(userAId) === String(userBId)) {
        return replyError(interaction, 'Bạn cần chọn đủ hai thành viên khác nhau để ghép đôi.');
      }

      await interaction.deferUpdate().catch(() => {});

      const result = await createSparkMatch(interaction.guild, userAId, userBId, { matchType: 'spark_guide' });
      const { buildSparkAdminMatchSuccessPayload, buildSparkAdminMatchErrorPayload } = await import('../../services/sparkMatchingUI.js');

      if (!result.ok) {
        const errorMsg = result.code === 'DM_UNAVAILABLE'
            ? 'Cupid chưa thể gửi lời mời qua DM vì có thành viên khóa tin nhắn riêng.'
            : 'Không thể tạo lượt ghép đôi từ hai hồ sơ này.';
        return interaction.editReply(buildSparkAdminMatchErrorPayload(errorMsg)).catch(() => {});
      }

      await updateSparkAdminMatchSelection(interaction.guildId, interaction.user.id, {
        userAId: null,
        userBId: null,
        maleId: null,
        femaleId: null,
      });
      return interaction.editReply(buildSparkAdminMatchSuccessPayload(result.match.matchId)).catch(() => {});
    },
  },

  // --- SPARK BOARD BUTTONS ---
  {
    name: 'spark_board_register',
    async execute(interaction) {
      const guildId = interaction.guildId;
      const posts = await getSparkBoardPosts(guildId);
      const activePost = posts.find((p) => String(p.userId) === String(interaction.user.id) && p.status === 'active');
      if (activePost) {
        // Kiểm tra xem thread diễn đàn của bài viết có thực sự còn tồn tại trên server không
        const forumThread = activePost.threadId
          ? await interaction.guild.channels.fetch(activePost.threadId).catch(() => null)
          : null;
        if (!forumThread) {
          activePost.status = 'deleted';
          activePost.deletedAt = Date.now();
          activePost.deletedReason = 'thread_not_found';
          await saveSparkBoardPosts(guildId, posts);
        } else {
          return interaction.reply({
            content: '<a:bang2:1546891483250954290> Bạn đã có một hồ sơ đang hiển thị trên Spark Board rồi nè! Bạn có thể quản lý hoặc gỡ bài cũ trước khi tạo hồ sơ mới nhé.',
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      const submissions = await getSparkBoardSubmissions(guildId);
      const pending = submissions.find((s) => String(s.userId) === String(interaction.user.id) && s.status === 'pending');
      if (pending) {
        return interaction.reply({
          content: '<a:bang2:1546891483250954290> Bạn đang có một hồ sơ đang chờ Cupid xét duyệt rồi nha! Hãy theo dõi thông báo qua DM nhé.',
          flags: MessageFlags.Ephemeral,
        });
      }

      // Xóa draft cũ nếu có để người dùng nhập mới
      await clearSparkBoardDraft(guildId, interaction.user.id).catch(() => {});

      return interaction.showModal(sparkBoardStep1Modal());
    },
  },
  {
    name: 'spark_board_step2',
    async execute(interaction) {
      const draft = await getSparkBoardDraft(interaction.guildId, interaction.user.id);
      return interaction.showModal(sparkBoardStep2Modal(draft || {}));
    },
  },
  {
    name: 'spark_board_approve',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) {
        return replyError(interaction, 'Bạn không có quyền duyệt hồ sơ Spark Board.');
      }
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const submissionId = args?.[0];
      const result = await approveSparkBoardSubmission(interaction.guild, submissionId, interaction.user);
      if (!result.ok) {
        return interaction.editReply({ content: `Không thể duyệt hồ sơ: ${result.code}` }).catch(() => {});
      }

      try {
        const { buildSparkBoardReviewPayload } = await import('../../services/sparkBoardUI.js');
        const member = await interaction.guild.members.fetch(result.submission.userId).catch(() => null);
        const updatedPayload = buildSparkBoardReviewPayload(result.submission, member, `Đã duyệt bởi Cupid • ${interaction.user.tag}`);
        await interaction.message.edit(updatedPayload).catch(() => {});
      } catch (err) {}

      return interaction.editReply({
        content: `✅ Đã duyệt và đăng tải hồ sơ #${result.post.code} lên Spark Board thành công: <#${result.thread.id}>!`,
      }).catch(() => {});
    },
  },
  {
    name: 'spark_board_reject',
    async execute(interaction, client, args) {
      if (!isSparkAdmin(interaction.member)) {
        return replyError(interaction, 'Bạn không có quyền từ chối hồ sơ Spark Board.');
      }
      const submissionId = args?.[0];
      const modal = new ModalBuilder()
        .setCustomId(`spark_board_modal_reject:${submissionId}`)
        .setTitle('TỪ CHỐI HỒ SƠ SPARKMATE')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('reason')
              .setLabel('Lý do từ chối hồ sơ')
              .setPlaceholder('Ví dụ: Thông tin năm sinh chưa rõ ràng / Nội dung giới thiệu quá ngắn...')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(500),
          ),
        );
      return interaction.showModal(modal);
    },
  },
  {
    name: 'spark_board_comment',
    async execute(interaction, client, args) {
      const postId = args?.[0];
      const modal = new ModalBuilder()
        .setCustomId(`spark_board_modal_comment:${postId}`)
        .setTitle('GỬI BÌNH LUẬN ẨN DANH')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('alias')
              .setLabel('Biệt danh hiển thị của bạn (Tùy chọn)')
              .setPlaceholder('Ví dụ: Mèo Lười, Người qua đường, Cà Phê Đá...')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(50),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('content')
              .setLabel('Nội dung lời nhắn / bình luận')
              .setPlaceholder('Nhập đôi dòng chia sẻ hoặc cảm nghĩ gửi tới chủ nhân hồ sơ...')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(1000),
          ),
        );
      return interaction.showModal(modal);
    },
  },
  {
    name: 'spark_board_connect',
    async execute(interaction, client, args) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const postId = args?.[0];
      const result = await requestSparkBoardConnection(interaction.guild, postId, interaction.member);
      if (!result.ok) {
        const errorMessages = {
          CANNOT_CONNECT_SELF: 'Bạn không thể tự kết nối với chính hồ sơ của mình nha!',
          ALREADY_REQUESTED: 'Bạn đã gửi tín hiệu kết nối đến hồ sơ này rồi, hãy kiên nhẫn chờ phản hồi qua DM nhé!',
          ALREADY_ACTIVE_MATCH: 'Bạn và chủ nhân hồ sơ hiện đang có một không gian trò chuyện riêng tư đang mở rồi nhé!',
          POST_NOT_FOUND: 'Không tìm thấy hồ sơ Spark Board này.',
          OWNER_NOT_FOUND: 'Cupid không tìm thấy chủ nhân của hồ sơ.',
        };
        return interaction.editReply({ content: errorMessages[result.code] || 'Không thể gửi yêu cầu kết nối.' }).catch(() => {});
      }
      return interaction.editReply({
        content: 'Cupid đã gửi tín hiệu kết nối đến chủ nhân hồ sơ qua DM! Vui lòng kiên nhẫn chờ phản hồi nhé.',
      }).catch(() => {});
    },
  },
  {
    name: 'spark_board_conn_yes',
    async execute(interaction, client, args) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const connectionId = args?.[0];
      const guild = await resolveGuildForMatch(client, connectionId) || client.guilds.cache.get('1541279801183178754') || client.guilds.cache.first();
      if (!guild) return interaction.editReply({ content: 'Không tìm thấy máy chủ.' }).catch(() => {});

      const result = await respondSparkBoardConnection(guild, connectionId, interaction.user.id, true);
      if (!result.ok) {
        return interaction.editReply({ content: 'Yêu cầu kết nối này không còn hiệu lực hoặc đã được xử lý.' }).catch(() => {});
      }

      const threadUrl = `https://discord.com/channels/${guild.id}/${result.thread.id}`;
      const linkRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Đến Thread').setStyle(ButtonStyle.Link).setURL(threadUrl),
      );

      await interaction.editReply({
        content: `Cupid đã tạo thread riêng tư (72 giờ) cho hai bạn! Hãy bấm nút bên dưới để tham gia trò chuyện nhé.`,
        components: [linkRow],
      }).catch(() => {});

      try {
        await interaction.message.edit({ components: [] }).catch(() => {});
      } catch {}
    },
  },
  {
    name: 'spark_board_conn_no',
    async execute(interaction, client, args) {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral }).catch(() => {});
      const connectionId = args?.[0];
      const guild = await resolveGuildForMatch(client, connectionId) || client.guilds.cache.get('1541279801183178754') || client.guilds.cache.first();
      if (!guild) return interaction.editReply({ content: 'Không tìm thấy máy chủ.' }).catch(() => {});

      const result = await respondSparkBoardConnection(guild, connectionId, interaction.user.id, false);
      if (!result.ok) {
        return interaction.editReply({ content: 'Yêu cầu kết nối này không còn hiệu lực hoặc đã được xử lý.' }).catch(() => {});
      }

      await interaction.editReply({
        content: 'Cupid đã ghi nhận lựa chọn của bạn và gửi lời từ chối nhẹ nhàng đến đối phương.',
      }).catch(() => {});

      try {
        await interaction.message.edit({ components: [] }).catch(() => {});
      } catch {}
    },
  },
  {
    name: 'spark_board_edit',
    async execute(interaction, client, args) {
      const postId = args?.[0];
      const posts = await getSparkBoardPosts(interaction.guildId);
      const post = posts.find((p) => p.id === String(postId));
      if (!post) {
        return interaction.reply({ content: 'Không tìm thấy hồ sơ Spark Board.', flags: MessageFlags.Ephemeral });
      }

      const isAdmin = isSparkAdmin(interaction.member);
      if (String(post.userId) !== String(interaction.user.id) && !isAdmin) {
        return interaction.reply({
          content: '<a:bang2:1546891483250954290> Bạn không phải chủ nhân của bài viết này nên không thể chỉnh sửa nha!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`spark_board_modal_edit:${postId}`)
        .setTitle('CHỈNH SỬA HỒ SƠ SPARKMATE')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('alias')
              .setLabel('Biệt danh ẩn danh')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
              .setMaxLength(50)
              .setValue(post.alias || ''),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('about')
              .setLabel('Đôi nét về bản thân')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(1000)
              .setValue(post.about || ''),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('relationship')
              .setLabel('Điều trân trọng trong một mối quan hệ')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(1000)
              .setValue(post.relationship || ''),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('ideal')
              .setLabel('Hình mẫu Sparkmate lý tưởng')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(1000)
              .setValue(post.ideal || ''),
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('message')
              .setLabel('Lời nhắn gửi / Câu hỏi mở')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(false)
              .setMaxLength(500)
              .setValue(post.message || ''),
          ),
        );
      return interaction.showModal(modal);
    },
  },
  {
    name: 'spark_board_delete',
    async execute(interaction, client, args) {
      const postId = args?.[0];
      const posts = await getSparkBoardPosts(interaction.guildId);
      const post = posts.find((p) => p.id === String(postId));
      if (!post) {
        return interaction.reply({ content: 'Không tìm thấy hồ sơ Spark Board.', flags: MessageFlags.Ephemeral });
      }

      const isAdmin = isSparkAdmin(interaction.member);
      if (String(post.userId) !== String(interaction.user.id) && !isAdmin) {
        return interaction.reply({
          content: '<a:bang2:1546891483250954290> Chỉ chủ nhân của bài đăng mới có thể gỡ bài viết này nha!',
          flags: MessageFlags.Ephemeral,
        });
      }

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`spark_board_confirm_del:${postId}`)
          .setLabel('Xác Nhận Gỡ Bài')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('spark_board_cancel_del')
          .setLabel('Hủy')
          .setStyle(ButtonStyle.Secondary),
      );

      return interaction.reply({
        content: '<a:bang2:1546891483250954290> Bạn có chắc chắn muốn gỡ bài viết này khỏi Spark Board không? Thao tác này sẽ đóng và gỡ bài viết trên diễn đàn.',
        components: [row],
        flags: MessageFlags.Ephemeral,
      });
    },
  },
  {
    name: 'spark_board_confirm_del',
    async execute(interaction, client, args) {
      await interaction.deferUpdate().catch(() => {});
      const postId = args?.[0];
      const result = await deleteSparkBoardPost(interaction.guild, postId, interaction.user.id);
      if (!result.ok) {
        return interaction.editReply({ content: 'Không thể gỡ bài viết.', components: [] }).catch(() => {});
      }
      return interaction.editReply({
        content: '✅ Cupid đã gỡ bài đăng khỏi Spark Board thành công! Bạn có thể bấm nút **Gửi Hồ Sơ Ẩn Danh** trên bảng tin để đăng hồ sơ mới bất cứ lúc nào nhé.',
        components: [],
      }).catch(() => {});
    },
  },
  {
    name: 'spark_board_cancel_del',
    async execute(interaction) {
      return interaction.update({ content: 'Đã hủy thao tác gỡ bài.', components: [] });
    },
  },

];

const SPARK_FEEDBACK_REQUIRED = '<a:bang2:1546891483250954290> Bạn ơi quên feedback cho bé Cupid rồi kìaaa huhu... Feedback giùm bé nha rồi mới xóa thread được nè!!!!';
