/**
 * prismData.js
 * Kho dữ liệu kịch bản mở rộng cho mini-game "Sắc Màu Định Mệnh" (Prism & Pride).
 * Bao gồm đầy đủ 54 mục kịch bản + Hệ thống Vật phẩm, Cửa hàng, Quà tặng & Nhiệm vụ ngày.
 */

export const PRISM_EMOJIS = Object.freeze({
  heartg5: '<a:heartg5:1546906071199907972>',
  trangtrig41: '<a:trangtrig41:1547238037832863744>', // Thần thái
  heartg3: '<a:heartg3:1546047728314884226>',       // Chân thành
  trangtrig29: '<a:trangtrig29:1546385117478527016>', // Nổi loạn
  trangtrig49: '<a:trangtrig49:1567818140375851018>',
  trangtrig50: '<a:trangtrig50:1567818385306165301>', // Title Left
  trangtrig51: '<a:trangtrig51:1567818549794439229>', // Title Right
  trangtrig62: '<a:trangtrig62:1569560241190871152>', // Bullet / Hub Buttons / Cực Hiếm
  capybarag1: '<a:capybarag1:1546058369566122015>',
  animeg5: '<a:animeg5:1546087137227579432>',
  trangtrig30: '<a:trangtrig30:1546905942476464178>', // Chat / Thả thính
  trangtrig20: '<a:trangtrig20:1546092997299667055>', // Vòng quay / Tiếp tục
  hamster1: '<:hamster1:1546057497159409664>',       // Áo / Quần
  trangtrig60: '<a:trangtrig60:1569558191551942696>', // Phụ kiện
  trangtrig5: '<a:trangtrig5:1546042766029754368>',   // Chọn món / Chốt

  // Emojis mới bổ sung
  xucauvong: '<a:xucauvong:1571138752284332082>',
  lcbluelollipop: '<a:lcbluelollipop:1571141483476811826>',
  remdance: '<a:remdance:1571141481580990504>',
  bua_ho_menh_discord: '<a:bua_ho_menh_discord:1571141485448138762>',
  xuc_xac_may_man_discord: '<a:xuc_xac_may_man_discord:1571141488039956611>',
  boba: '<a:boba:1571141477755654324>',
  flowerswhite: '<a:flowerswhite:1571141475691925594>',
});

export const IDENTITY_PROFILES = Object.freeze({
  gay: {
    key: 'gay',
    name: 'Hội Anh Trai Cầu Vồng (Gay)',
    emoji: '<:gay:1571137010150670517>',
    description: 'Tự tin, cuốn hút và luôn là tâm điểm của sự chú ý với phong thái đĩnh đạc, ấm áp.',
    initialPoints: { slay: 20, heart: 10, rebel: 10 },
    crushTitle: 'Anh chàng barista điển trai',
    crushCall: 'cậu',
    playerCall: 'mình',
  },
  lesbian: {
    key: 'lesbian',
    name: 'Hội Chị Em Bách Hợp (Lesbian)',
    emoji: '<:lesbianprideflag:1571137266904993864>',
    description: 'Sâu lắng, ấm áp, tinh tế và tràn đầy sự thấu hiểu chân thành với người thương.',
    initialPoints: { slay: 10, heart: 20, rebel: 10 },
    crushTitle: 'Cô nàng họa sĩ cá tính',
    crushCall: 'cậu',
    playerCall: 'tớ',
  },
  pansexual: {
    key: 'pansexual',
    name: 'Hệ Chơi Đa Vũ Trụ (Bisexual / Pansexual)',
    emoji: '<:pansexual:1571085128493568091>',
    description: 'Cởi mở, đa sắc màu, nhìn thấu vẻ đẹp tâm hồn vượt qua mọi giới hạn và định kiến.',
    initialPoints: { slay: 15, heart: 15, rebel: 10 },
    crushTitle: 'Người ấy cực phẩm',
    crushCall: 'bạn',
    playerCall: 'mình',
  },
  transgender: {
    key: 'transgender',
    name: 'Chiến Binh Chuyển Giới (Transgender)',
    emoji: '<:genderfluid32:1571137005700653076>',
    description: 'Mạnh mẽ, kiên cường, dũng cảm vượt qua định kiến để sống thật với chính con người mình.',
    initialPoints: { slay: 15, heart: 15, rebel: 15 },
    crushTitle: 'Người thương ấm áp',
    crushCall: 'cậu',
    playerCall: 'tớ',
  },
  nonbinary: {
    key: 'nonbinary',
    name: 'Phi Nhị Nguyên Giới (Non-binary)',
    emoji: '<:nonbinarypridefl:1571137003691708477>',
    description: 'Tự do, phá cách, tỏa sáng độc bản mà không bị ràng buộc bởi bất kỳ khuôn mẫu nhị nguyên nào.',
    initialPoints: { slay: 15, heart: 10, rebel: 20 },
    crushTitle: 'Tâm hồn đồng điệu',
    crushCall: 'bạn',
    playerCall: 'mình',
  },
  asexual: {
    key: 'asexual',
    name: 'Hội Tâm Hồn Tự Do (Asexual / Aromantic)',
    emoji: '<:asexualprideflag:1571137001674117131>',
    description: 'Độc lập, tinh tế, tìm kiếm những kết nối tâm hồn thuần khiết và không gian bình yên.',
    initialPoints: { slay: 20, heart: 20, rebel: 5 },
    crushTitle: 'Đứa bạn thân hợp cạ',
    crushCall: 'bồ',
    playerCall: 'tui',
  },
});

export function randomRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Danh sách toàn bộ vật phẩm trong hệ thống (Túi đồ, Shop & Quà tặng)
 */
