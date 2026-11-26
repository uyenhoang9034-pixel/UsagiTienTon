import {
  getDatabaseValue,
  setDatabaseValue,
  deleteDatabaseValue,
  listDatabaseKeys,
} from '../utils/database.js';
import { logger } from '../utils/logger.js';

export const MATERIALS = {
  wood: { id: 'wood', name: 'Gỗ thông', icon: '🌲', baseRatePerMin: 2.0 },
  fabric: { id: 'fabric', name: 'Vải đỏ', icon: '🧶', baseRatePerMin: 1.5 },
  magicDust: { id: 'magicDust', name: 'Bụi phép thuật', icon: '✨', baseRatePerMin: 0.9 },
  ribbon: { id: 'ribbon', name: 'Ruy băng', icon: '🎀', baseRatePerMin: 1.2 },
};

export const TOY_RECIPES = [
  {
    id: 'teddy',
    name: 'Gấu Bông Noel',
    icon: '🧸',
    ingredients: { wood: 1, fabric: 3, ribbon: 1 },
    baseCoins: 35,
    baseRep: 12,
  },
  {
    id: 'train',
    name: 'Tàu Hỏa Gỗ',
    icon: '🚂',
    ingredients: { wood: 4, magicDust: 1, ribbon: 1 },
    baseCoins: 55,
    baseRep: 18,
  },
  {
    id: 'musicBox',
    name: 'Hộp Nhạc Tuyết',
    icon: '🎵',
    ingredients: { wood: 2, magicDust: 2, ribbon: 2 },
    baseCoins: 70,
    baseRep: 24,
  },
  {
    id: 'snowGlobe',
    name: 'Quả Cầu Tuyết',
    icon: '🔮',
    ingredients: { fabric: 1, magicDust: 3, ribbon: 2 },
    baseCoins: 85,
    baseRep: 30,
  },
  {
    id: 'santaSleigh',
    name: 'Xe Trượt Tuyết Mini',
    icon: '🛷',
    ingredients: { wood: 5, fabric: 2, magicDust: 3, ribbon: 2 },
    baseCoins: 145,
    baseRep: 50,
    minLevel: 1,
  },
  {
    id: 'polarExpress',
    name: 'Tàu Tốc Hành Bắc Cực',
    icon: '🚅',
    ingredients: { wood: 7, fabric: 3, magicDust: 5, ribbon: 4 },
    baseCoins: 290,
    baseRep: 95,
    minLevel: 10,
  },
  {
    id: 'icePalace',
    name: 'Cung Điện Tuyết',
    icon: '🏰',
    ingredients: { wood: 8, fabric: 5, magicDust: 8, ribbon: 6 },
    baseCoins: 480,
    baseRep: 160,
    minLevel: 15,
  },
  {
    id: 'santaCrown',
    name: 'Vương Miện Ông Già Noel',
    icon: '👑',
    ingredients: { wood: 10, fabric: 8, magicDust: 12, ribbon: 10 },
    baseCoins: 850,
    baseRep: 280,
    minLevel: 20,
  },
  {
    id: 'magicLantern',
    name: 'Đèn Lồng Phép Thuật',
    icon: '🏮',
    ingredients: { wood: 11, fabric: 9, magicDust: 14, ribbon: 11 },
    baseCoins: 1050,
    baseRep: 340,
    minLevel: 25,
  },
  {
    id: 'reindeerBell',
    name: 'Chuông Vàng Tuần Lộc',
    icon: '🔔',
    ingredients: { wood: 12, fabric: 10, magicDust: 16, ribbon: 13 },
    baseCoins: 1280,
    baseRep: 410,
    minLevel: 30,
  },
  {
    id: 'frostGuitar',
    name: 'Đàn Tuyết Bắc Cực',
    icon: '🎸',
    ingredients: { wood: 14, fabric: 11, magicDust: 18, ribbon: 15 },
    baseCoins: 1550,
    baseRep: 490,
    minLevel: 35,
  },
  {
    id: 'auroraPrism',
    name: 'Pha Lê Cực Quang',
    icon: '💎',
    ingredients: { wood: 15, fabric: 13, magicDust: 21, ribbon: 17 },
    baseCoins: 1850,
    baseRep: 580,
    minLevel: 40,
  },
  {
    id: 'starCompass',
    name: 'La Bàn Ngôi Sao',
    icon: '🧭',
    ingredients: { wood: 18, fabric: 15, magicDust: 25, ribbon: 20 },
    baseCoins: 2300,
    baseRep: 720,
    minLevel: 50,
  },
  {
    id: 'santaWatch',
    name: 'Đồng Hồ Đêm Giáng Sinh',
    icon: '⌚',
    ingredients: { wood: 21, fabric: 18, magicDust: 30, ribbon: 24 },
    baseCoins: 2900,
    baseRep: 900,
    minLevel: 65,
  },
  {
    id: 'polarOrb',
    name: 'Quả Cầu Bắc Cực',
    icon: '🌐',
    ingredients: { wood: 25, fabric: 22, magicDust: 36, ribbon: 28 },
    baseCoins: 3600,
    baseRep: 1150,
    minLevel: 80,
  },
  {
    id: 'eternalGift',
    name: 'Đại Lễ Vật Giáng Sinh',
    icon: '🎁',
    ingredients: { wood: 30, fabric: 26, magicDust: 44, ribbon: 35 },
    baseCoins: 4800,
    baseRep: 1500,
    minLevel: 100,
  },
];

export const CHRISTMAS_RIDDLES = [
  {
    id: 'riddle_1',
    question: 'Ông già Noel thường đi vào nhà các bạn nhỏ qua lối nào vào đêm Giáng Sinh?',
    options: ['Ống khói', 'Cửa sổ tầng hầm', 'Ban công', 'Cửa gara'],
    answerIndex: 0,
  },
  {
    id: 'riddle_2',
    question: 'Chú tuần lộc nổi tiếng dẫn đầu đoàn xe của Ông Già Noel có chiếc mũi màu gì?',
    options: ['Màu xanh lá', 'Màu đỏ phát sáng', 'Màu vàng kim', 'Màu trắng tuyết'],
    answerIndex: 1,
  },
  {
    id: 'riddle_3',
    question: 'Ngày lễ Giáng Sinh chính thức được tổ chức vào ngày nào hàng năm?',
    options: ['24/12', '25/12', '31/12', '01/01'],
    answerIndex: 1,
  },
  {
    id: 'riddle_4',
    question: 'Loại cây nào thường được trang trí đèn, quả châu và ngôi sao vào dịp Giáng Sinh?',
    options: ['Cây thông', 'Cây dừa', 'Cây tre', 'Cây phượng'],
    answerIndex: 0,
  },
  {
    id: 'riddle_5',
    question: 'Trong xưởng của Ông Già Noel, ai là những người thợ chăm chỉ làm đồ chơi?',
    options: ['Các chú Yêu Tinh (Elf)', 'Hải tặc', 'Phi hành gia', 'Ninja'],
    answerIndex: 0,
  },
  {
    id: 'riddle_6',
    question: 'Món bánh hình người nổi tiếng thường nướng vào dịp Giáng Sinh gọi là gì?',
    options: ['Bánh mì gừng (Gingerbread)', 'Bánh chưng', 'Bánh xèo', 'Bánh bao'],
    answerIndex: 0,
  },
];

export const SHOP_ITEMS = [
  {
    id: 'frame_wreath',
    type: 'frame',
    name: 'Khung Vòng Nguyệt Quế',
    icon: '🌿',
    price: 120,
    description: 'Khung avatar lá thông & quả châu đỏ rực rỡ.',
    cssClass: 'frame-wreath',
  },
  {
    id: 'frame_reindeer',
    type: 'frame',
    name: 'Khung Tuần Lộc Vàng',
    icon: '🦌',
    price: 260,
    description: 'Khung viền vàng lấp lánh phong cách hoàng gia Bắc Cực.',
    cssClass: 'frame-reindeer',
  },
  {
    id: 'frame_frost',
    type: 'frame',
    name: 'Khung Băng Giá Tuyết Rơi',
    icon: '❄️',
    price: 450,
    description: 'Hào quang băng giá phát sáng dành cho Yêu Tinh trưởng.',
    cssClass: 'frame-frost',
  },
  {
    id: 'lucky_ticket',
    type: 'ticket',
    name: 'Vé Quay Số Giáng Sinh',
    icon: '🎟️',
    price: 60,
    description: 'Dùng để quay Vòng Quay May Mắn trúng Xu Tuyết & Bụi Phép!',
  },
  {
    id: 'event_role',
    type: 'role',
    name: 'Role Sự Kiện Noel Giới Hạn',
    icon: '👑',
    price: 20000,
    description: 'Nhận ngay Role Giáng Sinh giới hạn trên server Discord (nếu server đã cấu hình).',
  },
  {
    id: 'pet_usagi',
    type: 'pet',
    name: 'Thỏ Tuyết Usagi',
    icon: '🐰',
    price: 280,
    description: 'Chạy lon ton trong xưởng & tự động nhặt hộ quà rơi khi Fever!',
  },
  {
    id: 'pet_reindeer',
    type: 'pet',
    name: 'Tuần Lộc Con',
    icon: '🦌',
    price: 380,
    description: 'Nhanh nhẹn hơn, tự động nhặt hộ quà Fever siêu tốc!',
  },
  {
    id: 'skin_santa',
    type: 'skin',
    name: 'Áo Choàng Ông Già Noel',
    icon: '🎅',
    price: 180,
    description: 'Trang phục đỏ viền trắng sang trọng cho Yêu Tinh trong xưởng.',
  },
  {
    id: 'skin_fairy',
    type: 'skin',
    name: 'Cánh Tiên Băng Giá',
    icon: '🧚',
    price: 320,
    description: 'Đôi cánh băng phát sáng rực rỡ sau lưng Yêu Tinh.',
  },
  {
    id: 'frame_candy',
    type: 'frame',
    name: 'Khung Kẹo Gậy Ngọt Ngào',
    icon: '🍭',
    price: 350,
    description: 'Viền kẹo gậy sọc đỏ trắng ngọt ngào kèm kẹo gắn góc.',
    cssClass: 'frame-candy',
  },
  {
    id: 'frame_royal',
    type: 'frame',
    name: 'Khung Vương Miện Bắc Cực',
    icon: '👑',
    price: 1200,
    description: 'Hào quang tím-vàng hoàng gia xoay vòng dành cho đại gia Noel.',
    cssClass: 'frame-royal',
  },
  {
    id: 'pet_snowman',
    type: 'pet',
    name: 'Người Tuyết Tí Hon',
    icon: '⛄',
    price: 550,
    description: 'Chạy lon ton trong xưởng & tự nhặt quà Fever mỗi 0.95 giây!',
  },
  {
    id: 'pet_fox',
    type: 'pet',
    name: 'Cáo Tuyết Bắc Cực',
    icon: '🦊',
    price: 900,
    description: 'Nhanh nhẹn! Tự động nhặt hộ quà Fever mỗi 0.75 giây!',
  },
  {
    id: 'skin_ginger',
    type: 'skin',
    name: 'Áo Bánh Gừng Ngọt Ngào',
    icon: '🍪',
    price: 420,
    description: 'Trang phục bánh gừng nâu ấm viền kem đường cho Yêu Tinh.',
  },
  {
    id: 'skin_golden',
    type: 'skin',
    name: 'Chiến Giáp Hoàng Kim Noel',
    icon: '🌟',
    price: 1500,
    description: 'Bộ giáp vàng lấp lánh kèm hào quang rực rỡ trên Yêu Tinh.',
  },
  {
    id: 'mat_pack_small',
    type: 'pack',
    name: 'Túi Nguyên Liệu Xưởng',
    icon: '📦',
    price: 120,
    weeklyLimit: 1,
    description: 'Nhận ngay +10 🌲, +10 🧶, +6 ✨, +8 🎀 vào kho (Giới hạn 1 lần/tuần).',
    pack: { wood: 10, fabric: 10, magicDust: 6, ribbon: 8 },
  },
  {
    id: 'mat_pack_mega',
    type: 'pack',
    name: 'Rương Nguyên Liệu Đại Gia',
    icon: '🧳',
    price: 480,
    weeklyLimit: 1,
    description: 'Nhận ngay +45 🌲, +45 🧶, +30 ✨, +35 🎀 vào kho (Giới hạn 1 lần/tuần)!',
    pack: { wood: 45, fabric: 45, magicDust: 30, ribbon: 35 },
  },
  {
    id: 'buff_x3_10m',
    type: 'buff',
    name: 'Thuốc Tăng Tốc x3 (10 phút)',
    icon: '⚡',
    price: 300,
    cooldownDays: 3,
    description: 'Kích hoạt ngay Buff x3 tốc độ sản xuất Idle trong 10 phút (Giới hạn 1 lần/3 ngày)!',
  },
  {
    id: 'frame_bells',
    type: 'frame',
    name: 'Khung Chuông Vàng Đôi',
    icon: '🔔',
    price: 650,
    description: 'Viền lá thông kép đính đôi chuông vàng trên đỉnh & dải ruy băng đỏ bên dưới.',
    cssClass: 'frame-bells',
  },
  {
    id: 'frame_snowglobe',
    type: 'frame',
    name: 'Khung Quả Cầu Tuyết Pha Lê',
    icon: '🔮',
    price: 950,
    description: 'Vòm kính pha lê phản chiếu ánh sáng kèm đế gỗ đỏ khắc vàng bên dưới avatar.',
    cssClass: 'frame-snowglobe',
  },
  {
    id: 'frame_aurora',
    type: 'frame',
    name: 'Khung Cực Quang Bắc Cực',
    icon: '🌌',
    price: 1800,
    description: 'Dải cực quang chuyển sắc uốn lượn kèm sao Bắc Đẩu & mũ Noel nghiêng.',
    cssClass: 'frame-aurora',
  },
  {
    id: 'skin_reindeer_suit',
    type: 'skin',
    name: 'Bộ Đồ Tuần Lộc Đáng Yêu',
    icon: '🦌',
    price: 680,
    description: 'Mọc cặp sừng tuần lộc nâu trên đầu, mũi đỏ Rudolph & áo yếm nâu trắng!',
  },
  {
    id: 'skin_wizard',
    type: 'skin',
    name: 'Pháp Sư Tuyết Bắc Cực',
    icon: '🧙',
    price: 1100,
    description: 'Đội nón phù thủy chóp cao đính sao vàng & cầm quyền trượng phép phát sáng!',
  },
  {
    id: 'skin_angel',
    type: 'skin',
    name: 'Thiên Thần Giáng Sinh',
    icon: '👼',
    price: 2200,
    description: 'Vòng hào quang trên đầu, đôi cánh trắng khổng lồ & đũa phép sao vàng!',
  },
  {
    id: 'pet_husky',
    type: 'pet',
    name: 'Chó Tuyết Husky',
    icon: '🐺',
    price: 1400,
    description: 'Chạy cực nhanh & tự động nhặt quà Fever mỗi 0.55 giây!',
  },
  {
    id: 'pet_dragon',
    type: 'pet',
    name: 'Rồng Tuyết Tí Hon',
    icon: '🐲',
    price: 2800,
    description: 'Thú cưng huyền thoại! Bay siêu tốc & nhặt quà Fever mỗi 0.38 giây!',
  },
  {
    id: 'mat_pack_legend',
    type: 'pack',
    name: 'Hòm Kho Báu Bắc Cực',
    icon: '👑',
    price: 1800,
    weeklyLimit: 1,
    description: 'Nhận ngay +150 🌲, +150 🧶, +110 ✨, +120 🎀 vào kho (1 lần/tuần)!',
    pack: { wood: 150, fabric: 150, magicDust: 110, ribbon: 120 },
  },
  {
    id: 'ticket_bundle_5',
    type: 'ticket',
    name: 'Xấp 5 Vé Quay Số',
    icon: '🎟️',
    price: 270,
    amount: 5,
    description: 'Mua liền 5 Vé Quay Số Giáng Sinh với giá ưu đãi (tiết kiệm 30 ❄️, giới hạn 1 lần/ngày)!',
  },
];

