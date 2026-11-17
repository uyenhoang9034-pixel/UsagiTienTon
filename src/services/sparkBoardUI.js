import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} from 'discord.js';
import { SPARK_MATCHING_CONFIG } from '../config/sparkMatchingConfig.js';

export const SPARK_COMPONENTS_V2 = MessageFlags.IsComponentsV2 ?? (1 << 15);

const { emojis } = SPARK_MATCHING_CONFIG;

const container = (...components) => ({
  flags: SPARK_COMPONENTS_V2,
  components: [{ type: 17, components }],
});

const text = (content) => ({ type: 10, content });
const divider = () => ({ type: 14, divider: true, spacing: 1 });

export function buildSparkBoardMainIntroPayload() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('spark_board_register')
      .setLabel('Gửi Hồ Sơ Ẩn Danh')
      .setEmoji(emojis.trangtrig30)
      .setStyle(ButtonStyle.Secondary),
  );

  return container(
    text(`${emojis.trangtrig50} **SPARK BOARD — BẢNG TIN TÌM SPARKMATE** ${emojis.trangtrig51}`),
    divider(),
    text(
      'Mỗi người đều có một tần số riêng đang chờ được lắng nghe. Nếu bạn đang tìm kiếm một **Sparkmate thực sự đồng điệu về tâm hồn** — nơi bắt đầu từ những cuộc trò chuyện chân thành và có thể tiến xa hơn thành một mối quan hệ đặc biệt, hãy để lại dấu ấn ẩn danh của mình tại đây.'
    ),
    divider(),
    text(
      `${emojis.heartg8} **Cách thức tham gia:**\n` +
      '1. Nhấn vào nút `Gửi Hồ Sơ Ẩn Danh` ngay bên dưới.\n' +
      '2. Chia sẻ đôi nét về bản thân, những điều bạn trân trọng và hình mẫu người đồng hành bạn đang tìm kiếm.\n' +
      '3. Chờ đợi Cupid duyệt hồ sơ.\n' +
      `4. Nếu được duyệt, Cupid sẽ đăng tải hồ sơ ẩn danh của bạn lên bảng tin kèm mã số riêng, đồng thời cấp quyền <@&${SPARK_MATCHING_CONFIG.memberRoleId}> để bạn sẵn sàng kết nối.\n` +
      '5. Mọi bình luận của bạn đều được ẩn danh nếu bạn muốn trao đổi với người theo dõi bảng tin.'
    ),
    divider(),
    text(
      `${emojis.heartg8} **Trong trường hợp là người xem hoặc theo dõi các bài đăng:**\n` +
      '1. Bạn cảm thấy đồng cảm và muốn kết nối với Sparked vừa đăng tin? Vậy thì chỉ cần trực tiếp bình luận (ẩn danh) để trao đổi, tìm hiểu thêm về nhau.\n' +
      '2. Nếu cảm thấy ngại ngùng? Hãy nhấn vào nút `Kết Nối` để Cupid trực tiếp tạo thread riêng tư cho hai bạn (công khai danh tính). Thời gian trao đổi trực tiếp tại thread riêng tư tối đa 72 giờ.'
    ),
    divider(),
    text(
      `${emojis.trangtrig30} **Nguyên tắc bảng tin:**\n` +
      '- An toàn & Riêng tư: Danh tính tài khoản Discord của bạn luôn được giữ bí mật hoàn toàn cho đến khi thực sự muốn công khai. Đồng thời hệ thống Admin tuyệt đối không xâm nhập vào thread riêng tư của cả hai khi chưa có sự đồng ý hoặc cho phép!\n' +
      '- Chân thành & Văn minh: Tôn trọng cảm xúc của nhau, tuyệt đối không đùa cợt thiếu nghiêm túc, dùng từ ngữ phản cảm hay giả mạo thông tin.\n' +
      '- Chủ động quản lý: Mỗi thành viên được giữ 01 hồ sơ hiển thị tại một thời điểm và có thể tự cập nhật hoặc gỡ bài bất cứ lúc nào.'
    ),
    divider(),
    text(
      `${emojis.trangtrig49} **Hỗ trợ & Góp ý:**\n` +
      'Nếu cần hỗ trợ trong quá trình tạo hồ sơ hoặc có ý tưởng giúp không gian kết nối trọn vẹn hơn, hãy tạo ticket hoặc dm thẳng <@872792190651334707>. Xin cảm ơn!'
    ),
    divider(),
    text('Spark Ecosystem • Tìm một tần số đồng điệu'),
    row.toJSON(),
  );
}