export const PRISM_ITEMS = Object.freeze({
  // Nhóm 1: Vật Phẩm Kỷ Niệm & Hỗ Trợ
  lollipop: {
    key: 'lollipop',
    name: 'Kẹo Mút Lục Sắc',
    emoji: '<a:lcbluelollipop:1571141483476811826>',
    rarity: 'Thường',
    category: 'souvenir',
    price: 40,
    desc: 'Dùng để cộng random +8 ~ +15 Chân thành.',
  },
  fan: {
    key: 'fan',
    name: 'Quạt Xếp Ánh Kim',
    emoji: '<a:remdance:1571141481580990504>',
    rarity: 'Hiếm',
    category: 'souvenir',
    price: 85,
    desc: 'Dùng để cộng random +15 ~ +25 Thần thái.',
  },
  crown: {
    key: 'crown',
    name: 'Vương Miện Tự Hào',
    emoji: '<a:trangtrig62:1569560241190871152>',
    rarity: 'Cực Hiếm',
    category: 'souvenir',
    price: null, // Không bán ở shop, chỉ rớt hoặc mở hộp mù
    desc: 'Dùng để cộng random +20 ~ +35 cho cả 3 chỉ số.',
  },
  amulet: {
    key: 'amulet',
    name: 'Bùa Hộ Mệnh',
    emoji: '<a:bua_ho_menh_discord:1571141485448138762>',
    rarity: 'Hỗ Trợ',
    category: 'buff',
    price: 90,
    desc: 'Bấm dùng để kích hoạt trạng thái bảo vệ (amulet + 1), chặn 1 lần bị trừ điểm.',
  },
  dice: {
    key: 'dice',
    name: 'Xúc Xắc May Mắn',
    emoji: '<a:xuc_xac_may_man_discord:1571141488039956611>',
    rarity: 'Hỗ Trợ',
    category: 'buff',
    price: 120,
    desc: 'Bấm dùng để kích hoạt buff (dice + 1), nhân đôi (x2) hoặc nhân ba (x3) điểm ở lượt mini-game tiếp theo.',
  },
  mystery_box: {
    key: 'mystery_box',
    name: 'Hộp Mù Bí Ẩn',
    emoji: '<a:trangtrig62:1569560241190871152>',
    rarity: 'Đặc Biệt',
    category: 'mystery',
    price: 100,
    desc: 'Mở ra cơ hội trúng Vương Miện (2%), Quạt Xếp (18%), Kẹo Mút (50%), hoặc hoàn 30~60 Xu (30%).',
  },

  // Nhóm 2: Quà Tặng Crush
  boba: {
    key: 'boba',
    name: 'Trà Sữa Trân Châu Đường Đen',
    emoji: '<a:boba:1571141477755654324>',
    category: 'gift',
    price: 50,
    desc: 'Món quà ngọt ngào khiến đối phương cảm động, cộng điểm Chân thành & Thần thái.',
  },
  flowers: {
    key: 'flowers',
    name: 'Bó Hoa Tươi Thắm',
    emoji: '<a:flowerswhite:1571141475691925594>',
    category: 'gift',
    price: 80,
    desc: 'Bó hoa tươi rạng rỡ mang năng lượng yêu thương, cộng nhiều điểm Chân thành & Thần thái.',
  },
  movie_tickets: {
    key: 'movie_tickets',
    name: 'Cặp Vé Xem Phim Đôi',
    emoji: '<a:trangtrig62:1569560241190871152>',
    category: 'gift',
    price: 150,
    desc: 'Buổi hẹn hò riêng tư lãng mạn, nhận lời khen ngọt ngào và điểm cộng cực lớn.',
  },
});

/**
 * Cơ chế mở Hộp Mù Bí Ẩn
 * 2% Vương Miện, 18% Quạt Xếp, 50% Kẹo Mút, 30% hoàn 30~60 xu
 */
export function openMysteryBox() {
  const roll = Math.random() * 100;
  if (roll < 2) {
    return {
      type: 'item',
      itemKey: 'crown',
      name: 'Vương Miện Tự Hào (Cực Hiếm)',
      emoji: PRISM_EMOJIS.trangtrig62,
    };
  } else if (roll < 20) {
    return {
      type: 'item',
      itemKey: 'fan',
      name: 'Quạt Xếp Ánh Kim (Hiếm)',
      emoji: PRISM_EMOJIS.remdance,
    };
  } else if (roll < 70) {
    return {
      type: 'item',
      itemKey: 'lollipop',
      name: 'Kẹo Mút Lục Sắc (Thường)',
      emoji: PRISM_EMOJIS.lcbluelollipop,
    };
  } else {
    const refundCoins = randomRange(30, 60);
    return {
      type: 'coins',
      coins: refundCoins,
      name: `${refundCoins} Xu Cầu Vồng`,
      emoji: PRISM_EMOJIS.xucauvong,
    };
  }
}

/**
 * Tỷ lệ rớt vật phẩm sau mỗi lượt mini-game (Loot Drop)
 * 10% Thường (Kẹo Mút), 5% Hiếm (Quạt Xếp), 2% Cực Hiếm (Vương Miện), 83% không rớt
 */
export function rollLootDrop() {
  const roll = Math.random() * 100;
  if (roll < 2) {
    return {
      itemKey: 'crown',
      name: 'Vương Miện Tự Hào',
      rarity: 'Cực Hiếm',
      emoji: PRISM_EMOJIS.trangtrig62,
    };
  } else if (roll < 7) {
    // 2 + 5 = 7
    return {
      itemKey: 'fan',
      name: 'Quạt Xếp Ánh Kim',
      rarity: 'Hiếm',
      emoji: PRISM_EMOJIS.remdance,
    };
  } else if (roll < 17) {
    // 7 + 10 = 17
    return {
      itemKey: 'lollipop',
      name: 'Kẹo Mút Lục Sắc',
      rarity: 'Thường',
      emoji: PRISM_EMOJIS.lcbluelollipop,
    };
  }
  return null;
}

/**
 * Phản ứng của Crush khi được tặng quà
 */
export const CRUSH_GIFT_REACTIONS = Object.freeze({
  boba: [
    '{crush_title}: "Oa ly trà sữa đúng ý {crush_call} luôn á! Cảm ơn {player_call} nhiều nha, ngọt ngào từ miệng vào tới tim luôn rồi!"',
    '{crush_title}: "Trời ơi sao {player_call} biết {crush_call} đang thèm trà sữa hay vậy? Uống chung một ngụm với {crush_call} không nè?"',
  ],
  flowers: [
    '{crush_title}: "Bó hoa đẹp quá chừng! Nhưng đứng cạnh {player_call} thì hoa cũng phải chịu thua một bậc đó nha!"',
    '{crush_title}: "Cảm ơn {player_call} vì món quà bất ngờ này! {crush_call} sẽ cắm ngay ở bàn làm việc để ngắm cả ngày!"',
  ],
  movie_tickets: [
    '{crush_title}: "Cặp vé xem phim đôi á? Tuyệt vời quá! Cuối tuần này {crush_call} dành trọn thời gian để đi xem cùng {player_call} luôn đó!"',
    '{crush_title}: "Chốt kèo liền! Đi xem phim nhớ ngồi sát rạt cạnh {player_call} mới chịu nha!"',
  ],
});

/**
 * Lấy chuỗi ngày YYYY-MM-DD theo múi giờ Việt Nam (Asia/Ho_Chi_Minh)
 */
export function getVietnamDateString() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Kho nhiệm vụ ngày phân theo độ khó
 */