export const ACHIEVEMENTS = [
  {
    id: 'craft_10',
    name: 'Thợ Thủ Công Chăm Chỉ',
    icon: '🔨',
    description: 'Chế tạo đủ 10 món đồ chơi Noel',
    rewardCoins: 60,
    rewardTickets: 1,
    check: (p) => (p.totalCrafted || 0) >= 10,
  },
  {
    id: 'deliver_10',
    name: 'Giao Hàng Thần Tốc',
    icon: '🛷',
    description: 'Giao thành công 10 đơn hàng Giáng Sinh',
    rewardCoins: 100,
    rewardTickets: 1,
    check: (p) => (p.totalDelivered || 0) >= 10,
  },
  {
    id: 'coins_1000',
    name: 'Trùm Tuyết Bắc Cực',
    icon: '❄️',
    description: 'Sở hữu ít nhất 1.000 Xu Tuyết cùng lúc',
    rewardCoins: 150,
    rewardTickets: 2,
    check: (p) => (p.snowCoins || 0) >= 1000,
  },
  {
    id: 'tree_contrib',
    name: 'Người Thắp Sáng Cây Thông',
    icon: '🎄',
    description: 'Đóng góp trang trí Cây Thông Chung của Server',
    rewardCoins: 50,
    rewardTickets: 1,
    check: (p) => (p.treeContributed || 0) >= 1,
  },
];

const TREE_THRESHOLDS = [
  0, 150, 400, 800, 1500, 2500, 4000, 6000, 8500, 11500, 15000,
  20000, 26000, 33000, 41000, 50000, 62000, 76000, 92000, 110000, 135000,
];

export const DAILY_QUESTS = [
  { id: 'q_checkin', name: 'Điểm danh sáng sớm', icon: '📅', description: 'Điểm danh nhận quà trong ngày', target: 1, rewardCoins: 30, rewardRep: 10 },
  { id: 'q_riddle', name: 'Thám tử Giáng Sinh', icon: '🧩', description: 'Giải đúng câu đố Noel hôm nay', target: 1, rewardCoins: 40, rewardRep: 15 },
  { id: 'q_tap_20', name: 'Gõ búa chăm chỉ', icon: '🔨', description: 'Chạm vào Xưởng để gõ búa 20 lần', target: 20, rewardCoins: 45, rewardMat: { wood: 5 } },
  { id: 'q_collect_1', name: 'Thu hoạch kho xưởng', icon: '🧺', description: 'Bấm Thu hoạch sản lượng Idle 1 lần', target: 1, rewardCoins: 35, rewardMat: { fabric: 4 } },
  { id: 'q_craft_3', name: 'Thợ thủ công tài ba', icon: '🧸', description: 'Chế tạo 3 món đồ chơi bất kỳ', target: 3, rewardCoins: 70, rewardRep: 15 },
  { id: 'q_deliver_2', name: 'Shipper Bắc Cực', icon: '🛷', description: 'Giao thành công 2 đơn hàng', target: 2, rewardCoins: 90, rewardTickets: 1 },
  { id: 'q_fever_1', name: 'Đón cơn Mưa Quà', icon: '🔥', description: 'Hoàn thành 1 lần Mưa Quà Fever', target: 1, rewardCoins: 80, rewardMat: { magicDust: 3 } },
  { id: 'q_tree_1', name: 'Trang trí Cây Thông', icon: '🎄', description: 'Góp điểm cho Cây Thông Chung Server', target: 1, rewardCoins: 60, rewardRep: 20 },
  { id: 'q_wheel_1', name: 'Thử vận may Noel', icon: '🎡', description: 'Quay Vòng Quay May Mắn 1 lần', target: 1, rewardCoins: 50, rewardMat: { ribbon: 4 } },
  { id: 'q_friend_1', name: 'Yêu tinh thân thiện', icon: '❤️', description: 'Thả tim hoặc tặng quà cho bạn bè', target: 1, rewardCoins: 65, rewardTickets: 1 },
];

function ensureDailyQuests(player, today = getTodayKey()) {
  if (!player.dailyQuests || player.dailyQuests.date !== today) {
    player.dailyQuests = {
      date: today,
      progress: {},
      claimed: [],
    };
  }
  return player.dailyQuests;
}

function bumpDailyQuest(player, questId, amount = 1) {
  const dq = ensureDailyQuests(player);
  dq.progress[questId] = (dq.progress[questId] || 0) + amount;
}

export const ELF_HELPERS = [
  {
    id: 'lumberjack',
    name: 'Yêu Tinh Tiều Phu',
    icon: '🪓',
    description: 'Chặt thông Bắc Cực (+1.5 🌲 Gỗ thông / phút mỗi cấp)',
    baseCost: 80,
    bonuses: { wood: 1.5 },
  },
  {
    id: 'tailor',
    name: 'Yêu Tinh Thợ May',
    icon: '✂️',
    description: 'Dệt vải nhung đỏ (+1.3 🧶 Vải đỏ / phút mỗi cấp)',
    baseCost: 95,
    bonuses: { fabric: 1.3 },
  },
  {
    id: 'mage',
    name: 'Yêu Tinh Phù Thủy',
    icon: '🌟',
    description: 'Tinh chế phép thuật (+1.0 ✨ Bụi phép & +1.1 🎀 Ruy băng / phút mỗi cấp)',
    baseCost: 120,
    bonuses: { magicDust: 1.0, ribbon: 1.1 },
  },
];

export const WHEEL_SEGMENTS = [
  { label: '+60 ❄️', color: '#e63946', type: 'coins', amount: 60 },
  { label: '+5 ✨', color: '#2a9d8f', type: 'magicDust', amount: 5 },
  { label: '+70 ⭐', color: '#457b9d', type: 'rep', amount: 70 },
  { label: '+100 ❄️', color: '#e76f51', type: 'coins', amount: 100 },
  { label: '+6 🌲🧶', color: '#2d6a4f', type: 'mats', amount: 6 },
  { label: '+150 ❄️', color: '#9b5de5', type: 'coins', amount: 150 },
  { label: '+2 🎟️', color: '#f4a261', type: 'tickets', amount: 2 },
  { label: 'JACKPOT 300❄️', color: '#d90429', type: 'jackpot', amount: 300 },
];

export function getWheelRewardMultiplier(workshopLevel = 1) {
  const lv = Math.max(1, Math.min(2000, Number(workshopLevel) || 1));
  return 1 + (lv - 1) * 0.5;
}

export function getScaledWheelSegments(workshopLevel = 1) {
  const lv = Math.max(1, Math.min(2000, Number(workshopLevel) || 1));
  const mult = getWheelRewardMultiplier(lv);
  return WHEEL_SEGMENTS.map((seg) => {
    if (seg.type === 'tickets') {
      const tickets = 2 + Math.floor((lv - 1) * 0.1);
      return { ...seg, amount: tickets, label: `+${tickets} 🎟️` };
    }
    const scaled = Math.round(seg.amount * mult);
    let label = seg.label;
    if (seg.type === 'coins') label = `+${scaled} ❄️`;
    else if (seg.type === 'magicDust') label = `+${scaled} ✨`;
    else if (seg.type === 'rep') label = `+${scaled} ⭐`;
    else if (seg.type === 'mats') label = `+${scaled} 🌲🧶`;
    else if (seg.type === 'jackpot') label = `JACKPOT ${scaled}❄️`;
    return { ...seg, amount: scaled, label };
  });
}

const ORDER_CUSTOMERS = [
  { name: 'Bé Bông', icon: '👧' },
  { name: 'Tuần Lộc Rudolph', icon: '🦌' },
  { name: 'Người Tuyết Olaf', icon: '⛄' },
  { name: 'Bé Tí Hon', icon: '🧒' },
  { name: 'Bà Chúa Tuyết', icon: '👸' },
  { name: 'Cú Tuyết Bắc Cực', icon: '🦉' },
];

const MAX_IDLE_MINUTES = 120;
const TAP_COOLDOWN_MS = 1200;

function getTodayKey() {
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vnTime.toISOString().slice(0, 10);
}

function getWeekKey() {
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const day = vnTime.getUTCDay(); // 0 = CN, 1 = T2...
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(vnTime);
  monday.setUTCDate(vnTime.getUTCDate() + diffToMonday);
  return monday.toISOString().slice(0, 10);
}

function getPlayerKey(guildId, userId) {
  return `santa:player:${guildId || 'global'}:${userId}`;
}

function getGuildSettingsKey(guildId) {
  return `santa:guild:${guildId}`;
}

function getLeaderboardKey(guildId) {
  return `santa:leaderboard:${guildId || 'global'}`;
}

export function getScaledRecipe(recipe, workshopLevel = 1) {
  const lv = Math.max(1, Math.min(2000, Number(workshopLevel) || 1));
  const earlyMultiplier = 1 + (Math.min(lv, 100) - 1) * 0.6;
  const lateMultiplier = lv > 100 ? 1 + (lv - 100) * 0.025 : 1;
  const matMult = earlyMultiplier * lateMultiplier;
  const scaledIngredients = {};
  for (const [mat, req] of Object.entries(recipe.ingredients)) {
    scaledIngredients[mat] = Math.max(1, Math.round(req * matMult));
  }
  return {
    ...recipe,
    ingredients: scaledIngredients,
  };
}

