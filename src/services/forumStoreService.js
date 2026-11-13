import {
  ButtonStyle,
  ChannelFlags,
  ChannelType,
  Routes,
} from 'discord.js';
import {
  SERVICE_TICKET_EMOJIS,
  SERVICE_TICKET_IDS,
} from '../config/serviceTicketConfig.js';
import {
  IS_COMPONENTS_V2,
  isServiceTicketStaff,
} from './serviceTicketService.js';
import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';
import { logger } from '../utils/logger.js';

export const FORUM_STORE_EMOJIS = Object.freeze({
  CHINESE_TITLE_L: '<a:trangtrig50:1567818385306165301>',
  CHINESE_TITLE_R: '<a:trangtrig51:1567818549794439229>',
  SECTION: SERVICE_TICKET_EMOJIS.SUB_SECTION, // <a:trangtrig61:1569559986550612051>
});

export const FORUM_STORE_TICKET_URL =
  `https://discord.com/channels/1541279801183178754/${SERVICE_TICKET_IDS.PANEL_CHANNEL_ID}`;

export const FORUM_STORE_ORDER = Object.freeze([
  'codebot',
  'nitrodecor',
  'chinese',
  'khac',
]);

export const FORUM_STORE_CATEGORIES = Object.freeze({
  codebot: {
    key: 'codebot',
    threadTitle: '01 • Vibe Code Bot Discord',
    defaultTagName: 'Vibe Code Bot',
    tagHints: ['vibe code', 'codebot', 'code bot', 'bot', 'dịch vụ', 'dich vu'],
    ready: false,
  },
  nitrodecor: {
    key: 'nitrodecor',
    threadTitle: '02 • Nitro Decor',
    defaultTagName: 'Nitro Decor',
    tagHints: ['nitro', 'decor', 'dịch vụ', 'dich vu'],
    ready: true,
  },
  chinese: {
    key: 'chinese',
    threadTitle: '03 • Chinese',
    defaultTagName: 'Chinese',
    tagHints: ['chinese', 'tiếng trung', 'tieng trung', 'khóa học', 'khoa hoc', 'dịch vụ', 'dich vu'],
    ready: true,
  },
  khac: {
    key: 'khac',
    threadTitle: '04 • Khác',
    defaultTagName: 'Khác',
    tagHints: ['khác', 'khac', 'theo yêu cầu', 'dịch vụ', 'dich vu'],
    ready: false,
  },
});

export function getForumStoreStorageKey(guildId, forumChannelId) {
  return `guild:${guildId}:forum_store:${forumChannelId}`;
}

function buildOpenTicketButtonRow() {
  return {
    type: 1,
    components: [
      {
        type: 2,
        style: ButtonStyle.Link,
        label: 'Mở Ticket',
        url: FORUM_STORE_TICKET_URL,
      },
    ],
  };
}

function buildForumV2Message(content, title = false, button = false) {
  const components = [];
  if (title) {
    components.push({ type: 10, content: '# <a:trangtrig2:1546040703375904801> **DỊCH VỤ THIẾT KẾ & VIBE CODE BOT DISCORD THEO YÊU CẦU** <a:trangtrig3:1546040818261954610>' });
    components.push({ type: 14, divider: true, spacing: 1 });
  }
  components.push({ type: 10, content });
  if (button) {
    components.push({ type: 14, divider: true, spacing: 1 });
    components.push(buildOpenTicketButtonRow());
  }
  return { flags: IS_COMPONENTS_V2, components: [{ type: 17, components }], allowedMentions: { parse: [] } };
}