export const QUEST_POOL = Object.freeze({
  tier1: [
    { id: 'story_1', action: 'story', target: 1, title: 'Chơi Tình Huống Khó Đỡ 1 lần', reward: 30 },
    { id: 'spin_1', action: 'spin', target: 1, title: 'Quay Vòng Quay Định Mệnh 1 lần', reward: 30 },
    { id: 'chat_1', action: 'chat', target: 1, title: 'Nhắn Tin Cho Crush 1 lần', reward: 30 },
  ],
  tier2: [
    { id: 'outfit_1', action: 'outfit', target: 1, title: 'Phối Đồ Đi Hội 1 lần', reward: 50 },
    { id: 'use_item_1', action: 'use_item', target: 1, title: 'Sử Dụng Vật Phẩm Trong Túi 1 lần', reward: 50 },
    { id: 'story_2', action: 'story', target: 2, title: 'Chơi Tình Huống Khó Đỡ 2 lần', reward: 50 },
  ],
  tier3: [
    { id: 'gift_1', action: 'gift', target: 1, title: 'Tặng Quà Cho Crush 1 lần', reward: 70 },
    { id: 'spin_2', action: 'spin', target: 2, title: 'Quay Vòng Quay Định Mệnh 2 lần', reward: 70 },
  ],
});

/**
 * Khởi tạo hoặc lấy danh sách 3 nhiệm vụ ngẫu nhiên của ngày hôm nay
 */
export function getOrGenerateDailyQuests(stored) {
  const today = getVietnamDateString();
  if (stored && stored.date === today && Array.isArray(stored.quests) && stored.quests.length === 3) {
    return stored;
  }

  const q1 = QUEST_POOL.tier1[Math.floor(Math.random() * QUEST_POOL.tier1.length)];
  const q2 = QUEST_POOL.tier2[Math.floor(Math.random() * QUEST_POOL.tier2.length)];
  const q3 = QUEST_POOL.tier3[Math.floor(Math.random() * QUEST_POOL.tier3.length)];

  return {
    date: today,
    quests: [
      { id: q1.id, action: q1.action, target: q1.target, title: q1.title, reward: q1.reward, progress: 0, claimed: false },
      { id: q2.id, action: q2.action, target: q2.target, title: q2.title, reward: q2.reward, progress: 0, claimed: false },
      { id: q3.id, action: q3.action, target: q3.target, title: q3.title, reward: q3.reward, progress: 0, claimed: false },
    ],
  };
}

/**
 * 16 Tình huống khó đỡ (Mini-game 1)
 */
