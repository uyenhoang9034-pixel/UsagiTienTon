import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { logger } from '../utils/logger.js';

/**
 * ID kênh than vãn tư bản duy nhất được phép kích hoạt tính năng.
 */
export const THAN_VAN_CHANNEL_ID = '1559832849798926357';

/**
 * Thời gian cooldown giữa các lần trả lời cùng loại từ khóa trong kênh (2 phút).
 */
export const COOLDOWN_MS = 2 * 60 * 1000; // 120.000 ms = 2 phút

/**
 * Cooldown hiển thị thanh nộ khí tự động (để tránh spam kênh khi nhiều người chat từ cay cú).
 */
export const RAGE_ANNOUNCE_COOLDOWN_MS = 60 * 1000; // 1 phút

/**
 * Map lưu timestamp kích hoạt gần nhất để tính cooldown theo từng kênh và từ khóa.
 * Key dạng: `${type}-${channelId}`
 */
const cooldowns = new Map();

/**
 * Lưu trữ nộ khí theo từng guild (server).
 * Giá trị từ 0 đến 100.
 */
const serverRageMeters = new Map();

// ==========================================
// REGEX ĐỐI SOÁT TỪ KHÓA
// ==========================================

const TAN_LAM_REGEX =
  /(tan làm|được về|tan ca|mấy giờ về|giờ chuồn|bao giờ về|khi nào về|giờ về|chuồn khỏi tư bản)/i;
const TAN_LAM_NO_ACCENT_REGEX =
  /(tan lam|duoc ve|tan ca|may gio ve|gio chuon|bao gio ve|khi nao ve|gio ve|chuon khoi tu ban)/i;

const LUONG_REGEX =
  /(phát lương|ngày lương|ting\s*ting|bao giờ.*lương|khi nào.*lương|tiền về|hóng lương|sắp có lương|lương.*về|hóng ting ting)/i;
const LUONG_NO_ACCENT_REGEX =
  /(phat luong|ngay luong|ting\s*ting|bao gio.*luong|khi nao.*luong|tien ve|hong luong|sap co luong|luong.*ve|hong ting ting)/i;

const BOC_QUE_REGEX = /(bốc quẻ|xin quẻ|quẻ hôm nay|boc que|xin que)/i;

const XIN_NGHI_REGEX =
  /(xin nghỉ|nghỉ phép|lý do xin nghỉ|đơn xin nghỉ|xin nghi|nghi phep|ly do xin nghi)/i;

const DOT_VIA_REGEX = /(đốt vía|thắp hương|dot via|thap huong)/i;

const RAGE_MANUAL_CHECK_REGEX =
  /(nộ khí|thước đo nộ khí|rage meter|xem nộ khí|kiem tra no khi|no khi)/i;

const RAGE_KEYWORDS = [
  'đồng nghiệp rắn',
  'dong nghiep ran',
  'rắn',
  'ran',
  'sếp',
  'sep',
  'đì',
  'di',
  'deadline',
  'cay',
  'hãm',
  'ham',
  'ot',
  'overtime',
  'trừ lương',
  'tru luong',
  'khóc',
  'khoc',
  'stress',
  'ức chế',
  'uc che',
  'bực',
  'buc',
  'bóc lột',
  'boc lot',
  'hành',
  'hanh',
  'task',
  'bug',
  'delay',
];

// ==========================================
// KHO QUẺ CÔNG SỞ (OFFICE FORTUNES)
// ==========================================

