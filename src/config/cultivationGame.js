export const CULTIVATION_CONFIG = {
  enabled: true,
  channelId: '1547233544412205066',
  ui: {
    color: '#F3AFC8',
    footer: 'Usagi Tu Tiên · Nhất niệm nhập tiên đồ, vạn kiếp cầu trường sinh.',
    image: 'https://raw.githubusercontent.com/uyenhoang9034-pixel/UsagiTienTon/main/assets/Games/tutien.png',
    emojis: {
      user: '<:ttdaohuu:1547296747301376130>',
      realm: '<a:ttcanhgioi:1547448784924180500>',
      spiritRoot: '<a:ttlinhcan:1547448824497442917>',
      cultivation: '<a:tttuvi:1547448737377427550>',
      spiritStone: '<a:ttlinhthach:1547448522125869126>',
      stamina: '<a:tttheluc:1547448708537262090>',
      talisman: '<a:ttphu:1547448667630207086>',
      sword: '<a:ttkiem:1547448386771222619>',
      pendant: '<a:ttboi:1547448623946801152>',
      pill: '<a:ttdanduoc:1547449015224762399>',
      swordManual: '<a:ttkiempho:1547448592975790080>',
      technique: '<a:ttbikip:1547448442022797342>',
      furnace: '<a:ttlobatquai:1547448473882861659>',
      moon: '<a:tttrang:1547448866440347739>',
      ore: '<a:tthuyenthiet:1547448560818065498>',
      herb: '<a:ttlinhthao:1547464708318167122>',
    },
    itemEmojis: {
      herb: '<a:ttlinhthao:1547464708318167122>',
      pill: '<a:ttdanduoc:1547449015224762399>',
      ore: '<a:tthuyenthiet:1547448560818065498>',
      treasure: '<a:ttphu:1547448667630207086>',
      technique: '<a:ttkiempho:1547448592975790080>',
    },
    buttonEmojis: {
      cultivate: '1547297891167510568',
      breakthrough: '1547298327098425475',
      adventure: '1547299221974024342',
      inventory: '1547300335805141042',
      profile: '1547299990093828116',
      leaderboard: '1547301799273435177',
      alchemy: '1547301856688996552',
      forge: '1547303215639433247',
      equipment: '1547457114987962438',
      technique: '1547303808483205211',
      treasure: '1547304199161774100',
      pet: '1547305016694669503',
      use: '1547458192286421012',
    },
  },
  gameplay: {
    maxStamina: 100,
    cultivateStaminaCost: 5,
    cultivateCooldownMs: 5 * 60 * 1000,
    cultivateBaseMin: 90,
    cultivateBaseMax: 150,
    spiritStoneMin: 8,
    spiritStoneMax: 25,
    adventureCooldownMs: 10 * 60 * 1000,
    breakthroughBaseChance: 0.88,
    breakthroughMinChance: 0.55,
    breakthroughFailureLossPercent: 0.10,
  },
};

export const CULTIVATION_REALMS = [
  'Luyện Khí','Trúc Cơ','Kim Đan','Nguyên Anh','Hóa Thần','Luyện Hư','Hợp Thể','Đại Thừa','Độ Kiếp','Chân Tiên','Kim Tiên','Thái Ất Kim Tiên','Đại La Kim Tiên',
];

export const CULTIVATION_STAGES = ['Sơ Kỳ','Trung Kỳ','Hậu Kỳ','Viên Mãn'];

