import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder,
  TextInputStyle, MessageFlags,
} from 'discord.js';
import {
  beginSparkRegistration, reviewSparkProfile, closeSparkMatchAfterFeedback,
  respondSparkInvite, submitSparkRevealVote, submitSparkConnectionVote,
  endSparkAnonymousChat,
} from '../../services/sparkMatchingService.js';

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
];

const SPARK_FEEDBACK_REQUIRED = '<a:bang2:1546040703375904801> Bạn ơi quên feedback cho bé Cupid rồi kìaaa huhu... Feedback giùm bé nha rồi mới đóng thread được nè!!!!';