export const OFFICE_FORTUNES = [
  {
    type: 'ĐẠI CÁT',
    title: 'Long Mạch Văn Phòng Che Chở',
    diemBao: 'Sếp hôm nay bận việc với đối tác cả ngày, không ai soi màn hình.',
    dieuDaiKy: 'Đừng nhận email có tiêu đề "FYI" hoặc "Nhờ chút xíu".',
    conSoMayMan: '17:30 (Giờ đứng lên bấm vân tay).',
  },
  {
    type: 'ĐẠI CÁT',
    title: 'Hộ Vệ Thần Trà Sữa Giáng Trần',
    diemBao:
      'Chiều nay trong team có đại gia khao trà sữa full topping 70% đường 100% đá.',
    dieuDaiKy: 'Uống nước lọc (kẻo làm phật ý thần ẩm thực).',
    conSoMayMan: '0 (Số tiền bạn phải bỏ ra hôm nay).',
  },
  {
    type: 'TRUNG CÁT',
    title: 'Tàng Hình Nơi Công Sở',
    diemBao:
      'Hôm nay aura tàng hình cực mạnh, đi muộn 15 phút bảo vệ không chấm công, sếp lướt qua cũng không thấy.',
    dieuDaiKy: 'Cười quá to khi xem meme kẻo tự phá vỡ thuật ẩn thân.',
    conSoMayMan: '404 (Không tìm thấy nhân viên này).',
  },
  {
    type: 'TRUNG CÁT',
    title: 'Thần Wifi Độ Mạng',
    diemBao:
      'Mạng văn phòng hôm nay mượt như nhung, lướt Shopee săn sale không giật lag một giây.',
    dieuDaiKy: 'Chia sẻ màn hình khi chưa đóng các tab ẩn danh.',
    conSoMayMan: '5G (Tốc độ trốn việc).',
  },
  {
    type: 'TIỂU CÁT',
    title: 'Deadline Bỗng Dưng Biến Mất',
    diemBao:
      'Khách hàng bất ngờ đổi ý hủy tính năng, task khó tự dưng biến mất như chưa từng tồn tại.',
    dieuDaiKy: 'Nhiệt tình hỏi thăm dự án của đồng nghiệp (hỏi là dính đạn gánh hộ).',
    conSoMayMan: '12:00 (Giờ mở hộp cơm trưa).',
  },
  {
    type: 'TIỂU CÁT',
    title: 'Điều Hòa Phả Đúng Chỗ Ngồi',
    diemBao:
      'Nhiệt độ phòng mát mẻ lý tưởng 25 độ C, ngủ trưa ngon lành không bị lạnh gáy.',
    dieuDaiKy: 'Quên mang áo khoác hoặc chăn ngủ văn phòng.',
    conSoMayMan: '25 (Độ C chuẩn nghỉ dưỡng).',
  },
  {
    type: 'BÌNH HOÀ',
    title: 'Ngày Trôi Qua Như Một Giấc Mơ',
    diemBao:
      'Không drama, không việc gấp, mọi việc bình lặng trôi êm ả về mốc 17:30.',
    dieuDaiKy: 'Tỏ ra quá rảnh rỗi trước mặt ban quản lý.',
    conSoMayMan: '8 (Số tiếng ngồi giả vờ bận rộn).',
  },
  {
    type: 'BÌNH HOÀ',
    title: 'Culi Mẫu Mực',
    diemBao: 'Code một mạch không bug, nộp báo cáo đúng hạn, sếp thả tim nhẹ.',
    dieuDaiKy: 'Hỏi sếp: "Hôm nay em có được về sớm không?".',
    conSoMayMan: '100 (% năng lượng cống hiến).',
  },
  {
    type: 'TIỂU HUNG',
    title: 'Việc Gấp Bất Thình Lình',
    diemBao:
      'Đúng 17:25 loa phòng vang lên: "Team nán lại 5 phút sếp đồng bộ nhanh chút việc".',
    dieuDaiKy: 'Thu dọn balo và cắm sạc dự phòng quá sớm.',
    conSoMayMan: '5 (Số phút trên danh nghĩa, thực tế là 1 tiếng).',
  },
  {
    type: 'TIỂU HUNG',
    title: 'Cốc Nước Đổ Vào Bàn Phím',
    diemBao:
      'Cẩn thận tay chân lóng ngóng làm đổ cà phê hoặc vấp dây cáp mạng cả phòng.',
    dieuDaiKy: 'Để cốc nước sát cạnh laptop hoặc tài liệu mật.',
    conSoMayMan: '0.5 (Lít nước có nguy cơ đổ tràn).',
  },
  {
    type: 'ĐẠI HUNG',
    title: 'Sếp Đứng Sau Lưng',
    diemBao:
      'Đang hào hứng chốt đơn giỏ hàng Shopee thì cảm nhận sau gáy có luồng tử khí lạnh căm.',
    dieuDaiKy: 'Dùng chuột click lia lịa mà quên phím tắt Alt+Tab thần chưởng.',
    conSoMayMan: '911 (Cần cứu hộ khẩn cấp).',
  },
  {
    type: 'ĐẠI HUNG',
    title: 'Bug Đè Bẹp Tâm Hồn',
    diemBao:
      'Tính năng chạy mượt trên localhost nhưng vừa lên Production là sập toàn hệ thống.',
    dieuDaiKy: 'Deploy code vào chiều thứ Sáu.',
    conSoMayMan: '500 (Internal Server Error).',
  },
];

// ==========================================
// KHO LÝ DO XIN NGHỈ PHÉP (EXCUSE POOL)
// ==========================================

export const EXCUSE_STYLES = {
  luon_leo: 'Lươn lẹo nhưng khoa học',
  bi_trang: 'Bi tráng cảm động',
  tam_linh: 'Tâm linh khó giải',
  thang_than: 'Thẳng thắn bất cần',
  hai_huoc: 'Hài hước khó đỡ',
};

