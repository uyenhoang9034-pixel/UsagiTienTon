import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { SPARK_MATCHING_CONFIG } from '../config/sparkMatchingConfig.js';
import { getSparkConfig } from './sparkMatchingService.js';

export const SPARK_COMPONENTS_V2 = MessageFlags.IsComponentsV2 ?? (1 << 15);

const button = (customId, label, style = ButtonStyle.Secondary) =>
  new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);

const container = (...components) => ({
  flags: SPARK_COMPONENTS_V2,
  components: [{ type: 17, components }],
});

const text = (content) => ({ type: 10, content });
const divider = () => ({ type: 14, divider: true, spacing: 1 });

export function buildSparkStartPayload() {
  const row = new ActionRowBuilder().addComponents(
    button('spark_register_start', 'Bắt Đầu Điền Hồ Sơ'),
  );
  return container(
    text(SPARK_MATCHING_CONFIG.title),
    divider(),
    text('Cupid đang tìm kiếm những Sparkmate phù hợp để giúp bạn bắt đầu một hành trình mới.\n\nHãy điền hồ sơ thật chân thành để Cupid hiểu hơn về bạn nhé!'),
    divider(),
    text('Thông tin của bạn sẽ được giữ kín và chỉ được đội ngũ quản trị sử dụng để xét duyệt, ghép đôi. Danh tính chỉ được tiết lộ khi cả hai cùng đồng ý.'),
    row.toJSON(),
  );
}

export function buildSparkAdminProfilePayload(profile) {
  const data = profile.data || {};
  const row = new ActionRowBuilder().addComponents(
    button(`spark_profile_approve:${profile.profileId}`, 'Duyệt Hồ Sơ', ButtonStyle.Secondary),
    button(`spark_profile_reject:${profile.profileId}`, 'Từ Chối', ButtonStyle.Secondary),
  );
  return container(
    text('(trangtrig50) **SPARK MATCHING · HỒ SƠ CHỜ DUYỆT** (trangtrig51)'),
    divider(),
    text(
      `**Mã hồ sơ:** ${profile.profileId}\n**Discord ID:** ${profile.userId}\n**Tên lúc đăng ký:** ${profile.usernameAtSubmission || 'Không có'}\n**Tuổi:** ${data.age}\n**Giới tính:** ${data.gender}\n**Mong muốn ghép đôi:** ${data.matchGender}\n**Khu vực:** ${data.area}\n**Mục đích:** ${data.intention}\n\n**Giới thiệu:**\n${data.about}\n\n**Sở thích:**\n${data.hobbies}\n\n**Điều khiến bạn vui trong một mối quan hệ:**\n${data.relationshipHappy}\n\n**Tính cách Sparkmate mong muốn:**\n${data.traits}\n\n**Độ tuổi mong muốn:**\n${data.ageRange}\n\n**Yêu cầu khác:**\n${data.otherRequirements || 'Không có'}\n**Người muốn ghép đôi cụ thể:** ${data.requestedUserId || 'Không có'}`,
    ),
    divider(),
    text(`Thời gian gửi: <t:${Math.floor(profile.submittedAt / 1000)}:F>`),
    row.toJSON(),
  );
}

export function buildSparkMatchInvitePayload(match, otherUser) {
  const row = new ActionRowBuilder().addComponents(
    button(`spark_invite_accept:${match.matchId}`, 'Bắt Đầu Trò Chuyện'),
    button(`spark_invite_decline:${match.matchId}`, 'Từ Chối'),
  );
  return container(
    text(SPARK_MATCHING_CONFIG.title),
    divider(),
    text('Cupid đã tìm thấy một Sparkmate có thể phù hợp với bạn! Đây là lời mời trò chuyện ẩn danh.'),
    text('Danh tính của đối phương sẽ được giữ kín. Bạn có thể đồng ý hoặc từ chối lời mời này.'),
    row.toJSON(),
  );
}

export function buildSparkRevealPayload(match) {
  const row = new ActionRowBuilder().addComponents(
    button(`spark_reveal_yes:${match.matchId}`, 'Đồng Ý!'),
    button(`spark_reveal_no:${match.matchId}`, 'Kết Thúc!'),
  );
  return container(
    text('(trangtrig50) **THE SPARK · TIẾP TỤC HÀNH TRÌNH?** (trangtrig51)'),
    divider(),
    text('Thời gian trò chuyện ẩn danh đã kết thúc. Cupid muốn hỏi liệu bạn có muốn cùng Sparkmate công khai danh tính và tiếp tục trò chuyện trong một thread riêng không?'),
    divider(),
    text('(trangtrig49) Chỉ khi cả hai cùng đồng ý, danh tính mới được tiết lộ.'),
    row.toJSON(),
  );
}

export function buildSparkConnectionConfirmPayload(match) {
  const row = new ActionRowBuilder().addComponents(
    button(`spark_connection_yes:${match.matchId}`, 'Đồng Ý Kết Nối'),
    button(`spark_connection_no:${match.matchId}`, 'Kết Thúc!'),
  );
  return container(
    text('(trangtrig50) **SPARK MATCHING · XÁC NHẬN KẾT NỐI** (trangtrig51)'),
    divider(),
    text('Hai bạn đã có thời gian trò chuyện trực tiếp. Cupid muốn xác nhận liệu cả hai có muốn tiếp tục giữ kết nối sau hành trình này không.'),
    row.toJSON(),
  );
}

export async function buildSparkFinalPayload(match) {
  const config = await getSparkConfig(match.guildId);
  const feedbackUrl = `https://discord.com/channels/${match.guildId}/${config.feedbackChannelId || SPARK_MATCHING_CONFIG.feedbackChannelId}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Gửi Feedback').setStyle(ButtonStyle.Link).setURL(feedbackUrl),
    button(`spark_thread_close:${match.matchId}`, 'Đóng Thread'),
  );
  const isEarly = match.endedReason === 'early';
  return container(
    text('(trangtrig50) **SPARK MATCHING · HÀNH TRÌNH TẠM DỪNG** (trangtrig51)'),
    divider(),
    text(
      isEarly
        ? 'Có vẻ như một trong hai bạn muốn kết thúc cuộc trò chuyện sớm hơn dự kiến. Cupid đã ghi nhận yêu cầu và tạm khóa cuộc trò chuyện. Hai bạn sẽ không thể tiếp tục nhắn tin trong thread này nữa.'
        : 'Hành trình Spark Matching của hai bạn đã đi đến hồi kết. Cảm ơn vì đã dành thời gian tìm hiểu nhau và đồng hành cùng Cupid.',
    ),
    text('**Trước khi khép lại hành trình, đừng quên gửi feedback cho bé Cupid nhé!** Những chia sẻ của hai bạn sẽ giúp Cupid cải thiện Spark Matching tốt hơn.'),
    divider(),
    text('(trangtrig49) Chỉ cần một trong hai người gửi feedback tại kênh được liên kết, cả hai sẽ có thể đóng thread.'),
    row.toJSON(),
  );
}