export function buildForumStorePostPayloads(categoryKey) {
  if (categoryKey === 'codebot') {
    const parts = [
      [
        '**I. CÁC TÍNH NĂNG NHẬN THỰC HIỆN**',
        '',
        '**1. Hệ thống Quản lý & Tiện ích:**',
        '> Welcome/Goodbye tùy chỉnh, Auto-role, Reaction/Button Role, Auto-react & Auto-responder, Join-to-Create (tự động tạo phòng voice riêng), Ticket hỗ trợ, Cảnh cáo (warn) / Kỷ luật (ban), Tự động hóa thông báo (chúc mừng sinh nhật, vinh danh tự động, ..), ..',
        '',
        '**2. Hệ thống Nhà tù / Phạt vi phạm (đặt tên tùy chỉnh)**',
        '> Cách ly và xử phạt thành viên vi phạm (spam, gây rối...) vào khu vực riêng theo quy định server.',
        '',
        '**3. Hệ thống Boost Server & Donation**',
        '> Thông báo vinh danh tự động khi thành viên Boost server, ghi nhận Donate, bảng xếp hạng / tri ân người ủng hộ.',
        '',
        '**4. Hệ thống Giveaway chuyên sâu**',
        '> Tạo giveaway, quay số random tự động, tích hợp **bộ lọc ẩn nâng cao dành riêng cho Admin** (lọc bỏ người đã trúng giải hoặc danh sách loại trừ ẩn).',
        '',
        '**5. Hệ thống Game theo chủ đề / phong cách (Tu tiên, bí ẩn kiểu Witch Hunter, .. vv)**',
        '> Điểm danh hằng ngày, tiền tệ riêng, cửa hàng vật phẩm/role, túi đồ, nhiệm vụ ngày, đánh boss/săn quái theo lượt, bảng xếp hạng, ...',
        '',
        '**6. Tương tác & Cộng đồng**',
        '> Hệ thống Confession (gửi tâm sự ẩn danh kèm duyệt bài), hệ thống cấp độ (Leveling), Kết hôn (Marry), hồ sơ cá nhân (Profile), ...',
        '',
        '**7. Minigame & Học tập giải trí**',
        '> Nối từ, Đoán từ, các minigame đơn giản thiết kế theo chủ đề server; đặc biệt có **hệ thống học tiếng Trung, ôn luyện HSK và Đấu trường tiếng Trung** (so tài kiến thức từ HSK 1 đến HSK 9), ...',
        '',
        '**8. Ngoài những tính năng trên, bên mình có thể làm các tính năng khác theo yêu cầu, miễn là bạn có ý tưởng và bên mình sẽ kiểm tra tính khả thi trước khi thực hiện.**',
        '',
        '**9. Tích hợp Database riêng**',
        '> Lưu trữ dữ liệu ổn định, mượt mà, có thể nâng cấp thêm tính năng mới bất cứ lúc nào.',
      ].join('\n'),
      [
        '**II. LƯU Ý KỸ THUẬT (CÁC TÍNH NĂNG CẦN CÂN NHẮC)**',
        '',
        '- Vẫn nhận lập trình tính năng Phát nhạc (Music / Audio streaming) và Bot nói thay (TTS - Text to Speech trong kênh voice cho thành viên không bật mic).',
        '- Tuy nhiên do đặc thù các tính năng xử lý âm thanh này khá tốn RAM, nguồn nhạc hiện tại chưa thực sự ổn định nên **có thể xảy ra tình trạng giật/lag**. Dịch vụ sẽ không ưu tiên nhóm tính năng này và chỉ thực hiện khi khách hàng đã nắm rõ, đồng ý chấp nhận tình trạng trên.',
      ].join('\n'),
      [
        '**III. BẢNG GIÁ DỊCH VỤ**',
        '',
        '**Giá ưu đãi — 1.000.000 VNĐ**',
        '> - Đã bao gồm trọn bộ tính năng cơ bản + Tặng kèm 1 tháng Hosting.',
        '> - Đây là giá chạy thử, không phải giá cạnh tranh.',
        '',
        '<a:trangtrig61:1569559986550612051> **1. Quản lý & Tiện ích**',
        '- Welcome / Goodbye tùy chỉnh',
        '- Auto-role, Reaction / Button Role',
        '- Auto-react & Auto-responder',
        '- Ticket hỗ trợ',
        '- Cảnh cáo / Kỷ luật',
        '- Tự động hóa thông báo đơn giản',
        '- Join-to-Create (tự động tạo phòng voice riêng)',
        '',
        '<a:trangtrig61:1569559986550612051> **2. Hệ thống Nhà tù / Phạt vi phạm (đặt tên tùy chỉnh)**',
        '',
        '<a:trangtrig61:1569559986550612051> **3. Hệ thống Boost Server & Donation**',
        '- Thông báo vinh danh tự động khi thành viên Boost server',
        '- Hệ thống ghi nhận Donate, bảng xếp hạng / tri ân người ủng hộ.',
        '',
        '<a:trangtrig61:1569559986550612051> **4. Hệ thống Giveaway chuyên sâu**',
        '- Tạo giveaway, quay random tự động',
        '- Tích hợp **bộ lọc ẩn nâng cao dành riêng cho Admin**',
        '',
        '<a:trangtrig61:1569559986550612051> **5. Tương tác & Giải trí cố định**',
        '- Hệ thống Confession (gửi tâm sự ẩn danh kèm duyệt bài)',
        '- Hệ thống Leveling cơ bản',
        '- Kết hôn (Marry)',
        '- 2 minigame cố định (Nối từ & Đoán từ)',
        '',
        '<a:trangtrig61:1569559986550612051> **6. Đặc quyền hỗ trợ thêm**',
        '- Hỗ trợ **setup / setting cấu trúc server hoàn chỉnh** (kênh, danh mục, phân quyền) nếu khách hàng chưa xây dựng xong server, giúp bot hoạt động đồng bộ và mượt mà nhất.',
        '',
        '<a:trangtrig60:1569558191551942696> **Các tính năng nâng cao**',
        '> - Không bao gồm trong gói cơ bản.',
        '> - Thu phụ phí thêm tùy theo tính năng.',
        '- Hệ thống Game nhập vai theo chủ đề có Database chuyên sâu (Tu tiên, Witch Hunter, kinh tế, túi đồ, cửa hàng, đánh boss/nhiệm vụ...).',
        '- Hệ thống Học tập & Đấu trường tiếng Trung (HSK 1 – HSK 9).',
        '- Các tính năng xử lý âm thanh (Music, Bot nói thay TTS) hoặc các tính năng thiết kế đặc thù riêng ngoài gói cơ bản.',
      ].join('\n'),
      [
        '**IV. TRẢI NGHIỆM TEST BOT TRỰC TIẾP**',
        '',
        '<a:trangtrig62:1569560241190871152> **Hỗ trợ cấp quyền Test Bot trực tiếp**',
        'Trước khi quyết định đặt làm, nếu bạn muốn trải nghiệm thực tế các tính năng quản trị (những lệnh mà member thông thường không dùng được), bên mình sẵn sàng **cấp tạm role quản lý tại server của mình trong vòng 2 giờ** để bạn trực tiếp test bot và đánh giá trước khi chốt đơn.',
        '',
        '<a:bang2:1546891483250954290> **Quy định bắt buộc khi Test:**',
        '- Chỉ được test bot sau khi cọc tiền.',
        '- Trong suốt quá trình được cấp quyền, khách hàng **tuyệt đối không** được làm ảnh hưởng đến dữ liệu, cấu trúc hoặc hoạt động có sẵn trong server; không lạm quyền hoặc sử dụng role vào bất kỳ mục đích nào khác ngoài việc test bot.',
        '- Nếu bạn sử dụng role quản lý cho mục đích tiêu cực, bạn hoàn toàn có thể **mất cọc**. Bên mình sẽ không hoàn cọc trong bất kì tình huống nào nếu phát hiện.',
      ].join('\n'),
      [
        '**V. QUY ĐỊNH VỀ HOSTING & DUY TRÌ BOT 24/7**',
        '',
        '<a:heartg1:1545307544808071258> Sau khi hoàn thiện code và bàn giao mã nguồn qua **GitHub**, bot cần được đẩy lên nền tảng **Hosting** để hoạt động liên tục 24/7.',
        '<a:heartg1:1545307544808071258> Ưu đãi tháng đầu: Miễn phí **1 tháng Hosting đầu tiên** cho mọi đơn hàng.',
        '<a:heartg1:1545307544808071258> Từ tháng thứ 2 trở đi, bạn có thể chọn một trong hai hình thức sau:',
        '',
        '**1. Hình thức Tự quản lý Hosting (Khuyên dùng):**',
        '- Khách hàng tự cài đặt (setting) và thanh toán phí duy trì hằng tháng trực tiếp trên nền tảng Hosting.',
        '- Nền tảng hỗ trợ: Bên mình chỉ hỗ trợ và hướng dẫn cài đặt Hosting trên **Railway**. Nếu bạn sử dụng các nền tảng khác, bên mình chỉ bàn giao file GitHub và không thể hỗ trợ kỹ thuật cài đặt.',
        '> Thực ra có thể hướng dẫn kỹ thuật nhưng sẽ không đảm bảo độ chuẩn xác khi bên mình chưa nắm rõ nguyên tắc hoạt động của web Hosting đó.',
        '',
        '**2. Hình thức Ủy quyền Hosting trọn gói (Dành cho khách chưa quen kỹ thuật):**',
        '- Nếu bạn chưa quen thao tác về code/kỹ thuật hoặc bận rộn không tiện tự quản lý, bên mình nhận duy trì Hosting giùm trọn gói để đảm bảo bot luôn online 24/7.',
        '- Các gói Hosting Railway áp dụng (theo giá chuẩn của web):',
        '',
        '<a:trangtrig53:1567819189866201219> **Gói Hobby — $5 / tháng (~130.000 VNĐ) + Phụ phí dịch vụ 20.000 VNĐ/tháng:** Đáp ứng tốt cho server vừa và nhỏ, chạy ổn định khoảng 1–2 bot.',
        '<a:trangtrig53:1567819189866201219> **Gói Pro — $20 / tháng (~520.000 VNĐ) + Phụ phí dịch vụ 30.000 VNĐ/tháng:** Gói tài nguyên lớn, dung lượng và băng thông rất rộng.',
        '<a:bang2:1546891483250954290> Lưu ý: Với 1 server quy mô không quá đông và chỉ chạy duy nhất 1 project cho 1 bot thì **không cần thiết** phải dùng đến gói Pro này.',
        '> Ví dụ thực tế: Một server khoảng 100 thành viên vận hành 1–2 bot trong 1 tháng thì mức tài nguyên tiêu thụ thường còn chưa tới $5.',
        '',
        '- Quy trình thu phí hằng tháng: Mỗi tháng tính từ ngày đầu tiên bàn giao bot và bắt đầu sử dụng hosting, bên mình sẽ **chụp ảnh đối soát chi tiết** mức sử dụng thực tế trong tháng của bot gửi bạn kiểm tra minh bạch, sau đó cộng thêm phụ phí dịch vụ tương ứng ở trên để tiến hành gia hạn. Số tiền không nhất thiết sẽ chuẩn xác 5-20$, mà tùy vào lượng sử dụng.',
      ].join('\n'),
      [
        '**VI. THỜI GIAN BÀN GIAO, BẢO HÀNH & QUY TRÌNH ĐẶT HÀNG**',
        '',
        '<a:heartg8:1567818755793358928> **Thời gian hoàn thiện dự kiến:**',
        '- Tùy vào độ chi tiết và thỏa thuận giữa hai bên, thời gian bàn giao sẽ thong thả trong **khoảng 1 tuần** do cần thời gian tinh chỉnh kỹ lưỡng nhiều hạng mục như hỗ trợ setup cấu trúc server, chọn lọc và gắn bộ emoji phù hợp cho từng lệnh, ...',
        '- Sau khi bàn giao vẫn hỗ trợ chỉnh sửa hoàn thiện thêm theo thỏa thuận.',
        '',
        '<a:heartg8:1567818755793358928> **Cam kết đồng hành & Khắc phục lỗi kỹ thuật:**',
        '- Vì bot được lập trình thủ công (custom) từ đầu theo yêu cầu riêng nên trong quá trình vận hành thực tế khó tránh khỏi đôi lúc phát sinh những lỗi nhỏ hoặc sai sót kỹ thuật ngoài ý muốn từ phía bên mình.',
        '- Sẽ test trước khi bàn giao, tuy nhiên nếu gặp sự cố, bạn chỉ cần báo lại — bên mình cam kết hợp tác hết mình, tiếp nhận phản hồi và hỗ trợ fix lỗi nhanh chóng, tận tình nhất có thể.',
        '',
        '<a:heartg8:1567818755793358928> **Quy trình đặt hàng:**',
        '<a:1_:1563484001765949550> Bước 1: Mở ticket tại kênh ticket (ấn nút bên dưới), nêu rõ chủ đề server và danh sách tính năng muốn làm.',
        '> - Ví dụ: server booking, server gaming, server học tập, server cộng đồng, ...',
        '> - Mình vẫn hỗ trợ custom lời thoại, màu sắc và phong cách hiển thị theo đúng chủ đề đó ngay trong Gói Cơ Bản (không tính thêm phụ phí), nhưng bạn cần mô tả rõ ngay từ đầu để tránh phải đập đi làm lại nhiều lần.',
        '',
        '<a:2_:1563484061111156828> Bước 2: Chốt giao diện, tính năng, nhận báo giá chi tiết và thời gian hoàn thành.',
        '',
        '<a:3_:1563484342779388045> Bước 3: Đặt cọc 50%, tiến hành code, test trực tiếp trên server mẫu và bàn giao hoàn chỉnh.',
        '',
        '<a:bang2:1546891483250954290> **Lưu ý:**',
        'Để giao diện hiển thị của từng lệnh bot được chỉn chu, đẹp mắt và đẩy nhanh tiến độ hoàn thiện, bạn nên phác thảo trước ý tưởng trong đầu và chuẩn bị sẵn bộ **emoji** (emoji mặc định hoặc emoji riêng của server) mà bạn muốn gắn vào các nút bấm, embed và thông báo của bot.',
      ].join('\n'),
    ];

    return parts.map((content, index) => buildForumV2Message(content, index === 0, index === 5));
  }

  if (categoryKey === 'nitrodecor') return buildNitroDecorForumStorePostPayloads();
  if (categoryKey === 'chinese') return [buildChineseForumStorePostPayload()];

  const placeholderTitles = { khac: 'DỊCH VỤ KHÁC' };
  const titleText = placeholderTitles[categoryKey] || 'DỊCH VỤ SERVER';
  return [{
    flags: IS_COMPONENTS_V2,
    components: [{
      type: 17,
      components: [
        { type: 10, content: '# **' + titleText + '**' },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: 'Nội dung chi tiết dịch vụ đang được cập nhật. Bạn vẫn có thể bấm nút bên dưới để mở ticket trao đổi trực tiếp với tụi mình nhé!' },
        buildOpenTicketButtonRow(),
      ],
    }],
    allowedMentions: { parse: [] },
  }];
}