export const EXCUSE_POOL = {
  luon_leo: [
    'Sáng nay đường ống nước nhà em gặp sự cố vỡ van áp lực gây ngập cục bộ, em phải ở lại phối hợp với ban quản lý toà nhà khắc phục khẩn cấp để tránh chập điện. Em xin phép được làm việc từ xa / nghỉ phép hôm nay. Em vẫn check mail và xử lý việc gấp ạ.',
    'Khu vực nhà em sáng nay bị sự cố chập trạm biến áp hạ thế dẫn đến mất điện và rớt mạng diện rộng, pin laptop sụt áp không kịp sạc. Em xin phép nghỉ phép hôm nay để chờ điện lực khắc phục, có việc gấp anh/chị cứ gọi trực tiếp cho em ạ.',
    'Sáng nay mắt kính chống ánh sáng xanh của em bị nứt gãy khúc xạ khiến mắt em bị hội chứng mỏi điều tiết nhãn cầu (Asthenopia) cấp tính, nhìn màn hình bị lóa đôi. Bác sĩ yêu cầu em cách ly thiết bị điện tử trong 24h. Em xin phép nghỉ hôm nay ạ.',
    'Hệ thống khóa thông minh cửa nhà em bị lỗi firmware mã hóa RSA kẹt chốt an toàn cơ học bên trong, hiện em đang bị khóa trái trong phòng. Kỹ thuật viên hãng hẹn đầu giờ chiều mới mang thiết bị phá khóa tới. Em xin phép nghỉ phép hôm nay ạ.',
  ],
  bi_trang: [
    'Đêm qua chú cún cưng gắn bó với em từ thời sinh viên bỗng phát sốt cao li bì, nằm rên rỉ nhìn em cầu cứu. Em không thể nhẫn tâm bỏ rơi một sinh linh vô tội lúc này. Em xin phép sếp cho em nghỉ một hôm để đưa bé đi cấp cứu thú y ạ.',
    'Sáng nay mẹ em bị trúng gió độc nhức đầu chóng mặt, trong nhà không còn ai ngoài em. Bổn phận làm con chữ hiếu đi đầu, em xin phép sếp cho em nghỉ một ngày để sắc thuốc và chăm sóc mẹ qua cơn sốt. Em xin cảm ơn sếp nhiều ạ.',
    'Cây sen đá em chăm bẵm suốt 3 năm trời bỗng rụng hết lá chỉ sau một đêm giông gió. Em cảm thấy tâm lý chấn động sâu sắc và mất mát to lớn, tinh thần đang chạm đáy không thể tập trung xử lý số liệu. Em xin phép nghỉ hôm nay để tịnh tâm cân bằng lại ạ.',
  ],
  tam_linh: [
    'Sáng nay bước chân trái xuống giường em thấy lòng bồn chồn, bốc quẻ Kinh Dịch trúng ngay quẻ Thuần Khảm (nước ngập đầu). Thầy phong thủy thân tín dặn hôm nay ngày hắc đạo tuyệt đối không được xuất hành ra đường kẻo rước tai ương cho công ty. Em xin phép nghỉ một hôm để giữ phúc khí cho cả team ạ.',
    'Đêm qua em nằm mơ thấy thần tài báo mộng nhắc nhở hôm nay em mang vía xung khắc cực mạnh với mệnh Kim của sếp. Nếu em đến công ty hôm nay sẽ cản trở dòng chảy tiền tài của doanh nghiệp. Vì tương lai công ty đạt KPI, em xin phép hy sinh nghỉ phép ở nhà hôm nay ạ.',
    'Hôm nay là ngày sao Thái Bạch quét qua cung bản mệnh của em, ra đường rất dễ va chạm thị phi hao tài tốn của. Em xin phép sếp làm việc tại nhà / nghỉ phép 1 ngày để bảo toàn sinh khí và ví tiền của bản thân ạ.',
  ],
  thang_than: [
    'Sáng nay chuông báo thức reo nhưng linh hồn em từ chối rời khỏi chăn ấm. Cơ thể em lành lặn nhưng động lực đi làm hôm nay đã về 0%. Em xin dùng 1 ngày phép năm chính đáng của mình để sạc lại pin tinh thần, tránh việc đến công ty ngồi thở dài ảnh hưởng đồng nghiệp ạ.',
    'Hôm qua em cày task đến 4h sáng cho kịp tiến độ, hiện tại tế bào não em đang ở trạng thái shutdown hoàn toàn. Nếu hôm nay em tiếp tục viết code thì tỷ lệ sinh bug là 99.9%. Em xin nghỉ bù hôm nay để bảo vệ tính toàn vẹn của sản phẩm công ty ạ.',
    'Tâm trạng em hôm nay bất ổn định, chỉ số kiên nhẫn bằng 0, rất dễ khẩu nghiệp nếu gặp task khó hoặc người hỏi nhiều. Để giữ gìn văn hóa công sở hòa nhã và tình đồng nghiệp keo sơn, em xin phép nghỉ 1 ngày cách ly xã hội ạ.',
  ],
  hai_huoc: [
    'Sáng nay chú mèo nhà em trèo lên ngực em nằm ngủ say sưa và bắt đầu ngáy. Đạo luật bảo vệ động vật và lương tâm của một con sen không cho phép em cử động đánh thức Hoàng Thượng. Em xin phép sếp cho em nghỉ một hôm để làm tròn bổn phận hầu hạ ạ.',
    'Em vừa dắt xe ra đầu ngõ thì bà bán bánh mì quen nhìn mặt em phán: "Hôm nay mặt mày ám khí hãm tài lắm, quay xe về đi con". Em sợ vía đen của em ám vào doanh số của công ty nên em đành quay xe về nhà. Em xin nghỉ phép hôm nay ạ!',
    'Sáng nay em dậy đánh răng thì phát hiện một nốt mụn to như hòn đảo mọc ngay giữa sống mũi. Với nhan sắc hiện tại em không thể tự tin đối diện với ánh nhìn của đồng nghiệp và đối tác. Em xin phép nghỉ 1 hôm để trị liệu nhan sắc ạ.',
  ],
};

// ==========================================
// CÁC HÀM TIỆN ÍCH HỖ TRỢ
// ==========================================

export function removeAccents(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function checkCooldown(type, channelId, timeLimit = COOLDOWN_MS) {
  const key = `${type}-${channelId}`;
  const now = Date.now();
  const last = cooldowns.get(key) || 0;

  if (now - last < timeLimit) {
    return true;
  }

  cooldowns.set(key, now);

  if (cooldowns.size > 200) {
    const expiredThreshold = now - 600000;
    for (const [k, timestamp] of cooldowns.entries()) {
      if (timestamp < expiredThreshold) {
        cooldowns.delete(k);
      }
    }
  }

  return false;
}

export function getVietnamTime(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      map[part.type] = parseInt(part.value, 10);
    }
  }

  const hour = map.hour === 24 ? 0 : map.hour;
  return new Date(map.year, map.month - 1, map.day, hour, map.minute, map.second);
}

