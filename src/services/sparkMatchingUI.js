import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, StringSelectMenuBuilder } from 'discord.js';
import { SPARK_MATCHING_CONFIG } from '../config/sparkMatchingConfig.js';
import { getSparkConfig, isMaleGender, isFemaleGender } from './sparkMatchingService.js';

export const SPARK_COMPONENTS_V2 = MessageFlags.IsComponentsV2 ?? (1 << 15);

const EMOJI = {
  heartg1: { id: '1545307544808071258', name: 'heartg1' },
  heartg8: { id: '1567818755793358928', name: 'heartg8' },
  bang2: { id: '1546891483250954290', name: 'bang2', animated: true },
  trangtrig30: { id: '1546905942476464178', name: 'trangtrig30', animated: true },
};
const button = (customId, label, style = ButtonStyle.Secondary, emoji = null) => {
  const builder = new ButtonBuilder().setCustomId(customId).setLabel(label).setStyle(style);
  if (emoji) builder.setEmoji(emoji);
  return builder;
}

const container = (...components) => ({
  flags: SPARK_COMPONENTS_V2,
  components: [{ type: 17, components }],
});

const text = (content) => ({ type: 10, content });
const divider = () => ({ type: 14, divider: true, spacing: 1 });

export function buildSparkStartPayload() {
  const registerButton = new ButtonBuilder()
    .setCustomId('spark_register_start')
    .setLabel('Đăng Ký Tham Gia')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji({ id: '1546905942476464178', name: 'trangtrig30', animated: true });

  const row = new ActionRowBuilder().addComponents(registerButton);

  return container(
    text(SPARK_MATCHING_CONFIG.title),
    divider(),
    text(
      'Chào mừng bạn đến với không gian Spark Matching!\n' +
      '> - Spark ở đây chính là gợi lên cảm giác rung động ban đầu. Và người tham gia sẽ được gọi với cái tên mỹ miều là **Sparkmate**.\n' +
      '> - Tất cả mọi tình cảm đều bắt nguồn từ những rung động ban sơ ấy, nên hãy trân trọng và nắm bắt những cơ hội tạo nên câu chuyện tình yêu đó nhé!\n\n' +
      'Đây là nơi để bạn có thể gặp gỡ, làm quen và tìm kiếm một người đồng hành, một người bạn tri kỉ, một anh bạn trai / cô bạn gái đồng điệu về linh hồn. Liệu bạn đã sẵn sàng tìm kiếm một người đặc biệt chưa?'
    ),
    divider(),
    text(
      '<a:trangtrig49:1567818140375851018> **THÔNG TIN CỦA BẠN ĐƯỢC BẢO MẬT**\n' +
      'Mọi thông tin đăng ký sẽ được bảo mật và danh tính của bạn sẽ được ẩn danh cho đến khi cả hai cùng đồng ý công khai thông tin của nhau.'
    ),
    divider(),
    text(
      '<a:heartg1:1545307544808071258> **CÁCH THỨC THAM GIA**\n' +
      '1. Điền hồ sơ hẹn hò theo hướng dẫn của Cupid.\n' +
      '2. Bạn có thể chọn chờ hệ thống ghép đôi người phù hợp hoặc bạn gửi ID Discord Sparkmate mà bạn mong muốn được ghép đôi cùng họ.\n' +
      '> <a:bang2:1546891483250954290> Lưu ý: Trong trường hợp yêu cầu ghép đôi với Sparkmate cụ thể, đối phương có quyền từ chối ghép đôi với bạn.\n' +
      '3. Chờ Cupid xét duyệt hồ sơ. Sau khi được duyệt, Cupid mở khung trò chuyện ẩn danh để hai bên nhẹ nhàng tìm hiểu về nhau. Thời gian tìm hiểu tối đa 24 giờ. Sau đó các bạn sẽ đưa ra quyết định công khai danh tính hoặc kết thúc ghép đôi.\n' +
      '4. Nếu hợp ý muốn tiếp tục và đã thông qua sự xác nhận của cả hai bên, Cupid sẽ tạo thread riêng tư cho hai bạn thoải mái trò chuyện - tâm tình - chia sẻ -  tỉ tê thật nhiều điều.\n' +
      '5. Thời gian trò chuyện ở thread riêng tư của cặp đôi tối đa 48 giờ. Sau đó Cupid sẽ gửi khung xác nhận kết nối.\n' +
      '> - Nếu đồng ý, Cupid sẽ chờ feedback, đóng thread và các bạn có thể trực tiếp addfriend discord của nhau để tiếp tục câu chuyện của riêng mình.\n' +
      '> - Nếu từ chối, Cupid sẽ chờ feedback, đóng thread, kết thúc ghép đôi và gửi lời chúc đến cả hai, mong các bạn tìm được bến đỗ riêng phù hợp, làm tròn nghĩa vụ của một Cupid thực thụ!'
    ),
    text(
      '<a:trangtrig49:1567818140375851018> Hãy đảm bảo rằng bạn đã **bật nhận tin nhắn riêng từ bot** trước khi tham gia để không bỏ lỡ thông báo nhé!'
    ),
    row.toJSON(),
  );
}