export function buildForumStorePostPayload(categoryKey) {
  return buildForumStorePostPayloads(categoryKey)[0];
}

function buildNitroDecorForumStorePostPayloads() {
  const parts = [
    // Tin nhắn 1: Header + Giới thiệu + I. Danh mục nhận mua hộ
    {
      title: true,
      content: [
        'Nhận mua hộ trung gian các gói nâng cấp tài khoản, vật phẩm trang trí hồ sơ Discord chính chủ, uy tín, nhanh gọn và bảo hành đầy đủ theo quy định mục **TOS**.',
        '',
        '# I. DANH MỤC NHẬN MUA HỘ',
        '<a:trangtrig62:1569560241190871152> Discord Nitro',
        '- Nitro Boost gói 1 tháng: 90.000 VNĐ',
        '- Nitro Boost gói 1 năm: 810.000 VNĐ',
        '- Không nhận gói 2 tháng, không cần phải nuôi mail, up nitro chính chủ.',
        '',
        '<a:trangtrig62:1569560241190871152> Decoration',
        '- Toàn bộ khung viền ảnh đại diện đang mở bán trên Discord Shop (bao gồm cả các bộ sưu tập sự kiện / giới hạn - miễn còn hạn mua). Chỉ nhận dạng Decor Gift Link (không cần login acc). Các gói combo trang trí hoặc quà tặng gửi trực tiếp cho bạn bè.',
        '',
        '<a:trangtrig61:1569559986550612051> Bảng giá lẻ như sau:',
        '~~66.000đ~~ | 35.000đ',
        '~~79.000đ~~ | 41.000đ',
        '~~92.000đ~~ | 51.000đ',
        '~~105.000đ~~ | 60.000đ',
        '~~111.000đ~~ | 65.000đ',
        '~~118.000đ~~ | 70.000đ',
        '~~131.000đ~~ | 85.000đ',
        '~~141.000đ~~ | 90.000đ',
        '',
        '<a:trangtrig61:1569559986550612051> Bảng giá combo như sau:',
        '~~118.000đ~~ | 70.000đ',
        '~~136.000đ~~ | 85.000đ',
        '~~146.000đ~~ | 95.000đ',
        '~~155.000đ~~ | 100.000đ',
        '~~189.000đ~~ | 115.000đ',
        '~~220.000đ~~ | 145.000đ',
        '~~300.000đ~~ | 210.000đ',
      ].join('\n'),
      button: false,
    },
    // Tin nhắn 2: II. Cam kết & Quy định dịch vụ
    {
      title: false,
      content: [
        '# II. CAM KẾT & QUY ĐỊNH DỊCH VỤ (TRUNG GIAN ORDER)',
        '<a:trangtrig60:1569558191551942696> Nguồn gốc an toàn: Nguồn thanh toán sạch, chính chủ 100% từ Store cung cấp uy tín, an toàn tuyệt đối cho tài khoản.',
        '<a:trangtrig60:1569558191551942696> Thời gian xử lý: Tất cả đơn hàng cam kết hoàn thành trong vòng **48 giờ** kể từ khi xác nhận thanh toán (vui lòng hạn chế giục đơn, mình sẽ báo ngay khi Store hoàn tất). Riêng đơn decor gift link là preorder, trong khoảng 1 tuần đổ lại.',
        '<a:trangtrig60:1569558191551942696> Bảo mật tài khoản (Đối với gói cần Login): Khách hàng vui lòng **đổi Mật khẩu & Mã dự phòng ngay lập tức** sau khi mình báo Done đơn.',
        '<a:trangtrig60:1569558191551942696> Đối với dạng Link Quà Tặng (Gift Link): Khách hàng cần **bấm nhận ngay khi được gửi link**, mỗi link thường có giới hạn khoảng 48 giờ tính từ lúc bắt đầu tạo link.',
        '<a:trangtrig60:1569558191551942696> Điều kiện kích hoạt bảo hành: Sau khi nhận hàng thành công, bạn vui lòng **gửi Feedback theo mẫu** tại kênh feedback dịch vụ (ấn nút bên dưới) trong vòng **24 giờ** để được hỗ trợ bảo hành trọn gói.',
        '',
        '<a:trangtrig49:1567818140375851018> *Mọi quy định chi tiết về hoàn tiền/refund áp dụng theo điều khoản của Store gốc tại kênh điều khoản dịch vụ (ấn nút bên dưới).*',
      ].join('\n'),
      button: false,
    },
    // Tin nhắn 3: III. Lưu ý + Nút mở ticket
    {
      title: false,
      content: [
        '# III. LƯU Ý',
        '<a:heartg8:1567818755793358928> Role Super Donate (donate ≥ 500.000đ) và role Legendary Donator (donate ≥ 1.000.000đ) sẽ được mua giá gốc (có bảng giá riêng sẽ gửi khi mở ticket).',
        '<a:heartg8:1567818755793358928> Mình không phải ctv, không pr, mình chỉ là khách hay mua của Store gốc, đã từng mua nhiều và tin tưởng dịch vụ, nên nhận mua hộ (có phí nhẹ) cho ai thực sự cần. Các bạn cũng có thể ghé Store gốc để mua (tạo ticket lấy link) nếu cần, nếu không mua xin đừng nói lời cay đắng. <a:catg2:1541439091365773362>',
      ].join('\n'),
      button: true,
    },
  ];

  return parts.map((part) => {
    const components = [];
    if (part.title) {
      components.push({
        type: 10,
        content: '# <a:trangtrig50:1567818385306165301> **DỊCH VỤ MUA HỘ DISCORD NITRO & DECORATION** <a:trangtrig51:1567818549794439229>',
      });
      components.push({ type: 14, divider: true, spacing: 1 });
    }
    components.push({ type: 10, content: part.content });
    if (part.button) {
      components.push({ type: 14, divider: true, spacing: 1 });
      components.push(buildOpenTicketButtonRow());
    }
    return {
      flags: IS_COMPONENTS_V2,
      components: [{ type: 17, components }],
      allowedMentions: { parse: [] },
    };
  });
}

