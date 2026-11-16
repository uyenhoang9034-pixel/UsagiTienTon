import { SlashCommandBuilder, ChannelType, MessageFlags, PermissionFlagsBits } from 'discord.js';
import {
  getSparkConfig, updateSparkConfig, getSparkProfiles, getSparkMatches,
  createSparkMatch, isSparkAdmin, cancelSparkMatchByAdmin, getSparkHistory, setSparkAdminNote,
} from '../../services/sparkMatchingService.js';

export default {
  data: new SlashCommandBuilder()
    .setName('spark-admin')
    .setDescription('Quản trị hệ thống SPARK MATCHING')
    .addSubcommand((sub) => sub
      .setName('setup')
      .setDescription('Cấu hình khu vực quản lý hồ sơ và kênh Spark Matching')
      .addChannelOption((o) => o.setName('ho-so-nam').setDescription('Kênh riêng để Cupid gửi hồ sơ nam').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addChannelOption((o) => o.setName('ho-so-nu').setDescription('Kênh riêng để Cupid gửi hồ sơ nữ').addChannelTypes(ChannelType.GuildText).setRequired(true))
      .addChannelOption((o) => o.setName('feedback').setDescription('Kênh nhận feedback').addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addChannelOption((o) => o.setName('thread').setDescription('Kênh cha tạo thread riêng cho từng cặp đôi').addChannelTypes(ChannelType.GuildText).setRequired(false)))
    .addSubcommand((sub) => sub.setName('enable').setDescription('Mở SPARK MATCHING và cho phép đăng ký'))
    .addSubcommand((sub) => sub.setName('disable').setDescription('Tạm dừng đăng ký và ghép đôi'))
    .addSubcommand((sub) => sub.setName('status').setDescription('Xem trạng thái và thống kê SPARK MATCHING'))
    .addSubcommand((sub) => sub.setName('dashboard').setDescription('Mở bảng quản trị SPARK MATCHING'))
    .addSubcommand((sub) => sub
      .setName('note')
      .setDescription('Thêm hoặc cập nhật ghi chú nội bộ cho một lượt ghép đôi')
      .addStringOption((o) => o.setName('match-id').setDescription('Mã lượt ghép đôi').setRequired(true))
      .addStringOption((o) => o.setName('ghi-chu').setDescription('Ghi chú chỉ admin xem được').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('details')
      .setDescription('Xem chi tiết một lượt ghép đôi và hai hồ sơ')
      .addStringOption((o) => o.setName('match-id').setDescription('Mã lượt ghép đôi').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('cancel')
      .setDescription('Admin kết thúc một lượt ghép đôi')
      .addStringOption((o) => o.setName('match-id').setDescription('Mã lượt ghép đôi').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('test')
      .setDescription('Admin tự test ghép đôi với một thành viên cụ thể')
      .addUserOption((o) => o.setName('doi-tuong').setDescription('Thành viên nhận lời mời test').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('match')
      .setDescription('Ghép đôi hai hồ sơ đã được duyệt')
      .addUserOption((o) => o.setName('nguoi-thu-nhat').setDescription('Thành viên thứ nhất').setRequired(true))
      .addUserOption((o) => o.setName('nguoi-thu-hai').setDescription('Thành viên thứ hai').setRequired(true))),
  category: 'Games',
  async execute(interaction) {
    if (!isSparkAdmin(interaction.member)) {
      return interaction.reply({ content: 'Bạn không có quyền quản trị SPARK MATCHING.', flags: MessageFlags.Ephemeral });
    }
    const subcommand = interaction.options.getSubcommand();
    if (subcommand === 'setup') {
      const male = interaction.options.getChannel('ho-so-nam');
      const female = interaction.options.getChannel('ho-so-nu');
      const feedback = interaction.options.getChannel('feedback');
      const thread = interaction.options.getChannel('thread');
      const publicVisible = [male, female].filter((channel) =>
        channel.permissionsFor(interaction.guild.roles.everyone)?.has(PermissionFlagsBits.ViewChannel)
      );
      const config = await updateSparkConfig(interaction.guildId, {
        maleReviewChannelId: male.id,
        femaleReviewChannelId: female.id,
        feedbackChannelId: feedback?.id || '1571930215632867479',
        threadParentChannelId: thread?.id || '1571931107002417386',
      });
      return interaction.reply({
        content: [
          'Đã lưu cấu hình SPARK MATCHING.',
          '• Hồ sơ nam: <#' + config.maleReviewChannelId + '>',
          '• Hồ sơ nữ: <#' + config.femaleReviewChannelId + '>',
          '• Feedback: <#' + config.feedbackChannelId + '>',
          '• Thread riêng: <#' + config.threadParentChannelId + '>',
          'Tính năng vẫn đang tắt cho đến khi bạn dùng /spark-admin enable.',
          ...(publicVisible.length ? ['⚠️ Cảnh báo: ' + publicVisible.map((channel) => '#' + channel.name).join(', ') + ' vẫn cho @everyone xem được. Hãy khóa quyền xem hai kênh hồ sơ để bảo vệ thông tin riêng tư.'] : ['Đã kiểm tra: @everyone không có quyền xem hai kênh hồ sơ.']),
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
      });
    }
    if (subcommand === 'enable') {
      const config = await getSparkConfig(interaction.guildId);
      if (!config.maleReviewChannelId || !config.femaleReviewChannelId) {
        return interaction.reply({ content: 'Bạn cần chạy /spark-admin setup và chọn kênh hồ sơ nam/nữ trước.', flags: MessageFlags.Ephemeral });
      }
      await updateSparkConfig(interaction.guildId, { enabled: true, registrationEnabled: true });
      return interaction.reply({ content: 'SPARK MATCHING đã được bật. Thành viên có thể dùng /spark để đăng ký.', flags: MessageFlags.Ephemeral });
    }
    if (subcommand === 'disable') {
      await updateSparkConfig(interaction.guildId, { enabled: false, registrationEnabled: false });
      return interaction.reply({ content: 'Đã tạm dừng SPARK MATCHING. Hồ sơ và các cặp đôi đang hoạt động vẫn được lưu lại.', flags: MessageFlags.Ephemeral });
    }
    if (subcommand === 'dashboard') {
      const [config, profiles, matches] = await Promise.all([
        getSparkConfig(interaction.guildId),
        getSparkProfiles(interaction.guildId),
        getSparkMatches(interaction.guildId),
      ]);
      const { buildSparkAdminDashboardPayload } = await import('../../services/sparkMatchingUI.js');
      return interaction.reply(buildSparkAdminDashboardPayload({ config, profiles, matches }));
    }

    if (subcommand === 'status') {
      const [config, profiles, matches] = await Promise.all([
        getSparkConfig(interaction.guildId), getSparkProfiles(interaction.guildId), getSparkMatches(interaction.guildId),
      ]);
      const pending = profiles.filter((p) => p.status === 'pending').length;
      const approved = profiles.filter((p) => p.status === 'approved').length;
      const active = matches.filter((m) => m.status !== 'closed').length;
      return interaction.reply({
        content: [
          '**SPARK MATCHING · TRẠNG THÁI HỆ THỐNG**',
          '• Hệ thống: ' + (config.enabled ? 'Đang bật' : 'Đang tắt'),
          '• Đăng ký: ' + (config.registrationEnabled ? 'Đang mở' : 'Đang đóng'),
          '• Hồ sơ chờ duyệt: ' + pending,
          '• Hồ sơ đã duyệt: ' + approved,
          '• Cặp đôi chưa đóng: ' + active,
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
      });
    }
    if (subcommand === 'note') {
      const matchId = interaction.options.getString('match-id');
      const note = interaction.options.getString('ghi-chu');
      const result = await setSparkAdminNote(interaction.guildId, matchId, interaction.user.id, note);
      return interaction.reply({
        content: result.ok ? 'Đã lưu ghi chú nội bộ cho ' + matchId + '.' : 'Không tìm thấy lượt ghép đôi này.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'details') {
      const matchId = interaction.options.getString('match-id');
      const [matches, profiles, history] = await Promise.all([
        getSparkMatches(interaction.guildId),
        getSparkProfiles(interaction.guildId),
        getSparkHistory(interaction.guildId),
      ]);
      const match = matches.find((item) => item.matchId === matchId) || history.find((item) => item.matchId === matchId);
      if (!match) return interaction.reply({ content: 'Không tìm thấy lượt ghép đôi này.', flags: MessageFlags.Ephemeral });
      const a = match.profileSnapshots?.userA || profiles.find((item) => item.userId === match.userAId);
      const b = match.profileSnapshots?.userB || profiles.find((item) => item.userId === match.userBId);
      const profileSummary = (profile) => profile
        ? '**' + profile.usernameAtSubmission + '** · ' + (profile.data?.age || '?') + ' tuổi · ' + (profile.data?.gender || 'Chưa rõ') + ' · ' + (profile.data?.area || 'Chưa rõ khu vực') + '\n' + (profile.data?.about || 'Không có phần giới thiệu')
        : 'Không có hồ sơ (có thể là yêu cầu cụ thể hoặc lượt test).';
      return interaction.reply({
        content: [
          '**CHI TIẾT LƯỢT SPARK MATCHING · ' + match.matchId + '**',
          '• Trạng thái: ' + match.status,
          '• Loại ghép đôi: ' + (match.matchType || 'admin') + (match.test ? ' · TEST' : ''),
          '• Bắt đầu: <t:' + Math.floor(match.createdAt / 1000) + ':F>',
          '• Hết hạn ẩn danh: ' + (match.anonymousExpiresAt ? '<t:' + Math.floor(match.anonymousExpiresAt / 1000) + ':F>' : '—'),
          '• Thread: ' + (match.threadId ? '<#' + match.threadId + '>' : 'Chưa tạo'),
          '• Feedback: ' + (match.feedbackBy?.length || 0) + ' người đã gửi',
          '',
          '**HỒ SƠ THÀNH VIÊN A · <@' + match.userAId + '>**',
          profileSummary(a),
          '',
          '**HỒ SƠ THÀNH VIÊN B · <@' + match.userBId + '>**',
          profileSummary(b),
          '',
          '**GHI CHÚ ADMIN:** ' + (match.adminNotes || 'Chưa có ghi chú.'),
        ].join('\n'),
        flags: MessageFlags.Ephemeral,
      });
    }

    if (subcommand === 'cancel') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const matchId = interaction.options.getString('match-id');
      const result = await cancelSparkMatchByAdmin(interaction.guild, matchId, interaction.user.id);
      if (!result.ok) {
        return interaction.editReply(result.code === 'ALREADY_FEEDBACK_PENDING'
          ? 'Lượt này đã ở trạng thái chờ feedback và không thể hủy theo cách này.'
          : 'Không tìm thấy lượt ghép đôi đang hoạt động.');
      }
      return interaction.editReply(result.feedbackPending
        ? 'Đã kết thúc lượt ghép đôi. Thread được khóa và đang chờ ít nhất một người gửi feedback.'
        : 'Đã kết thúc lượt ghép đôi và thông báo cho hai thành viên.');
    }

    if (subcommand === 'test') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const target = interaction.options.getUser('doi-tuong');
      const result = await createSparkMatch(interaction.guild, interaction.user.id, target.id, {
        matchType: 'admin_test',
        test: true,
      });
      if (!result.ok) {
        const messages = {
          SAME_USER: 'Bạn không thể test với chính mình.',
          USER_BUSY: 'Bạn hoặc thành viên được chọn đang có lượt ghép đôi chưa kết thúc.',
          MEMBER_NOT_FOUND: 'Không tìm thấy thành viên trong máy chủ.',
          DM_UNAVAILABLE: 'Cupid không thể gửi DM đến một trong hai tài khoản. Hãy kiểm tra cài đặt nhận tin nhắn riêng.',
        };
        return interaction.editReply(messages[result.code] || 'Không thể tạo lượt test.');
      }
      return interaction.editReply('Đã tạo lượt test ' + result.match.matchId + '. Người được chọn vẫn phải tự đồng ý lời mời; dữ liệu test được đánh dấu riêng và không yêu cầu hồ sơ đã duyệt.');
    }

    if (subcommand === 'match') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const a = interaction.options.getUser('nguoi-thu-nhat');
      const b = interaction.options.getUser('nguoi-thu-hai');
      const result = await createSparkMatch(interaction.guild, a.id, b.id);
      if (!result.ok) {
        const messages = {
          SAME_USER: 'Bạn không thể ghép một người với chính họ.',
          PROFILE_NOT_APPROVED: 'Cả hai thành viên cần có hồ sơ đã được duyệt.',
          USER_BUSY: 'Một trong hai thành viên đang có hồ sơ hoặc lượt ghép đôi chưa kết thúc.',
          MEMBER_NOT_FOUND: 'Không tìm thấy một trong hai thành viên trong máy chủ.',
        };
        return interaction.editReply(messages[result.code] || 'Không thể tạo lượt ghép đôi.');
      }
      return interaction.editReply('Cupid đã gửi lời mời ghép đôi ' + result.match.matchId + ' đến cả hai thành viên.');
    }
  },
};