export function buildSparkBoardReviewPayload(submission, member, statusText = null) {
  const joinedTime = member?.joinedTimestamp
    ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`
    : 'Không rõ';

  const components = [
    text(`${emojis.trangtrig49} **YÊU CẦU DUYỆT HỒ SƠ SPARKMATE — MÃ #${submission.code}**`),
    divider(),
    text(
      `• Người gửi: <@${submission.userId}> (${member?.user?.tag || submission.username || 'Unknown'} • ID: ${submission.userId})\n` +
      `• Ngày tham gia server: ${joinedTime} (Giúp Cupid lọc nhanh tài khoản clone mới lập)`
    ),
    divider(),
    text(
      `${emojis.trangtrig30} Thông tin cơ bản:\n` +
      `• Biệt danh: ${submission.alias}\n` +
      `• Tuổi / Năm sinh: ${submission.age}\n` +
      `• Giới tính: ${submission.gender}\n` +
      `• Tìm kiếm: ${submission.seeking}`
    ),
    divider(),
    text(`${emojis.trangtrig30} Đôi nét về bản thân:\n${submission.about}`),
    divider(),
    text(`${emojis.trangtrig30} Điều trân trọng trong một mối quan hệ:\n${submission.relationship}`),
    divider(),
    text(`${emojis.trangtrig30} Hình mẫu Sparkmate lý tưởng:\n${submission.ideal}`),
    divider(),
    text(`${emojis.trangtrig49} Lời nhắn gửi / Câu hỏi mở:\n"${submission.message || 'Không có'}"`),
    divider(),
    text(statusText ? `**Trạng thái:** ${statusText}` : 'Trạng thái: ⏳ Đang chờ Cupid xét duyệt'),
  ];

  if (!statusText) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`spark_board_approve:${submission.id}`)
        .setLabel('Duyệt & Đăng Bảng Tin')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`spark_board_reject:${submission.id}`)
        .setLabel('Từ Chối (Kèm Lý Do)')
        .setStyle(ButtonStyle.Secondary),
    );
    components.push(row.toJSON());
  }

  return container(...components);
}

export function buildSparkBoardPostPayload(post) {
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

  return container(
    text(`${emojis.trangtrig50} **HỒ SƠ SPARKMATE #${post.code} — ${post.alias}** ${emojis.trangtrig51}`),
    divider(),
    text('Một tần số mới vừa được Cupid gửi lên bảng tin. Hãy lắng nghe và kết nối nếu bạn tìm thấy sự đồng điệu tại đây.'),
    divider(),
    text(
      `${emojis.trangtrig33} Thông tin cơ bản:\n` +
      `• Biệt danh: ${post.alias}\n` +
      `• Tuổi / Năm sinh: ${post.age}\n` +
      `• Giới tính: ${post.gender}\n` +
      `• Tìm kiếm: ${post.seeking}`
    ),
    divider(),
    text(`${emojis.trangtrig33} Đôi nét về bản thân:\n> ${post.about}`),
    divider(),
    text(`${emojis.trangtrig33} Điều trân trọng trong một mối quan hệ:\n> ${post.relationship}`),
    divider(),
    text(`${emojis.trangtrig33} Hình mẫu Sparkmate lý tưởng:\n> ${post.ideal}`),
    divider(),
    text(`${emojis.trangtrig30} Lời nhắn gửi / Câu hỏi mở:\n> "${post.message || '...'}"`),
    divider(),
    text('Bạn có thể bình luận ẩn danh ngay bên dưới bài viết này để trò chuyện cùng chủ nhân hồ sơ, hoặc nhấn nút Kết Nối để Cupid mở không gian riêng tư (72h) cho hai bạn.'),
    row.toJSON(),
  );
}