function buildChineseForumStorePostPayload() {
  const E = FORUM_STORE_EMOJIS;
  return {
    flags: IS_COMPONENTS_V2,
    components: [{
      type: 17,
      components: [
        { type: 10, content: '# ' + E.CHINESE_TITLE_L + ' **KHÓA HỌC & KÈM TIẾNG TRUNG 1:1** ' + E.CHINESE_TITLE_R },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: 'Server nhận dạy tiếng Trung 1 kèm 1 trực tiếp từ con số 0 đến trình độ HSK 3. Lộ trình cá nhân hóa hoàn toàn theo tốc độ tiếp thu của từng bạn với mức học phí siêu mềm cho học sinh – sinh viên và người đi làm bận rộn.' },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: [
          E.SECTION + ' 1. Các chương trình nhận kèm 1:1:',
          '- Người mới bắt đầu (Nền tảng): Làm quen phát âm chuẩn (Pinyin), quy tắc viết chữ Hán, thanh điệu và từ vựng cơ bản.',
          '- Luyện thi & Ôn tập HSK 1 – HSK 3: Bám sát giáo trình chuẩn HSK 1, HSK 2, HSK 3; hướng dẫn mẹo làm bài, luyện đủ 4 kỹ năng (Nghe – Nói – Đọc – Viết) và chữa đề trực tiếp 1:1.',
          '- Kèm theo yêu cầu riêng: Ôn tập kiến thức trên trường, chỉnh sửa phát âm chi tiết hoặc củng cố lại ngữ pháp cơ bản còn hổng.',
          '',
          E.SECTION + ' 2. Đặc quyền khi học kèm 1:1:',
          '- Theo sát 100%: Giáo viên chỉ tập trung hướng dẫn duy nhất một mình bạn trong suốt buổi học, chỉnh phát âm và sửa lỗi ngay lập tức, không lo ngại ngùng hay theo không kịp tiến độ.',
          '- Học phí "giá deal": Mức giá ưu đãi đặc biệt dành riêng cho thành viên trong server, có gói đăng ký theo buổi lẻ hoặc theo tháng linh hoạt.',
          '- Tài liệu miễn phí: Tặng kèm file giáo trình, bài tập và hỗ trợ giải đáp thắc mắc ngoài giờ học.',
          '- Giáo viên có kinh nghiệm, đã từng du học Trung Quốc, trình độ giảng dạy đủ để đảm nhiệm lớp học.',
          '',
          E.SECTION + ' 3. Khung giờ trống hiện tại:',
          '- Lịch nhận lớp: Thứ 3 & Thứ 5 hằng tuần',
          '- Khung giờ: 20:00 – 21:00 (hoặc 20:00 – 21:30) (Học trực tuyến qua nền tảng trực tuyến tiện lợi).',
        ].join('\n') },
        { type: 14, divider: true, spacing: 1 },
        { type: 10, content: [
          E.SECTION + ' 4. Cách thức đăng ký & Tư vấn lộ trình:',
          '- Bạn vui lòng mở ticket (ấn nút để mở), khi hiện bảng chọn vui lòng điền "chinese" để bot tạo ticket tự động cho bạn nhé.',
          '- Khi tạo ticket thành công, vui lòng nói sơ qua về Trình độ hiện tại + Mục tiêu (HSK 1 / HSK 2 / HSK 3) + Khung giờ chọn (8h–9h hoặc 8h–9h30 tối T3-T5) để được test nhanh, tư vấn lộ trình và nhận bảng học phí ưu đãi nhé!',
          '',
          '*Học 1 kèm 1 siêu sát sao – hiểu bài ngay tại lớp – chi phí cực hạt dẻ!*',
        ].join('\n') },
        buildOpenTicketButtonRow(),
      ],
    }],
    allowedMentions: { parse: [] },
  };
}