export function getVietnamDateString(date = new Date()) {
  const vn = getVietnamTime(date);
  const y = vn.getFullYear();
  const m = String(vn.getMonth() + 1).padStart(2, '0');
  const d = String(vn.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatProgressBar(percent, length = 10) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const filled = Math.min(
    length,
    Math.max(0, Math.round((clampedPercent / 100) * length)),
  );
  return '█'.repeat(filled) + '░'.repeat(length - filled);
}

// ==========================================
// 1. TÍNH NĂNG TAN LÀM & NGÀY LƯƠNG
// ==========================================

export function buildTanLamEmbed(nowVN = getVietnamTime()) {
  const endHour = 17;
  const endMinute = 30;
  const endSecond = 0;

  const startHour = 8;
  const startMinute = 0;
  const startSecond = 0;

  const targetDate = new Date(
    nowVN.getFullYear(),
    nowVN.getMonth(),
    nowVN.getDate(),
    endHour,
    endMinute,
    endSecond,
  );

  const startDate = new Date(
    nowVN.getFullYear(),
    nowVN.getMonth(),
    nowVN.getDate(),
    startHour,
    startMinute,
    startSecond,
  );

  const diffMs = targetDate.getTime() - nowVN.getTime();
  const totalWorkMs = targetDate.getTime() - startDate.getTime();

  let remainingText = '';
  let percent = 0;

  if (diffMs <= 0) {
    remainingText =
      '# **ĐÃ HẾT GIỜ HÀNH CHÍNH!!!**\n# Còn ngồi đó làm gì nữa, xách xe về ngayyyyy <a:hamsterg1:1546057526905405512>';
    percent = 100;
  } else {
    const hours = Math.floor(diffMs / 3600000);
    const minutes = Math.floor((diffMs % 3600000) / 60000);
    const seconds = Math.floor((diffMs % 60000) / 1000);
    remainingText = `${hours} giờ ${minutes} phút ${seconds} giây`;

    if (nowVN.getTime() < startDate.getTime()) {
      percent = 0;
    } else {
      const elapsedMs = nowVN.getTime() - startDate.getTime();
      percent = Math.min(
        99,
        Math.max(1, Math.floor((elapsedMs / totalWorkMs) * 100)),
      );
    }
  }

  const progressBar = formatProgressBar(percent, 10);

  const description =
    diffMs <= 0
      ? [
        `Giờ chuẩn tan làm: 17:30:00`,
        ``,
        `${remainingText}`,
        ``,
        `Tiến độ ngày cày cuốc: [${progressBar}] ${percent}%`,
      ].join('\n')
      : [
        `Giờ chuẩn tan làm: 17:30:00`,
        ``,
        `Còn lại: ${remainingText}`,
        ``,
        `Tiến độ ngày cày cuốc: [${progressBar}] ${percent}%`,
      ].join('\n');

  return new EmbedBuilder()
    .setTitle(
      '<a:trangtrig2:1546040703375904801> **ĐỒNG HỒ ĐẾM NGƯỢC: GIỜ CHUỒN KHỎI TƯ BẢN** <a:trangtrig3:1546040818261954610>',
    )
    .setColor('#FFB6C1')
    .setDescription(description)
    .setFooter({
      text: 'Thu dọn balo dần và alt-tab sẵn đi là vừa!',
    });
}

export function buildLuongEmbed(nowVN = getVietnamTime()) {
  const payday = 10;
  const currentYear = nowVN.getFullYear();
  const currentMonth = nowVN.getMonth();
  const currentDate = nowVN.getDate();

  let targetDate;
  let prevDate;

  if (currentDate === payday) {
    targetDate = new Date(currentYear, currentMonth, payday, 0, 0, 0);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    prevDate = new Date(prevYear, prevMonth, payday, 0, 0, 0);
  } else if (currentDate < payday) {
    targetDate = new Date(currentYear, currentMonth, payday, 0, 0, 0);
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    prevDate = new Date(prevYear, prevMonth, payday, 0, 0, 0);
  } else {
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    targetDate = new Date(nextYear, nextMonth, payday, 0, 0, 0);
    prevDate = new Date(currentYear, currentMonth, payday, 0, 0, 0);
  }

  let remainingText = '';
  let percent = 0;

  if (currentDate === payday) {
    remainingText =
      '# **HÔM NAY LÀ NGÀY TING TING!!!**\n# Mau mở app ngân hàng hồi sinh tài khoản nàooooo <a:trangtrig27:1546093546178748426>';
    percent = 100;
  } else {
    const diffMs = targetDate.getTime() - nowVN.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    remainingText = `${diffDays} ngày nữa mới hồi sinh tài khoản`;

    const totalPeriodMs = targetDate.getTime() - prevDate.getTime();
    const elapsedMs = nowVN.getTime() - prevDate.getTime();
    percent = Math.min(
      99,
      Math.max(1, Math.floor((elapsedMs / totalPeriodMs) * 100)),
    );
  }

  const progressBar = formatProgressBar(percent, 10);

  const description =
    currentDate === payday
      ? [
        `Dự kiến ngày ting ting: Ngày 10 hàng tháng`,
        ``,
        `${remainingText}`,
        ``,
        `Thời gian tồn tại bằng mì gói: [${progressBar}] ${percent}% chặng đường`,
      ].join('\n')
      : [
        `Dự kiến ngày ting ting: Ngày 10 hàng tháng`,
        ``,
        `Còn lại: ${remainingText}`,
        ``,
        `Thời gian tồn tại bằng mì gói: [${progressBar}] ${percent}% chặng đường`,
      ].join('\n');

  return new EmbedBuilder()
    .setTitle(
      '<a:trangtrig2:1546040703375904801> **LỊCH HÓNG TING TING** <a:trangtrig3:1546040818261954610>',
    )
    .setColor('#FFB6C1')
    .setDescription(description)
    .setFooter({
      text: 'Cố lên culi, đừng để tiền đình trước khi tiền về!',
    });
}

// ==========================================
// 2. TÍNH NĂNG BỐC QUẺ CÔNG SỞ
// ==========================================

export async function getUserDailyFortune(client, userId, dateStr) {
  const key = `thanvan:fortune:${userId}:${dateStr}`;
  if (client?.db?.get) {
    try {
      const data = await client.db.get(key);
      if (data) return data;
    } catch (e) {
      logger.debug('Lỗi đọc quẻ từ client.db:', e);
    }
  }
  return fortuneHistoryCache.get(key) || null;
}

export async function saveUserDailyFortune(client, userId, dateStr, fortune) {
  const key = `thanvan:fortune:${userId}:${dateStr}`;
  fortuneHistoryCache.set(key, fortune);
  if (client?.db?.set) {
    try {
      await client.db.set(key, fortune);
    } catch (e) {
      logger.debug('Lỗi lưu quẻ vào client.db:', e);
    }
  }
}

export function getRandomFortune() {
  const randomIndex = Math.floor(Math.random() * OFFICE_FORTUNES.length);
  return OFFICE_FORTUNES[randomIndex];
}

export function buildFortuneEmbed(user, fortune, alreadyDrawn = false) {
  const userName = user.displayName || user.username || 'Đồng nghiệp';
  const avatarUrl = user.displayAvatarURL ? user.displayAvatarURL({ dynamic: true }) : null;

  const embed = new EmbedBuilder()
    .setColor('#FFB6C1') // Hồng pastel
    .setAuthor({
      name: `Quẻ Xăm Công Sở Của: @${userName}`,
      iconURL: avatarUrl || undefined,
    })
    .setTitle(`**[${fortune.type}]** - ${fortune.title}`)
    .addFields([
      {
        name: '<a:trangtrig45:1547239010190237819> Điềm báo:',
        value: fortune.diemBao,
        inline: false,
      },
      {
        name: '<a:bang2:1546891483250954290> Điều đại kỵ:',
        value: fortune.dieuDaiKy,
        inline: false,
      },
      {
        name: '<a:heartg1:1545307544808071258> Con số may mắn:',
        value: fortune.conSoMayMan,
        inline: false,
      },
    ])
    .setFooter({
      text: 'Mỗi ngày chỉ được xin 1 quẻ. Đổi quẻ sếp trừ lương!',
    });

  if (alreadyDrawn) {
    embed.setDescription(
      `⚠️ **Bạn đã xin quẻ của ngày hôm nay rồi nha!**\n*Vận mệnh an bài, xin thêm cũng không đổi được đâu culi ơi:*`,
    );
  }

  return embed;
}

// ==========================================
// 3. TÍNH NĂNG THƯỚC ĐO NỘ KHÍ CÔNG SỞ
// ==========================================

export async function getRageMeter(client, guildId) {
  if (serverRageMeters.has(guildId)) {
    return serverRageMeters.get(guildId);
  }

  if (client?.db?.get) {
    try {
      const saved = await client.db.get(`thanvan:rage:${guildId}`);
      if (typeof saved === 'number') {
        serverRageMeters.set(guildId, saved);
        return saved;
      }
    } catch { }
  }

  serverRageMeters.set(guildId, 0);
  return 0;
}

export async function saveRageMeter(client, guildId, points) {
  const clamped = Math.min(100, Math.max(0, points));
  serverRageMeters.set(guildId, clamped);

  if (client?.db?.set) {
    try {
      await client.db.set(`thanvan:rage:${guildId}`, clamped);
    } catch { }
  }
  return clamped;
}

export function buildRageMeterEmbed(currentRage) {
  let color = '#F1C40F'; // Dưới 50%: Vàng
  let statusText = 'Ậm ừ chịu đựng - Bắt đầu thở dài theo nhịp';

  if (currentRage >= 80) {
    color = '#E74C3C'; // Trên 80%: Đỏ rực
    statusText = 'Báo động vỡ đê - Chuẩn bị tinh thần ăn gạch!';
  } else if (currentRage >= 50) {
    color = '#E67E22'; // 50% - 80%: Cam
    statusText = 'Áp suất cao - Nghiêm cấm giao thêm task!';
  }

  // Thanh 15 ký tự theo đúng mẫu Discord UI
  const progressBar = formatProgressBar(currentRage, 15);

  const description = [
    `Nộ khí hiện tại: [${progressBar}] ${currentRage} / 100`,
    ``,
    `Trạng thái: "${statusText}"`,
  ].join('\n');

  return new EmbedBuilder()
    .setTitle(
      '<a:trangtrig2:1546040703375904801> **THƯỚC ĐO NỘ KHÍ TƯ BẢN** <a:trangtrig3:1546040818261954610>',
    )
    .setColor(color)
    .setDescription(description)
    .setFooter({
      text: 'Hít sâu thở đều, gõ phím nhẹ tay kẻo gãy switch cơ nhé!',
    });
}

export function buildVoDePayload() {
  const content = `<a:bang3:1546891744237461635> **VỠ ĐÊ RỒI! TOÀN BỘ SERVER ĐÃ ĐẠT ĐỈNH ĐIỂM ỨC CHẾ!** <a:bang3:1546891744237461635>`;

  const embed = new EmbedBuilder()
    .setTitle('🧋 BẬT CHẾ ĐỘ "GIỜ GIẢI CỨU" - HẠ HỎA TOÀN SERVER 🧋')
    .setColor('#E74C3C')
    .setDescription(
      `Toàn bộ anh em culi trong server đã đạt tới cảnh giới tẩu hỏa nhập ma vì tư bản!\n\n` +
      `📢 **LỆNH GIẢI CỨU KHẨN CẤP:**\n` +
      `• Kêu gọi toàn thể anh em gác task lại, order ngay một ly trà sữa full topping size L 70% đường 100% đá!\n` +
      `• Tạm thời alt-tab sang ngắm meme chế giễu sếp để hạ hỏa nào!\n` +
      `• Ghi nhớ: *Task có thể delay, bug có thể sửa sau, nhưng tiền đình thì không đùa được!*`,
    )
    .setImage(
      'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Z0NWhzbXh4aWlsZzJ6ZnQ2bXFoc2s1c3E3dGVobGV5ZWRubzRpayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif',
    )
    .setFooter({
      text: 'Van xả áp đã mở thành công! Thước đo nộ khí tự động reset về 0/100.',
    });

  return { content, embeds: [embed] };
}

export const buildVoDeMessage = buildVoDePayload;

// ==========================================
// 4. TÍNH NĂNG MÁY TẠO LÝ DO XIN NGHỈ PHÉP
// ==========================================

export function getRandomExcuse(style = 'luon_leo') {
  const chosenStyle = EXCUSE_POOL[style] ? style : 'luon_leo';
  const list = EXCUSE_POOL[chosenStyle];
  const randomIndex = Math.floor(Math.random() * list.length);
  return {
    styleKey: chosenStyle,
    styleName: EXCUSE_STYLES[chosenStyle],
    text: list[randomIndex],
  };
}

export function buildExcuseEmbed(excuseData) {
  const description = [
    `Tone: ${excuseData.styleName}`,
    ``,
    `Kính gửi Anh/Chị quản lý,`,
    ``,
    `${excuseData.text}`,
  ].join('\n');

  return new EmbedBuilder()
    .setTitle(
      '<a:trangtrig30:1546905942476464178> **ĐƠN XIN NGHỈ PHÉP "BAO DUYỆT"** <a:trangtrig30:1546905942476464178>',
    )
    .setColor('#FFB6C1') // Hồng pastel
    .setDescription(description);
}

export function buildExcuseActionRow(styleKey = 'luon_leo') {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`excuse_reroll:${styleKey}`)
      .setLabel('Đổi lý do khác')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🎲'),
    new ButtonBuilder()
      .setCustomId('excuse_copy')
      .setLabel('Copy nội dung')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('📋'),
  );
}