export function buildSparkAdminProfilePayload(profile) {
  const data = profile.data || {};
  const reviewButtons = data.requestedUserId
    ? [
        button(`spark_request_approve:${profile.profileId}`, 'Duyệt Yêu Cầu Ghép Đôi', ButtonStyle.Secondary),
        button(`spark_profile_reject_retry:${profile.profileId}`, 'Từ Chối · Cho Đăng Ký Lại', ButtonStyle.Secondary),
        button(`spark_profile_reject_final:${profile.profileId}`, 'Từ Chối · Không Đăng Ký Lại', ButtonStyle.Secondary),
      ]
    : [
        button(`spark_profile_approve:${profile.profileId}`, 'Duyệt Hồ Sơ', ButtonStyle.Secondary),
        button(`spark_profile_reject_retry:${profile.profileId}`, 'Từ Chối · Cho Đăng Ký Lại', ButtonStyle.Secondary),
        button(`spark_profile_reject_final:${profile.profileId}`, 'Từ Chối · Không Đăng Ký Lại', ButtonStyle.Secondary),
      ];
  const row = new ActionRowBuilder().addComponents(...reviewButtons);
  const details = `**Mã hồ sơ:** ${profile.profileId}\n**Discord ID:** ${profile.userId}\n**Tên lúc đăng ký:** ${profile.usernameAtSubmission || 'Không có'}\n**Tuổi:** ${data.age}\n**Giới tính:** ${data.gender}\n**Xu hướng tính dục / bản dạng giới:** ${data.orientation || 'Không chia sẻ'}\n**Mong muốn ghép đôi:** ${data.matchGender}\n**Khu vực:** ${data.area}\n**Mục đích:** ${data.intention}\n\n**Giới thiệu:**\n${data.about}\n\n**Sở thích:**\n${data.hobbies}\n\n**Điều khiến bạn vui trong một mối quan hệ:**\n${data.relationshipHappy}\n\n**Tính cách Sparkmate mong muốn:**\n${data.traits}\n\n**Độ tuổi mong muốn:**\n${data.ageRange}\n\n**Yêu cầu khác:**\n${data.otherRequirements || 'Không có'}\n**Người muốn ghép đôi cụ thể:** ${data.requestedUserId || 'Không có'}`;
  return container(
    text('<a:trangtrig50:1567818385306165301> **SPARK MATCHING · HỒ SƠ CHỜ DUYỆT** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text(details.slice(0, 3900)),
    divider(),
    text(`Thời gian gửi: <t:${Math.floor(profile.submittedAt / 1000)}:F>`),
    row.toJSON(),
  );
}

export function buildSparkMatchInvitePayload(match, otherUser) {
  const row = new ActionRowBuilder().addComponents(
    button(`spark_invite_accept:${match.matchId}`, 'Bắt Đầu Trò Chuyện', ButtonStyle.Secondary, EMOJI.trangtrig30),
    button(`spark_invite_decline:${match.matchId}`, 'Từ Chối', ButtonStyle.Secondary, EMOJI.bang2),
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
    button(`spark_reveal_yes:${match.matchId}`, 'Đồng Ý!', ButtonStyle.Secondary, EMOJI.heartg1),
    button(`spark_reveal_no:${match.matchId}`, 'Kết Thúc!', ButtonStyle.Secondary, EMOJI.bang2),
  );
  return container(
    text('<a:trangtrig50:1567818385306165301> **THE SPARK · TIẾP TỤC HÀNH TRÌNH?** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text('Thời gian trò chuyện ẩn danh đã kết thúc. Cupid muốn hỏi liệu bạn có muốn cùng Sparkmate công khai danh tính và tiếp tục trò chuyện trong một thread riêng không?'),
    divider(),
    text('Lưu ý: Chỉ khi cả hai cùng đồng ý, danh tính mới được tiết lộ.'),
    row.toJSON(),
  );
}

export function buildSparkConnectionConfirmPayload(match) {
  const row = new ActionRowBuilder().addComponents(
    button(`spark_connection_yes:${match.matchId}`, 'Đồng Ý Kết Nối', ButtonStyle.Secondary, EMOJI.heartg8),
    button(`spark_connection_no:${match.matchId}`, 'Kết Thúc!', ButtonStyle.Secondary, EMOJI.bang2),
  );
  return container(
    text('<a:trangtrig50:1567818385306165301> **SPARK MATCHING · XÁC NHẬN KẾT NỐI** <a:trangtrig51:1567818549794439229>'),
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
    button(`spark_thread_close:${match.matchId}`, 'Xóa Thread', ButtonStyle.Danger),
  );
  const isEarly = match.endedReason === 'early';
  const endingText = isEarly
    ? 'Có vẻ như một trong hai bạn muốn kết thúc cuộc trò chuyện sớm hơn dự kiến. Cupid đã ghi nhận yêu cầu và tạm khóa cuộc trò chuyện. Hai bạn sẽ không thể tiếp tục nhắn tin trong thread này nữa.'
    : match.endedReason === 'connection_accepted'
      ? 'Thật vui vì cả hai đã đồng ý tiếp tục giữ kết nối sau Spark Matching! Cupid chúc hai bạn có thật nhiều khoảnh khắc đẹp bên nhau.'
      : match.endedReason === 'connection_declined'
        ? 'Có vẻ như hai bạn chưa đủ duyên để tiếp tục hành trình này. Cupid cảm ơn cả hai vì đã dành thời gian tìm hiểu nhau nhé.'
        : 'Hành trình Spark Matching của hai bạn đã đi đến hồi kết. Cảm ơn vì đã dành thời gian đồng hành cùng Cupid.';
  return container(
    text('<a:trangtrig50:1567818385306165301> **SPARK MATCHING · HÀNH TRÌNH TẠM DỪNG** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text(endingText),
    text('**Trước khi khép lại hành trình, đừng quên gửi feedback cho bé Cupid nhé!** Những chia sẻ của hai bạn sẽ giúp Cupid cải thiện Spark Matching tốt hơn.'),
    divider(),
    text('Chỉ cần một trong hai người gửi feedback theo cú pháp `+1 sparked` tại kênh được liên kết, thread sẽ tự động được xóa trong 24 giờ và **không lưu lại lịch sử chat**.'),
    row.toJSON(),
  );
}

export function buildSparkAnonymousChatPayload(match) {
  const row = new ActionRowBuilder().addComponents(
    button(`spark_chat_reply:${match.matchId}`, 'Trả Lời Tin Nhắn', ButtonStyle.Secondary, EMOJI.trangtrig30),
    button(`spark_chat_end:${match.matchId}`, 'Kết Thúc', ButtonStyle.Secondary, EMOJI.bang2),
  );
  return container(
    text(SPARK_MATCHING_CONFIG.title),
    divider(),
    text('Hai bạn đã đồng ý bắt đầu trò chuyện ẩn danh! Hãy nhắn tin trực tiếp cho Cupid qua DM; Cupid sẽ chuyển tiếp tin nhắn mà không tiết lộ danh tính người gửi.'),
    text(match?.test ? 'Thời gian trò chuyện ẩn danh (Chế độ TEST) tối đa là 1 phút.' : 'Thời gian trò chuyện ẩn danh tối đa là 24 giờ.'),
    row.toJSON(),
  );
}

export function buildSparkIncomingMessagePayload(match, messageContent) {
  const row = new ActionRowBuilder().addComponents(
    button(`spark_chat_reply:${match.matchId}`, 'Trả Lời Tin Nhắn', ButtonStyle.Secondary, EMOJI.trangtrig30),
    button(`spark_chat_end:${match.matchId}`, 'Kết Thúc', ButtonStyle.Secondary, EMOJI.bang2),
  );
  return container(
    text('<a:trangtrig50:1567818385306165301> **BẠN CÓ MỘT TIN NHẮN MỚI TỪ SPARKMATE** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text(String(messageContent || '[Tin nhắn trống]').slice(0, 3500)),
    divider(),
    text('Bạn có thể nhấn **Trả Lời Tin Nhắn** để gửi phản hồi cho Sparkmate.'),
    row.toJSON(),
  );
}

export function buildSparkAdminDashboardPayload({ config, profiles, matches }) {
  const pending = profiles.filter((profile) => profile.status === 'pending').length;
  const activeMatches = (matches || []).filter((match) => match.status !== 'closed');
  const activeUserIds = new Set();
  for (const m of activeMatches) {
    if (m.userAId) activeUserIds.add(String(m.userAId));
    if (m.userBId) activeUserIds.add(String(m.userBId));
    if (m.requestedUserId) activeUserIds.add(String(m.requestedUserId));
  }

  const allMale = profiles.filter((profile) => profile.status !== 'rejected' && isMaleGender(profile.data?.gender || profile.gender));
  const allFemale = profiles.filter((profile) => profile.status !== 'rejected' && isFemaleGender(profile.data?.gender || profile.gender));

  const availableMale = allMale.filter((p) => p.status === 'approved' && !activeUserIds.has(String(p.userId))).length;
  const availableFemale = allFemale.filter((p) => p.status === 'approved' && !activeUserIds.has(String(p.userId))).length;

  const maleDesc = allMale.length === availableMale
    ? `**${allMale.length}**`
    : `**${allMale.length}** (${availableMale} sẵn sàng · ${allMale.length - availableMale} đang bận)`;

  const femaleDesc = allFemale.length === availableFemale
    ? `**${allFemale.length}**`
    : `**${allFemale.length}** (${availableFemale} sẵn sàng · ${allFemale.length - availableFemale} đang bận)`;

  const active = activeMatches.length;
  const rowOne = new ActionRowBuilder().addComponents(
    button('spark_admin_pending', 'Hồ Sơ Chờ Duyệt'),
    button('spark_admin_match', 'Ghép Đôi Thủ Công'),
    button('spark_admin_requests', 'Yêu Cầu Cụ Thể'),
  );
  const rowTwo = new ActionRowBuilder().addComponents(
    button('spark_admin_active', 'Cặp Đôi Đang Hoạt Động'),
    button('spark_admin_all_profiles', 'Tất Cả Hồ Sơ'),
    button('spark_admin_history', 'Lịch Sử'),
  );
  const rowThree = new ActionRowBuilder().addComponents(
    button('spark_admin_settings', 'Cài Đặt'),
  );
  return {
    flags: SPARK_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [{
      type: 17,
      components: [
        text('<a:trangtrig50:1567818385306165301> **SPARK MATCHING · ADMIN DASHBOARD** <a:trangtrig51:1567818549794439229>'),
        divider(),
        text(
          '**THỐNG KÊ HỒ SƠ**\n' +
          '• Hồ sơ nam: ' + maleDesc + '\n' +
          '• Hồ sơ nữ: ' + femaleDesc + '\n' +
          '• Chờ duyệt: **' + pending + '**\n' +
          '• Cặp đôi chưa kết thúc: **' + active + '**\n\n' +
          '**TRẠNG THÁI**\n' +
          '• Hệ thống: **' + (config.enabled ? 'Đang bật' : 'Đang tắt') + '**\n' +
          '• Đăng ký: **' + (config.registrationEnabled ? 'Đang mở' : 'Đang đóng') + '**'
        ),
        divider(),
        rowOne.toJSON(),
        rowTwo.toJSON(),
        rowThree.toJSON(),
      ],
    }],
  };
}

export function buildSparkAdminMatchPickerPayload(profiles, selection = {}, matches = []) {
  const activeMatches = (matches || []).filter((match) => match.status !== 'closed');
  const activeUserIds = new Set();
  for (const m of activeMatches) {
    if (m.userAId) activeUserIds.add(String(m.userAId));
    if (m.userBId) activeUserIds.add(String(m.userBId));
    if (m.requestedUserId) activeUserIds.add(String(m.requestedUserId));
  }

  const mode = selection.mode || 'hetero'; // 'hetero', 'female_female', 'male_male'

  const allMale = profiles.filter((profile) => profile.status !== 'rejected' && isMaleGender(profile.data?.gender || profile.gender));
  const allFemale = profiles.filter((profile) => profile.status !== 'rejected' && isFemaleGender(profile.data?.gender || profile.gender));

  const maleProfiles = allMale.filter((profile) => profile.status === 'approved' && !activeUserIds.has(String(profile.userId)));
  const femaleProfiles = allFemale.filter((profile) => profile.status === 'approved' && !activeUserIds.has(String(profile.userId)));

  const pageSize = 25;

  let poolA = [];
  let poolB = [];
  let labelA = '';
  let labelB = '';
  let placeholderA = '';
  let placeholderB = '';
  let emptyMsgA = '';
  let emptyMsgB = '';

  const rawSelectedA = mode === 'hetero' ? (selection.maleId || selection.userAId) : selection.userAId;
  const rawSelectedB = mode === 'hetero' ? (selection.femaleId || selection.userBId) : selection.userBId;

  if (mode === 'hetero') {
    poolA = maleProfiles;
    poolB = femaleProfiles;
    labelA = 'CHỌN HỒ SƠ NAM';
    labelB = 'CHỌN HỒ SƠ NỮ';
    placeholderA = 'Chọn thành viên nam';
    placeholderB = 'Chọn thành viên nữ';
    emptyMsgA = allMale.length > 0
      ? `**HỒ SƠ NAM:** Có **${allMale.length}** hồ sơ nam nhưng đang bận trong lượt ghép đôi chưa kết thúc.`
      : '**HỒ SƠ NAM:** Chưa có hồ sơ nam nào được duyệt phù hợp.';
    emptyMsgB = allFemale.length > 0
      ? `**HỒ SƠ NỮ:** Có **${allFemale.length}** hồ sơ nữ nhưng đang bận trong lượt ghép đôi chưa kết thúc.`
      : '**HỒ SƠ NỮ:** Chưa có hồ sơ nữ nào được duyệt phù hợp.';
  } else if (mode === 'female_female') {
    poolA = femaleProfiles.length >= 2 ? femaleProfiles : [];
    poolB = femaleProfiles.length >= 2 ? femaleProfiles.filter((p) => String(p.userId) !== String(rawSelectedA)) : [];
    labelA = 'CHỌN BẠN NỮ THỨ NHẤT';
    labelB = 'CHỌN BẠN NỮ THỨ HAI';
    placeholderA = 'Chọn bạn nữ thứ nhất';
    placeholderB = 'Chọn bạn nữ thứ hai';
    emptyMsgA = femaleProfiles.length < 2
      ? `**HỒ SƠ NỮ × NỮ:** Cần ít nhất 2 hồ sơ nữ sẵn sàng để ghép đôi (Hiện có: **${femaleProfiles.length}** bạn).`
      : '**HỒ SƠ NỮ:** Chưa có hồ sơ nữ nào sẵn sàng.';
    emptyMsgB = femaleProfiles.length < 2
      ? '**HỒ SƠ NỮ (BẠN THỨ HAI):** Đang chờ thêm hồ sơ nữ sẵn sàng.'
      : rawSelectedA && poolB.length === 0
        ? '**HỒ SƠ NỮ (BẠN THỨ HAI):** Không còn bạn nữ nào khác sẵn sàng để ghép đôi.'
        : 'Vui lòng chọn bạn nữ thứ nhất trước.';
  } else if (mode === 'male_male') {
    poolA = maleProfiles.length >= 2 ? maleProfiles : [];
    poolB = maleProfiles.length >= 2 ? maleProfiles.filter((p) => String(p.userId) !== String(rawSelectedA)) : [];
    labelA = 'CHỌN BẠN NAM THỨ NHẤT';
    labelB = 'CHỌN BẠN NAM THỨ HAI';
    placeholderA = 'Chọn bạn nam thứ nhất';
    placeholderB = 'Chọn bạn nam thứ hai';
    emptyMsgA = maleProfiles.length < 2
      ? `**HỒ SƠ NAM × NAM:** Cần ít nhất 2 hồ sơ nam sẵn sàng để ghép đôi (Hiện có: **${maleProfiles.length}** bạn).`
      : '**HỒ SƠ NAM:** Chưa có hồ sơ nam nào sẵn sàng.';
    emptyMsgB = maleProfiles.length < 2
      ? '**HỒ SƠ NAM (BẠN THỨ HAI):** Đang chờ thêm hồ sơ nam sẵn sàng.'
      : rawSelectedA && poolB.length === 0
        ? '**HỒ SƠ NAM (BẠN THỨ HAI):** Không còn bạn nam nào khác sẵn sàng để ghép đôi.'
        : 'Vui lòng chọn bạn nam thứ nhất trước.';
  }

  const selectedA = poolA.some((p) => String(p.userId) === String(rawSelectedA)) ? rawSelectedA : null;
  const selectedB = poolB.some((p) => String(p.userId) === String(rawSelectedB)) ? rawSelectedB : null;

  const pageA = Math.max(0, Math.min(selection.pageA || selection.malePage || 0, Math.max(0, Math.ceil(poolA.length / pageSize) - 1)));
  const pageB = Math.max(0, Math.min(selection.pageB || selection.femalePage || 0, Math.max(0, Math.ceil(poolB.length / pageSize) - 1)));

  const optionsA = poolA.slice(pageA * pageSize, (pageA + 1) * pageSize).map((profile) => ({
    label: (profile.usernameAtSubmission || profile.userId).slice(0, 80),
    value: profile.userId,
    description: ((profile.data?.age || '?') + ' tuổi · ' + (profile.data?.area || 'Chưa rõ khu vực')).slice(0, 100),
    default: String(selectedA) === String(profile.userId),
  }));

  const optionsB = poolB.slice(pageB * pageSize, (pageB + 1) * pageSize).map((profile) => ({
    label: (profile.usernameAtSubmission || profile.userId).slice(0, 80),
    value: profile.userId,
    description: ((profile.data?.age || '?') + ' tuổi · ' + (profile.data?.area || 'Chưa rõ khu vực')).slice(0, 100),
    default: String(selectedB) === String(profile.userId),
  }));

  const modeRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('spark_admin_mode:hetero')
      .setLabel(mode === 'hetero' ? '● 🚻 Nam × Nữ' : '🚻 Nam × Nữ')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('spark_admin_mode:female_female')
      .setLabel(mode === 'female_female' ? '● 👭 Nữ × Nữ' : '👭 Nữ × Nữ')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('spark_admin_mode:male_male')
      .setLabel(mode === 'male_male' ? '● 👬 Nam × Nam' : '👬 Nam × Nam')
      .setStyle(ButtonStyle.Secondary),
  );

  const components = [
    text('<a:trangtrig50:1567818385306165301> **SPARK MATCHING · GHÉP ĐÔI THỦ CÔNG** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text('Chọn chế độ ghép đôi (Nam × Nữ, Nữ × Nữ hoặc Nam × Nam):'),
    modeRow.toJSON(),
    divider(),
  ];

  if (optionsA.length) {
    components.push(text(`**${labelA}** · Trang ${pageA + 1}/${Math.max(1, Math.ceil(poolA.length / pageSize))}`));
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(mode === 'hetero' ? 'spark_admin_pick_male' : 'spark_admin_pick_user_a').setPlaceholder(placeholderA).addOptions(optionsA),
    ).toJSON());
  } else {
    components.push(text(emptyMsgA));
  }

  if (poolA.length > pageSize) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('spark_admin_page_a:' + Math.max(0, pageA - 1)).setLabel('Trang trước (1)').setStyle(ButtonStyle.Secondary).setDisabled(pageA === 0),
      new ButtonBuilder().setCustomId('spark_admin_page_a:' + Math.min(Math.ceil(poolA.length / pageSize) - 1, pageA + 1)).setLabel('Trang sau (1)').setStyle(ButtonStyle.Secondary).setDisabled(pageA >= Math.ceil(poolA.length / pageSize) - 1),
    ).toJSON());
  }

  if (optionsB.length) {
    components.push(text(`**${labelB}** · Trang ${pageB + 1}/${Math.max(1, Math.ceil(poolB.length / pageSize))}`));
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(mode === 'hetero' ? 'spark_admin_pick_female' : 'spark_admin_pick_user_b').setPlaceholder(placeholderB).addOptions(optionsB),
    ).toJSON());
  } else {
    components.push(text(emptyMsgB));
  }

  if (poolB.length > pageSize) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('spark_admin_page_b:' + Math.max(0, pageB - 1)).setLabel('Trang trước (2)').setStyle(ButtonStyle.Secondary).setDisabled(pageB === 0),
      new ButtonBuilder().setCustomId('spark_admin_page_b:' + Math.min(Math.ceil(poolB.length / pageSize) - 1, pageB + 1)).setLabel('Trang sau (2)').setStyle(ButtonStyle.Secondary).setDisabled(pageB >= Math.ceil(poolB.length / pageSize) - 1),
    ).toJSON());
  }

  const canConfirm = selectedA && selectedB && String(selectedA) !== String(selectedB);
  const confirmRow = new ActionRowBuilder();
  if (activeMatches.length > 0) {
    confirmRow.addComponents(
      new ButtonBuilder().setCustomId('spark_admin_active').setLabel('Cặp Đôi Đang Hoạt Động').setStyle(ButtonStyle.Secondary),
    );
  }
  confirmRow.addComponents(
    new ButtonBuilder().setCustomId('spark_admin_match_confirm').setLabel('Xác Nhận Ghép Đôi').setStyle(ButtonStyle.Secondary).setDisabled(!canConfirm),
  );

  let descA = selectedA ? '<@' + selectedA + '>' : 'Chưa chọn nam';
  let descB = selectedB ? '<@' + selectedB + '>' : 'Chưa chọn nữ';
  if (mode === 'female_female') {
    descA = selectedA ? '<@' + selectedA + '>' : 'Chưa chọn bạn nữ 1';
    descB = selectedB ? '<@' + selectedB + '>' : 'Chưa chọn bạn nữ 2';
  } else if (mode === 'male_male') {
    descA = selectedA ? '<@' + selectedA + '>' : 'Chưa chọn bạn nam 1';
    descB = selectedB ? '<@' + selectedB + '>' : 'Chưa chọn bạn nam 2';
  }
  components.push(divider(), text('**Đã chọn:** ' + descA + ' × ' + descB), confirmRow.toJSON());

  return { flags: SPARK_COMPONENTS_V2 | MessageFlags.Ephemeral, components: [{ type: 17, components }] };
}