export const SPIRIT_ROOTS = [
  { id: 'kim', name: 'Kim Linh Căn', rarity: 'Phàm', weight: 18, cultivateBonus: 0.02 },
  { id: 'moc', name: 'Mộc Linh Căn', rarity: 'Phàm', weight: 18, cultivateBonus: 0.02 },
  { id: 'thuy', name: 'Thủy Linh Căn', rarity: 'Phàm', weight: 18, cultivateBonus: 0.02 },
  { id: 'hoa', name: 'Hỏa Linh Căn', rarity: 'Phàm', weight: 18, cultivateBonus: 0.02 },
  { id: 'tho', name: 'Thổ Linh Căn', rarity: 'Phàm', weight: 18, cultivateBonus: 0.02 },
  { id: 'phong', name: 'Phong Linh Căn', rarity: 'Hiếm', weight: 4, cultivateBonus: 0.05 },
  { id: 'bang', name: 'Băng Linh Căn', rarity: 'Hiếm', weight: 3, cultivateBonus: 0.06 },
  { id: 'loi', name: 'Lôi Linh Căn', rarity: 'Hiếm', weight: 2, cultivateBonus: 0.08 },
  { id: 'thien', name: 'Thiên Linh Căn', rarity: 'Cực Hiếm', weight: 0.8, cultivateBonus: 0.12 },
  { id: 'hon_don', name: 'Hỗn Độn Linh Căn', rarity: 'Thần Thoại', weight: 0.2, cultivateBonus: 0.18 },
];

export const CULTIVATION_ITEMS = {
  thien_linh_thao: { id: 'thien_linh_thao', name: 'Thiên Linh Thảo', type: 'herb', rarity: 'Linh Phẩm', description: 'Linh thảo hấp thu thiên địa linh khí, thường dùng để luyện đan.' },
  huyen_thiet: { id: 'huyen_thiet', name: 'Huyền Thiết', type: 'ore', rarity: 'Huyền Phẩm', description: 'Khoáng vật cứng chắc, có thể dùng để luyện chế pháp khí.' },
  tu_khi_dan: { id: 'tu_khi_dan', name: 'Tụ Khí Đan', type: 'pill', rarity: 'Linh Phẩm', description: 'Đan dược giúp tăng hiệu quả hấp thu linh khí.' },
  hoi_nguyen_dan: { id: 'hoi_nguyen_dan', name: 'Hồi Nguyên Đan', type: 'pill', rarity: 'Huyền Phẩm', description: 'Đan dược dùng để khôi phục tinh lực.' },
  pha_canh_dan: { id: 'pha_canh_dan', name: 'Phá Cảnh Đan', type: 'pill', rarity: 'Địa Phẩm', description: 'Đan dược quý giúp tăng khả năng phá vỡ bình cảnh.' },
  co_phu: { id: 'co_phu', name: 'Thượng Cổ Phù', type: 'treasure', rarity: 'Địa Phẩm', description: 'Một lá phù cổ mang khí tức từ thời thượng cổ.' },
  vo_danh_kiem_pho: { id: 'vo_danh_kiem_pho', name: 'Vô Danh Kiếm Phổ', type: 'technique', rarity: 'Thiên Phẩm', description: 'Một phần kiếm quyết không rõ lai lịch, dường như ẩn chứa huyền cơ.' },
};

export const CULTIVATION_EVENTS = [
  { id: 'normal', weight: 70, title: '<a:tttuvi:1547448737377427550> TĨNH TÂM TU LUYỆN', text: 'Đạo hữu tĩnh tọa nhập định, vận chuyển công pháp một chu thiên.', cultivationMultiplier: 1, stoneMultiplier: 1 },
  { id: 'minor_fortune', weight: 18, title: '<a:tttuvi:1547448737377427550> KỲ NGỘ', text: 'Một luồng linh khí tinh thuần bất ngờ hội tụ quanh động phủ.', cultivationMultiplier: 1.35, stoneMultiplier: 1.25 },
  { id: 'great_fortune', weight: 7, title: '<a:ttcanhgioi:1547448784924180500> THIÊN ĐẠO CƠ DUYÊN', text: 'Thiên địa sinh dị tượng, một tia tiên khí từ thiên ngoại giáng xuống.', cultivationMultiplier: 2.25, stoneMultiplier: 2 },
  { id: 'deviation', weight: 5, title: '<a:ttcanhgioi:1547448784924180500> TẨU HỎA NHẬP MA', text: 'Linh khí nghịch chuyển, kinh mạch chấn động. May mắn đạo cơ chưa tổn hại.', cultivationMultiplier: -0.35, stoneMultiplier: 0 },
];