/**
 * Đảm bảo kênh diễn đàn có sẵn tag cho từng danh mục (giữ nguyên các tag đã có, chỉ thêm tag còn thiếu).
 */
export async function ensureForumStoreTags(forumChannel) {
  if (!forumChannel) return forumChannel;
  const existingTags = Array.isArray(forumChannel.availableTags)
    ? forumChannel.availableTags.map((t) => ({
        ...(t.id ? { id: t.id } : {}),
        name: t.name,
        ...(typeof t.moderated === 'boolean' ? { moderated: t.moderated } : {}),
        ...(t.emoji ? { emoji: t.emoji } : {}),
      }))
    : [];

  const tagsToAdd = [];
  for (const key of FORUM_STORE_ORDER) {
    const matched = pickForumAppliedTags(forumChannel, key);
    if (matched.length > 0) continue;

    const defaultName = FORUM_STORE_CATEGORIES[key]?.defaultTagName;
    if (!defaultName) continue;

    const alreadyPending = tagsToAdd.some(
      (t) => t.name.toLowerCase() === defaultName.toLowerCase(),
    );
    const alreadyExists = existingTags.some(
      (t) => String(t.name || '').toLowerCase() === defaultName.toLowerCase(),
    );
    if (!alreadyPending && !alreadyExists && existingTags.length + tagsToAdd.length < 20) {
      tagsToAdd.push({ name: defaultName });
    }
  }

  if (tagsToAdd.length > 0 && typeof forumChannel.setAvailableTags === 'function') {
    try {
      const updated = await forumChannel.setAvailableTags(
        [...existingTags, ...tagsToAdd],
        'Usagi Forum Store: tự động tạo tag cho các danh mục dịch vụ',
      );
      if (updated && Array.isArray(updated.availableTags)) {
        return updated;
      }
    } catch (err) {
      logger.warn('[ForumStore] Không thể tự tạo tag diễn đàn (thiếu quyền Quản lý kênh?):', err?.message || err);
    }
  }

  return forumChannel;
}