export function buildSparkAdminMatchSuccessPayload(matchId) {
  return {
    flags: SPARK_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [{
      type: 17,
      components: [
        text('<a:trangtrig50:1567818385306165301> **SPARK MATCHING · GHÉP ĐÔI THÀNH CÔNG** <a:trangtrig51:1567818549794439229>'),
        divider(),
        text('Cupid đã gửi lời mời ghép đôi **' + matchId + '** đến cả hai thành viên qua tin nhắn riêng (DM) rồi nhé!'),
      ],
    }],
  };
}

export function buildSparkAdminMatchErrorPayload(errorMessage) {
  return {
    flags: SPARK_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [{
      type: 17,
      components: [
        text('<a:trangtrig50:1567818385306165301> **SPARK MATCHING · THÔNG BÁO** <a:trangtrig51:1567818549794439229>'),
        divider(),
        text('<a:bang2:1546891483250954290> ' + errorMessage),
      ],
    }],
  };
}

export function buildSparkThreadWelcomePayload(match, infoUrl) {
  const targetUrl = infoUrl || 'https://discord.com/channels/1541279801183178754/1571931107002417386/1572122362214613096';
  const components = [
    text('<a:trangtrig50:1567818385306165301> **SPARK MATCHING · PRIVATE THREAD** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text('Chúc mừng <@' + match.userAId + '> và <@' + match.userBId + '>! Cả hai đã đồng ý công khai danh tính. Đây sẽ là không gian riêng để hai bạn tiếp tục tìm hiểu nhau.'),
    divider(),
    text('<a:bang2:1546891483250954290> Nếu một trong hai cảm thấy không ổn muốn dừng lại ngay, bạn có thể dùng lệnh `/ketthuc` để bot lập tức đóng thread và kết thúc ghép đôi nhé! Tuy nhiên, hãy cẩn thận và suy nghĩ kĩ trước khi thực sự dùng lệnh để kết thúc trò chuyện, vì khi kết thúc rồi sẽ không mở lại được đâu ạ!'),
  ];
  if (targetUrl) {
    components.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Thông Tin Thread').setStyle(ButtonStyle.Link).setURL(targetUrl),
    ).toJSON());
  }
  return container(...components);
}

