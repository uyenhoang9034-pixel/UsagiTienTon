/**
 * marriageConfig.js — Trung tâm tùy chỉnh giao diện và thông báo hệ thống Kết Hôn
 * Vợ của Kim Nong có thể tự do chỉnh sửa toàn bộ câu chữ, màu sắc, icon, lời thoại ở file này!
 */

export const MARRIAGE_CONFIG = {
  // ==========================================
  // CẤU HÌNH ADMIN VÀ KÊNH LỆNH CỐ ĐỊNH
  // ==========================================
  adminRoleId: '1541303749916754001',
  marryChannelId: '1559076209214890030',
  channelErrorMessage: (channelId) =>
    `Lệnh kết hôn chỉ có thể sử dụng tại kênh <#${channelId}> thôi nha! 🐰🌸`,

  // ==========================================
  // BẢNG MÀU EMBED (HEX CODE)
  // ==========================================
  colors: {
    proposal: '#FF69B4',       // Gửi lời cầu hôn
    wedding: '#FF1493',        // Hôn lễ thành công rực rỡ
    rejected: '#808080',       // Lời cầu hôn bị từ chối
    timeout: '#808080',        // Hết hạn phản hồi
    profile: '#FF69B4',        // Giấy chứng nhận kết hôn
    harem: '#FF69B4',          // Danh sách hậu cung
    interact: '#FF1493',       // Tương tác hâm nóng tình cảm
    checkIn: '#00FA9A',        // Điểm danh hàng ngày
    gift: '#FF69B4',           // Tặng quà tình yêu
    divorceConfirm: '#ED4245', // Cảnh báo xác nhận ly hôn
    divorced: '#7289DA',       // Thông báo đã ly hôn
    leaderboard: '#FFD700',    // Bảng vàng xếp hạng
  },

  // ==========================================
  // HÌNH ẢNH & GIF MINH HOẠ
  // ==========================================
  images: {
    // Direct download/display URL từ Google Drive: 1LB0Bb8ktfQd-t8kBEV02uM5ny7aJsew-
    weddingGif: 'https://lh3.googleusercontent.com/d/1LB0Bb8ktfQd-t8kBEV02uM5ny7aJsew-',
  },

  // ==========================================
  // 1. GIAO DIỆN CẦU HÔN (/marry cauhon)
  // ==========================================
  proposal: {
    timeoutMs: 20 * 60 * 1000, // 20 phút thời gian thực (1,200,000 ms)
    defaultMessage: 'Em có đồng ý cùng anh đi qua mọi thăng trầm và cùng nhau già đi không?',

    buttonAccept: {
      label: 'Đồng ý',
      emoji: '<a:heartg4:1546068063500369940>',
    },
    buttonDecline: {
      label: 'Từ chối',
      emoji: '<:anime2:1546013742679064658>',
    },

    // Cảnh báo lỗi
    errorSelf: 'Bạn không thể tự cưới chính mình đâu nè! Hãy ngỏ lời với một thành viên khác nha! <a:bunnyg4:1541439959385374760>',
    errorBot: 'Em bot Usagi múp rụp và các bạn bot chỉ làm chứng nhân tình yêu thôi, không kết hôn được đâu ạ! Hihi~ <a:bunnyg4:1541439959385374760>',
    errorAlreadyMarried: (targetId) => `Bạn và <@${targetId}> đã là vợ chồng của nhau rồi nè! Không cần phải cầu hôn lại đâu nha! <a:bunnyg4:1541439959385374760>`,
    errorPending: 'Đang có một lời cầu hôn đang chờ phản hồi giữa hai bạn rồi nè! Hãy trả lời lời cầu hôn đó trước nhé! <a:catg1:1541439053256462396>',
    errorNotTarget: 'Chỉ người được cầu hôn mới có quyền đưa ra quyết định thôi nha! <a:bunnyg4:1541439959385374760>',
    errorRaceCondition: 'Hai bạn đã nên duyên vợ chồng từ trước rồi nè! 💖',

    // Embed gửi lời cầu hôn
    embedTitle: '<a:trangtrig2:1546040703375904801> 𝓦𝓲𝓵𝓵 𝓤 𝓜𝓪𝓻𝓻𝔂 𝓜𝓮 <a:trangtrig3:1546040818261954610>',
    embedContent: (targetId, authorId) => `<@${targetId}> ơi, bạn có một lời cầu hôn từ <@${authorId}> nè! <a:trangtrig30:1546905942476464178>`,
    embedDescription: (authorId, targetId, customMessage) => {
      const messageContent = customMessage
        ? customMessage
        : `<@${targetId}> ơi, bạn có đồng ý về chung một nhà và trở thành bạn đời của <@${authorId}> không? <a:heartg1:1545307544808071258>`;

      return (
        `Khoảnh khắc ngọt ngào đã đến! <a:heartg3:1546047728314884226>\n` +
        `<@${authorId}> đã trân trọng trao chiếc nhẫn ước hẹn và cầu hôn <@${targetId}>! <a:trangtrig6:1546043036390260756>\n\n` +
        `<a:trangtrig30:1546905942476464178> Lời nhắn: ${messageContent}`
      );
    },
    embedFooter: 'Lời cầu hôn sẽ tự động hết hạn sau 20 phút nếu không có phản hồi!',

    // Embed khi đối phương ĐỒNG Ý
    weddingSuccessTitle: '<a:trangtrig2:1546040703375904801> 𝓒𝓱𝓾́𝓬 𝓗𝓸̂𝓷 𝓛𝓮̂̃ 𝓣𝓱𝓪̀𝓷𝓱 𝓒𝓸̂𝓷𝓰 <a:trangtrig3:1546040818261954610>',
    weddingSuccessContent: 'Tiếng chuông đám cưới vang lên! Chúc mừng hai bạn đã nên duyên vợ chồng! <a:bunnyg8:1541440159990550580>',
    weddingSuccessDescription: (authorId, targetId) =>
      `Hôm nay là ngày lành tháng tốt, xin chúc mừng cho đôi uyên ương <@${authorId}> <a:heartg6:1546906117551030382> <@${targetId}>\n\n` +
      `<a:trangtrig30:1546905942476464178> Lời thề nguyện: Hai bạn đã chính thức kết duyên vợ chồng và nhận ngay 100 Điểm Thân Mật khởi đầu! <a:trangtrig46:1547240249761996812>\n\n` +
      `Hãy sử dụng các lệnh dưới đây mỗi ngày để tích lũy Điểm Thân Mật nha:\n` +
      `> /marry diemdanh: Điểm danh uyên ương (+50 đến +100 <a:trangtrig46:1547240249761996812>)\n` +
      `> /marry tuongtac: Hôn, ôm, hẹn hò, xoa đầu (+20 đến +35 <a:trangtrig46:1547240249761996812>)\n` +
      `> /marry tangqua: Tặng trà sữa, hoa hồng, socola, kim cương (+20 đến +150 <a:trangtrig46:1547240249761996812>)`,
    weddingSuccessFooter: 'Em bot Usagi múp rụp chúc hai bạn trăm năm hạnh phúc, mặn nồng keo sơn!',

    // Embed khi đối phương TỪ CHỐI
    weddingDeclinedTitle: '<a:trangtrig43:1547238351869059082> 𝓛𝓸̛̀𝓲 𝓒𝓪̂̀𝓾 𝓗𝓸̂𝓷 𝓑𝓲̣ 𝓣𝓾̛̀ 𝓒𝓱𝓸̂́𝓲 <a:trangtrig43:1547238351869059082>',
    weddingDeclinedDescription: (authorId, targetId) =>
      `<@${targetId}> đã **khéo léo từ chối lời cầu hôn** của <@${authorId}> rồi...\n\n` +
      `Duyên chưa đến thì chúng mình vẫn là những người bạn tốt của nhau nha! <a:hachiwareg1:1541427296777408552>`,
    weddingDeclinedFooter: 'Hỏng sao hỏng sao, em bot Usagi múp rụp sẽ vỗ về an ủi bạn nè~',

    // Embed khi HẾT HẠN 20 PHÚT
    weddingTimeoutTitle: '<a:shockg1:1541433028193165312> 𝓛𝓸̛̀𝓲 𝓒𝓪̂̀𝓾 𝓗𝓸̂𝓷 𝓗𝓮̂́𝓽 𝓗𝓪̣𝓷 𝓡𝓸̂̀𝓲',
    weddingTimeoutDescription: (authorId, targetId) =>
      `<@${targetId}> chưa kịp phản hồi lời cầu hôn của <@${authorId}>.\n\n` +
      `*Chiếc nhẫn ước hẹn đã được cất lại, hãy thử ngỏ lời vào một dịp thích hợp khác nhé!* <a:giftg1:1543150714732412948>`,
  },

  // ==========================================
  // 2. GIAO DIỆN XEM THIỆP CƯỚI & HẬU CUNG (/marry xem)
  // ==========================================
  profile: {
    singleSelf: 'Bạn hiện vẫn còn độc thân vui tính! Hãy dùng lệnh /marry cauhon để tìm kiếm nửa kia nhé! <a:bunnyg4:1541439959385374760>',
    singleOther: (targetId) => `<@${targetId}> hiện vẫn chưa kết hôn với ai cả! Ai đang để ý thì mau mau ngỏ lời đi kìa! <a:bunnyg4:1541439959385374760>`,
    notMarriedToSpecified: (targetId, spouseId) => `<@${targetId}> và <@${spouseId}> không phải là vợ chồng của nhau nha! 🐰`,

    // Embed danh sách Hậu Cung
    haremTitle: '<a:trangtrig2:1546040703375904801> 𝓗𝓪̣̂𝓾 𝓒𝓾𝓷𝓰 𝓒𝓾̉𝓪 𝓑𝓪̣𝓷 <a:trangtrig3:1546040818261954610>',
    formatHaremItem: (index, rel, levelInfo, daysTogether) =>
      `**#${index + 1}.** <@${rel.spouseId}>\n` +
      `> <a:trangtrig46:1547240249761996812> ${(rel.lovePoints || 0).toLocaleString()} điểm · **${levelInfo.name}**\n` +
      `> <a:ilyg1:1546041656648929380> Cưới nhau ${daysTogether} ngày\n` +
      `> <a:trangtrig45:1547239010190237819> Streak: ${rel.streak || 0} ngày\n` +
      `> <a:ilyg1:1546041656648929380> ${rel.bio || 'Bên nhau trọn đời'}`,
    haremFooter: 'Em bot Usagi múp rụp ngưỡng mộ hậu cung đồ sộ quá nè!',

    // Embed Giấy Chứng Nhận Kết Hôn chi tiết
    certTitle: '<a:trangtrig2:1546040703375904801> 𝓖𝓲𝓪̂́𝔂 𝓒𝓱𝓾̛́𝓷𝓰 𝓝𝓱𝓪̣̂𝓷 𝓚𝓮̂́𝓽 𝓗𝓸̂𝓷 <a:trangtrig3:1546040818261954610>',
    certDescription: (userId, spouseId, bio) =>
      `<@${userId}> <a:heartg6:1546906117551030382> <@${spouseId}>\n\n` +
      `> 💌 **Lời thề ước:** *" ${bio || 'Bên nhau trọn đời 💕'} "*`,
    certFooter: 'Dùng /marry tuongtac hoặc /marry diemdanh để tăng điểm mỗi ngày nha!',
  },

  // ==========================================
  // 3. GIAO DIỆN TƯƠNG TÁC HÂM NÓNG (/marry tuongtac)
  // ==========================================
  interact: {
    cooldownMs: 20 * 60 * 1000, // 20 phút cooldown
    points: {
      hon: 25,
      om: 20,
      date: 30,
      tangqua: 35,
      xoadau: 20,
    },
    embedTitle: '<a:trangtrig2:1546040703375904801> 𝓗𝓪̂𝓶 𝓝𝓸́𝓷𝓰 𝓣𝓲̀𝓷𝓱 𝓒𝓪̉𝓶 <a:trangtrig3:1546040818261954610>',
    cooldownMessage: (spouseId, remainingFormatted) =>
      `Bạn và <@${spouseId}> vừa mới hâm nóng tình cảm xong mà! Hãy để đối phương nghỉ ngơi một chút nha! Cooldown còn lại: ${remainingFormatted}`,
    embedFooter: 'Tình yêu như cây xanh, cần chăm tưới mỗi ngày nha!',
    quotes: {
      hon: [
        (s, sp) => `<@${s}> khẽ nhón chân, trao cho <@${sp}> một nụ hôn nồng cháy khiến tim đập thình thịch! <a:meongg7:1546091671970783282>`,
        (s, sp) => `<@${s}> nhẹ nhàng đặt một nụ hôn ngọt ngào lên má <@${sp}>, cả thế giới như ngừng quay~ <a:ebichug2:1541444390856163458>`,
        (s, sp) => `<@${s}> giữ chặt tay <@${sp}> và trao một nụ hôn say đắm ngập tràn yêu thương! <a:ebichug2:1541444390856163458>`,
      ],
      om: [
        (s, sp) => `<@${s}> ôm chầm lấy <@${sp}> từ phía sau thật ấm áp và bình yên! <a:chiikawag5:1541427207375683614>`,
        (s, sp) => `<@${s}> kéo <@${sp}> vào lòng sưởi ấm, thì thầm những lời yêu thương ngọt ngào~ <a:chiikawag5:1541427207375683614>`,
        (s, sp) => `<@${s}> vùi đầu vào vai <@${sp}> tận hưởng khoảnh khắc ấm áp bên nhau! <a:chiikawag5:1541427207375683614>`,
      ],
      date: [
        (s, sp) => `<@${s}> và <@${sp}> cùng nắm tay đi dạo dưới bầu trời đầy sao lãng mạn~ <:dog19:1546085874763178094>`,
        (s, sp) => `<@${s}> chuẩn bị bữa tối lung linh dưới ánh nến và nâng ly rượu mừng cùng <@${sp}>! <:dog19:1546085874763178094>`,
        (s, sp) => `<@${s}> cùng <@${sp}> ghé quán trà nhỏ, tận hưởng từng phút giây an yên bên người thương! <:dog19:1546085874763178094>`,
      ],
      tangqua: [
        (s, sp) => `<@${s}> chuẩn bị một món quà bất ngờ cực kỳ đáng yêu dành tặng <@${sp}>! <a:giftg1:1543150714732412948>`,
        (s, sp) => `<@${s}> tặng <@${sp}> một bó hoa hồng đỏ thắm tượng trưng cho tình yêu bất diệt! <a:giftg1:1543150714732412948>`,
        (s, sp) => `<@${s}> gửi tặng <@${sp}> một món quà ngọt ngào khiến đối phương mỉm cười rạng rỡ! <a:giftg1:1543150714732412948>`,
      ],
      xoadau: [
        (s, sp) => `<@${s}> khẽ đưa tay xoa đầu <@${sp}> với ánh mắt cưng chiều hết mực! <a:bunnyg3:1541439928511107163>`,
        (s, sp) => `<@${s}> nhẹ nhàng vuốt tóc <@${sp}>, bảo rằng: "Hôm nay bạn vất vả rồi, thương nhiều lắm!" <a:bunnyg3:1541439928511107163>`,
        (s, sp) => `<@${s}> xoa nhẹ mái tóc của <@${sp}> khiến đối phương bất giác mỉm cười hạnh phúc! <a:bunnyg3:1541439928511107163>`,
      ],
    },
  },

  // ==========================================
  // 4. GIAO DIỆN ĐIỂM DANH UYÊN ƯƠNG (/marry diemdanh)
  // ==========================================
  checkIn: {
    cooldownMs: 20 * 60 * 60 * 1000, // 20 tiếng cooldown
    basePoints: 50,                  // Điểm gốc mỗi ngày
    streakBonusPerDay: 5,            // Thưởng thêm mỗi ngày streak
    maxStreakBonus: 50,              // Thưởng tối đa từ streak
    embedTitle: '<a:trangtrig2:1546040703375904801> 𝓒𝓱𝓮𝓬𝓴 𝓘𝓷 <a:trangtrig3:1546040818261954610>',
    cooldownMessage: (spouseId, remainingFormatted) =>
      `Hôm nay bạn và <@${spouseId}> đã điểm danh rồi nè!\nHãy quay lại sau: ${remainingFormatted} nhé!`,
    description: (u1, u2, gained, base, streakBonus, streak, total, levelName) =>
      `Chúc <@${u1}> và <@${u2}> một ngày mới ngập tràn hạnh phúc bên nhau! <a:hamsterg3:1546057620727799878>\n` +
      `> <a:trangtrig46:1547240249761996812> Điểm Thân Mật nhận được: +${gained} <a:trangtrig46:1547240249761996812> (Gốc: +${base} <a:trangtrig46:1547240249761996812>\n` +
      `> Thưởng Streak: +${streakBonus} <a:trangtrig46:1547240249761996812>)\n` +
      `> <a:trangtrig45:1547239010190237819> Chuỗi ngày điểm danh: ${streak} ngày liên tục\n` +
      `> <a:trangtrig46:1547240249761996812> Tổng Điểm Thân Mật: ${total.toLocaleString()} điểm (${levelName})`,
    embedFooter: 'Mỗi ngày điểm danh một lần để duy trì chuỗi streak nhé!',
  },

  // ==========================================
  // 5. GIAO DIỆN TẶNG QUÀ TÌNH YÊU (/marry tangqua)
  // ==========================================
  gifts: {
    cooldownMs: 60 * 60 * 1000,      // 1 tiếng cooldown
    embedColor: '#FF69B4',
    embedTitle: '<a:trangtrig2:1546040703375904801> 𝓠𝓾𝓪̀ 𝓣𝓪̣̆𝓷𝓰 𝓣𝓲̀𝓷𝓱 𝓨𝓮̂𝓾 𝓝𝓰𝓸̣𝓽 𝓝𝓰𝓪̀𝓸 <a:trangtrig3:1546040818261954610>',
    items: {
      trasua: {
        name: 'Trà Sữa Trân Châu',
        points: 20,
        icon: '<a:giftg1:1543150714732412948>',
        desc: 'Ngọt ngào thanh mát như tình yêu ban đầu',
      },
      hoahong: {
        name: 'Bó Hoa Hồng Đỏ',
        points: 40,
        icon: '<a:giftg1:1543150714732412948>',
        desc: 'Tượng trưng cho tình cảm nồng thắm bất diệt',
      },
      socola: {
        name: 'Hộp Socola Trái Tim',
        points: 65,
        icon: '<a:giftg1:1543150714732412948>',
        desc: 'Vị ngọt đắng khó quên của tình yêu say đắm',
      },
      kimcuong: {
        name: 'Nhẫn Kim Cương Lấp Lánh',
        points: 150,
        icon: '<a:giftg1:1543150714732412948>',
        desc: 'Lời thề hẹn ước vĩnh cửu trọn đời trọn kiếp',
      },
    },
    cooldownMessage: (spouseId, remainingFormatted) =>
      `Bạn vừa mới tặng quà cho <@${spouseId}> xong mà! Tặng nhiều quá đối phương ngại đó nha~ 🙈\n` +
      `<a:trangtrig46:1547240249761996812> Cooldown tặng quà: ${remainingFormatted}`,
    embedFooter: 'Một món quà nhỏ mang trọn tấm lòng lớn!',
  },

  // ==========================================
  // 6. GIAO DIỆN LỜI THỀ ƯỚC (/marry loinhac)
  // ==========================================
  vows: {
    success: (spouseId, newBio) =>
      `<a:trangtrig31:1546905996893626440> Đã cập nhật lời thề ước mới cùng <@${spouseId}> trên Giấy Kết Hôn\n` +
      `> " ${newBio} " <a:catg5:1542406653574389770>`,
  },

  // ==========================================
  // 7. GIAO DIỆN LY HÔN (/marry lyhon)
  // ==========================================
  divorce: {
    buttonConfirm: {
      label: 'Xác nhận ly hôn',
    },
    buttonCancel: {
      label: 'Suy nghĩ lại',
      emoji: '<a:hamsterg2:1546057566209974292>',
    },
    confirmTitle: '<a:bang2:1546891483250954290> 𝓧𝓪́𝓬 𝓝𝓱𝓪̣̂𝓷 𝓖𝓲𝓪̉𝓲 𝓣𝓻𝓾̛̀ 𝓠𝓾𝓪𝓷 𝓗𝓮̣̂ 𝓗𝓸̂𝓷 𝓝𝓱𝓪̂𝓷 <a:bang2:1546891483250954290>',
    confirmDescription: (spouseId) =>
      `Bạn có chắc chắn muốn ly hôn với <@${spouseId}> không? <:chiikawa4:1541429063392956516>\n` +
      `> Điểm Thân Mật, chuỗi streak và ngày kết hôn giữa hai người sẽ bị xóa vĩnh viễn!\n` +
      `> *(Các mối quan hệ với những bạn đời khác trong hậu cung vẫn được giữ nguyên)*\n` +
      `> Hãy suy nghĩ thật kỹ trước khi đưa ra quyết định nhé!`,
    confirmFooter: 'Thời gian xác nhận là 60 giây',
    cancelledMessage: 'Bạn đã hủy thủ tục ly hôn! Hãy trân trọng và thấu hiểu nhau nhiều hơn nhé! <a:bunnyg4:1541439959385374760>',
    announcementTitle: '<a:trangtrig2:1546040703375904801> 𝓣𝓱𝓸̂𝓷𝓰 𝓑𝓪́𝓸 𝓚𝓮̂́𝓽 𝓣𝓱𝓾́𝓬 𝓗𝓸̂𝓷 𝓝𝓱𝓪̂𝓷 <a:trangtrig3:1546040818261954610>',
    announcementDescription: (authorId, spouseId) =>
      `<@${authorId}> và <@${spouseId}> đã chính thức ly hôn. Chúc cả hai sẽ luôn tìm thấy niềm vui và sự an yên trên con đường phía trước! <a:heartg5:1546906071199907972>`,
    announcementFooter: 'Em bot Usagi múp rụp gửi lời chúc bình an đến cả hai~',
  },

  // ==========================================
  // 8. BẢNG XẾP HẠNG (/marry bxh)
  // ==========================================
  leaderboard: {
    emptyMessage: 'Server hiện chưa có cặp đôi nào kết hôn cả! Hãy là cặp đôi đầu tiên với lệnh /marry cauhon nhé!',
    embedTitle: '<a:trangtrig19:1546068350030053406> 𝓑𝓪̉𝓷𝓰 𝓥𝓪̀𝓷𝓰 𝓒𝓸𝓾𝓹𝓵𝓮 <a:trangtrig19:1546068350030053406>',
    embedFooter: 'Em bot Usagi múp rụp vinh danh tình yêu viên mãn!',
  },

  // ==========================================
  // 9. THÔNG BÁO TAG BẠN ĐỜI TRONG CHAT
  // ==========================================
  mention: {
    cooldownMs: 60 * 1000, // 1 phút giữa các lần tag
    points: 5,             // +5 💕 mỗi lần tag
    reactionEmoji: '<a:trangtrig47:1547249293944029308>', // Tự động thả tim custom
  },

  // ==========================================
  // 10. THÔNG BÁO TREO VOICE CÙNG PHÒNG
  // ==========================================
  voice: {
    targetMinutes: 30, // Cứ mỗi 30 phút
    pointsReward: 30,  // Cộng 30 điểm
    messageText: (u1, u2, channelId, points, total, icon, name) =>
      `<a:trangtrig15:1546047955696488489> <@${u1}> và <@${u2}> đã cùng nhau gắn bó 30 phút trong phòng thoại <#${channelId}>! ` +
      `Hai bạn được cộng +${points} Điểm Thân Mật <a:trangtrig46:1547240249761996812> ` +
      `*(Tổng cộng: ${total.toLocaleString()} <a:trangtrig46:1547240249761996812> · ${icon} ${name})*`,
  },

  // ==========================================
  // 11. BẢNG 6 CẤP BẬC TÌNH YÊU (LOVE TIERS)
  // ==========================================
  levels: [
    { min: 0, level: 1, name: 'Tình Đầu Ngây Thơ', icon: '<:hamster1:1546057497159409664>', title: 'Thuở Thiếu Thời' },
    { min: 250, level: 2, name: 'Mặn Nồng Thắm Thiết', icon: '<:hamster1:1546057497159409664>', title: 'Uyên Ương Say Đắm' },
    { min: 600, level: 3, name: 'Tâm Đầu Ý Hợp', icon: '<:hamster1:1546057497159409664>', title: 'Tương Kính Như Tân' },
    { min: 1200, level: 4, name: 'Tri Kỷ Trăm Năm', icon: '<:hamster1:1546057497159409664>', title: 'Kết Tóc Se Duyên' },
    { min: 2500, level: 5, name: 'Uyên Ương Kim Cương', icon: '<:hamster1:1546057497159409664>', title: 'Đầu Bạc Răng Long' },
    { min: 5000, level: 6, name: 'Tiên Lữ Bất Diệt', icon: '<:hamster1:1546057497159409664>', title: 'Vĩnh Hằng Bất Hủ' },
  ],
};