// ==========================================
// 5. TÍNH NĂNG ĐỐT VÍA / THẮP HƯƠNG PHONG THỦY
// ==========================================

export const OFFICE_PRAYERS_BASE = [
  'Xua tan vía OT đêm muộn.',
  'Khách hàng duyệt file v1, không có v1_final, v1_final_chot.',
  'Sếp vui tính ký duyệt tăng lương.',
  'Code chạy mượt một phát ăn ngay, localhost sao thì Production y vậy.',
  'Đồng nghiệp rắn tự động quay đầu hướng thiện, bớt đâm sau lưng.',
  'Máy in văn phòng không kẹt giấy, wifi không sập giữa giờ làm.',
  'Đúng 17:30 bấm vân tay êm đẹp, không có thông báo việc gấp bất ngờ.',
  'Sếp đi công tác cả tuần, cả phòng tự do hít thở không khí hòa bình.',
  'Trà sữa order về kịp giờ ngủ trưa, trân châu mềm dẻo không bị sượng.',
  'Deadline tự động lùi lại 3 ngày mà không cần mở lời năn nỉ.',
  'Không bị tag vào group chat công ty sau 18:00.',
  'Đơn xin nghỉ phép gửi đi sếp bấm duyệt trong vòng 1 nốt nhạc.',
  'Tránh xa mọi drama văn phòng, tâm thanh tịnh nhận ting ting mùng 10.',
  'Khách hàng thanh toán hợp đồng đúng hạn, không kì kèo trừ tiền.',
];