export function buildSparkBoardCommentsNoticePayload(post) {
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

  return container(
    text(`${emojis.trangtrig50} **KHU VỰC THẢO LUẬN & QUẢN LÝ HỒ SƠ** ${emojis.trangtrig51}`),
    divider(),
    text(
      `${emojis.trangtrig30} Dành cho người ghé thăm:\n` +
      'Hãy nhấn nút `Gửi Bình Luận Ẩn Danh` ở đầu bài viết để gửi lời nhắn trò chuyện cùng chủ nhân hồ sơ mà không sợ lộ danh tính nhé!'
    ),
    divider(),
    text(
      `${emojis.trangtrig49} Dành riêng cho chủ nhân bài đăng:\n` +
      '• Quản Lý Bài Đăng: Cho phép bạn cập nhật lại nội dung giới thiệu, hình mẫu hoặc lời nhắn bất cứ lúc nào. Bot sẽ tự động cập nhật bài viết mà không cần đăng lại.\n' +
      '• Gỡ Bài Đăng: Đóng và gỡ bài viết khỏi bảng tin khi bạn đã tìm thấy Sparkmate đồng điệu hoặc tạm dừng tìm kiếm.'
    ),
    divider(),
    text(`${emojis.trangtrig49} Hai nút thao tác bên dưới chỉ riêng chủ bài đăng (hoặc Admin) mới có quyền sử dụng.`),
    row.toJSON(),
  );
}

export function buildSparkBoardApprovedDm(post, threadId, threadUrl = null) {
  const components = [
    text(`${emojis.trangtrig50} **HỒ SƠ SPARKMATE CỦA BẠN ĐÃ LÊN SÓNG!** ${emojis.trangtrig51}`),
    divider(),
    text(
      `Chúc mừng "${post.alias}", Cupid đã duyệt và đăng tải hồ sơ ẩn danh của bạn lên Spark Board với mã số #${post.code}, đồng thời cấp role **Sparked**.\n\n` +
      `${emojis.heartg8} Xem bài đăng của bạn tại: Spark Board (nhấn nút Xem Bài Đăng bên dưới nhé!)\n\n` +
      `${emojis.trangtrig49} Lưu ý nhỏ: Khi có người bình luận ẩn danh hoặc bấm nút Kết Nối trên bài viết của bạn, Cupid sẽ nhắn tin thông báo ngay tại đây. Chúc bạn sớm tìm được tần số đồng điệu của riêng mình!`
    ),
  ];

  if (threadUrl) {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Xem Bài Đăng').setStyle(ButtonStyle.Link).setURL(threadUrl),
    );
    components.push(row.toJSON());
  }

  return container(...components);
}

export function buildSparkBoardRejectedDm(submission, reason) {
  return container(
    text(`${emojis.trangtrig50} **THÔNG BÁO VỀ HỒ SƠ SPARKMATE CỦA BẠN** ${emojis.trangtrig51}`),
    divider(),
    text(
      'Cảm ơn bạn đã gửi hồ sơ về cho Spark Board. Tuy nhiên, Cupid chưa thể đăng tải hồ sơ này vì lý do sau:\n\n' +
      `> ${reason}\n\n` +
      'Bạn hoàn toàn có thể chỉnh sửa lại nội dung cho phù hợp hơn và nhấn nút Gửi Hồ Sơ Ẩn Danh trên bảng tin để đăng ký lại bất cứ lúc nào nhé!'
    ),
  );
}

export function buildSparkBoardCommentNotificationDm(post, threadId, threadUrl) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Xem Bài Đăng').setStyle(ButtonStyle.Link).setURL(threadUrl),
  );

  return container(
    text(`${emojis.trangtrig50} **BẠN CÓ BÌNH LUẬN MỚI TRÊN SPARK BOARD!** ${emojis.trangtrig51}`),
    divider(),
    text(
      `Một thành viên vừa ghé thăm và để lại bình luận ẩn danh vào bài đăng hồ sơ #${post.code} của bạn trên Spark Board.\n\n` +
      `${emojis.heartg8} Bạn có thể nhấn nút **Xem Bài Đăng** bên dưới để chuyển thẳng đến bài viết và gửi lời phản hồi nhé!`
    ),
    row.toJSON(),
  );
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

  return container(
    text(`${emojis.trangtrig50} **BẠN NHẬN ĐƯỢC MỘT TÍN HIỆU KẾT NỐI MỚI!** ${emojis.trangtrig51}`),
    divider(),
    text(
      `Một thành viên vừa ghé thăm hồ sơ #${post.code} của bạn trên Spark Board và muốn mở không gian trò chuyện riêng tư (tối đa 72 giờ).\n\n` +
      `${emojis.trangtrig49} Lưu ý: Khi đồng ý, Cupid sẽ tạo một Private Thread tại kênh riêng tư và công khai danh tính Discord của hai bạn cho nhau.\n\n` +
      'Bạn có muốn chấp nhận lời mời kết nối này không?'
    ),
    row.toJSON(),
  );
}