/**
 * Chọn Forum Tag phù hợp từ availableTags của kênh diễn đàn (nếu có).
 */
export function pickForumAppliedTags(forumChannel, categoryKey) {
  const availableTags = Array.isArray(forumChannel?.availableTags)
    ? forumChannel.availableTags
    : [];

  if (availableTags.length === 0) {
    return [];
  }

  const hints = FORUM_STORE_CATEGORIES[categoryKey]?.tagHints || [];
  for (const hint of hints) {
    const found = availableTags.find((tag) =>
      String(tag?.name || '').toLowerCase().includes(hint.toLowerCase()),
    );
    if (found?.id) {
      return [found.id];
    }
  }

  const requiresTag = Boolean(forumChannel?.flags?.has?.(ChannelFlags?.RequireTag));
  if (requiresTag && availableTags[0]?.id) {
    return [availableTags[0].id];
  }

  return [];
}

async function editForumStarterMessage(thread, client, messageId, payload) {
  const targetMsgId = messageId || thread.id;
  if (typeof thread.messages?.edit === 'function') {
    await thread.messages.edit(targetMsgId, payload);
    return targetMsgId;
  }

  const rest = client?.rest || thread.client?.rest;
  if (rest && typeof rest.patch === 'function') {
    await rest.patch(Routes.channelMessage(thread.id, targetMsgId), {
      body: payload,
    });
    return targetMsgId;
  }

  throw new Error('Không thể chỉnh sửa bài đăng diễn đàn hiện có.');
}