export const STORY_SCENARIOS = [
  {
    id: 1,
    title: 'Bữa cơm gia đình bất ổn',
    context: 'Tối Chủ Nhật ở phòng khách. Ba mẹ vô tình thấy cờ ủng hộ cộng đồng LGBTQ+ rơi ra từ balo của bạn. Không khí căng như dây đàn, ba thở dài: "Nhà mình không chấp nhận chuyện này, con dẹp ngay đi!"',
    choices: {
      A: {
        label: 'A: Nhẹ nhàng tâm sự',
        summary: 'Bạn nắm tay mẹ kể về những áp lực đã giấu kín bao năm. Mẹ lặng người dịu giọng xuống 50%, sáng hôm sau ba còn gọt sẵn đĩa trái cây để ngoài bàn cho bạn.',
        points: { heart: [15, 25], slay: [5, 15] },
      },
      B: {
        label: 'B: Bẻ lái tấu hài',
        summary: 'Bạn cười xòa: "Trời ơi thời buổi này kiếm được người thương mình thật lòng còn khó hơn trúng Vietlott đó ba mẹ!". Ba mẹ đứng hình 3 giây rồi phì cười, tạm thoát kiếp nạn tối nay!',
        points: { slay: [15, 25], rebel: [5, 15] },
      },
      C: {
        label: 'C: Mặc kệ & Khẳng định bản thân',
        summary: 'Bạn ngẩng cao đầu: "Con yêu ba mẹ, nhưng con không thể sống cuộc đời của người khác được!" rồi xách balo sang ở nhờ nhà bạn thân, tự do 100%!',
        points: { rebel: [18, 30], slay: [5, 15], heart: [-12, -5] },
      },
    },
  },
  {
    id: 2,
    title: 'Mâm cỗ họ hàng ngày Tết',
    context: 'Đang gắp miếng giò lụa thì bà cô họ xa hỏi oang oang: "Năm nay bao nhiêu tuổi rồi mà chưa dẫn người yêu về ra mắt? Hay là kén quá?" Cả bàn đồng loạt quay sang nhìn bạn.',
    choices: {
      A: {
        label: 'A: Đáp trả sang chảnh',
        summary: 'Bạn nhấp ngụm trà: "Dạ cháu đang bận kiếm tiền với tận hưởng cuộc sống ạ, duyên tới lúc nào cháu báo tin vui sau nha cô!". Khí chất ngút ngàn khiến bà cô gật gù khen ngợi.',
        points: { slay: [15, 25], heart: [5, 15] },
      },
      B: {
        label: 'B: Chia sẻ chân thành',
        summary: 'Bạn mỉm cười: "Cháu chỉ cần tìm một người thật sự hiểu và trân trọng cháu thôi ạ, không quan trọng là ai hay bao giờ." Mấy anh chị em họ ngồi cạnh vỗ tay rần rần!',
        points: { heart: [15, 25], slay: [5, 15] },
      },
      C: {
        label: 'C: Bẻ lái cực gắt',
        summary: 'Bạn tỉnh bơ: "Cháu đang phân vân giữa mấy mối ngon quá chưa biết chọn ai cô ạ, hay cô chọn giúp cháu nha?" Cả mâm cỗ cười nghiêng ngả, không ai dám hỏi thêm!',
        points: { rebel: [18, 30], slay: [5, 15] },
      },
    },
  },
  {
    id: 3,
    title: 'Đồng nghiệp tò mò ở công ty',
    context: 'Giờ nghỉ trưa, một đồng nghiệp thấy hình nền điện thoại lục sắc của bạn và hỏi nửa đùa nửa thật: "Ủa bộ bạn thuộc cộng đồng đó hả? Nhìn bề ngoài đâu có giống đâu!"',
    choices: {
      A: {
        label: 'A: Phá bỏ định kiến tinh tế',
        summary: 'Bạn cười nhẹ: "Cộng đồng tụi mình đa dạng lắm, đâu có khuôn mẫu cố định nào đâu bạn. Miễn mình sống tốt và làm việc hết mình là được ha!"',
        points: { slay: [15, 25], heart: [5, 15] },
      },
      B: {
        label: 'B: Hùa theo trêu lại',
        summary: 'Bạn nháy mắt: "Trời, mình giấu kỹ vậy mà bạn cũng phát hiện ra hả? Giữ bí mật nha không là mình nổi tiếng nhất văn phòng mất!"',
        points: { slay: [15, 25], rebel: [5, 15] },
      },
      C: {
        label: 'C: Khẳng định tự hào',
        summary: 'Bạn giơ cao chiếc ly cầu vồng trên bàn: "Chuẩn luôn bạn ơi! Tự hào 100% nhé!" Sự tự tin của bạn khiến đồng nghiệp trầm trồ nể phục.',
        points: { rebel: [18, 30], slay: [5, 15] },
      },
    },
  },
  {
    id: 4,
    title: 'Buổi họp lớp cũ và định kiến',
    context: 'Đi họp lớp cấp 3, một đứa bạn cũ vốn hay trêu chọc người khác bỗng chỉ vào bộ đồ cá tính của bạn và cười cợt: "Nay ăn mặc nhìn lạ đời vậy, định chuyển hệ hả?"',
    choices: {
      A: {
        label: 'A: Đáp trả sắc sảo',
        summary: 'Bạn nhìn thẳng mắt nó, cười nhạt: "Thời đại nào rồi mà còn giữ tư duy đóng khung vậy bạn? Mình mặc đẹp cho mình ngắm, đâu cần xin phép ai."',
        points: { slay: [18, 30], rebel: [5, 15] },
      },
      B: {
        label: 'B: Bình tĩnh giải thích',
        summary: 'Bạn mỉm cười: "Mình chỉ đang sống đúng với phong cách và con người thật của mình thôi. Mọi người ở đây ai cũng trưởng thành rồi mà, đúng không?"',
        points: { heart: [15, 25], slay: [5, 15] },
      },
      C: {
        label: 'C: Phớt lờ đầy khí chất',
        summary: 'Bạn nâng ly nước ngọt lên chạm cốc với hội bạn thân ngồi cạnh, coi như người kia tàng hình. Đối phương quê xệ tự động im bặt!',
        points: { slay: [15, 25], rebel: [5, 15] },
      },
    },
  },
  {
    id: 5,
    title: 'Bạn thân lỡ thích thầm mình',
    context: 'Đứa bạn thân không hợp xu hướng của bạn bỗng nhiên tỏ tình cực kỳ nghiêm túc dưới trời mưa lãng mạn, trong khi bạn chỉ coi nó là chiến hữu.',
    choices: {
      A: {
        label: 'A: Thẳng thắn nhưng ấm áp',
        summary: 'Bạn che ô cho nó và nhẹ nhàng chia sẻ thật về bản dạng/xu hướng của mình để cả hai không bị khó xử, giữ trọn tình bạn đẹp.',
        points: { heart: [18, 30], slay: [5, 15] },
      },
      B: {
        label: 'B: Chuyển hướng sang tấu hài',
        summary: 'Bạn vỗ vai nó cái bốp: "Ê nay uống nhầm trà sữa hết hạn hả bro? Tỉnh lại đi, hai đứa mình làm anh em cây khế mới bền vững!"',
        points: { slay: [15, 25], rebel: [5, 15] },
      },
      C: {
        label: 'C: Rút lui thần tốc',
        summary: 'Bạn giả vờ có cuộc gọi khẩn cấp từ vũ trụ: "Alo mẹ gọi về cất quần áo rồi, mai tính tiếp nha!" rồi chạy biến trong 3 giây.',
        points: { rebel: [15, 25], slay: [5, 15] },
      },
    },
  },
  {
    id: 6,
    title: 'Gặp người yêu cũ ở phố đi bộ',
    context: 'Đang tung tăng đi dạo cùng hội bạn thì đụng mặt ngay người yêu cũ đi cùng người mới. Hai bên chạm mắt nhau giữa ngã tư đường!',
    choices: {
      A: {
        label: 'A: Chào hỏi văn minh',
        summary: 'Bạn gật đầu mỉm cười rạng rỡ chúc phúc trong lòng rồi sải bước đi tiếp như một vị thần.',
        points: { slay: [18, 30], heart: [5, 15] },
      },
      B: {
        label: 'B: Tranh thủ khoe độ hạnh phúc',
        summary: 'Bạn khoác tay đứa bạn thân cười nói rôm rả: "Tối nay đi quẩy tới sáng luôn nha!", cho người cũ thấy mình đang sống cực kỳ rực rỡ.',
        points: { rebel: [15, 25], slay: [5, 15] },
      },
      C: {
        label: 'C: Tâm sự mỏng với bạn thân',
        summary: 'Bạn rẽ ngay vào quán trà sữa gần đó, gọi full topping và ngồi phân tích 7749 lý do hồi xưa mình mù quáng.',
        points: { heart: [15, 25], rebel: [5, 15] },
      },
    },
  },
  {
    id: 7,
    title: 'Bình luận kém duyên trên mạng xã hội',
    context: 'Bạn vừa đăng một tấm ảnh cực đẹp lên trang cá nhân hưởng ứng tháng Tự Hào thì có một tài khoản ảo nhảy vào bình luận công kích kém duyên.',
    choices: {
      A: {
        label: 'A: Xóa & Block trong 1 nốt nhạc',
        summary: 'Không tốn một giây năng lượng tiêu cực nào, bạn bấm chặn thẳng tay và tiếp tục đi ngắm ảnh đẹp.',
        points: { slay: [15, 25], heart: [5, 15] },
      },
      B: {
        label: 'B: Ghim bình luận & phản dame',
        summary: 'Bạn ghim bình luận đó lên đầu kèm câu trả lời: "Cảm ơn bạn đã tương tác giúp bài viết mình lên xu hướng nha!" khiến cả cộng đồng vào thả haha.',
        points: { rebel: [18, 30], slay: [5, 15] },
      },
      C: {
        label: 'C: Nhắn thông điệp tích cực',
        summary: 'Bạn phản hồi nhẹ nhàng về sự tôn trọng lẫn nhau trên không gian mạng, nhận về hàng trăm lượt thả tim ủng hộ từ bạn bè.',
        points: { heart: [18, 30], slay: [5, 15] },
      },
    },
  },
  {
    id: 8,
    title: 'Đứa em họ nhỏ tuổi tâm sự',
    context: 'Đứa em họ cấp 2 nhắn tin riêng cho bạn lúc nửa đêm: "Anh/chị ơi, hình như em cũng giống anh/chị... nhưng em sợ ba mẹ mắng lắm, em không biết phải làm sao."',
    choices: {
      A: {
        label: 'A: Lắng nghe và làm chỗ dựa',
        summary: 'Bạn thức tới 2 giờ sáng để lắng nghe, an ủi và hướng dẫn em cách bảo vệ bản thân cũng như từng bước chia sẻ với gia đình.',
        points: { heart: [18, 30], slay: [5, 15] },
      },
      B: {
        label: 'B: Truyền lửa tự tin',
        summary: 'Bạn gửi cho em một loạt bài viết truyền cảm hứng: "Đừng sợ gì hết, có anh/chị chống lưng cho em rồi, cứ tập trung học thật giỏi để tự lập nhé!"',
        points: { slay: [15, 25], heart: [5, 15] },
      },
      C: {
        label: 'C: Rủ em đi giải khuây',
        summary: 'Cuối tuần bạn dẫn em đi ăn kem và tham quan một không gian nghệ thuật của cộng đồng để em thấy mình không hề đơn độc.',
        points: { heart: [15, 25], rebel: [5, 15] },
      },
    },
  },
  {
    id: 9,
    title: 'Bị bắt gặp đang thả thính Crush',
    context: 'Bạn đang đứng trước gương tập dượt câu thả thính sến súa nhất quả đất để chuẩn bị gặp {crush_title} thì mẹ bất ngờ mở cửa phòng bước vào!',
    choices: {
      A: {
        label: 'A: Biến thành diễn viên kịch',
        summary: 'Bạn lập tức đổi tông giọng sang ngâm thơ: "Con đang tập kịch cho câu lạc bộ ở trường đó mẹ!" — diễn sâu tới mức mẹ tin sái cổ.',
        points: { slay: [15, 25], rebel: [5, 15] },
      },
      B: {
        label: 'B: Thú nhận ngây ngô',
        summary: 'Bạn đỏ mặt gãi đầu: "Dạ con đang tập nói chuyện với người con thích ạ..." Mẹ phì cười rồi đóng cửa lại cho bạn không gian riêng.',
        points: { heart: [18, 30], slay: [5, 15] },
      },
      C: {
        label: 'C: Rủ mẹ làm quân sư',
        summary: 'Bạn kéo mẹ ngồi xuống: "Mẹ nghe thử xem câu này ổn chưa, mẹ tư vấn cho con với!" Hai mẹ con ngồi cười ngặt nghẽo suốt buổi tối.',
        points: { heart: [15, 25], slay: [5, 15] },
      },
    },
  },
  {
    id: 10,
    title: 'Sự cố mic trong đêm nhạc cộng đồng',
    context: 'Bạn được mời lên sân khấu giao lưu ở đêm hội Pride, vừa cầm micro lên thì âm thanh bỗng dưng tắt phụt trong 5 giây trước hàng trăm khán giả!',
    choices: {
      A: {
        label: 'A: Bắn tim & khuấy động đám đông',
        summary: 'Bạn giơ hai tay làm hình trái tim thật to và hô vang không cần mic: "Mọi người ơi cháy lên nào!" Cả quảng trường hò reo vang dội!',
        points: { slay: [18, 30], rebel: [5, 15] },
      },
      B: {
        label: 'B: Cười duyên chữa cháy',
        summary: 'Bạn mỉm cười thật tươi chờ kỹ thuật viên xử lý, sau đó gửi lời cảm ơn chân thành tới tất cả mọi người đã có mặt hôm nay.',
        points: { heart: [15, 25], slay: [5, 15] },
      },
      C: {
        label: 'C: Nhảy ngẫu hứng',
        summary: 'Không có mic thì mình nhảy! Bạn làm ngay một đoạn vũ đạo cực sung theo tiếng vỗ tay của khán giả khiến không khí nóng hơn bao giờ hết!',
        points: { rebel: [18, 30], slay: [5, 15] },
      },
    },
  },
  {
    id: 11,
    title: 'Đặt nhầm đồ giao tới nhà',
    context: 'Bạn đặt mua một bộ phụ kiện Pride cực cháy trên mạng nhưng lại ghi nhầm số điện thoại của... ba bạn! Shipper gọi cho ba bạn ra nhận hàng giúp.',
    choices: {
      A: {
        label: 'A: Nhận hàng tỉnh bơ',
        summary: 'Bạn chạy ra cổng nhận gói hàng với gương mặt bình thản: "Dạ đồ trang trí sự kiện ở trường/công ty con đó ba!" — diễn xuất 10 điểm không có nhưng.',
        points: { slay: [15, 25], rebel: [5, 15] },
      },
      B: {
        label: 'B: Nhân cơ hội mở lòng',
        summary: 'Bạn cầm hộp hàng trên tay và nhẹ nhàng giải thích ý nghĩa của những món đồ bên trong cho ba hiểu thêm về thế giới của mình.',
        points: { heart: [18, 30], slay: [5, 15] },
      },
      C: {
        label: 'C: Tặng luôn cho ba một cái',
        summary: 'Bạn khui hộp ngay tại chỗ và cài thử một chiếc huy hiệu cầu vồng lên áo ba: "Ba đeo thử đi, nhìn trẻ ra 10 tuổi luôn á!"',
        points: { rebel: [18, 30], heart: [5, 15] },
      },
    },
  },
  {
    id: 12,
    title: 'Chụp ảnh kỷ yếu / sự kiện',
    context: 'Cả nhóm đang chuẩn bị chụp ảnh tập thể, phó nháy hô to: "Mọi người tạo dáng tự nhiên và cá tính nhất xem nào!"',
    choices: {
      A: {
        label: 'A: Tạo dáng bìa tạp chí',
        summary: 'Bạn xoay góc mặt thần thánh, hất nhẹ tóc và thả một ánh nhìn sắc lẹm thẳng vào ống kính. Tấm ảnh đẹp tới mức cả nhóm xin làm ảnh bìa!',
        points: { slay: [18, 30], heart: [5, 15] },
      },
      B: {
        label: 'B: Bắn tim tập thể',
        summary: 'Bạn rủ mọi người cùng ghép tay thành một trái tim khổng lồ giữa khung hình, tạo nên khoảnh khắc ấm áp nhớ đời.',
        points: { heart: [15, 25], slay: [5, 15] },
      },
      C: {
        label: 'C: Tạo dáng quậy đục nước',
        summary: 'Bạn nhảy lên không trung tạo dáng siêu nhân giải cứu thế giới khiến cả đội hình cười ngả nghiêng.',
        points: { rebel: [15, 25], slay: [5, 15] },
      },
    },
  },
  {
    id: 13,
    title: 'Quán cà phê bị nhìn ngó',
    context: 'Bạn và {crush_title} đang ngồi trò chuyện vui vẻ ở quán cà phê thì bàn bên cạnh cứ quay sang nhìn chằm chằm với ánh mắt tò mò.',
    choices: {
      A: {
        label: 'A: Tỏa sáng bất chấp ánh nhìn',
        summary: 'Bạn càng ngồi thẳng lưng, cười nói tự tin và rạng rỡ hơn nữa, biến ánh nhìn của họ thành khán giả bất đắc dĩ!',
        points: { slay: [15, 25], rebel: [5, 15] },
      },
      B: {
        label: 'B: Đổi sang chỗ ấm cúng hơn',
        summary: 'Bạn tinh tế rủ {crush_title} đổi sang góc ban công nhiều cây xanh để cả hai có không gian riêng tư, thoải mái tâm sự.',
        points: { heart: [15, 25], slay: [5, 15] },
      },
      C: {
        label: 'C: Mỉm cười chào lại',
        summary: 'Bạn quay sang gật đầu mỉm cười thân thiện với bàn bên cạnh khiến họ ngượng ngùng quay đi ngay lập tức.',
        points: { slay: [18, 30], heart: [5, 15] },
      },
    },
  },
  {
    id: 14,
    title: 'Chọn nhạc trên xe đi chơi xa',
    context: 'Cả nhóm bạn đang đi phượt cuối tuần và giao quyền làm DJ trên xe cho bạn. Ai cũng hóng xem bạn sẽ bật bài gì!',
    choices: {
      A: {
        label: 'A: Bật playlist Diva bùng nổ',
        summary: 'Cả xe lập tức biến thành sân khấu ca nhạc di động, mọi người cùng hát vang khản cả cổ!',
        points: { rebel: [15, 25], slay: [5, 15] },
      },
      B: {
        label: 'B: Bật nhạc Indie chữa lành',
        summary: 'Những giai điệu nhẹ nhàng vang lên giữa cảnh hoàng hôn khiến cả nhóm lặng yên tận hưởng phút giây bình yên.',
        points: { heart: [15, 25], slay: [5, 15] },
      },
      C: {
        label: 'C: Bật nhạc Remix cực căng',
        summary: 'Bạn biến chuyến đi thành sàn nhảy tốc độ cao khiến bác tài cũng phải nhún nhảy theo nhịp!',
        points: { rebel: [18, 30], slay: [5, 15] },
      },
    },
  },
  {
    id: 15,
    title: 'Đối mặt với câu hỏi "Ai là nam, ai là nữ?"',
    context: 'Một người quen mới gặp vô tư hỏi câu kinh điển: "Trong mối quan hệ của tụi bạn thì ai đóng vai nam, ai đóng vai nữ vậy?"',
    choices: {
      A: {
        label: 'A: Giải thích hóm hỉnh',
        summary: 'Bạn cười tươi: "Tụi mình đều là hai chiếc đũa trong một đôi đũa nè bạn ơi, thiếu một chiếc là không gắp được đồ ăn ngon đâu!"',
        points: { heart: [18, 30], slay: [5, 15] },
      },
      B: {
        label: 'B: Trả lời sang chảnh',
        summary: 'Bạn nháy mắt: "Tụi mình đều đóng vai chính trong bộ phim cuộc đời của nhau nha!"',
        points: { slay: [15, 25], rebel: [5, 15] },
      },
      C: {
        label: 'C: Đáp lại siêu lầy',
        summary: 'Bạn nhìn đồng hồ: "Tụi mình chia ca theo ngày chẵn lẻ bạn ạ, nay thứ Bảy nên cả hai cùng làm... người đi ăn lẩu!"',
        points: { rebel: [18, 30], slay: [5, 15] },
      },
    },
  },
  {
    id: 16,
    title: 'Bị hủy kèo phút chót',
    context: 'Bạn đã lên đồ lồng lộn chuẩn bị đi chơi thì đứa bạn thân nhắn tin báo bận đột xuất không đi được nữa!',
    choices: {
      A: {
        label: 'A: Tự mình đi chill',
        summary: 'Không gì cản được bước chân người đẹp! Bạn tự đặt một bàn ở quán rooftop sang chảnh, thưởng thức đồ uống ngon và chụp cả trăm tấm ảnh tự sướng.',
        points: { slay: [18, 30], rebel: [5, 15] },
      },
      B: {
        label: 'B: Gọi điện hỏi thăm bạn',
        summary: 'Bạn lo lắng hỏi xem bạn thân có gặp chuyện gì cần giúp không, sẵn sàng mang đồ ăn qua nhà tiếp tế cho nó.',
        points: { heart: [18, 30], slay: [5, 15] },
      },
      C: {
        label: 'C: Rủ rê hội bạn trên Discord',
        summary: 'Bạn lên kênh voice rủ ngay hội anh em trên server làm một đêm game xuyên màn đêm cực vui!',
        points: { rebel: [15, 25], heart: [5, 15] },
      },
    },
  },
];