export const SPARK_FEEDBACK_STICKY_MARKER = 'Cảm ơn bạn đã feedback cho showroom Spark Matching!';

export function buildSparkFeedbackStickyPayloadV2() {
  return container(
    text(
      [
        '<a:heartg7:1567818322718761100> Cảm ơn bạn đã feedback cho showroom Spark Matching!',
        '<a:heartg7:1567818322718761100> Xin vui lòng gửi tin nhắn feedback theo cú pháp: +1 sparked',
      ].join('\n'),
    ),
  );
}

function buildSparkFeedMatchRow() {
  const [link1, link2] = SPARK_MATCHING_CONFIG.feedMatchLinks;
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Match').setStyle(ButtonStyle.Link).setURL(link1),
    new ButtonBuilder().setLabel('Match').setStyle(ButtonStyle.Link).setURL(link2),
  ).toJSON();
}

export function buildSparkFeedFemalePayload() {
  return container(
    text('## <a:trangtrig50:1567818385306165301> **TÍN HIỆU SPARK MATCHING MỚI** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text(
      [
        'Một Sparked đã gia nhập, +1 Sparkmate cho ai may mắn đâyyy!!!',
        '',
        '<a:linhtocg:1563399670351536310> Giới tính: Nữ',
        '<a:linhtocg:1563399670351536310> Trạng thái: Đang chờ ghép đôi',
        '',
        'Tạo hồ sơ match ngay nào! <a:heartg1:1545307544808071258>',
      ].join('\n'),
    ),
    buildSparkFeedMatchRow(),
  );
}

