import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { SPARK_MATCHING_CONFIG } from '../config/sparkMatchingConfig.js';

const { emojis } = SPARK_MATCHING_CONFIG;

export function buildSparkBoardMainIntroPayload() {
  const embed = new EmbedBuilder()
    .setColor('#f4c2d7')
    .setTitle(`${emojis.trangtrig50} SPARK BOARD — BẢNG TIN TÌM SPARKMATE ${emojis.trangtrig51}`)
    .setDescription([
      'Mỗi người đều có một tần số riêng đang chờ được lắng nghe. Nếu bạn đang tìm kiếm một **Sparkmate thực sự đồng điệu về tâm hồn** — nơi bắt đầu từ những cuộc trò chuyện chân thành và có thể tiến xa hơn thành một mối quan hệ đặc biệt, hãy để lại dấu ấn ẩn danh của mình tại đây.\n',
      `${emojis.heartg8} **Cách thức tham gia:**`,
      '1. Nhấn vào nút `Gửi Hồ Sơ Ẩn Danh` ngay bên dưới.',
      '2. Chia sẻ đôi nét về bản thân, những điều bạn trân trọng và hình mẫu người đồng hành bạn đang tìm kiếm.',
      '3. Chờ đợi Cupid duyệt hồ sơ.',
      `4. Nếu được duyệt, Cupid sẽ đăng tải hồ sơ ẩn danh của bạn lên bảng tin kèm mã số riêng, đồng thời cấp quyền <@&${SPARK_MATCHING_CONFIG.memberRoleId}> để bạn sẵn sàng kết nối.`,
      '5. Mọi bình luận của bạn đều được ẩn danh nếu bạn muốn trao đổi với người theo dõi bảng tin.\n',
      `${emojis.heartg8} **Trong trường hợp là người xem hoặc theo dõi các bài đăng:**`,
      '1. Bạn cảm thấy đồng cảm và muốn kết nối với Sparked vừa đăng tin? Vậy thì chỉ cần trực tiếp bình luận (ẩn danh) để trao đổi, tìm hiểu thêm về nhau.',
      '2. Nếu cảm thấy ngại ngùng? Hãy nhấn vào nút `Kết Nối` để Cupid trực tiếp tạo thread riêng tư cho hai bạn (công khai danh tính). Thời gian trao đổi trực tiếp tại thread riêng tư tối đa 72 giờ.\n',
      `${emojis.trangtrig30} **Nguyên tắc bảng tin:**`,
      '- An toàn & Riêng tư: Danh tính tài khoản Discord của bạn luôn được giữ bí mật hoàn toàn cho đến khi thực sự muốn công khai. Đồng thời hệ thống Admin tuyệt đối không xâm nhập vào thread riêng tư của cả hai khi chưa có sự đồng ý hoặc cho phép!',
      '- Chân thành & Văn minh: Tôn trọng cảm xúc của nhau, tuyệt đối không đùa cợt thiếu nghiêm túc, dùng từ ngữ phản cảm hay giả mạo thông tin.',
      '- Chủ động quản lý: Mỗi thành viên được giữ 01 hồ sơ hiển thị tại một thời điểm và có thể tự cập nhật hoặc gỡ bài bất cứ lúc nào.\n',
      `${emojis.trangtrig49} **Hỗ trợ & Góp ý:**`,
      'Nếu cần hỗ trợ trong quá trình tạo hồ sơ hoặc có ý tưởng giúp không gian kết nối trọn vẹn hơn, hãy tạo ticket hoặc dm thẳng <@872792190651334707>. Xin cảm ơn!',
    ].join('\n'))
    .setFooter({ text: 'Spark Ecosystem • Tìm một tần số đồng điệu' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('spark_board_register')
      .setLabel('Gửi Hồ Sơ Ẩn Danh')
      .setEmoji(emojis.trangtrig30)
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

export function buildSparkBoardReviewPayload(submission, member) {
  const joinedTime = member?.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
    : 'Không rõ';

  const embed = new EmbedBuilder()
    .setColor('#f39c12')
    .setTitle(`${emojis.trangtrig49} **YÊU CẦU DUYỆT HỒ SƠ SPARKMATE — MÃ #${submission.code}**`)
    .setDescription([
      `• Người gửi: <@${submission.userId}> (${member?.user?.tag || submission.username || 'Unknown'} • ID: ${submission.userId})`,
      `• Ngày tham gia server: ${joinedTime} (Giúp Cupid lọc nhanh tài khoản clone mới lập)\n`,
      `${emojis.trangtrig30} Thông tin cơ bản:`,
      `• Biệt danh: ${submission.alias}`,
      `• Tuổi / Năm sinh: ${submission.age}`,
      `• Giới tính: ${submission.gender}`,
      `• Tìm kiếm: ${submission.seeking}\n`,
      `${emojis.trangtrig30} Đôi nét về bản thân:`,
      `${submission.about}\n`,
      `${emojis.trangtrig30} Điều trân trọng trong một mối quan hệ:`,
      `${submission.relationship}\n`,
      `${emojis.trangtrig30} Hình mẫu Sparkmate lý tưởng:`,
      `${submission.ideal}\n`,
      `${emojis.trangtrig49} Lời nhắn gửi / Câu hỏi mở:`,
      `"${submission.message || 'Không có'}"`,
    ].join('\n'))
    .setFooter({ text: 'Trạng thái: ⏳ Đang chờ Cupid xét duyệt' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spark_board_approve:${submission.id}`)
      .setLabel('Duyệt & Đăng Bảng Tin')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`spark_board_reject:${submission.id}`)
      .setLabel('Từ Chối (Kèm Lý Do)')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

export function buildSparkBoardPostPayload(post) {
  const embed = new EmbedBuilder()
    .setColor('#e8a2be')
    .setTitle(`${emojis.trangtrig50} **HỒ SƠ SPARKMATE #${post.code} — ${post.alias}** ${emojis.trangtrig51}`)
    .setDescription([
      'Một tần số mới vừa được Cupid gửi lên bảng tin. Hãy lắng nghe và kết nối nếu bạn tìm thấy sự đồng điệu tại đây.\n',
      `${emojis.trangtrig33} Thông tin cơ bản:`,
      `• Biệt danh: ${post.alias}`,
      `• Tuổi / Năm sinh: ${post.age}`,
      `• Giới tính: ${post.gender}`,
      `• Tìm kiếm: ${post.seeking}\n`,
      `${emojis.trangtrig33} Đôi nét về bản thân:`,
      `> ${post.about}\n`,
      `${emojis.trangtrig33} Điều trân trọng trong một mối quan hệ:`,
      `> ${post.relationship}\n`,
      `${emojis.trangtrig33} Hình mẫu Sparkmate lý tưởng:`,
      `> ${post.ideal}\n`,
      `${emojis.trangtrig30} Lời nhắn gửi / Câu hỏi mở:`,
      `> "${post.message || '...'}"\n`,
      'Bạn có thể bình luận ẩn danh ngay bên dưới bài viết này để trò chuyện cùng chủ nhân hồ sơ, hoặc nhấn nút Kết Nối để Cupid mở không gian riêng tư (72h) cho hai bạn.',
    ].join('\n'))
    .setFooter({ text: 'Cupid • Spark Board — Hồ sơ đã được xác thực' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spark_board_comment:${post.id}`)
      .setLabel('Gửi Bình Luận Ẩn Danh')
      .setEmoji(emojis.trangtrig30)
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`spark_board_connect:${post.id}`)
      .setLabel('Kết Nối')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

export function buildSparkBoardCommentsNoticePayload(post) {
  const embed = new EmbedBuilder()
    .setColor('#d896b0')
    .setTitle(`${emojis.trangtrig50} **KHU VỰC THẢO LUẬN & QUẢN LÝ HỒ SƠ** ${emojis.trangtrig51}`)
    .setDescription([
      `${emojis.trangtrig30} Dành cho người ghé thăm:`,
      'Hãy nhấn nút `Gửi Bình Luận Ẩn Danh` ở đầu bài viết để gửi lời nhắn trò chuyện cùng chủ nhân hồ sơ mà không sợ lộ danh tính nhé!\n',
      `${emojis.trangtrig49} Dành riêng cho chủ nhân bài đăng:`,
      '• Quản Lý Bài Đăng: Cho phép bạn cập nhật lại nội dung giới thiệu, hình mẫu hoặc lời nhắn bất cứ lúc nào. Bot sẽ tự động cập nhật bài viết mà không cần đăng lại.',
      '• Gỡ Bài Đăng: Đóng và gỡ bài viết khỏi bảng tin khi bạn đã tìm thấy Sparkmate đồng điệu hoặc tạm dừng tìm kiếm.\n',
      `${emojis.trangtrig49} Hai nút thao tác bên dưới chỉ riêng chủ bài đăng (hoặc Admin) mới có quyền sử dụng.`,
    ].join('\n'));

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spark_board_edit:${post.id}`)
      .setLabel('Quản Lý Bài Đăng')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`spark_board_delete:${post.id}`)
      .setLabel('Gỡ Bài Đăng')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    embeds: [embed],
    components: [row],
  };
}

export function buildSparkBoardApprovedDm(post, threadId, threadUrl = null) {
  const row = threadUrl
    ? new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Xem Bài Đăng').setStyle(ButtonStyle.Link).setURL(threadUrl),
    )
    : null;

  return {
    content: [
      `${emojis.trangtrig50} **HỒ SƠ SPARKMATE CỦA BẠN ĐÃ LÊN SÓNG!** ${emojis.trangtrig51}\n`,
      `Chúc mừng "${post.alias}", Cupid đã duyệt và đăng tải hồ sơ ẩn danh của bạn lên Spark Board với mã số #${post.code}, đồng thời cấp role <@&${SPARK_MATCHING_CONFIG.memberRoleId}>.\n`,
      `${emojis.heartg8} Xem bài đăng của bạn tại: <#${threadId}>\n`,
      `${emojis.trangtrig49} Lưu ý nhỏ: Khi có người bình luận ẩn danh hoặc bấm nút Kết Nối trên bài viết của bạn, Cupid sẽ nhắn tin thông báo ngay tại đây. Chúc bạn sớm tìm được tần số đồng điệu của riêng mình!`,
    ].join('\n'),
    ...(row ? { components: [row] } : {}),
  };
}

export function buildSparkBoardRejectedDm(submission, reason) {
  return {
    content: [
      `${emojis.trangtrig50} **THÔNG BÁO VỀ HỒ SƠ SPARKMATE CỦA BẠN** ${emojis.trangtrig51}\n`,
      'Cảm ơn bạn đã gửi hồ sơ về cho Spark Board. Tuy nhiên, Cupid chưa thể đăng tải hồ sơ này vì lý do sau:\n',
      `> ${reason}\n`,
      'Bạn hoàn toàn có thể chỉnh sửa lại nội dung cho phù hợp hơn và nhấn nút Gửi Hồ Sơ Ẩn Danh trên bảng tin để đăng ký lại bất cứ lúc nào nhé!',
    ].join('\n'),
  };
}

export function buildSparkBoardCommentNotificationDm(post, threadId, threadUrl) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Xem Bài Đăng').setStyle(ButtonStyle.Link).setURL(threadUrl),
  );

  return {
    content: [
      `${emojis.trangtrig50} **BẠN CÓ BÌNH LUẬN MỚI TRÊN SPARK BOARD!** ${emojis.trangtrig51}\n`,
      `Một thành viên vừa ghé thăm và để lại bình luận ẩn danh vào bài đăng hồ sơ #${post.code} của bạn trên Spark Board.\n`,
      `${emojis.heartg8} Xem bài đăng của bạn tại: <#${threadId}>`,
      `${emojis.trangtrig49} Bạn có thể bấm nút bên dưới để chuyển thẳng đến bài viết và gửi lời phản hồi nhé!`,
    ].join('\n'),
    components: [row],
  };
}

export function buildSparkBoardConnectionPromptDm(post, connectionId) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`spark_board_conn_yes:${connectionId}`)
      .setLabel('Đồng Ý Mở Phòng')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`spark_board_conn_no:${connectionId}`)
      .setLabel('Từ Chối Nhẹ Nhàng')
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    content: [
      `${emojis.trangtrig50} **BẠN NHẬN ĐƯỢC MỘT TÍN HIỆU KẾT NỐI MỚI!** ${emojis.trangtrig51}\n`,
      `Một thành viên vừa ghé thăm hồ sơ #${post.code} của bạn trên Spark Board và muốn mở không gian trò chuyện riêng tư (tối đa 72 giờ).\n`,
      `${emojis.trangtrig49} Lưu ý: Khi đồng ý, Cupid sẽ tạo một Private Thread tại kênh riêng tư và công khai danh tính Discord của hai bạn cho nhau.\n`,
      'Bạn có muốn chấp nhận lời mời kết nối này không?',
    ].join('\n'),
    components: [row],
  };
}