/**
 * Mini-game 2: Sàn Diễn Outfit (6 chủ đề, 8 Áo, 8 Quần/Váy, 8 Phụ kiện)
 */
export const OUTFIT_THEMES = [
  { id: 0, name: 'Đêm Hội Diễu Hành Pride Parade', desc: 'Tối nay ra phố đi bộ nhất định phải tỏa sáng nhất khu này!' },
  { id: 1, name: 'Buổi Hẹn Hò Đầu Tiên Với {crush_title}', desc: 'Làm sao để vừa ấn tượng, vừa tinh tế khiến đối phương đổ gục ngay ánh nhìn đầu tiên?' },
  { id: 2, name: 'Tiệc Sinh Nhật Hội Bạn Thân', desc: 'Dresscode đêm nay là tự do phá cách, ai mặc nhạt nhòa phải bao chầu tăng hai!' },
  { id: 3, name: 'Triển Lãm Nghệ Thuật Sắc Màu', desc: 'Một không gian sang trọng, tinh tế để tôn vinh cá tính và gu thẩm mỹ của riêng bạn!' },
  { id: 4, name: 'Chuyến Dã Ngoại Cuối Tuần', desc: 'Năng động, trẻ trung để vừa thoải mái chạy nhảy vừa có ảnh sống ảo ngàn like!' },
  { id: 5, name: 'Đêm Nhạc Acoustic Dưới Ánh Nến', desc: 'Ấm áp, lãng mạn và đầy chất thơ giữa không gian âm nhạc dịu êm.' },
];

