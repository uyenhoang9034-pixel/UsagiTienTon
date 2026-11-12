import { logger } from '../utils/logger.js';

export const IS_COMPONENTS_V2 = 1 << 15; // 32768

export const SERVICE_TOS_CHANNEL_IDS = {
  TICKET_CHANNEL_ID: '1570346905928474624',
  FEEDBACK_CHANNEL_ID: '1570348805155594290',
};

export const SERVICE_TOS_EMOJIS = {
  HEADER_L: '<a:trangtrig2:1546040703375904801>',
  HEADER_R: '<a:trangtrig3:1546040818261954610>',
  BULLET_SERVICE: '<a:trangtrig60:1569558191551942696>',
  SUB_SECTION: '<a:trangtrig61:1569559986550612051>',
  HEART: '<a:heartg1:1545307544808071258>',
};

/**
 * Build 3 payload Components V2 cho lệnh &dichvu (TOS & Quy định giao dịch)
 */
export function buildServiceTosPayloadsV2() {
  const card1 = {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `# ${SERVICE_TOS_EMOJIS.HEADER_L} **ĐIỀU KHOẢN DỊCH VỤ (TOS) & QUY ĐỊNH GIAO DỊCH** ${SERVICE_TOS_EMOJIS.HEADER_R}`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              'Vui lòng đọc kỹ toàn bộ quy định dưới đây trước khi mở ticket đặt hàng hoặc đăng ký dịch vụ. Khi bạn tiến hành thanh toán, điều đó đồng nghĩa với việc bạn đã đọc, hiểu và đồng ý với tất cả các điều khoản này.',
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '# I. QUY ĐỊNH CHUNG & THANH TOÁN',
              `- Giao dịch chính thức: Mọi trao đổi, báo giá và thanh toán chỉ thực hiện duy nhất qua hệ thống ticket tại <#${SERVICE_TOS_CHANNEL_IDS.TICKET_CHANNEL_ID}>. Không bảo hộ các giao dịch tự ý thực hiện qua tin nhắn riêng (DMs) hoặc bên ngoài server.`,
              '- Hình thức thanh toán: Chuyển khoản ngân hàng / Ví điện tử theo đúng thông tin được cung cấp trong ticket. Server không nhận thanh toán bằng card hoặc các hình thức thanh toán khác.',
              '- Chính sách hoàn tiền chung: Không hỗ trợ hoàn tiền (refund) dưới mọi hình thức nếu khách hàng tự ý hủy ngang sau khi đơn hàng đã được xử lý, bot đã bắt đầu được code hoặc lớp học đã chốt và chuyển khoản (trừ các trường hợp có quy định riêng ở từng dịch vụ bên dưới).',
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '# II. ĐIỀU KHOẢN CHI TIẾT TỪNG DỊCH VỤ',
              `${SERVICE_TOS_EMOJIS.BULLET_SERVICE} **1. Dịch vụ Vibe Code Bot Discord theo yêu cầu**`,
              '- Đặt cọc & Thanh toán: Thanh toán trước 50% giá trị đơn hàng để bắt đầu tiến hành code; thanh toán 50% còn lại sau khi test tính năng hoàn tất và trước khi bàn giao chính thức.',
              '- Phạm vi tính năng: Chỉ thực hiện đúng danh sách tính năng đã chốt ban đầu trong ticket (không nhận lập trình các tính năng phát nhạc / music). Mọi yêu cầu phát sinh thêm ngoài thỏa thuận ban đầu sẽ được tính phụ phí tùy mức độ (tối thiểu 50k/tính năng).',
              '- Bản quyền sở hữu: Toàn bộ mã nguồn (source code) và thiết kế giao diện thuộc bản quyền độc quyền của dev. Khách hàng không được tự ý sao chép, chỉnh sửa để thương mại hóa hoặc bán lại cho bên thứ ba khi chưa có sự đồng ý.',
              '- Bảo hành kỹ thuật: Hỗ trợ sửa lỗi (bug) phát sinh từ phía code trong quá trình vận hành, hỗ trợ fix khi khách hàng thay đổi cấu trúc quyền/kênh trên server dẫn đến lỗi. Không chịu trách nhiệm bảo hành nếu khách hàng tự ý can thiệp sửa code.',
            ].join('\n'),
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };

  const card2 = {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `## ${SERVICE_TOS_EMOJIS.BULLET_SERVICE} **2. Dịch vụ Mua hộ Discord Nitro & Decoration (Cozy Store)**`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '> Lưu ý vai trò trung gian: Mình chỉ đóng vai trò mua hộ trung gian, do đó, mọi quy định về thời gian, bảo hành và chính sách refund đều được thực hiện theo điều khoản của bên Store bán gốc. Chi tiết xem ở đây:',
              '',
              `${SERVICE_TOS_EMOJIS.SUB_SECTION} **Quy định Mua hàng**`,
              '- Thanh toán: Thanh toán 100% giá trị đơn hàng trước khi mình tiến hành đặt đơn với Store.',
              '- Thời gian xử lý: Tất cả đơn hàng cam kết hoàn thành trong vòng 48 giờ. Đối với đơn preorder như decor gift, thời gian có thể lâu hơn (tối đa 7 ngày). Vui lòng hạn chế hối/giục đơn, mình sẽ báo ngay cho bạn khi Store báo hoàn tất (done).',
              '- Bảo mật tài khoản (Đối với gói cần Login - Nitro): Khách hàng vui lòng đổi **mật khẩu và mã dự phòng** ngay lập tức sau khi mình báo done đơn (kỹ thuật viên bên Store sẽ Logout ngay khi xong). Bên Store và mình không chịu trách nhiệm tranh chấp sau khi done đơn nếu bạn không đổi thông tin.',
              '- Đối với dạng Decor Gift Link: Link sẽ được gửi trực tiếp qua dm của bạn. Bạn cần bấm nhận ngay khi được giao link. Store KHÔNG BẢO HÀNH LINK sau khi đã gửi đi (vì toàn bộ link đều đã được kiểm tra hoạt động 100% trước khi bàn giao).',
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              `${SERVICE_TOS_EMOJIS.SUB_SECTION} **Chính sách Refund**`,
              '- Nếu yêu cầu hủy và hoàn tiền trước 48 giờ (khi đơn chưa hoàn tất), mức hoàn tiền tối đa chỉ là 50% giá trị đơn hàng.',
              '- Hàng đặt trước: Không hỗ trợ hoàn tiền trong thời gian chờ (chỉ hoàn tiền 100% nếu thời gian pre-order kéo dài quá lâu theo xác nhận của Store).',
              '- Sản phẩm gặp lỗi: Nếu sản phẩm phát sinh lỗi kỹ thuật hoặc không đúng mô tả, Store sẽ ưu tiên đổi mới (không hoàn tiền).',
              '- Từ chối hoàn tiền: Không hoàn tiền nếu lỗi không xuất phát từ phía mình hoặc Store gốc (tài khoản tự vi phạm chính sách Discord, chuyển khoản nhầm người nhận...)',
              '- Quy trình & Thời gian xử lý: Cần gửi bằng chứng giao dịch để đối soát. Store gốc xử lý hoàn tiền cố định 1 lần/tuần (Thứ 7 hoặc Chủ Nhật).',
            ].join('\n'),
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };

  const card3 = {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: `## ${SERVICE_TOS_EMOJIS.BULLET_SERVICE} **3. Dịch vụ Dạy kèm Tiếng Trung 1:1**`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '- Hình thức & Học phí: Lớp học áp dụng hình thức 1 kèm 1. Học viên thanh toán 100% học phí của khóa/gói buổi học đã đăng ký trước khi bắt đầu buổi học đầu tiên.',
              '- Dời lịch & Học bù: Vì là lịch dạy riêng 1:1, nếu có việc bận đột xuất, học viên vui lòng báo trước ít nhất 3–4 tiếng để được sắp xếp lịch học bù. Trường hợp báo sát giờ hoặc tự ý vắng mặt không lý do sẽ tính là đã hoàn thành buổi học đó (trừ trường hợp bất khả kháng).',
              '- Bảo lưu & Hủy khóa: Hỗ trợ bảo lưu lịch học nếu có lý do chính đáng và báo trước; không hoàn lại học phí nếu học viên tự ý bỏ ngang giữa chừng sau khi khóa học đã bắt đầu.',
            ].join('\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: [
              '# III. LƯU Ý KHÁC',
              `- **KHÔNG XỬ LÝ / HỖ TRỢ CHO BẤT KÌ TRƯỜNG HỢP NÀO KHÔNG FEEDBACK TRONG 24 GIỜ SAU KHI MUA HÀNG TẠI <#${SERVICE_TOS_CHANNEL_IDS.FEEDBACK_CHANNEL_ID}>!**`,
              '- Server có quyền từ chối phục vụ đối với những trường hợp thiếu tôn trọng, có hành vi gian lận hoặc cố tình gây rối trong quá trình giao dịch.',
              '- Các điều khoản dịch vụ (TOS) có thể được cập nhật, bổ sung bất kỳ lúc nào để phù hợp với tình hình vận hành mà không cần thông báo trước.',
              '',
              `Cảm ơn bạn đã tôn trọng quy định và ủng hộ dịch vụ của mình! ${SERVICE_TOS_EMOJIS.HEART}`,
            ].join('\n'),
          },
        ],
      },
    ],
    allowedMentions: { parse: [] },
  };

  return [card1, card2, card3];
}

/**
 * Xử lý các lệnh prefix thuộc hệ thống Ticket Mua Hàng / Dịch Vụ (hiện tại: &dichvu)
 */
export async function handleServiceTicketMessage(message) {
  if (!message || typeof message.content !== 'string' || !message.content) {
    return false;
  }

  const trimmed = message.content.trim();
  const dichVuMatch = trimmed.match(/^[&!]dichvu$/i);
  if (!dichVuMatch) {
    return false;
  }

  try {
    const payloads = buildServiceTosPayloadsV2();
    for (const payload of payloads) {
      await message.channel.send(payload);
    }

    await message.delete().catch(() => {});
  } catch (err) {
    logger.error('[ServiceTicket] Không thể gửi giao diện &dichvu:', err);
    await message.delete().catch(() => {});
    await message.channel
      .send('❌ Không thể hiển thị bảng Điều Khoản Dịch Vụ lúc này. Vui lòng thử lại sau.')
      .catch(() => {});
  }

  return true;
}