async function listForumThreadsByName(forumChannel) {
  const byName = new Map();
  if (!forumChannel?.threads) return byName;

  if (typeof forumChannel.threads.fetchActive === 'function') {
    const active = await forumChannel.threads.fetchActive().catch(() => null);
    if (active?.threads?.values) {
      for (const th of active.threads.values()) {
        if (th?.name) byName.set(String(th.name).trim().toLowerCase(), th);
      }
    }
  }

  if (typeof forumChannel.threads.fetchArchived === 'function') {
    const archived = await forumChannel.threads.fetchArchived({ type: 'public', limit: 50 }).catch(() => null);
    if (archived?.threads?.values) {
      for (const th of archived.threads.values()) {
        const key = String(th?.name || '').trim().toLowerCase();
        if (key && !byName.has(key)) {
          byName.set(key, th);
        }
      }
    }
  }

  return byName;
}

/**
 * Tạo mới hoặc cập nhật (edit in-place) cả 4 bài đăng diễn đàn trong kênh Forum chỉ định.
 */
export async function syncForumStorePosts({
  guild,
  forumChannel,
  client,
  recreateKeys = [],
}) {
  if (!guild || !forumChannel) {
    return { ok: false, errorMessage: '❌ Không xác định được server hoặc kênh diễn đàn.' };
  }

  if (
    forumChannel.type !== undefined &&
    forumChannel.type !== ChannelType.GuildForum
  ) {
    return { ok: false, errorMessage: '❌ Kênh được chọn không phải là kênh Diễn đàn (Forum).' };
  }

  const resolvedForum = await ensureForumStoreTags(forumChannel);
  const storageKey = getForumStoreStorageKey(guild.id, resolvedForum.id);
  const existingState = (await getDatabaseValue(client, storageKey, null)) || {};
  const savedPosts = { ...(existingState.posts || {}) };
  const liveThreadsByName = await listForumThreadsByName(resolvedForum);

  const shouldRecreatePosts =
    recreateKeys.length > 0
      ? recreateKeys
      : !existingState.recreated_v3
        ? ['nitrodecor', 'chinese', 'khac']
        : [];

  const created = [];
  const updated = [];

  for (const key of FORUM_STORE_ORDER) {
    const entry = FORUM_STORE_CATEGORIES[key];
    const payloads = buildForumStorePostPayloads(key);
    const payload = payloads[0];
    const appliedTags = pickForumAppliedTags(resolvedForum, key);
    const prev = savedPosts[key];

    let existingThread = null;
    if (prev?.threadId) {
      existingThread =
        guild.channels?.cache?.get?.(prev.threadId) ||
        (typeof guild.channels?.fetch === 'function'
          ? await guild.channels.fetch(prev.threadId).catch(() => null)
          : null) ||
        (typeof client?.channels?.fetch === 'function'
          ? await client.channels.fetch(prev.threadId).catch(() => null)
          : null);
    }

    if (!existingThread) {
      existingThread = liveThreadsByName.get(entry.threadTitle.toLowerCase()) || null;
    }

    if (shouldRecreatePosts.includes(key)) {
      if (existingThread) {
        if (typeof existingThread.setLocked === 'function') {
          await existingThread.setLocked(false).catch(() => {});
        }
        if (typeof existingThread.delete === 'function') {
          await existingThread.delete('Xóa bài cũ mục 2, 3, 4 để đăng lại').catch(() => {});
        }
        existingThread = null;
      }
      delete savedPosts[key];
    }

    if (existingThread) {
      if (existingThread.archived && typeof existingThread.setArchived === 'function') {
        await existingThread.setArchived(false).catch(() => {});
      }

      if (appliedTags.length > 0) {
        const currentTags = Array.isArray(existingThread.appliedTags) ? existingThread.appliedTags : [];
        if (currentTags.length === 0 && typeof existingThread.setAppliedTags === 'function') {
          await existingThread.setAppliedTags(appliedTags).catch(() => {});
        }
      }

      const editedMsgId = await editForumStarterMessage(
        existingThread,
        client,
        prev?.messageId || existingThread.id,
        payload,
      );

      const previousExtraIds = Array.isArray(prev?.additionalMessageIds) ? prev.additionalMessageIds : [];
      const nextExtraIds = [];
      for (let i = 1; i < payloads.length; i += 1) {
        const oldMessage = previousExtraIds[i - 1]
          ? await existingThread.messages.fetch(previousExtraIds[i - 1]).catch(() => null)
          : null;
        if (oldMessage) {
          await oldMessage.edit(payloads[i]);
          nextExtraIds.push(oldMessage.id);
        } else {
          const sentMessage = await existingThread.send(payloads[i]);
          if (sentMessage?.id) nextExtraIds.push(sentMessage.id);
        }
      }

      for (const obsoleteId of previousExtraIds.slice(payloads.length - 1)) {
        const obsolete = await existingThread.messages.fetch(obsoleteId).catch(() => null);
        if (obsolete) await obsolete.delete().catch(() => {});
      }

      if (typeof existingThread.setLocked === 'function') {
        await existingThread.setLocked(true, 'Khóa bài đăng dịch vụ sau khi cập nhật nội dung').catch(() => {});
      }

      savedPosts[key] = {
        threadId: existingThread.id,
        messageId: editedMsgId,
        additionalMessageIds: nextExtraIds,
        appliedTags,
        updatedAt: Date.now(),
      };
      updated.push({ key, threadId: existingThread.id, title: entry.threadTitle });
      continue;
    }

    const thread = await resolvedForum.threads.create({
      name: entry.threadTitle,
      ...(appliedTags.length > 0 ? { appliedTags } : {}),
      message: payload,
    });

    const threadId = thread?.id || null;
    const additionalMessageIds = [];
    for (let i = 1; i < payloads.length; i += 1) {
      const sentMessage = await thread.send(payloads[i]);
      if (sentMessage?.id) additionalMessageIds.push(sentMessage.id);
    }

    if (typeof thread.setLocked === 'function') {
      await thread.setLocked(true, 'Khóa bài đăng dịch vụ sau khi đăng nội dung').catch(() => {});
    }

    savedPosts[key] = {
      threadId,
      messageId: threadId,
      additionalMessageIds,
      appliedTags,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    created.push({ key, threadId, title: entry.threadTitle });
  }

  await setDatabaseValue(client, storageKey, {
    forumChannelId: resolvedForum.id,
    posts: savedPosts,
    recreated_v3: true,
    updatedAt: Date.now(),
  });

  logger.info('[ForumStore] Đã đồng bộ bài đăng diễn đàn', {
    guildId: guild.id,
    forumChannelId: resolvedForum.id,
    created: created.length,
    updated: updated.length,
  });

  return {
    ok: true,
    created,
    updated,
    posts: savedPosts,
  };
}

/**
 * Tự động đồng bộ bài đăng vào kênh diễn đàn mặc định (1570392561200398407) khi bot khởi động.
 */
export async function initForumStoreSync(client) {
  const forumChannelId = SERVICE_TICKET_IDS.FORUM_CHANNEL_ID;
  if (!client || !forumChannelId) {
    return null;
  }

  const forumChannel =
    client.channels?.cache?.get?.(forumChannelId) ||
    (typeof client.channels?.fetch === 'function'
      ? await client.channels.fetch(forumChannelId).catch(() => null)
      : null);

  if (!forumChannel || !forumChannel.guild || forumChannel.type !== ChannelType.GuildForum) {
    logger.warn('[ForumStore] Không tìm thấy kênh diễn đàn mặc định để đồng bộ:', { forumChannelId });
    return null;
  }

  return syncForumStorePosts({
    guild: forumChannel.guild,
    forumChannel,
    client,
  });
}

/**
 * Lệnh prefix &postforum [ID hoặc #kênh_diễn_đàn] (mặc định kênh 1570392561200398407, chỉ SP Ticket / Admin / Owner)
 */
export async function handleForumStoreMessage(message, client) {
  if (!message || message.author?.bot || !message.guild || typeof message.content !== 'string') {
    return false;
  }

  const trimmed = message.content.trim();
  const match = trimmed.match(/^[&!](?:postforum|upforum)(?:\s+(.+))?$/i);
  if (!match) {
    return false;
  }

  if (!isServiceTicketStaff(message.member, message.author?.id, client)) {
    await message.delete().catch(() => {});
    return true;
  }

  const rawArg = String(match[1] || '').trim();
  const isReset = /\b(reset|recreate|remake|repost|xoa|xóa)\b/i.test(rawArg);
  const arg = rawArg.replace(/\b(reset|recreate|remake|repost|xoa|xóa)\b/gi, '').trim();
  const channelIdMatch = arg.match(/(?:<#)?(\d{15,22})>?/);
  const targetChannelId = channelIdMatch
    ? channelIdMatch[1]
    : SERVICE_TICKET_IDS.FORUM_CHANNEL_ID || message.channel?.parentId || message.channel?.id;

  await message.delete().catch(() => {});

  const forumChannel =
    message.guild.channels?.cache?.get?.(targetChannelId) ||
    (typeof message.guild.channels?.fetch === 'function'
      ? await message.guild.channels.fetch(targetChannelId).catch(() => null)
      : null);

  if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
    await message.channel
      .send('❌ Vui lòng nhập đúng ID hoặc tag `#kênh-diễn-đàn` (Ví dụ: `&postforum #bảng-giá`).')
      .catch(() => {});
    return true;
  }

  try {
    const result = await syncForumStorePosts({
      guild: message.guild,
      forumChannel,
      client,
      recreateKeys: isReset ? ['nitrodecor', 'chinese', 'khac'] : [],
    });

    if (!result.ok) {
      await message.channel.send(result.errorMessage).catch(() => {});
      return true;
    }

    await message.channel
      .send(
        `✅ Đã đồng bộ bài đăng diễn đàn tại <#${forumChannel.id}> (Tạo mới: **${result.created.length}**, Cập nhật: **${result.updated.length}**).`,
      )
      .catch(() => {});
  } catch (err) {
    logger.error('[ForumStore] Lỗi đồng bộ bài đăng diễn đàn:', err);
    await message.channel
      .send('❌ Không thể đăng bài vào kênh diễn đàn. Vui lòng kiểm tra quyền của bot trong kênh diễn đàn đó.')
      .catch(() => {});
  }

  return true;
}