export const OUTFIT_TOPS = [
  { id: 0, name: 'Áo sơ mi lụa mở cúc phóng khoáng', points: { slay: [15, 25] } },
  { id: 1, name: 'Áo croptop ánh kim lấp lánh', points: { slay: [15, 25], rebel: [5, 15] } },
  { id: 2, name: 'Áo thun oversize in cờ Pride tối giản', points: { heart: [15, 25] } },
  { id: 3, name: 'Áo blazer cắt xẻ hiện đại', points: { slay: [18, 30] } },
  { id: 4, name: 'Áo len dệt kim pastel ấm áp', points: { heart: [18, 30] } },
  { id: 5, name: 'Áo khoác da đính đinh tán cực ngầu', points: { rebel: [18, 30] } },
  { id: 6, name: 'Áo gile len phối sơ mi trắng thư sinh', points: { heart: [15, 25], slay: [5, 15] } },
  { id: 7, name: 'Áo lưới xuyên thấu phá cách', points: { rebel: [15, 25], slay: [5, 15] } },
];

export const OUTFIT_BOTTOMS = [
  { id: 0, name: 'Quần ống rộng cạp cao hack dáng', points: { slay: [15, 25] } },
  { id: 1, name: 'Chân váy xếp ly phối dây xích', points: { rebel: [15, 25], slay: [5, 15] } },
  { id: 2, name: 'Quần jeans rách gối bụi bặm', points: { rebel: [18, 30] } },
  { id: 3, name: 'Quần short kaki năng động', points: { heart: [15, 25] } },
  { id: 4, name: 'Quần tây suông thanh lịch', points: { slay: [18, 30] } },
  { id: 5, name: 'Chân váy midi lụa mềm mại', points: { heart: [18, 30] } },
  { id: 6, name: 'Quần yếm denim trẻ trung', points: { heart: [15, 25], rebel: [5, 15] } },
  { id: 7, name: 'Quần da bóng cá tính', points: { slay: [15, 25], rebel: [5, 15] } },
];