export const CULTIVATION_ADVENTURE_LOCATIONS = [
  { id: 'thanh_van_son', name: 'THANH VÂN SƠN' },
  { id: 'u_minh_coc', name: 'U MINH CỐC' },
  { id: 'xich_viem_dong', name: 'XÍCH VIÊM ĐỘNG' },
  { id: 'dao_hoa_coc', name: 'ĐÀO HOA CỐC' },
  { id: 'loi_vuc', name: 'LÔI VỰC' },
  { id: 'thuong_co_di_tich', name: 'THƯỢNG CỔ DI TÍCH' },
];

export const CULTIVATION_ADVENTURE_EVENTS = [
  { id: 'spirit_gathering', type: 'normal', weight: 28, text: 'Đạo hữu tìm thấy một nơi linh khí nồng đậm, thuận thế ngồi xuống vận công.', cultivationMin: 90, cultivationMax: 170, stonesMin: 12, stonesMax: 35, dropChance: 0.18, drops: [ { itemId: 'thien_linh_thao', weight: 80, min: 1, max: 2 }, { itemId: 'tu_khi_dan', weight: 20, min: 1, max: 1 } ] },
  { id: 'spirit_stone_vein', type: 'treasure', weight: 20, text: 'Sau lớp đá phủ rêu, một mạch Linh Thạch nhỏ bất ngờ lộ ra trước mắt.', cultivationMin: 60, cultivationMax: 130, stonesMin: 55, stonesMax: 120, dropChance: 0.25, drops: [ { itemId: 'huyen_thiet', weight: 80, min: 1, max: 3 }, { itemId: 'hoi_nguyen_dan', weight: 20, min: 1, max: 1 } ] },
  { id: 'ancient_ruin', type: 'treasure', weight: 17, text: 'Một tòa cổ điện phủ đầy bụi thời gian xuất hiện giữa màn sương.', cultivationMin: 120, cultivationMax: 220, stonesMin: 30, stonesMax: 80, dropChance: 0.40, drops: [ { itemId: 'co_phu', weight: 55, min: 1, max: 1 }, { itemId: 'tu_khi_dan', weight: 30, min: 1, max: 2 }, { itemId: 'vo_danh_kiem_pho', weight: 15, min: 1, max: 1 } ] },
  { id: 'great_fortune', type: 'great_fortune', weight: 8, title: '<a:ttcanhgioi:1547448784924180500> ĐẠI CƠ DUYÊN', text: 'Trong khe đá, đạo hữu phát hiện một túi Linh Thạch cùng linh khí do tiền nhân để lại.', cultivationMin: 220, cultivationMax: 360, stonesMin: 120, stonesMax: 260, dropChance: 0.70, drops: [ { itemId: 'pha_canh_dan', weight: 25, min: 1, max: 1 }, { itemId: 'co_phu', weight: 30, min: 1, max: 1 }, { itemId: 'hoi_nguyen_dan', weight: 25, min: 1, max: 2 }, { itemId: 'vo_danh_kiem_pho', weight: 20, min: 1, max: 1 } ] },
  { id: 'blood_eye_wolf', type: 'monster', weight: 12, monster: 'Huyết Nhãn Ma Lang', text: 'Một con Huyết Nhãn Ma Lang bất ngờ lao ra từ trong rừng!', cultivationLossMin: 20, cultivationLossMax: 55, dropChance: 0 },
  { id: 'flame_serpent', type: 'monster', weight: 8, monster: 'Xích Viêm Hỏa Xà', text: 'Một con Xích Viêm Hỏa Xà từ khe đá lao ra, hỏa khí lập tức bao phủ xung quanh!', cultivationLossMin: 25, cultivationLossMax: 65, dropChance: 0 },
  { id: 'nothing', type: 'empty', weight: 7, text: 'Đạo hữu đi sâu hàng trăm dặm nhưng hôm nay dường như cơ duyên chưa tới.', cultivationMin: 20, cultivationMax: 60, stonesMin: 0, stonesMax: 10, dropChance: 0.08, drops: [ { itemId: 'thien_linh_thao', weight: 100, min: 1, max: 1 } ] },
];

export default CULTIVATION_CONFIG;