export function getScaledRecipes(workshopLevel = 1) {
  return TOY_RECIPES.map((r) => getScaledRecipe(r, workshopLevel));
}

function createOrder(workshopLevel = 1) {
  const customer = ORDER_CUSTOMERS[Math.floor(Math.random() * ORDER_CUSTOMERS.length)];
  const unlockedRecipes = TOY_RECIPES.filter((r) => workshopLevel >= (r.minLevel || 1));
  const recipe = unlockedRecipes[Math.floor(Math.random() * unlockedRecipes.length)] || TOY_RECIPES[0];
  const roll = Math.random();
  const isRush = roll < 0.25;
  const isSpecial = !isRush && roll < 0.5;
  const qty = workshopLevel >= 12 && Math.random() < 0.35 ? 3 : workshopLevel >= 3 && Math.random() < 0.35 ? 2 : 1;
  const multiplier = isRush ? 2.0 : isSpecial ? 1.5 : 1.0;
  const levelRewardMult = 1 + (Math.max(1, workshopLevel) - 1) * 0.35;

  return {
    id: `ord_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    customerName: isRush ? `Ông Già Noel (${customer.name})` : customer.name,
    customerIcon: isRush ? '🎅' : customer.icon,
    toyId: recipe.id,
    qty,
    isSpecial,
    isRush,
    expiresAt: isRush ? Date.now() + 90 * 1000 : null,
    rewardTickets: isRush ? 1 : 0,
    rewardCoins: Math.round(recipe.baseCoins * qty * multiplier * levelRewardMult),
    rewardRep: Math.round(recipe.baseRep * qty * multiplier * levelRewardMult),
  };
}

function createDefaultPlayer({ userId, username, avatarUrl, guildId }) {
  return {
    userId: String(userId),
    guildId: String(guildId || 'global'),
    username: username || 'Yêu Tinh Noel',
    avatarUrl: avatarUrl || null,
    workshopLevel: 1,
    helpers: { lumberjack: 0, tailor: 0, mage: 0 },
    snowCoins: 50,
    reputation: 0,
    materials: {
      wood: 6,
      fabric: 5,
      magicDust: 3,
      ribbon: 4,
    },
    toys: {
      teddy: 0,
      train: 0,
      musicBox: 0,
      snowGlobe: 0,
      santaSleigh: 0,
      polarExpress: 0,
      icePalace: 0,
      santaCrown: 0,
    },
    shinyToys: {},
    shinyCollection: [],
    hasGoldenHands: false,
    petLevels: {},
    adventOpened: [],
    lastAdventDate: null,
    personalBuffExpiresAt: 0,
    lastBossAttackAt: 0,
    orders: [createOrder(1), createOrder(1), createOrder(1)],
    ownedFrames: [],
    equippedFrame: null,
    ownedPets: [],
    equippedPet: null,
    ownedSkins: ['skin_classic'],
    equippedSkin: 'skin_classic',
    unlockedAchievements: [],
    totalCrafted: 0,
    treeContributed: 0,
    feverCount: 0,
    likedToday: {},
    lastGrinchAt: 0,
    pendingGiftNotices: [],
    luckyTickets: 1,
    hasEventRole: false,
    lastCheckinDate: null,
    checkinStreak: 0,
    lastRiddleDate: null,
    lastCollectAt: Date.now(),
    lastTapAt: 0,
    lastFeverAt: 0,
    totalDelivered: 0,
    updatedAt: Date.now(),
  };
}

export function computePendingIdleMaterials(player, now = Date.now(), partySize = 1) {
  const elapsedMs = Math.max(0, now - (player.lastCollectAt || now));
  const elapsedMinutes = Math.min(MAX_IDLE_MINUTES, elapsedMs / 60000);
  const levelMultiplier = 1 + (Math.max(1, player.workshopLevel || 1) - 1) * 0.35;
  const personalMult = (player.personalBuffExpiresAt || 0) > now ? 3 : 1;
  const coopMult = 1 + (Math.max(1, Math.min(10, Number(partySize) || 1)) - 1) * 0.15;
  const helpers = player.helpers || {};

  const helperBonuses = { wood: 0, fabric: 0, magicDust: 0, ribbon: 0 };
  for (const helperDef of ELF_HELPERS) {
    const lv = helpers[helperDef.id] || 0;
    if (lv > 0) {
      for (const [mat, rate] of Object.entries(helperDef.bonuses)) {
        helperBonuses[mat] = (helperBonuses[mat] || 0) + rate * lv;
      }
    }
  }

  const pending = {};
  let totalPending = 0;
  for (const [key, meta] of Object.entries(MATERIALS)) {
    const rate = (meta.baseRatePerMin * levelMultiplier + (helperBonuses[key] || 0)) * personalMult * coopMult;
    const amount = Math.floor(elapsedMinutes * rate);
    pending[key] = amount;
    totalPending += amount;
  }

  return {
    pending,
    totalPending,
    elapsedMinutes: Math.floor(elapsedMinutes),
    maxMinutes: MAX_IDLE_MINUTES,
    levelMultiplier,
  };
}

export const MAX_SANTA_LEVEL = 2000;

export function getUpgradeCost(level) {
  const lv = Math.max(1, Math.min(MAX_SANTA_LEVEL - 1, Math.floor(Number(level) || 1)));
  if (lv < 100) {
    if (lv <= 15) return Math.round(90 * Math.pow(1.4, lv - 1));
    const base15 = 90 * Math.pow(1.4, 14);
    return Math.round(base15 * (1 + (lv - 15) * 0.32));
  }
  if (lv === 100) return 2_000_000;
  if (lv === 101) return 3_000_000;
  if (lv < 1000) return Math.round(3_000_000 + ((lv - 101) / 899) * 17_000_000);
  if (lv < 1500) return 20_000_000;
  return 200_000_000;
}

export function getHelperUpgradeCost(helperDef, currentLevel = 0) {
  const lv = Math.max(0, Math.min(MAX_SANTA_LEVEL - 1, Math.floor(Number(currentLevel) || 0)));
  const earlyCost = Math.round(helperDef.baseCost * (1 + lv * 0.45 + Math.pow(lv, 1.55) * 0.35));
  if (lv < 100) return earlyCost;
  return Math.max(earlyCost, getUpgradeCost(lv));
}

export function getDailyRiddle(dateKey = getTodayKey()) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 100000;
  }
  return CHRISTMAS_RIDDLES[hash % CHRISTMAS_RIDDLES.length];
}

export async function getSantaGuildConfig(client, guildId) {
  if (!guildId || guildId === 'global') {
    return { eventRoleId: process.env.SANTA_EVENT_ROLE_ID || null, announceChannelId: null };
  }
  const saved = await getDatabaseValue(client, getGuildSettingsKey(guildId), null);
  return {
    eventRoleId: saved?.eventRoleId || process.env.SANTA_EVENT_ROLE_ID || null,
    announceChannelId: saved?.announceChannelId || null,
  };
}

export async function setSantaEventRole(client, guildId, roleId) {
  const current = (await getDatabaseValue(client, getGuildSettingsKey(guildId), {})) || {};
  await setDatabaseValue(client, getGuildSettingsKey(guildId), {
    ...current,
    eventRoleId: roleId ? String(roleId) : null,
    updatedAt: Date.now(),
  });
}

export async function setSantaAnnounceChannel(client, guildId, channelId) {
  const current = (await getDatabaseValue(client, getGuildSettingsKey(guildId), {})) || {};
  await setDatabaseValue(client, getGuildSettingsKey(guildId), {
    ...current,
    announceChannelId: channelId ? String(channelId) : null,
    updatedAt: Date.now(),
  });
}

async function announceToDiscordChannel(client, guildId, content) {
  if (!client || !guildId || guildId === 'global') return;
  try {
    const cfg = await getSantaGuildConfig(client, guildId);
    if (!cfg.announceChannelId) return;
    const ch =
      client.channels?.cache?.get(cfg.announceChannelId) ||
      (await client.channels?.fetch?.(cfg.announceChannelId).catch(() => null));
    if (ch && typeof ch.send === 'function') {
      await ch.send(content).catch(() => { });
    }
  } catch { }
}

function getTreeLevelFromPoints(points) {
  let lv = 0;
  for (let i = 1; i < TREE_THRESHOLDS.length; i += 1) {
    if (points >= TREE_THRESHOLDS[i]) lv = i;
  }
  return lv;
}

export async function getServerTree(client, guildId) {
  const key = `santa:tree:${guildId || 'global'}`;
  const tree = (await getDatabaseValue(client, key, null)) || {
    points: 0,
    level: 0,
    buffExpiresAt: 0,
    recentContributors: [],
  };
  const nextThreshold = TREE_THRESHOLDS[Math.min(TREE_THRESHOLDS.length - 1, (tree.level || 0) + 1)];
  return {
    ...tree,
    nextThreshold,
    buffActive: (tree.buffExpiresAt || 0) > Date.now(),
  };
}

function evaluateAchievements(player) {
  player.unlockedAchievements = player.unlockedAchievements || [];
  const newlyUnlocked = [];
  for (const ach of ACHIEVEMENTS) {
    if (!player.unlockedAchievements.includes(ach.id) && ach.check(player)) {
      player.unlockedAchievements.push(ach.id);
      player.snowCoins += ach.rewardCoins;
      player.luckyTickets = (player.luckyTickets || 0) + ach.rewardTickets;
      newlyUnlocked.push(ach);
    }
  }
  return newlyUnlocked;
}

function isGuestUserId(userId) {
  const s = String(userId || '').trim();
  return !s || s.startsWith('guest_');
}

function compareLeaderboardEntries(a, b) {
  return (
    ((b.workshopLevel || 1) - (a.workshopLevel || 1)) ||
    ((b.totalDelivered || 0) - (a.totalDelivered || 0)) ||
    ((b.reputation || 0) - (a.reputation || 0)) ||
    ((b.snowCoins || 0) - (a.snowCoins || 0))
  );
}

async function updateLeaderboard(client, guildId, player) {
  if (isGuestUserId(player?.userId)) {
    return;
  }
  const key = getLeaderboardKey(guildId);
  const list = (await getDatabaseValue(client, key, [])) || [];
  const filtered = Array.isArray(list)
    ? list.filter((e) => !isGuestUserId(e?.userId) && String(e.userId) !== String(player.userId))
    : [];
  filtered.push({
    userId: String(player.userId),
    username: player.username,
    avatarUrl: player.avatarUrl || null,
    reputation: player.reputation || 0,
    snowCoins: player.snowCoins || 0,
    workshopLevel: player.workshopLevel || 1,
    totalDelivered: player.totalDelivered || 0,
    equippedFrame: player.equippedFrame || null,
  });
  filtered.sort((a, b) => (b.reputation - a.reputation) || (b.snowCoins - a.snowCoins));
  filtered.sort(compareLeaderboardEntries);
  await setDatabaseValue(client, key, filtered.slice(0, 25));
}

export async function getSantaLeaderboard(client, guildId) {
  const key = getLeaderboardKey(guildId);
  const list = await getDatabaseValue(client, key, []);
  if (!Array.isArray(list)) return [];
  const clean = list.filter((e) => !isGuestUserId(e?.userId));
  clean.sort(compareLeaderboardEntries);
  if (clean.length !== list.length) {
    await setDatabaseValue(client, key, clean).catch(() => { });
  }
  return clean;
}

export async function cleanupGuestSantaData(client) {
  let deletedPlayers = 0;
  let cleanedBoards = 0;
  const keys = await listDatabaseKeys(client, 'santa:');
  for (const k of keys) {
    if (k.startsWith('santa:player:') && k.includes(':guest_')) {
      const ok = await deleteDatabaseValue(client, k);
      if (ok) deletedPlayers += 1;
    } else if (k.startsWith('santa:leaderboard:')) {
      const list = await getDatabaseValue(client, k, []);
      if (Array.isArray(list)) {
        const clean = list.filter((e) => !isGuestUserId(e?.userId));
        if (clean.length !== list.length) {
          await setDatabaseValue(client, k, clean);
          cleanedBoards += 1;
        }
      }
    }
  }
  return { deletedPlayers, cleanedBoards };
}

let ticketInflationResetPromise = null;

async function ensureSantaTicketInflationReset(client) {
  if (ticketInflationResetPromise) return ticketInflationResetPromise;
  ticketInflationResetPromise = (async () => {
    const markerKey = 'santa:maintenance:ticket-inflation-reset-v1';
    if (await getDatabaseValue(client, markerKey, false)) return { reset: false, count: 0 };
    const keys = await listDatabaseKeys(client, 'santa:player:');
    let count = 0;
    for (const key of keys) {
      const player = await getDatabaseValue(client, key, null);
      if (!player || typeof player !== 'object') continue;
      player.luckyTickets = 0;
      if (!(await setDatabaseValue(client, key, player))) {
        throw new Error(`Không thể lưu reset vé quay cho key ${key}`);
      }
      count += 1;
    }
    if (!(await setDatabaseValue(client, markerKey, { completedAt: Date.now(), resetPlayers: count }))) {
      throw new Error('Không thể ghi dấu hoàn tất reset vé quay');
    }
    logger.info(`[SantaWorkshop] Đã reset vé quay một lần cho ${count} người chơi.`);
    return { reset: true, count };
  })().catch((error) => {
    ticketInflationResetPromise = null;
    logger.error('[SantaWorkshop] Lỗi reset vé quay chống lạm phát:', error);
    throw error;
  });
  return ticketInflationResetPromise;
}

export async function getOrCreateSantaPlayer(client, { userId, username, avatarUrl, guildId = 'global' }) {
  await ensureSantaTicketInflationReset(client);
  const key = getPlayerKey(guildId, userId);
  let player = await getDatabaseValue(client, key, null);
  if (!player) {
    player = createDefaultPlayer({ userId, username, avatarUrl, guildId });
    await setDatabaseValue(client, key, player);
    await updateLeaderboard(client, guildId, player);
  } else {
    let changed = false;
    if (username && player.username !== username) {
      player.username = username;
      changed = true;
    }
    if (avatarUrl && player.avatarUrl !== avatarUrl) {
      player.avatarUrl = avatarUrl;
      changed = true;
    }
    if (!player.helpers) {
      player.helpers = { lumberjack: 0, tailor: 0, mage: 0 };
      changed = true;
    }
    if (!Array.isArray(player.orders) || player.orders.length < 3) {
      player.orders = player.orders || [];
      while (player.orders.length < 3) {
        player.orders.push(createOrder(player.workshopLevel || 1));
      }
      changed = true;
    }
    const now = Date.now();
    for (let i = 0; i < player.orders.length; i += 1) {
      if (player.orders[i]?.expiresAt && player.orders[i].expiresAt <= now) {
        player.orders[i] = createOrder(player.workshopLevel || 1);
        changed = true;
      }
    }
    if (changed) {
      await setDatabaseValue(client, key, player);
    }
  }
  return player;
}

async function savePlayer(client, guildId, player) {
  player.updatedAt = Date.now();
  const newlyUnlocked = evaluateAchievements(player);
  await setDatabaseValue(client, getPlayerKey(guildId, player.userId), player);
  await updateLeaderboard(client, guildId, player);
  if (newlyUnlocked.length > 0) {
    const names = newlyUnlocked.map((a) => `${a.icon} **${a.name}**`).join(', ');
    announceToDiscordChannel(
      client,
      guildId,
      `🏆 Chúc mừng <@${player.userId}> vừa mở khóa thành tựu Xưởng Quà Noel: ${names}!`,
    );
  }
  return player;
}

export async function buildSantaStatePayload(client, identity) {
  const guildId = identity.guildId || 'global';
  const partySize = Math.max(1, Math.min(10, Number(identity.partySize) || 1));
  const player = await getOrCreateSantaPlayer(client, identity);
  const today = getTodayKey();
  const riddle = getDailyRiddle(today);
  const idle = computePendingIdleMaterials(player, Date.now(), partySize);
  const leaderboard = await getSantaLeaderboard(client, guildId);
  const guildConfig = await getSantaGuildConfig(client, guildId);
  const serverTree = await getServerTree(client, guildId);
  const serverBoss = await getServerBoss(client, guildId);
  const openedAdvent = player.adventOpened || [];
  const nextAdventDay = openedAdvent.length + 1;
  const canOpenAdventToday = nextAdventDay <= 24 && player.lastAdventDate !== today;
  const bossDaily = player.bossDaily?.date === today ? player.bossDaily : { date: today, tap: 0, toy: 0 };

  return {
    player,
    idle,
    today,
    currentWeekKey: getWeekKey(),
    partySize,
    coopBonusPct: (partySize - 1) * 15,
    canOpenAdventToday,
    nextAdventDay,
    bossTapLeft: Math.max(0, 3 - (bossDaily.tap || 0)),
    bossToyLeft: Math.max(0, 2 - (bossDaily.toy || 0)),
    personalBuffActive: (player.personalBuffExpiresAt || 0) > Date.now(),
    checkedInToday: player.lastCheckinDate === today,
    riddleSolvedToday: player.lastRiddleDate === today,
    riddle: {
      id: riddle.id,
      question: riddle.question,
      options: riddle.options,
    },
    upgradeCost: getUpgradeCost(player.workshopLevel || 1),
    maxWorkshopLevel: MAX_SANTA_LEVEL,
    materialsMeta: MATERIALS,
    helpersMeta: ELF_HELPERS.map((h) => ({
      ...h,
      level: player.helpers?.[h.id] || 0,
      nextCost: getHelperUpgradeCost(h, player.helpers?.[h.id] || 0),
    })),
    achievementsMeta: ACHIEVEMENTS.map((a) => ({
      id: a.id,
      name: a.name,
      icon: a.icon,
      description: a.description,
      rewardCoins: a.rewardCoins,
      rewardTickets: a.rewardTickets,
      unlocked: (player.unlockedAchievements || []).includes(a.id),
    })),
    dailyQuestsMeta: (() => {
      const dq = ensureDailyQuests(player, today);
      return DAILY_QUESTS.map((q) => {
        const prog = Math.min(q.target, dq.progress?.[q.id] || 0);
        return {
          ...q,
          progress: prog,
          completed: prog >= q.target,
          claimed: (dq.claimed || []).includes(q.id),
        };
      });
    })(),
    serverTree,
    serverBoss,
    wheelSegments: getScaledWheelSegments(player.workshopLevel || 1),
    wheelMultiplier: Number((1 + ((player.workshopLevel || 1) - 1) * 0.5).toFixed(2)),
    recipes: getScaledRecipes(player.workshopLevel || 1),
    shopItems: SHOP_ITEMS.map((item) => item.type === 'ticket'
      ? { ...item, price: Math.round(item.price * getWheelRewardMultiplier(player.workshopLevel || 1)) }
      : item),
    eventRoleConfigured: Boolean(guildConfig.eventRoleId),
    leaderboard,
  };
}

export async function handleSantaCollect(client, identity, { isTap = false } = {}) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const now = Date.now();

  if (isTap) {
    if (now - (player.lastTapAt || 0) < TAP_COOLDOWN_MS) {
      return { ok: false, message: 'Yêu tinh đang gõ búa, chờ xíu nha!', state: await buildSantaStatePayload(client, identity) };
    }
    player.lastTapAt = now;
    const keys = Object.keys(MATERIALS);
    const picked = keys[Math.floor(Math.random() * keys.length)];
    const lv = player.workshopLevel || 1;
    const bonus = lv >= 60 ? 8 : lv >= 40 ? 6 : lv >= 25 ? 5 : lv >= 15 ? 4 : lv >= 8 ? 3 : lv >= 4 ? 2 : 1;
    player.materials[picked] = (player.materials[picked] || 0) + bonus;
    bumpDailyQuest(player, 'q_tap_20', 1);
    await savePlayer(client, guildId, player);
    return {
      ok: true,
      gained: { [picked]: bonus },
      message: `+${bonus} ${MATERIALS[picked].icon} ${MATERIALS[picked].name}!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  const idle = computePendingIdleMaterials(player, now);
  if (idle.totalPending <= 0) {
    return {
      ok: false,
      message: 'Xưởng đang sản xuất, hãy đợi thêm một chút để thu hoạch nhé!',
      state: await buildSantaStatePayload(client, identity),
    };
  }

  for (const [k, v] of Object.entries(idle.pending)) {
    player.materials[k] = (player.materials[k] || 0) + v;
  }
  player.lastCollectAt = now;
  bumpDailyQuest(player, 'q_collect_1', 1);
  await savePlayer(client, guildId, player);

  return {
    ok: true,
    gained: idle.pending,
    message: 'Thu hoạch nguyên liệu thành công!',
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaCheckin(client, identity) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const today = getTodayKey();

  if (player.lastCheckinDate === today) {
    return {
      ok: false,
      message: 'Hôm nay bạn đã điểm danh nhận quà rồi nè!',
      state: await buildSantaStatePayload(client, identity),
    };
  }

  player.checkinStreak = (player.checkinStreak || 0) + 1;
  player.lastCheckinDate = today;

  const bonusCoins = 40 + Math.min(player.checkinStreak, 7) * 10;
  player.snowCoins += bonusCoins;
  player.materials.wood += 4;
  player.materials.fabric += 3;
  player.materials.magicDust += 2;
  player.materials.ribbon += 3;
  bumpDailyQuest(player, 'q_checkin', 1);

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: `Điểm danh ngày ${player.checkinStreak}! Nhận +${bonusCoins} ❄️ và gói nguyên liệu Noel!`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaRiddle(client, identity, optionIndex) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const today = getTodayKey();

  if (player.lastRiddleDate === today) {
    return {
      ok: false,
      message: 'Bạn đã giải đố Giáng Sinh hôm nay rồi!',
      state: await buildSantaStatePayload(client, identity),
    };
  }

  const riddle = getDailyRiddle(today);
  if (Number(optionIndex) !== riddle.answerIndex) {
    return {
      ok: false,
      message: 'Sai mất tiêu rồi! Thử suy nghĩ lại đáp án khác xem sao nha 🎄',
      state: await buildSantaStatePayload(client, identity),
    };
  }

  player.lastRiddleDate = today;
  player.snowCoins += 55;
  player.reputation += 15;
  player.materials.magicDust += 3;
  player.materials.ribbon += 2;
  bumpDailyQuest(player, 'q_riddle', 1);

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: 'Chính xác! +55 ❄️, +15 ⭐ Danh vọng, +3 ✨ Bụi phép, +2 🎀 Ruy băng!',
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaCraft(client, identity, toyId, count = 1) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const baseRecipe = TOY_RECIPES.find((r) => r.id === toyId);
  const qty = Math.max(1, Math.min(20, Math.floor(Number(count) || 1)));

  if (!baseRecipe) {
    return { ok: false, message: 'Công thức đồ chơi không tồn tại!', state: await buildSantaStatePayload(client, identity) };
  }

  const recipe = getScaledRecipe(baseRecipe, player.workshopLevel || 1);

  if ((player.workshopLevel || 1) < (recipe.minLevel || 1)) {
    return {
      ok: false,
      message: `Cần Xưởng Cấp ${recipe.minLevel} để mở khóa ${recipe.name}!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  for (const [mat, req] of Object.entries(recipe.ingredients)) {
    if ((player.materials[mat] || 0) < req * qty) {
      return {
        ok: false,
        message: `Thiếu ${MATERIALS[mat].icon} ${MATERIALS[mat].name} để chế tạo ${qty} ${recipe.name}!`,
        state: await buildSantaStatePayload(client, identity),
      };
    }
  }

  for (const [mat, req] of Object.entries(recipe.ingredients)) {
    player.materials[mat] -= req * qty;
  }

  let shinyMade = 0;
  let normalMade = 0;
  let goldenHandsNotice = '';
  player.shinyToys = player.shinyToys || {};
  player.shinyCollection = player.shinyCollection || [];

  for (let i = 0; i < qty; i += 1) {
    if (Math.random() < 0.18) {
      shinyMade += 1;
      player.shinyToys[recipe.id] = (player.shinyToys[recipe.id] || 0) + 1;
      if (!player.shinyCollection.includes(recipe.id)) {
        player.shinyCollection.push(recipe.id);
        if (player.shinyCollection.length >= TOY_RECIPES.length && !player.hasGoldenHands) {
          player.hasGoldenHands = true;
          goldenHandsNotice = ' 🏆 Mở khóa danh hiệu "Bàn Tay Vàng Bắc Cực" (+20% Xu Tuyết vĩnh viễn)!';
          announceToDiscordChannel(
            client,
            guildId,
            `🏆 **BÀN TAY VÀNG BẮC CỰC!** Chúc mừng <@${player.userId}> đã sưu tầm đủ ${TOY_RECIPES.length}/${TOY_RECIPES.length} Đồ Chơi Hoàng Kim!`,
          );
        }
      }
    } else {
      normalMade += 1;
      player.toys[recipe.id] = (player.toys[recipe.id] || 0) + 1;
    }
  }

  player.totalCrafted = (player.totalCrafted || 0) + qty;
  bumpDailyQuest(player, 'q_craft_3', qty);

  await savePlayer(client, guildId, player);
  const shinyNote = shinyMade > 0 ? ` (✨ ${shinyMade} Hoàng Kim!)` : '';
  return {
    ok: true,
    isShiny: shinyMade > 0,
    message: `Chế tạo thành công ${qty} ${recipe.icon} ${recipe.name}!${shinyNote}${goldenHandsNotice}`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaDeliver(client, identity, orderId) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const idx = (player.orders || []).findIndex((o) => o.id === orderId);

  if (idx === -1) {
    return { ok: false, message: 'Đơn hàng này không còn tồn tại!', state: await buildSantaStatePayload(client, identity) };
  }

  const order = player.orders[idx];
  const recipe = TOY_RECIPES.find((r) => r.id === order.toyId);
  const normalCount = player.toys[order.toyId] || 0;
  const shinyCount = player.shinyToys?.[order.toyId] || 0;
  if (normalCount + shinyCount < order.qty) {
    return {
      ok: false,
      message: `Bạn cần ${order.qty} ${recipe?.icon || ''} ${recipe?.name || ''} để giao đơn này!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  const tree = await getServerTree(client, guildId);
  const buffMult = tree.buffActive ? 2 : 1;

  // Ưu tiên dùng bản Hoàng Kim (nếu có) để nhân 3 Xu Tuyết!
  let usedShiny = 0;
  let remaining = order.qty;
  player.shinyToys = player.shinyToys || {};
  if (shinyCount > 0) {
    usedShiny = Math.min(shinyCount, remaining);
    player.shinyToys[order.toyId] -= usedShiny;
    remaining -= usedShiny;
  }
  if (remaining > 0) {
    player.toys[order.toyId] -= remaining;
  }

  const shinyMult = usedShiny > 0 ? 3 : 1;
  const goldenMult = player.hasGoldenHands ? 1.2 : 1;
  const gainedCoins = Math.round(order.rewardCoins * buffMult * shinyMult * goldenMult);
  player.snowCoins += gainedCoins;
  player.reputation += order.rewardRep;
  if (order.rewardTickets) {
    player.luckyTickets = (player.luckyTickets || 0) + order.rewardTickets;
  }
  player.totalDelivered = (player.totalDelivered || 0) + 1;
  bumpDailyQuest(player, 'q_deliver_2', 1);
  player.orders.splice(idx, 1, createOrder(player.workshopLevel || 1));

  await savePlayer(client, guildId, player);
  const ticketNote = order.rewardTickets ? ` & +${order.rewardTickets} 🎟️` : '';
  const buffNote = buffMult > 1 ? ' (x2 Cây Thông!)' : '';
  const shinyNote = usedShiny > 0 ? ' (✨ Hoàng Kim x3!)' : '';
  return {
    ok: true,
    message: `Giao hàng cho ${order.customerIcon} ${order.customerName} thành công! Nhận +${gainedCoins} ❄️, +${order.rewardRep} ⭐${ticketNote}${buffNote}${shinyNote}`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaHireHelper(client, identity, helperId) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const helperDef = ELF_HELPERS.find((h) => h.id === helperId);

  if (!helperDef) {
    return { ok: false, message: 'Yêu tinh phụ việc không tồn tại!', state: await buildSantaStatePayload(client, identity) };
  }

  player.helpers = player.helpers || { lumberjack: 0, tailor: 0, mage: 0 };
  const currentLv = player.helpers[helperId] || 0;
  if (currentLv >= MAX_SANTA_LEVEL) {
    return { ok: false, message: `${helperDef.name} đã đạt cấp tối đa (Cấp ${MAX_SANTA_LEVEL})!`, state: await buildSantaStatePayload(client, identity) };
  }

  const cost = getHelperUpgradeCost(helperDef, currentLv);
  if (player.snowCoins < cost) {
    return {
      ok: false,
      message: `Cần ${cost} ❄️ để thuê/nâng cấp ${helperDef.name}!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  player.snowCoins -= cost;
  player.helpers[helperId] = currentLv + 1;
  await savePlayer(client, guildId, player);

  return {
    ok: true,
    message: `Đã nâng cấp ${helperDef.icon} ${helperDef.name} lên Cấp ${player.helpers[helperId]}!`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaFeverBonus(client, identity, { hits = 0 } = {}) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const now = Date.now();

  if (now - (player.lastFeverAt || 0) < 12000) {
    return { ok: false, message: 'Mưa quà đang hồi chiêu!', state: await buildSantaStatePayload(client, identity) };
  }

  const safeHits = Math.max(1, Math.min(35, Number(hits) || 5));
  const tree = await getServerTree(client, guildId);
  const buffMult = tree.buffActive ? 2 : 1;
  const bonusCoins = safeHits * 3 * buffMult;
  const bonusMat = Math.max(1, Math.floor(safeHits / 3)) * buffMult;

  player.lastFeverAt = now;
  player.feverCount = (player.feverCount || 0) + 1;
  player.snowCoins += bonusCoins;
  player.materials.wood += bonusMat;
  player.materials.fabric += bonusMat;
  player.materials.magicDust += Math.max(1, Math.floor(bonusMat / 2));
  player.materials.ribbon += Math.max(1, Math.floor(bonusMat / 2));
  bumpDailyQuest(player, 'q_fever_1', 1);

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: `🎉 Tổng kết Mưa Quà Fever #${player.feverCount} (${safeHits} quà): +${bonusCoins} ❄️ & nguyên liệu đầy kho!`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaUpgrade(client, identity) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const currentLevel = player.workshopLevel || 1;
  if (currentLevel >= MAX_SANTA_LEVEL) {
    return { ok: false, message: `Xưởng Yêu Tinh đã đạt cấp tối đa (Cấp ${MAX_SANTA_LEVEL})!`, state: await buildSantaStatePayload(client, identity) };
  }

  const cost = getUpgradeCost(currentLevel);
  if (player.snowCoins < cost) {
    return {
      ok: false,
      message: `Cần ${cost} ❄️ để nâng cấp Xưởng lên cấp ${currentLevel + 1}!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  player.snowCoins -= cost;
  player.workshopLevel = currentLevel + 1;
  await savePlayer(client, guildId, player);

  return {
    ok: true,
    message: `Nâng cấp Xưởng Yêu Tinh lên Cấp ${player.workshopLevel}! Tốc độ thu hoạch tăng 35%!`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaBuyItem(client, identity, itemId) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const baseItem = SHOP_ITEMS.find((i) => i.id === itemId);
  const level = Math.max(1, Number(player.workshopLevel) || 1);
  const item = baseItem && baseItem.type === 'ticket'
    ? { ...baseItem, price: Math.round(baseItem.price * getWheelRewardMultiplier(level)) }
    : baseItem;

  if (!item) {
    return { ok: false, message: 'Vật phẩm không tồn tại!', state: await buildSantaStatePayload(client, identity) };
  }

  if (item.type === 'frame' && player.ownedFrames.includes(item.id)) {
    return { ok: false, message: 'Bạn đã sở hữu khung avatar này rồi!', state: await buildSantaStatePayload(client, identity) };
  }

  if (item.type === 'role' && player.hasEventRole) {
    return { ok: false, message: 'Bạn đã nhận Role Sự Kiện Noel rồi!', state: await buildSantaStatePayload(client, identity) };
  }

  const weekKey = getWeekKey();
  const todayKey = getTodayKey();
  if (item.id === 'ticket_bundle_5' && player.dailyPurchases?.[item.id] === todayKey) {
    return {
      ok: false,
      message: '⏳ Xấp 5 Vé Quay Số chỉ được mua 1 lần mỗi ngày! Ngày mai bạn quay lại nhé.',
      state: await buildSantaStatePayload(client, identity),
    };
  }
  if (item.weeklyLimit && player.weeklyPurchases?.[item.id] === weekKey) {
    return {
      ok: false,
      message: `⏳ ${item.name} mỗi tuần chỉ được mua 1 lần! Hãy quay lại vào tuần sau nhé!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  if (item.cooldownDays) {
    const cooldownMs = item.cooldownDays * 24 * 60 * 60 * 1000;
    const lastAt = player.cooldownPurchases?.[item.id] || 0;
    const remainMs = cooldownMs - (Date.now() - lastAt);
    if (remainMs > 0) {
      const remainHours = Math.ceil(remainMs / (60 * 60 * 1000));
      return {
        ok: false,
        message: `⏳ ${item.name} mỗi ${item.cooldownDays} ngày chỉ mua 1 lần (còn ${remainHours} giờ)!`,
        state: await buildSantaStatePayload(client, identity),
      };
    }
  }

  if (player.snowCoins < item.price) {
    return {
      ok: false,
      message: `Bạn còn thiếu ${item.price - player.snowCoins} ❄️ để mua ${item.name}!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  let extraNote = '';
  if (item.type === 'role') {
    const guildConfig = await getSantaGuildConfig(client, guildId);
    if (guildConfig.eventRoleId && guildId !== 'global' && client?.guilds) {
      try {
        const guild = client.guilds.cache.get(guildId) || (await client.guilds.fetch(guildId).catch(() => null));
        const member = guild ? await guild.members.fetch(player.userId).catch(() => null) : null;
        if (member) {
          await member.roles.add(guildConfig.eventRoleId, 'Đổi Xu Tuyết trong Shop Xưởng Quà Noel');
          extraNote = ' Đã tự động trao Role trên Discord cho bạn!';
        }
      } catch (err) {
        logger.warn('[SantaWorkshop] Không thể trao Role sự kiện tự động:', err?.message || err);
        extraNote = ' (Bot chưa đủ quyền trao Role tự động, hãy báo Admin nhé!)';
      }
    }
    player.hasEventRole = true;
  } else if (item.type === 'frame') {
    player.ownedFrames = player.ownedFrames || [];
    player.ownedFrames.push(item.id);
    player.equippedFrame = item.id;
  } else if (item.type === 'pet') {
    player.ownedPets = player.ownedPets || [];
    if (player.ownedPets.includes(item.id)) {
      return { ok: false, message: 'Bạn đã sở hữu thú cưng này rồi!', state: await buildSantaStatePayload(client, identity) };
    }
    player.ownedPets.push(item.id);
    player.equippedPet = item.id;
  } else if (item.type === 'skin') {
    player.ownedSkins = player.ownedSkins || ['skin_classic'];
    if (player.ownedSkins.includes(item.id)) {
      return { ok: false, message: 'Bạn đã sở hữu trang phục này rồi!', state: await buildSantaStatePayload(client, identity) };
    }
    player.ownedSkins.push(item.id);
    player.equippedSkin = item.id;
  } else if (item.type === 'ticket') {
    player.luckyTickets = (player.luckyTickets || 0) + (item.amount || 1);
    if (item.id === 'ticket_bundle_5') {
      player.dailyPurchases = player.dailyPurchases || {};
      player.dailyPurchases[item.id] = todayKey;
    }
  } else if (item.type === 'pack' && item.pack) {
    for (const [m, amt] of Object.entries(item.pack)) {
      player.materials[m] = (player.materials[m] || 0) + amt;
    }
    if (item.weeklyLimit) {
      player.weeklyPurchases = player.weeklyPurchases || {};
      player.weeklyPurchases[item.id] = weekKey;
    }
  } else if (item.type === 'buff') {
    const base = Math.max(Date.now(), player.personalBuffExpiresAt || 0);
    player.personalBuffExpiresAt = base + 10 * 60 * 1000;
    if (item.cooldownDays) {
      player.cooldownPurchases = player.cooldownPurchases || {};
      player.cooldownPurchases[item.id] = Date.now();
    }
  }

  player.snowCoins -= item.price;
  await savePlayer(client, guildId, player);

  return {
    ok: true,
    message: `Mua thành công ${item.icon} ${item.name}!${extraNote}`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaEquipFrame(client, identity, frameId) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);

  if (frameId && !player.ownedFrames.includes(frameId)) {
    return { ok: false, message: 'Bạn chưa sở hữu khung avatar này!', state: await buildSantaStatePayload(client, identity) };
  }

  player.equippedFrame = frameId || null;
  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: frameId ? 'Đã trang bị khung avatar mới!' : 'Đã tháo khung avatar.',
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaSpinWheel(client, identity, rawCount = 1) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const spinCount = Math.max(1, Math.min(10, Math.floor(Number(rawCount) || 1)));

  if ((player.luckyTickets || 0) < spinCount) {
    return {
      ok: false,
      message:
        spinCount > 1
          ? `Bạn cần ít nhất ${spinCount} Vé Quay Số để quay x${spinCount}! (Hiện có ${player.luckyTickets || 0} 🎟️)`
          : 'Bạn đã hết Vé Quay Số! Hãy ghé Shop Giáng Sinh mua thêm nhé 🎟️',
      state: await buildSantaStatePayload(client, identity),
    };
  }

  player.luckyTickets -= spinCount;
  const scaledSegments = getScaledWheelSegments(player.workshopLevel || 1);
  const repBonusPerJackpot = Math.round(40 * (1 + ((player.workshopLevel || 1) - 1) * 0.5));
  player.wheelPity = player.wheelPity || { spinsSinceJackpot: 0, spinsSinceTicket: 0 };

  let lastWheelIndex = 0;
  let lastPrizeText = '';
  let totalCoins = 0;
  let totalMagicDust = 0;
  let totalRep = 0;
  let totalMats = 0;
  let totalTickets = 0;
  let jackpotCount = 0;

  for (let i = 0; i < spinCount; i += 1) {
    player.wheelPity.spinsSinceJackpot = Math.max(0, Number(player.wheelPity.spinsSinceJackpot) || 0) + 1;
    player.wheelPity.spinsSinceTicket = Math.max(0, Number(player.wheelPity.spinsSinceTicket) || 0) + 1;

    const jackpotDue = player.wheelPity.spinsSinceJackpot >= 100;
    const ticketDue = player.wheelPity.spinsSinceTicket >= 100;
    let wheelIndex;
    if (jackpotDue) {
      wheelIndex = scaledSegments.findIndex((segment) => segment.type === 'jackpot');
      player.wheelPity.spinsSinceJackpot = 0;
    } else if (ticketDue) {
      wheelIndex = scaledSegments.findIndex((segment) => segment.type === 'tickets');
      player.wheelPity.spinsSinceTicket = 0;
    } else {
      const ordinarySegments = scaledSegments
        .map((segment, index) => ({ segment, index }))
        .filter(({ segment }) => segment.type !== 'jackpot' && segment.type !== 'tickets');
      const picked = ordinarySegments[Math.floor(Math.random() * ordinarySegments.length)];
      wheelIndex = picked?.index ?? 0;
    }
    const seg = scaledSegments[wheelIndex >= 0 ? wheelIndex : 0];
    lastWheelIndex = wheelIndex >= 0 ? wheelIndex : 0;

    if (seg.type === 'coins') {
      player.snowCoins += seg.amount;
      totalCoins += seg.amount;
      lastPrizeText = `+${seg.amount} ❄️ Xu Tuyết!`;
    } else if (seg.type === 'magicDust') {
      player.materials.magicDust += seg.amount;
      totalMagicDust += seg.amount;
      lastPrizeText = `+${seg.amount} ✨ Bụi phép!`;
    } else if (seg.type === 'rep') {
      player.reputation += seg.amount;
      totalRep += seg.amount;
      lastPrizeText = `+${seg.amount} ⭐ Điểm Danh Vọng!`;
    } else if (seg.type === 'mats') {
      player.materials.wood += seg.amount;
      player.materials.fabric += seg.amount;
      totalMats += seg.amount;
      lastPrizeText = `+${seg.amount} 🌲 Gỗ thông & +${seg.amount} 🧶 Vải đỏ!`;
    } else if (seg.type === 'tickets') {
      player.luckyTickets += seg.amount;
      totalTickets += seg.amount;
      lastPrizeText = `+${seg.amount} 🎟️ Vé Quay Số!`;
    } else if (seg.type === 'jackpot') {
      player.snowCoins += seg.amount;
      player.reputation += repBonusPerJackpot;
      totalCoins += seg.amount;
      totalRep += repBonusPerJackpot;
      jackpotCount += 1;
      lastPrizeText = `JACKPOT! +${seg.amount} ❄️ Xu Tuyết & +${repBonusPerJackpot} ⭐ Danh Vọng!`;
    }
  }

  if (jackpotCount > 0) {
    const jackpotSeg = scaledSegments.find((s) => s.type === 'jackpot');
    const jackpotCoins = (jackpotSeg?.amount || 0) * jackpotCount;
    const prefix = jackpotCount > 1 ? `**${jackpotCount}x JACKPOT ĐÊM NOEL!**` : '**JACKPOT ĐÊM NOEL!**';
    announceToDiscordChannel(
      client,
      guildId,
      `🎰 ${prefix} Chúc mừng <@${player.userId}> vừa quay trúng **+${jackpotCoins} ❄️ Xu Tuyết** tại Vòng Quay Xưởng Quà Ông Già Noel!`,
    );
  }

  let prizeText = lastPrizeText;
  if (spinCount > 1) {
    const parts = [];
    if (jackpotCount > 0) parts.push(`🎉 ${jackpotCount}x JACKPOT!`);
    if (totalCoins > 0) parts.push(`+${totalCoins} ❄️ Xu`);
    if (totalMagicDust > 0) parts.push(`+${totalMagicDust} ✨ Bụi phép`);
    if (totalRep > 0) parts.push(`+${totalRep} ⭐ Danh vọng`);
    if (totalMats > 0) parts.push(`+${totalMats} 🌲🧶 Nguyên liệu`);
    if (totalTickets > 0) parts.push(`+${totalTickets} 🎟️ Vé`);
    prizeText = parts.join(' • ');
  }

  bumpDailyQuest(player, 'q_wheel_1', spinCount);
  await savePlayer(client, guildId, player);
  return {
    ok: true,
    spinCount,
    wheelIndex: lastWheelIndex,
    prizeText,
    message: spinCount > 1 ? `🎡 Quay x${spinCount} trúng: ${prizeText}` : `🎡 Trúng thưởng: ${prizeText}`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaEquipCosmetic(client, identity, { kind, itemId }) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);

  if (kind === 'pet') {
    if (itemId && !(player.ownedPets || []).includes(itemId)) {
      return { ok: false, message: 'Bạn chưa nuôi thú cưng này!', state: await buildSantaStatePayload(client, identity) };
    }
    player.equippedPet = itemId || null;
  } else if (kind === 'skin') {
    const owned = player.ownedSkins || ['skin_classic'];
    if (itemId && !owned.includes(itemId)) {
      return { ok: false, message: 'Bạn chưa sở hữu trang phục này!', state: await buildSantaStatePayload(client, identity) };
    }
    player.equippedSkin = itemId || 'skin_classic';
  } else {
    if (itemId && !(player.ownedFrames || []).includes(itemId)) {
      return { ok: false, message: 'Bạn chưa sở hữu khung avatar này!', state: await buildSantaStatePayload(client, identity) };
    }
    player.equippedFrame = itemId || null;
  }

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: 'Đã thay đổi trang bị thành công!',
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaContributeTree(client, identity, { mode = 'coins', toyId = null } = {}) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const key = `santa:tree:${guildId}`;
  const tree = (await getDatabaseValue(client, key, null)) || {
    points: 0,
    level: 0,
    buffExpiresAt: 0,
    recentContributors: [],
  };

  let addedPoints = 0;
  let repGain = 0;

  if (mode === 'toy' && toyId) {
    if ((player.toys[toyId] || 0) < 1) {
      return { ok: false, message: 'Bạn không có món đồ chơi này trong kho!', state: await buildSantaStatePayload(client, identity) };
    }
    player.toys[toyId] -= 1;
    addedPoints = 40;
    repGain = 20;
  } else {
    if (player.snowCoins < 40) {
      return { ok: false, message: 'Cần ít nhất 40 ❄️ Xu Tuyết để trang trí Cây Thông!', state: await buildSantaStatePayload(client, identity) };
    }
    player.snowCoins -= 40;
    addedPoints = 35;
    repGain = 15;
  }

  player.reputation += repGain;
  player.treeContributed = (player.treeContributed || 0) + 1;
  bumpDailyQuest(player, 'q_tree_1', 1);

  const oldLevel = tree.level || 0;
  tree.points = (tree.points || 0) + addedPoints;
  tree.level = getTreeLevelFromPoints(tree.points);
  tree.recentContributors = [
    { username: player.username, points: addedPoints, at: Date.now() },
    ...(Array.isArray(tree.recentContributors) ? tree.recentContributors : []),
  ].slice(0, 5);

  let levelUpMsg = '';
  if (tree.level > oldLevel) {
    tree.buffExpiresAt = Date.now() + 60 * 60 * 1000;
    levelUpMsg = ` 🌟 Cây Thông Server lên Cấp ${tree.level}! Toàn server được x2 Xu Tuyết & Quà trong 1 giờ!`;
    announceToDiscordChannel(
      client,
      guildId,
      `🎄 **CÂY THÔNG CHUNG LÊN CẤP ${tree.level}!** Nhờ đóng góp của <@${player.userId}>, toàn server được **x2 Xu Tuyết & Quà Fever** trong 1 giờ!`,
    );
  }

  await setDatabaseValue(client, key, tree);
  await savePlayer(client, guildId, player);

  return {
    ok: true,
    message: `🎄 Đã góp +${addedPoints} điểm trang trí Cây Thông (+${repGain} ⭐)!${levelUpMsg}`,
    state: await buildSantaStatePayload(client, identity),
  };
}

function pickRandomAvailableToy(player, preferredToyId = null) {
  if (preferredToyId && Number(player.toys?.[preferredToyId] || 0) > 0) {
    return preferredToyId;
  }
  const available = Object.keys(player.toys || {}).filter((k) => Number(player.toys[k] || 0) > 0);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export async function handleSantaVisitFriend(client, identity, { targetUserId, action = 'like', toyId = null } = {}) {
  const guildId = identity.guildId || 'global';
  if (!targetUserId || String(targetUserId) === String(identity.userId)) {
    return { ok: false, message: 'Không thể tự tương tác với chính mình nha!', state: await buildSantaStatePayload(client, identity) };
  }

  const player = await getOrCreateSantaPlayer(client, identity);
  const friendKey = getPlayerKey(guildId, targetUserId);
  const friend = await getDatabaseValue(client, friendKey, null);
  if (!friend) {
    return { ok: false, message: 'Không tìm thấy xưởng của người chơi này!', state: await buildSantaStatePayload(client, identity) };
  }

  const today = getTodayKey();
  player.socialDaily = player.socialDaily || {};
  if (player.socialDaily.date !== today) player.socialDaily = { date: today, targets: {} };
  player.socialDaily.targets = player.socialDaily.targets || {};
  const targetDaily = player.socialDaily.targets[String(targetUserId)] || { likes: 0, gifts: 0 };
  targetDaily.likes = Math.max(0, Number(targetDaily.likes) || 0);
  targetDaily.gifts = Math.max(0, Number(targetDaily.gifts) || 0);

  if (action === 'gift') {
    if (targetDaily.gifts >= 3) {
      return { ok: false, message: '🎁 Bạn đã dùng đủ 3/3 lượt tặng quà hôm nay. Ngày mai quay lại nhé!', state: await buildSantaStatePayload(client, identity) };
    }
    const giftToy = pickRandomAvailableToy(player, toyId);
    if (!giftToy || Number(player.toys?.[giftToy] || 0) < 1) {
      return {
        ok: false,
        message: 'Kho đồ chơi của bạn đang trống! Hãy chế tạo ít nhất 1 món đồ chơi mới tặng được nhé 🎁',
        state: await buildSantaStatePayload(client, identity),
      };
    }
    player.toys[giftToy] = Math.max(0, Number(player.toys[giftToy] || 0) - 1);
    targetDaily.gifts += 1;
    player.socialDaily.targets[String(targetUserId)] = targetDaily;
    player.reputation += 15;
    friend.toys = friend.toys || {};
    friend.toys[giftToy] = (friend.toys[giftToy] || 0) + 1;
    friend.reputation = (friend.reputation || 0) + 15;

    await savePlayer(client, guildId, friend);
    bumpDailyQuest(player, 'q_friend_1', 1);
    await savePlayer(client, guildId, player);
    const recipe = TOY_RECIPES.find((r) => r.id === giftToy);
    return {
      ok: true,
      message: `🎁 Đã tặng ${recipe?.icon || ''} ${recipe?.name || 'đồ chơi'} (còn ${player.toys[giftToy]} trong kho) cho ${friend.username}! Cả 2 nhận +15 ⭐!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  if (action !== 'like') {
    return { ok: false, message: 'Thao tác không hợp lệ!', state: await buildSantaStatePayload(client, identity) };
  }
  if (targetDaily.likes >= 3) {
    return { ok: false, message: '❤️ Bạn đã dùng đủ 3/3 lượt thả tim hôm nay. Ngày mai quay lại nhé!', state: await buildSantaStatePayload(client, identity) };
  }

  targetDaily.likes += 1;
  player.socialDaily.targets[String(targetUserId)] = targetDaily;
  player.reputation += 10;
  friend.reputation = (friend.reputation || 0) + 10;
  friend.snowCoins = (friend.snowCoins || 0) + 15;

  await savePlayer(client, guildId, friend);
  bumpDailyQuest(player, 'q_friend_1', 1);
  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: `❤️ Đã thả tim giúp xưởng ${friend.username}! Cả 2 nhận +10 ⭐ (bạn ấy được +15 ❄️)!`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaRepelGrinch(client, identity) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const now = Date.now();

  if (now - (player.lastGrinchAt || 0) < 20000) {
    return { ok: false, message: 'Grinch vừa chạy mất rồi!', state: await buildSantaStatePayload(client, identity) };
  }

  player.lastGrinchAt = now;
  player.snowCoins += 50;
  player.luckyTickets = (player.luckyTickets || 0) + 1;
  player.reputation += 20;

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: '👺 Đuổi Grinch thành công! Nhận +50 ❄️ Xu Tuyết, +1 🎟️ Vé Quay & +20 ⭐!',
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaClaimQuest(client, identity, questId) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const dq = ensureDailyQuests(player);
  const quest = DAILY_QUESTS.find((q) => q.id === questId);

  if (!quest) {
    return { ok: false, message: 'Nhiệm vụ không tồn tại!', state: await buildSantaStatePayload(client, identity) };
  }

  if ((dq.claimed || []).includes(questId)) {
    return { ok: false, message: 'Bạn đã nhận thưởng nhiệm vụ này hôm nay rồi!', state: await buildSantaStatePayload(client, identity) };
  }

  const prog = dq.progress?.[questId] || 0;
  if (prog < quest.target) {
    return { ok: false, message: 'Bạn chưa hoàn thành nhiệm vụ này!', state: await buildSantaStatePayload(client, identity) };
  }

  dq.claimed = dq.claimed || [];
  dq.claimed.push(questId);

  if (quest.rewardCoins) player.snowCoins += quest.rewardCoins;
  if (quest.rewardRep) player.reputation += quest.rewardRep;
  if (quest.rewardTickets) player.luckyTickets = (player.luckyTickets || 0) + quest.rewardTickets;
  if (quest.rewardMat) {
    for (const [m, amt] of Object.entries(quest.rewardMat)) {
      player.materials[m] = (player.materials[m] || 0) + amt;
    }
  }

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: `🎁 Hoàn thành "${quest.name}"! Đã nhận thưởng!`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function grantSantaSnowCoins(client, { guildId = 'global', targetUser, amount, adminUser, note = '' }) {
  const safeAmount = Math.min(20000000000, Math.max(1, Math.floor(Number(amount) || 0)));
  const player = await getOrCreateSantaPlayer(client, {
    userId: targetUser.id,
    username: targetUser.globalName || targetUser.username || 'Yêu Tinh Noel',
    avatarUrl: typeof targetUser.displayAvatarURL === 'function' ? targetUser.displayAvatarURL({ size: 128 }) : null,
    guildId,
  });

  player.snowCoins = (player.snowCoins || 0) + safeAmount;
  player.pendingGiftNotices = Array.isArray(player.pendingGiftNotices) ? player.pendingGiftNotices : [];
  player.pendingGiftNotices.push({
    id: `gift_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    amount: safeAmount,
    fromName: adminUser?.globalName || adminUser?.username || 'Admin',
    note: String(note || '').trim().slice(0, 140),
    at: Date.now(),
  });

  await savePlayer(client, guildId, player);
  return { ok: true, amount: safeAmount, player };
}

export async function grantSantaMaterials(client, { guildId = 'global', targetUser, amount, adminUser, note = '' }) {
  const safeAmount = Math.min(2_000_000, Math.max(1, Math.floor(Number(amount) || 0)));
  const player = await getOrCreateSantaPlayer(client, {
    userId: targetUser.id,
    username: targetUser.globalName || targetUser.username || 'Yêu Tinh Noel',
    avatarUrl: typeof targetUser.displayAvatarURL === 'function' ? targetUser.displayAvatarURL({ size: 128 }) : null,
    guildId,
  });
  player.materials = player.materials || {};
  const granted = { wood: safeAmount, fabric: safeAmount, magicDust: safeAmount };
  for (const [material, quantity] of Object.entries(granted)) {
    player.materials[material] = (Number(player.materials[material]) || 0) + quantity;
  }
  player.pendingMaterialGiftNotices = Array.isArray(player.pendingMaterialGiftNotices) ? player.pendingMaterialGiftNotices : [];
  player.pendingMaterialGiftNotices.push({
    id: 'materials_gift_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
    materials: granted,
    fromName: adminUser?.globalName || adminUser?.username || 'Admin',
    note: String(note || '').trim().slice(0, 140),
    at: Date.now(),
  });
  await savePlayer(client, guildId, player);
  return { ok: true, amount: safeAmount, materials: granted, player };
}

export async function handleSantaAckGifts(client, identity) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const hasCoinNotices = Array.isArray(player.pendingGiftNotices) && player.pendingGiftNotices.length > 0;
  const hasMaterialNotices = Array.isArray(player.pendingMaterialGiftNotices) && player.pendingMaterialGiftNotices.length > 0;
  if (hasCoinNotices || hasMaterialNotices) {
    player.pendingGiftNotices = [];
    player.pendingMaterialGiftNotices = [];
    await savePlayer(client, guildId, player);
  }
  return { ok: true, state: await buildSantaStatePayload(client, identity) };
}

export async function getServerBoss(client, guildId) {
  const key = `santa:boss:${guildId || 'global'}`;
  const today = getTodayKey();
  const now = Date.now();
  const BOSS_DURATION_MS = 20 * 60 * 60 * 1000;

  let boss = await getDatabaseValue(client, key, null);
  if (!boss || boss.date !== today) {
    // Nếu boss ngày cũ hết giờ mà chưa kịp phát quà an ủi
    if (boss && boss.status === 'active' && !boss.rewardsDistributed && boss.contributors) {
      await distributeBossConsolation(client, guildId, boss);
    }
    const nextLv = boss ? (boss.level || 1) : 1;
    const maxHp = 8000 + (nextLv - 1) * 4000;
    boss = {
      name: 'Người Tuyết Bão Tố Khổng Lồ',
      icon: '⛄',
      level: nextLv,
      hp: maxHp,
      maxHp,
      date: today,
      openedAt: now,
      closesAt: now + BOSS_DURATION_MS,
      status: 'active',
      rewardsDistributed: false,
      contributors: {},
      defeatedCount: boss?.defeatedCount || 0,
    };
    await setDatabaseValue(client, key, boss);
  } else if (boss.status === 'active' && boss.closesAt && now > boss.closesAt) {
    boss.status = 'expired';
    if (!boss.rewardsDistributed && boss.contributors) {
      await distributeBossConsolation(client, guildId, boss);
      boss.rewardsDistributed = true;
    }
    await setDatabaseValue(client, key, boss);
  }
  return boss;
}

async function distributeBossConsolation(client, guildId, boss) {
  const consolationCoins = 45;
  for (const uid of Object.keys(boss.contributors || {})) {
    const p = await getDatabaseValue(client, getPlayerKey(guildId, uid), null);
    if (!p) continue;
    p.snowCoins = (p.snowCoins || 0) + consolationCoins;
    p.pendingGiftNotices = Array.isArray(p.pendingGiftNotices) ? p.pendingGiftNotices : [];
    p.pendingGiftNotices.push({
      id: `boss_con_${Date.now().toString(36)}_${uid.slice(-4)}`,
      amount: consolationCoins,
      fromName: 'Ông Già Noel (An ủi Boss)',
      note: `Hết 20h đánh ${boss.name} chưa thành công, gửi bạn chút Xu Tuyết an ủi nhé!`,
      at: Date.now(),
    });
    await setDatabaseValue(client, getPlayerKey(guildId, uid), p);
  }
}

export async function handleSantaAttackBoss(client, identity, { mode = 'tap', toyId = null } = {}) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const today = getTodayKey();
  const now = Date.now();

  const key = `santa:boss:${guildId}`;
  const boss = await getServerBoss(client, guildId);

  if (boss.status === 'defeated') {
    return { ok: false, message: '🎉 Boss hôm nay đã bị cả server hạ gục rồi! Hẹn gặp lại ngày mai nha!', state: await buildSantaStatePayload(client, identity) };
  }
  if (boss.status === 'expired') {
    return { ok: false, message: '⏳ Đã hết 20 giờ đánh Boss hôm nay! Ngày mai quay lại chiến tiếp nhé!', state: await buildSantaStatePayload(client, identity) };
  }

  if (!player.bossDaily || player.bossDaily.date !== today) {
    player.bossDaily = { date: today, tap: 0, toy: 0 };
  }

  if (mode === 'toy') {
    if ((player.bossDaily.toy || 0) >= 2) {
      return { ok: false, message: 'Hôm nay bạn đã ném đồ chơi Boss đủ 2/2 lần rồi!', state: await buildSantaStatePayload(client, identity) };
    }
  } else {
    if ((player.bossDaily.tap || 0) >= 3) {
      return { ok: false, message: 'Hôm nay bạn đã đánh Boss thường đủ 3/3 lần rồi!', state: await buildSantaStatePayload(client, identity) };
    }
  }

  const coopMult = 1 + (Math.max(1, Math.min(10, Number(identity.partySize) || 1)) - 1) * 0.15;
  let dmg = Math.round((85 + (player.workshopLevel || 1) * 12) * coopMult);

  let thrownToyId = null;
  if (mode === 'toy') {
    const useToy = pickRandomAvailableToy(player, toyId);
    if (!useToy || Number(player.toys?.[useToy] || 0) < 1) {
      return { ok: false, message: 'Kho đồ chơi đang trống! Hãy chế tạo ít nhất 1 món đồ chơi để ném vào Boss!', state: await buildSantaStatePayload(client, identity) };
    }
    player.toys[useToy] = Math.max(0, Number(player.toys[useToy] || 0) - 1);
    thrownToyId = useToy;
    player.bossDaily.toy = (player.bossDaily.toy || 0) + 1;
    dmg = Math.round((320 + (player.workshopLevel || 1) * 25) * coopMult);
  } else {
    player.bossDaily.tap = (player.bossDaily.tap || 0) + 1;
    player.lastBossAttackAt = now;
  }

  boss.hp = Math.max(0, (boss.hp || 0) - dmg);
  boss.contributors = boss.contributors || {};
  boss.contributors[player.userId] = {
    username: player.username,
    dmg: (boss.contributors[player.userId]?.dmg || 0) + dmg,
  };

  player.reputation += mode === 'toy' ? 25 : 10;
  player.snowCoins += mode === 'toy' ? 30 : 12;

  const thrownRecipe = thrownToyId ? TOY_RECIPES.find((r) => r.id === thrownToyId) : null;
  let msg =
    mode === 'toy' && thrownToyId
      ? `🧸 Đã ném ${thrownRecipe?.icon || ''} ${thrownRecipe?.name || 'đồ chơi'} (còn ${player.toys[thrownToyId]} trong kho) gây **${dmg} sát thương** lên ${boss.icon} ${boss.name}!`
      : `⚔️ Gây **${dmg} sát thương** lên ${boss.icon} ${boss.name}!`;

  if (boss.hp <= 0) {
    const rewardCoins = 400 + (boss.level || 1) * 120;
    const teamCoins = 180 + (boss.level || 1) * 50;
    player.snowCoins += rewardCoins;
    player.luckyTickets = (player.luckyTickets || 0) + 3;
    player.reputation += 120;

    // Gửi thưởng đồng đội cho các thành viên khác đã tham gia đánh Boss hôm nay
    for (const uid of Object.keys(boss.contributors || {})) {
      if (String(uid) === String(player.userId)) continue;
      const mate = await getDatabaseValue(client, getPlayerKey(guildId, uid), null);
      if (!mate) continue;
      mate.snowCoins = (mate.snowCoins || 0) + teamCoins;
      mate.luckyTickets = (mate.luckyTickets || 0) + 1;
      mate.pendingGiftNotices = Array.isArray(mate.pendingGiftNotices) ? mate.pendingGiftNotices : [];
      mate.pendingGiftNotices.push({
        id: `boss_win_${Date.now().toString(36)}_${uid.slice(-4)}`,
        amount: teamCoins,
        fromName: 'Chiến Thắng Boss Server!',
        note: `Cả server đã hạ gục ${boss.name} (Lv.${boss.level})! Tặng bạn +${teamCoins} ❄️ & +1 🎟️!`,
        at: Date.now(),
      });
      await setDatabaseValue(client, getPlayerKey(guildId, uid), mate);
    }

    announceToDiscordChannel(
      client,
      guildId,
      `⛄💥 **BOSS SERVER ĐÃ BỊ HẠ GỤC!** <@${player.userId}> đã tung đòn kết liễu **${boss.name} (Lv.${boss.level})**, nhận rương thưởng **+${rewardCoins} ❄️ & +3 🎟️**! Các đồng đội tham gia đều được nhận **+${teamCoins} ❄️ & +1 🎟️**!`,
    );

    boss.level = (boss.level || 1) + 1;
    boss.defeatedCount = (boss.defeatedCount || 0) + 1;
    boss.status = 'defeated';
    boss.rewardsDistributed = true;
    msg = `🎉 HẠ GỤC BOSS THÀNH CÔNG! Nhận Rương Quà +${rewardCoins} ❄️, +3 🎟️ Vé Quay & +120 ⭐!`;
  }

  await setDatabaseValue(client, key, boss);
  await savePlayer(client, guildId, player);

  return {
    ok: true,
    damage: dmg,
    message: msg,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaExchangeMaterial(client, identity, { fromMat, toMat, mode = 'swap', amount = 1 } = {}) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);

  if (!MATERIALS[fromMat]) {
    return { ok: false, message: 'Nguyên liệu nguồn không hợp lệ!', state: await buildSantaStatePayload(client, identity) };
  }

  if (mode === 'sell') {
    if ((player.materials[fromMat] || 0) < 5) {
      return { ok: false, message: `Cần ít nhất 5 ${MATERIALS[fromMat].icon} để bán lấy 20 ❄️!`, state: await buildSantaStatePayload(client, identity) };
    }
    player.materials[fromMat] -= 5;
    player.snowCoins += 20;
    await savePlayer(client, guildId, player);
    return {
      ok: true,
      message: `🏪 Đã bán 5 ${MATERIALS[fromMat].icon} ${MATERIALS[fromMat].name} lấy +20 ❄️ Xu Tuyết!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  if (!MATERIALS[toMat] || fromMat === toMat) {
    return { ok: false, message: 'Hãy chọn loại nguyên liệu muốn đổi sang khác loại cũ!', state: await buildSantaStatePayload(client, identity) };
  }

  // amount là số lần đổi; chỉ cho phép các mốc nút đã định sẵn để tránh gửi số lượng tùy ý.
  const exchangeCount = [1, 20, 100].includes(Number(amount)) ? Number(amount) : 1;
  const ribbonExchange = fromMat === 'ribbon' || toMat === 'ribbon';
  const inputPerExchange = ribbonExchange ? (toMat === 'ribbon' ? 20 : 1) : 2;
  const outputPerExchange = ribbonExchange ? (fromMat === 'ribbon' ? 20 : 1) : 1;
  const required = inputPerExchange * exchangeCount;
  const received = outputPerExchange * exchangeCount;

  if ((player.materials[fromMat] || 0) < required) {
    return {
      ok: false,
      message: `Cần ${required.toLocaleString('vi-VN')} ${MATERIALS[fromMat].icon} ${MATERIALS[fromMat].name} để đổi!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  player.materials[fromMat] -= required;
  player.materials[toMat] = (player.materials[toMat] || 0) + received;
  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: `🏪 Đã đổi ${required.toLocaleString('vi-VN')} ${MATERIALS[fromMat].icon} → ${received.toLocaleString('vi-VN')} ${MATERIALS[toMat].icon} ${MATERIALS[toMat].name}!`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaOpenMysteryBox(client, identity) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const today = getTodayKey();
  const daily = player.mysteryBoxDaily || { date: today, count: 0 };
  const usedToday = daily.date === today ? Math.max(0, Number(daily.count) || 0) : 0;
  const remaining = Math.max(0, 3 - usedToday);
  const level = Math.max(1, Number(player.workshopLevel) || 1);
  const price = Math.round(150 * getWheelRewardMultiplier(level));

  if (usedToday >= 3) {
    return { ok: false, message: '🎁 Bạn đã mở đủ 3 Hộp Quà Bí Ẩn hôm nay! Hãy quay lại vào ngày mai nhé.', state: await buildSantaStatePayload(client, identity) };
  }
  if (player.snowCoins < price) {
    return { ok: false, message: `Cần ${price.toLocaleString('vi-VN')} ❄️ để mở Hộp Quà Bí Ẩn Noel (Xưởng Lv.${level})!`, state: await buildSantaStatePayload(client, identity) };
  }

  player.snowCoins -= price;
  player.mysteryBoxDaily = { date: today, count: usedToday + 1 };
  const roll = Math.random();
  let msg = '';

  if (roll < 0.3) {
    player.personalBuffExpiresAt = Date.now() + 10 * 60 * 1000;
    msg = '🎁 Trúng BUFF ĐỘC QUYỀN: x3 tốc độ sản xuất Idle trong 10 phút!';
  } else if (roll < 0.55) {
    player.materials.magicDust += 8;
    player.materials.ribbon += 8;
    msg = '🎁 Trúng Gói Nguyên Liệu Hiếm: +8 ✨ Bụi phép & +8 🎀 Ruy băng!';
  } else if (roll < 0.78) {
    player.luckyTickets = (player.luckyTickets || 0) + 3;
    msg = '🎁 Trúng +3 🎟️ Vé Quay Số May Mắn!';
  } else if (roll < 0.9 && !(player.ownedPets || []).includes('pet_penguin')) {
    player.ownedPets = player.ownedPets || [];
    player.ownedPets.push('pet_penguin');
    player.equippedPet = 'pet_penguin';
    msg = '🐧 SIÊU HIẾM! Bạn mở trúng Thú Cưng Bí Mật: Chim Cánh Cụt Hoàng Đế!';
  } else if (!(player.ownedSkins || []).includes('skin_knight')) {
    player.ownedSkins = player.ownedSkins || ['skin_classic'];
    player.ownedSkins.push('skin_knight');
    player.equippedSkin = 'skin_knight';
    msg = '🛡️ SIÊU HIẾM! Bạn mở trúng Skin Bí Mật: Hiệp Sĩ Băng Giá!';
  } else {
    player.snowCoins += 280;
    msg = '🎁 Trúng Túi Xu Tuyết Lớn: +280 ❄️!';
  }

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: `${msg} (Đã mở ${usedToday + 1}/3 hộp hôm nay, còn ${remaining - 1} lượt.)`,
    state: await buildSantaStatePayload(client, identity),
  };
}
export async function handleSantaFeedPet(client, identity, { mode = 'coins', toyId = null } = {}) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const petId = player.equippedPet;

  if (!petId) {
    return { ok: false, message: 'Hãy trang bị một Thú Cưng trước khi cho ăn nhé!', state: await buildSantaStatePayload(client, identity) };
  }

  player.petLevels = player.petLevels || {};
  const curLv = player.petLevels[petId] || 1;
  if (curLv >= 5) {
    return { ok: false, message: 'Thú Cưng này đã tiến hóa tối đa (Lv.5)!', state: await buildSantaStatePayload(client, identity) };
  }

  let fedToyId = null;
  if (mode === 'toy') {
    const useToy = pickRandomAvailableToy(player, toyId);
    if (!useToy || Number(player.toys?.[useToy] || 0) < 1) {
      return { ok: false, message: 'Kho đồ chơi đang trống! Hãy chế tạo ít nhất 1 món đồ chơi để cho thú cưng ăn!', state: await buildSantaStatePayload(client, identity) };
    }
    player.toys[useToy] = Math.max(0, Number(player.toys[useToy] || 0) - 1);
    fedToyId = useToy;
  } else {
    const cost = 150 * curLv;
    if (player.snowCoins < cost) {
      return { ok: false, message: `Cần ${cost} ❄️ Xu Tuyết để nâng cấp Thú Cưng lên Lv.${curLv + 1}!`, state: await buildSantaStatePayload(client, identity) };
    }
    player.snowCoins -= cost;
  }

  player.petLevels[petId] = curLv + 1;
  await savePlayer(client, guildId, player);

  const fedRecipe = fedToyId ? TOY_RECIPES.find((r) => r.id === fedToyId) : null;
  return {
    ok: true,
    message: fedToyId
      ? `🐾 Đã cho thú cưng ăn ${fedRecipe?.icon || ''} ${fedRecipe?.name || 'đồ chơi'} (còn ${player.toys[fedToyId]} trong kho)! Thú Cưng tiến hóa lên **Lv.${curLv + 1}/5**!`
      : `🐾 Tuyệt vời! Thú Cưng đã tiến hóa lên **Lv.${curLv + 1}/5** (nhặt quà Fever nhanh hơn)!`,
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaOpenAdvent(client, identity, dayNumber) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const today = getTodayKey();
  const opened = Array.isArray(player.adventOpened) ? player.adventOpened : [];
  const nextDay = opened.length + 1;
  const reqDay = Number(dayNumber) || nextDay;

  if (opened.includes(reqDay)) {
    return { ok: false, message: `Ô Ngày ${reqDay} bạn đã mở rồi!`, state: await buildSantaStatePayload(client, identity) };
  }
  if (reqDay !== nextDay || reqDay < 1 || reqDay > 24) {
    return { ok: false, message: `Hãy mở theo thứ tự — hôm nay tới lượt Ô Ngày ${nextDay}!`, state: await buildSantaStatePayload(client, identity) };
  }
  if (player.lastAdventDate === today) {
    return { ok: false, message: 'Hôm nay bạn đã mở 1 ô Lịch Quà Giáng Sinh rồi! Ngày mai quay lại mở tiếp nha 🎄', state: await buildSantaStatePayload(client, identity) };
  }

  player.adventOpened = [...opened, reqDay];
  player.lastAdventDate = today;

  const coins = 50 + reqDay * 25;
  const matBonus = 2 + Math.floor(reqDay / 4);
  player.snowCoins += coins;
  player.materials.wood += matBonus;
  player.materials.fabric += matBonus;
  player.materials.magicDust += Math.max(1, Math.floor(matBonus / 2));
  player.materials.ribbon += Math.max(1, Math.floor(matBonus / 2));

  let extra = '';
  if (reqDay === 12) {
    player.luckyTickets = (player.luckyTickets || 0) + 3;
    extra = ' & +3 🎟️ Vé Quay Số!';
  } else if (reqDay === 24) {
    player.luckyTickets = (player.luckyTickets || 0) + 5;
    player.personalBuffExpiresAt = Math.max(Date.now(), player.personalBuffExpiresAt || 0) + 30 * 60 * 1000;
    extra = ' & +5 🎟️ Vé Quay + Buff x3 (30 phút)!';
  } else if (reqDay % 5 === 0) {
    player.luckyTickets = (player.luckyTickets || 0) + 1;
    extra = ' & +1 🎟️ Vé Quay!';
  }

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: `📅 Mở Ô Ngày ${reqDay}/24! Nhận +${coins} ❄️ & +${matBonus} nguyên liệu${extra}`,
    state: await buildSantaStatePayload(client, identity),
  };
}


export async function grantSantaRibbon(client, { guildId = 'global', targetUser, amount, adminUser, note = '' }) {
  const safeAmount = Math.min(2000000, Math.max(1, Math.floor(Number(amount) || 0)));
  const player = await getOrCreateSantaPlayer(client, {
    userId: targetUser.id,
    username: targetUser.globalName || targetUser.username || 'Yêu Tinh Noel',
    avatarUrl: typeof targetUser.displayAvatarURL === 'function' ? targetUser.displayAvatarURL({ size: 128 }) : null,
    guildId,
  });

  player.materials = player.materials || {};
  player.materials.ribbon = (player.materials.ribbon || 0) + safeAmount;
  player.pendingMaterialGiftNotices = Array.isArray(player.pendingMaterialGiftNotices) ? player.pendingMaterialGiftNotices : [];
  player.pendingMaterialGiftNotices.push({
    id: `ribbon_gift_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    material: 'ribbon',
    amount: safeAmount,
    fromName: adminUser?.globalName || adminUser?.username || 'Admin',
    note: String(note || '').trim().slice(0, 140),
    at: Date.now(),
  });

  await savePlayer(client, guildId, player);
  return { ok: true, amount: safeAmount, player };
}