export const OUTFIT_ACCESSORIES = [
  { id: 0, name: 'Quạt xếp cầu vồng cỡ đại', points: { slay: [15, 25], rebel: [5, 15] } },
  { id: 1, name: 'Kính râm mắt mèo thời thượng', points: { slay: [18, 30] } },
  { id: 2, name: 'Huy hiệu cài áo biểu tượng bản dạng', points: { heart: [18, 30] } },
  { id: 3, name: 'Cờ choàng lục sắc tung bay', points: { heart: [15, 25], rebel: [5, 15] } },
  { id: 4, name: 'Vòng cổ bạc layer cá tính', points: { rebel: [15, 25], slay: [5, 15] } },
  { id: 5, name: 'Túi tote vải canvas thêu hoa hướng dương', points: { heart: [15, 25] } },
  { id: 6, name: 'Mũ nồi (Beret) phong cách cổ điển', points: { slay: [15, 25], heart: [5, 15] } },
  { id: 7, name: 'Bốt cao cổ đế khủng', points: { rebel: [18, 30] } },
];

export const OUTFIT_FRIEND_PRAISES = [
  'Hội bạn thân tròn mắt ngước nhìn: "Trời ơi thần thái ngút ngàn, đêm nay giật spotlight chắc luôn!"',
  'Hội bạn huýt sáo trầm trồ: "10 điểm không có nhưng! Gu phối đồ này xứng đáng lên trang bìa tạp chí!"',
  'Đứa bạn thân ôm tim: "Cháy quá bro ơi! Ai nhìn vào cũng phải ngoái lại ngắm lần hai!"',
  'Cả nhóm đồng thanh reo hò: "Bộ này sinh ra là dành riêng cho bạn rồi, vừa tinh tế vừa chất ngất!"',
  'Hội bạn chụp vội vài tấm ảnh: "Đẹp xỉu ngang! Để đăng story khoe có đứa bạn cực phẩm mới được!"',
];

/**
 * Mini-game 3: Chat Chit Cùng Crush (12 tin nhắn & 4 nhánh phản hồi)
 */
export const CRUSH_MESSAGES = [
  '{crush_title}: Nãy thấy {crush_call} cầm quạt nhảy sung quá trời, giờ có mệt không hay đi ăn khuya với {player_call}?',
  '{crush_title}: {crush_call} về tới nhà an toàn chưa đó? Nãy lúc tạm biệt tự nhiên {player_call} thấy hơi luyến tiếc ghê...',
  '{crush_title}: Thú thật là hôm nay {crush_call} nổi bật nhất đám đông luôn á, {player_call} nhìn mãi không rời mắt được!',
  '{crush_title}: Cuối tuần này rạp mới chiếu một bộ phim về chủ đề của tụi mình hay lắm, {crush_call} có muốn đi xem cùng {player_call} không?',
  '{crush_title}: Tự nhiên hôm nay trời trở gió lạnh ngang, làm {player_call} chỉ muốn kiếm một cái ôm ấm áp từ {crush_call} thôi...',
  '{crush_title}: Cảm ơn {crush_call} hôm nay đã lắng nghe {player_call} nha, lâu lắm rồi mới gặp được người hiểu mình tới vậy!',
  '{crush_title}: Đố {crush_call} biết giữa trà sữa full topping với {player_call} thì cái nào ngọt hơn?',
  '{crush_title}: Mọi người bảo {player_call} khó tính, nhưng không hiểu sao đứng trước {crush_call} là bao nhiêu nguyên tắc bay biến hết trơn!',
  '{crush_title}: Sáng nay {player_call} vừa đi ngang qua tiệm bánh hôm bữa tụi mình nhắc tới, tự nhiên nhớ tới {crush_call} liền!',
  '{crush_title}: Hôm nay {crush_call} có lịch trình gì chưa? Nếu rảnh thì cho {player_call} xin một cái hẹn đi dạo phố nha?',
  '{crush_title}: Nãy giờ {player_call} cứ mở khung chat của {crush_call} ra rồi lại đóng vào, không biết mở lời sao cho ngầu nữa...',
  '{crush_title}: Người ta bảo cầu vồng chỉ xuất hiện sau cơn mưa, nhưng sao {player_call} thấy cầu vồng mỗi lần {crush_call} cười vậy ta?',
];

export const CRUSH_BRANCHES = {
  sweet: {
    keywords: ['đi', 'ok', 'chốt', 'ăn', 'thích', 'nhớ', 'đợi', 'đón', 'liền', 'luôn', 'yêu', 'thương', 'rảnh', 'ngọt'],
    reply: '{crush_title}: Nghe {crush_call} nói câu này là tim {player_call} đập lệch nhịp rồi đó! Chốt kèo liền nha!',
    points: { heart: [15, 25], slay: [5, 15] },
  },
  funny: {
    keywords: ['bao', 'trả tiền', 'khao', 'ví', 'nghèo', 'đói', 'mệt', 'haha', 'hihi', 'cứu', 'xỉu', 'lầy', 'đấm'],
    reply: '{crush_title}: Haha dễ thương xỉu! Yên tâm mọi chi phí cứ để {player_call} lo, chỉ cần {crush_call} xuất hiện là được!',
    points: { slay: [15, 25], rebel: [10, 20] },
  },
  shy: {
    keywords: ['ngại', 'bận', 'hôm khác', 'suy nghĩ', 'xem đã', 'không', 'thôi', 'ngủ', 'về', 'khó', 'hic', 'sợ'],
    reply: '{crush_title}: Ồ vậy {crush_call} nghỉ ngơi cho khỏe nha, {player_call} vẫn kiên nhẫn xếp hàng chờ lịch hẹn của {crush_call} đó!',
    points: { slay: [15, 25], heart: [5, 12] },
  },
  defaultBranch: {
    reply: '{crush_title}: Cách trả lời của {crush_call} cuốn thật sự luôn á! Nói chuyện với {crush_call} cả ngày cũng không chán!',
    points: { slay: [10, 20], heart: [10, 20] },
  },
};

/**
 * Mini-game 4: Vòng Quay Định Mệnh (16 sự kiện ngẫu nhiên trên Phố Cầu Vồng)
 */