export const TARGET_SPECIFIC_PRAYERS = {
  sếp: 'Sếp bớt khó tính, bớt dí task và hoan hỉ ký duyệt tăng lương.',
  bug: 'Xua đuổi sạch sẽ mọi con bug quái ác, deploy Production êm ru.',
  deadline: 'Đè bẹp deadline, khách hàng tự nguyện lùi hạn chót thêm 1 tuần.',
  'đồng nghiệp rắn': 'Trừ tà trừ ám, xua tan vía đồng nghiệp rắn hay soi mói đâm chọt.',
  ot: 'Tiễn vong OT đêm muộn, 17:30 xách balo phóng xe về nhà.',
  'khách hàng': 'Khách hàng duyệt file v1 êm đẹp, không bắt sửa lại màu sắc phong thủy.',
};

export function getRandomPrayers(count = 3, target = null) {
  const prayers = [];
  const pool = [...OFFICE_PRAYERS_BASE];

  if (target) {
    const key = target.toLowerCase();
    for (const [tKey, pText] of Object.entries(TARGET_SPECIFIC_PRAYERS)) {
      if (key.includes(tKey) || tKey.includes(key)) {
        prayers.push(pText);
        break;
      }
    }
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  for (const item of pool) {
    if (prayers.length >= count) break;
    if (!prayers.includes(item)) {
      prayers.push(item);
    }
  }

  return prayers;
}

export function buildDotViaEmbed(user, target = null) {
  const userMention = `<@${user.id}>`;
  const prayers = getRandomPrayers(3, target);

  const description = [
    `Đồng chí ${userMention} vừa châm 3 nén nhang cầu xin:`,
    ``,
    `<a:bang1:1546891405371117668> ${prayers[0]}`,
    ``,
    `<a:bang1:1546891405371117668> ${prayers[1]}`,
    ``,
    `<a:bang1:1546891405371117668> ${prayers[2]}`,
    ``,
    `( ( ( 🕯️ 🕯️ 🕯️ ) ) )`,
    ``,
    `Thành tâm thì linh, không thành tâm thì tối nay ở lại làm tiếp!`,
  ].join('\n');

  return new EmbedBuilder()
    .setTitle('🕯️ BÀN THỜ PHONG THỦY CÔNG SỞ')
    .setColor('#FFB6C1')
    .setDescription(description)
    .setFooter({
      text: 'Khói hương nghi ngút, xua tan ám khí tư bản!',
    });
}

// ==========================================
// BỘ ĐIỀU PHỐI AUTORESPONDER MESSAGE_CREATE
// ==========================================

/**
 * Điều phối toàn bộ tính năng tại kênh Than Vãn Tư Bản (ID: 1559832849798926357).
 * @param {import('discord.js').Message} message
 * @returns {Promise<boolean>}
 */
export async function handleThanVanTuBan(message) {
  try {
    if (!message.guild || message.author?.bot || !message.content?.trim()) {
      return false;
    }

    // Chỉ nhận cố định ở ID kênh 1559832849798926357 (hoặc thread con thuộc kênh này)
    const isTargetChannel =
      message.channelId === THAN_VAN_CHANNEL_ID ||
      message.channel?.parentId === THAN_VAN_CHANNEL_ID;

    if (!isTargetChannel) {
      return false;
    }

    const content = message.content.trim();
    const unaccented = removeAccents(content);

    // ----------------------------------------------------
    // 1. Keyword: Tan Làm & Được Về
    // ----------------------------------------------------
    const isTanLam =
      TAN_LAM_REGEX.test(content) || TAN_LAM_NO_ACCENT_REGEX.test(unaccented);

    if (isTanLam) {
      if (checkCooldown('tanlam', message.channelId, COOLDOWN_MS)) {
        logger.debug('[ThanVanTuBan] Từ khóa tan làm đang trong cooldown 2 phút.');
        return true;
      }

      const embed = buildTanLamEmbed();
      await message
        .reply({
          embeds: [embed],
          allowedMentions: { repliedUser: false },
        })
        .catch(async () => {
          await message.channel.send({ embeds: [embed] }).catch(() => { });
        });

      logger.info(
        `[ThanVanTuBan] Đã gửi đếm ngược tan làm cho ${message.author.tag} tại ${message.channelId}`,
      );
      return true;
    }

    // ----------------------------------------------------
    // 2. Keyword: Lương & Ting Ting
    // ----------------------------------------------------
    const isLuong =
      LUONG_REGEX.test(content) || LUONG_NO_ACCENT_REGEX.test(unaccented);

    if (isLuong) {
      if (checkCooldown('luong', message.channelId, COOLDOWN_MS)) {
        logger.debug('[ThanVanTuBan] Từ khóa lương đang trong cooldown 2 phút.');
        return true;
      }

      const embed = buildLuongEmbed();
      await message
        .reply({
          embeds: [embed],
          allowedMentions: { repliedUser: false },
        })
        .catch(async () => {
          await message.channel.send({ embeds: [embed] }).catch(() => { });
        });

      logger.info(
        `[ThanVanTuBan] Đã gửi lịch hóng ting ting cho ${message.author.tag} tại ${message.channelId}`,
      );
      return true;
    }

    // ----------------------------------------------------
    // 3. Keyword: Bốc Quẻ / Xin Quẻ (Giới hạn 1 lần/ngày)
    // ----------------------------------------------------
    const isBocQue =
      BOC_QUE_REGEX.test(content) || BOC_QUE_REGEX.test(unaccented);

    if (isBocQue) {
      const todayStr = getVietnamDateString();
      const existingFortune = await getUserDailyFortune(
        message.client,
        message.author.id,
        todayStr,
      );

      if (existingFortune) {
        const embed = buildFortuneEmbed(message.author, existingFortune, true);
        await message
          .reply({
            embeds: [embed],
            allowedMentions: { repliedUser: false },
          })
          .catch(async () => {
            await message.channel.send({ embeds: [embed] }).catch(() => { });
          });
        return true;
      }

      const newFortune = getRandomFortune();
      await saveUserDailyFortune(
        message.client,
        message.author.id,
        todayStr,
        newFortune,
      );

      const embed = buildFortuneEmbed(message.author, newFortune, false);
      await message
        .reply({
          embeds: [embed],
          allowedMentions: { repliedUser: false },
        })
        .catch(async () => {
          await message.channel.send({ embeds: [embed] }).catch(() => { });
        });

      logger.info(
        `[ThanVanTuBan] ${message.author.tag} đã bốc quẻ [${newFortune.type}] tại kênh ${message.channelId}`,
      );
      return true;
    }

    // ----------------------------------------------------
    // 4. Keyword: Xin Nghỉ Phép (Excuse Generator)
    // ----------------------------------------------------
    const isXinNghi =
      XIN_NGHI_REGEX.test(content) || XIN_NGHI_REGEX.test(unaccented);

    if (isXinNghi) {
      if (checkCooldown('xinnghi', message.channelId, 30000)) {
        logger.debug('[ThanVanTuBan] Xin nghỉ phép đang trong cooldown 30s.');
        return true;
      }

      const excuseData = getRandomExcuse('luon_leo');
      const embed = buildExcuseEmbed(excuseData);
      const row = buildExcuseActionRow(excuseData.styleKey);

      await message
        .reply({
          embeds: [embed],
          components: [row],
          allowedMentions: { repliedUser: false },
        })
        .catch(async () => {
          await message.channel
            .send({ embeds: [embed], components: [row] })
            .catch(() => { });
        });

      logger.info(
        `[ThanVanTuBan] Đã tạo đơn xin nghỉ phép cho ${message.author.tag} tại ${message.channelId}`,
      );
      return true;
    }

    // ----------------------------------------------------
    // 5. Keyword: Đốt Vía / Thắp Hương Xua Đuổi Bug & Deadline
    // ----------------------------------------------------
    const isDotVia =
      DOT_VIA_REGEX.test(content) || DOT_VIA_REGEX.test(unaccented);

    if (isDotVia) {
      if (checkCooldown('dotvia', message.channelId, 15000)) {
        logger.debug('[ThanVanTuBan] Đốt vía đang trong cooldown 15s.');
        return true;
      }

      let target = null;
      if (/sếp|sep/i.test(content)) target = 'sếp';
      else if (/bug/i.test(content)) target = 'bug';
      else if (/deadline/i.test(content)) target = 'deadline';
      else if (/đồng nghiệp|dong nghiep|rắn|ran/i.test(content))
        target = 'đồng nghiệp rắn';
      else if (/ot|overtime/i.test(content)) target = 'ot';
      else if (/khách hàng|khach hang/i.test(content)) target = 'khách hàng';

      const embed = buildDotViaEmbed(message.author, target);

      await message
        .reply({
          embeds: [embed],
          allowedMentions: { repliedUser: false },
        })
        .catch(async () => {
          await message.channel.send({ embeds: [embed] }).catch(() => { });
        });

      logger.info(
        `[ThanVanTuBan] ${message.author.tag} đã đốt vía ${target || 'công sở'} tại ${message.channelId}`,
      );
      return true;
    }

    // ----------------------------------------------------
    // 9. Keyword & Scan: Thước Đo Nộ Khí Tư Bản
    // ----------------------------------------------------
    const isManualRageCheck =
      RAGE_MANUAL_CHECK_REGEX.test(content) ||
      RAGE_MANUAL_CHECK_REGEX.test(unaccented);

    if (isManualRageCheck) {
      const currentRage = await getRageMeter(message.client, message.guild.id);
      const embed = buildRageMeterEmbed(currentRage);

      await message
        .reply({
          embeds: [embed],
          allowedMentions: { repliedUser: false },
        })
        .catch(async () => {
          await message.channel.send({ embeds: [embed] }).catch(() => { });
        });
      return true;
    }

    // Quét các từ cay cú để tích lũy nộ khí
    let matchCount = 0;
    for (const kw of RAGE_KEYWORDS) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}([^\\p{L}\\p{N}]|$)`, 'iu');
      if (regex.test(content) || regex.test(unaccented)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      // Giới hạn tối đa 3 từ tính điểm mỗi tin nhắn để tránh spam
      const effectiveMatches = Math.min(matchCount, 3);
      let addedPoints = 0;
      for (let i = 0; i < effectiveMatches; i++) {
        addedPoints += Math.floor(Math.random() * 4) + 2; // 2 đến 5 điểm
      }

      const prevRage = await getRageMeter(message.client, message.guild.id);
      const newRage = Math.min(100, prevRage + addedPoints);
      await saveRageMeter(message.client, message.guild.id, newRage);

      logger.debug(
        `[ThanVanTuBan] Đã phát hiện ${matchCount} từ cay cú từ ${message.author.tag}, cộng ${addedPoints} nộ khí (${prevRage} -> ${newRage})`,
      );

      // Đạt đỉnh 100/100: Kích hoạt VỠ ĐÊ ngay lập tức!
      if (newRage >= 100) {
        const voDePayload = buildVoDeMessage();
        await message.channel.send(voDePayload).catch(() => { });
        await saveRageMeter(message.client, message.guild.id, 0);

        logger.info(
          `[ThanVanTuBan] Server ${message.guild.id} đã VỠ ĐÊ NỘ KHÍ! Tự động bật Giờ Giải Cứu và reset về 0.`,
        );
        return true;
      }

      // Nếu vượt qua mốc quan trọng (50 hoặc 80) và không dính cooldown thông báo
      const crossedFifty = prevRage < 50 && newRage >= 50;
      const crossedEighty = prevRage < 80 && newRage >= 80;

      if (crossedFifty || crossedEighty) {
        const canAnnounce = !checkCooldown(
          'rage_milestone',
          message.channelId,
          RAGE_ANNOUNCE_COOLDOWN_MS,
        );

        if (canAnnounce) {
          const embed = buildRageMeterEmbed(newRage);
          await message.channel.send({ embeds: [embed] }).catch(() => { });
        }
      }
    }

    return false;
  } catch (error) {
    logger.error(
      '[ThanVanTuBan] Lỗi khi xử lý auto-responder kênh than vãn:',
      error,
    );
    return false;
  }
}