export function buildSparkFeedMalePayload() {
  return container(
    text('## <a:trangtrig50:1567818385306165301> **TÍN HIỆU SPARK MATCHING MỚI** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text(
      [
        'Một Sparked đã gia nhập, +1 Sparkmate cho ai may mắn đâyyy!!!',
        '',
        '<a:trangtrig15:1546047955696488489> Giới tính: Nam',
        '<a:trangtrig15:1546047955696488489> Trạng thái: Đang chờ ghép đôi',
        '',
        'Tạo hồ sơ match ngay nào! <a:heartg1:1545307544808071258>',
      ].join('\n'),
    ),
    buildSparkFeedMatchRow(),
  );
}

export function buildSparkFeedDonePayload() {
  return container(
    text('## <a:trangtrig50:1567818385306165301> **SPARKED DONE** <a:trangtrig51:1567818549794439229>'),
    divider(),
    text(
      [
        '<a:heartg1:1545307544808071258> Xin thông báo, Cupid đã ghép đôi thành công một cặp đôi đồng điệu về tâm hồn!',
        '',
        '<a:heartg1:1545307544808071258> Còn bạn thì sao? Đừng ngồi tự hỏi "Hi, can I join?" nữa mà hãy mau mau tạo hồ sơ match ngay đi nhé!',
      ].join('\n'),
    ),
    buildSparkFeedMatchRow(),
  );
}