export const RAINBOW_STREET_EVENTS = [
  {
    id: 1,
    desc: 'Bạn vô tình nhặt được chiếc huy hiệu phiên bản giới hạn rơi trên phố và trả lại cho ban tổ chức. Bạn được tặng vé VIP hàng đầu đêm nhạc Pride!',
    points: { slay: [15, 25], heart: [10, 18] },
  },
  {
    id: 2,
    desc: 'Đang đi dạo thì gặp ngay bà hàng xóm nhiều chuyện nhất xóm! Bạn liền đeo kính râm, sải bước như người mẫu quốc tế lướt qua khiến bà không kịp nhận ra.',
    points: { slay: [20, 30] },
  },
  {
    id: 3,
    desc: 'Một người lạ mặt đi ngang qua mỉm cười và tặng bạn một bông hoa hướng dương kèm lời chúc: "Chúc bạn luôn rực rỡ nhé!"',
    points: { heart: [20, 30] },
  },
  {
    id: 4,
    desc: 'Nhạc nổi lên giữa quảng trường, bạn bất chấp ánh nhìn xung quanh và nhảy một điệu cực sung cùng hội bạn mới quen!',
    points: { rebel: [20, 30] },
  },
  {
    id: 5,
    desc: 'Đang tạo dáng chụp ảnh cực ngầu thì bị chim bồ câu... "tặng quà" lên vai áo. Bạn cười xòa lau đi rồi tạo dáng tiếp như chưa có gì xảy ra!',
    points: { slay: [10, 18], rebel: [15, 25] },
  },
  {
    id: 6,
    desc: 'Bạn ghé vào một tiệm cà phê nhỏ và bất ngờ được chủ quán (một người đồng minh siêu dễ thương) tặng miễn phí ly nước cầu vồng vì nụ cười rạng rỡ của bạn!',
    points: { heart: [15, 25], slay: [10, 18] },
  },
  {
    id: 7,
    desc: 'Vô tình lọt vào ống kính của một nhiếp ảnh gia đường phố nổi tiếng, bức ảnh của bạn được đăng lên tạp chí thời trang với lời khen ngợi hết lời!',
    points: { slay: [22, 32] },
  },
  {
    id: 8,
    desc: 'Bạn giúp một bạn trẻ lần đầu tham gia sự kiện cộng đồng tìm đường và làm quen với mọi người, nhận lại một cái ôm cảm ơn siêu ấm áp.',
    points: { heart: [22, 32] },
  },
  {
    id: 9,
    desc: 'Trời bất ngờ đổ mưa rào giữa phố đi bộ, bạn cùng hội bạn thân đội cờ cầu vồng lên đầu và chạy dưới mưa cười vang cả một góc trời!',
    points: { rebel: [18, 28], heart: [10, 15] },
  },
  {
    id: 10,
    desc: 'Bạn tham gia thử thách "Hát nối chữ" ngẫu nhiên trên phố và giành chiến thắng thuyết phục trước sự cổ vũ của hàng chục khán giả!',
    points: { slay: [15, 25], rebel: [15, 25] },
  },
  {
    id: 11,
    desc: 'Lúc thanh toán tiền trà sữa, bạn phát hiện người xếp hàng phía trước đã âm thầm trả tiền giúp bạn kèm lời nhắn: "Have a proud day!"',
    points: { heart: [20, 30] },
  },
  {
    id: 12,
    desc: 'Bạn vô tình diện đồ trùng khớp 100% với một fashionista đình đám trên phố, cả hai liền rủ nhau chụp ngay một bộ ảnh đôi cực cháy!',
    points: { slay: [18, 28], rebel: [10, 18] },
  },
  {
    id: 13,
    desc: 'Bạn trúng thưởng minigame rút thăm may mắn tại gian hàng cộng đồng, rinh về một chú gấu bông mặc áo cầu vồng siêu cưng!',
    points: { heart: [15, 25], slay: [10, 15] },
  },
  {
    id: 14,
    desc: 'Trên đường về nhà, bạn bắt gặp một chiếc cầu vồng đôi xuất hiện sau cơn mưa chiều — tín hiệu vũ trụ báo hiệu sắp có tin vui lớn!',
    points: { slay: [12, 20], heart: [12, 20], rebel: [12, 20] },
  },
  {
    id: 15,
    desc: 'Bạn vô tình cứu một chú mèo đi lạc giữa phố đi bộ và tìm lại được chủ cho bé, được cả khu phố vỗ tay khen ngợi hết lời!',
    points: { heart: [25, 35] },
  },
  {
    id: 16,
    desc: 'Một nhóm nhảy đường phố kéo bạn vào vòng tròn freestyle, bạn tung ngay vài động tác thần sầu khiến cả đám đông bùng nổ!',
    points: { rebel: [20, 30], slay: [10, 20] },
  },
];

/**
 * Hàm hỗ trợ thay thế các biến xưng hô theo Bản dạng giới
 */
export function formatWithIdentity(text, identity) {
  if (!text || !identity) return text || '';
  return text
    .replace(/\{crush_title\}/g, identity.crushTitle || 'Người ấy')
    .replace(/\{crush_call\}/g, identity.crushCall || 'bạn')
    .replace(/\{player_call\}/g, identity.playerCall || 'mình');
}

/**
 * Tính toán điểm ngẫu nhiên dựa trên cấu hình points object
 * points: { slay?: [min, max], heart?: [min, max], rebel?: [min, max] }
 */
export function calculatePointChanges(pointsConfig) {
  const result = { slay: 0, heart: 0, rebel: 0 };
  if (!pointsConfig) return result;

  if (Array.isArray(pointsConfig.slay)) {
    result.slay = randomRange(pointsConfig.slay[0], pointsConfig.slay[1]);
  }
  if (Array.isArray(pointsConfig.heart)) {
    result.heart = randomRange(pointsConfig.heart[0], pointsConfig.heart[1]);
  }
  if (Array.isArray(pointsConfig.rebel)) {
    result.rebel = randomRange(pointsConfig.rebel[0], pointsConfig.rebel[1]);
  }

  return result;
}

/**
 * Format chuỗi thông báo điểm thay đổi trực quan
 */
export function formatPointChanges(changes) {
  const parts = [];
  if (changes.slay !== 0) {
    const sign = changes.slay > 0 ? `+${changes.slay}` : `${changes.slay}`;
    parts.push(`${sign} ${PRISM_EMOJIS.trangtrig41} Thần thái`);
  }
  if (changes.heart !== 0) {
    const sign = changes.heart > 0 ? `+${changes.heart}` : `${changes.heart}`;
    parts.push(`${sign} ${PRISM_EMOJIS.heartg3} Chân thành`);
  }
  if (changes.rebel !== 0) {
    const sign = changes.rebel > 0 ? `+${changes.rebel}` : `${changes.rebel}`;
    parts.push(`${sign} ${PRISM_EMOJIS.trangtrig29} Nổi loạn`);
  }
  return parts.length > 0 ? parts.join(' | ') : 'Không có thay đổi';
}
