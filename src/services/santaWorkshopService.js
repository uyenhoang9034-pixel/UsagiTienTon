import { getDatabaseValue, setDatabaseValue } from '../utils/database.js';
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
    price: 500,
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

const TREE_THRESHOLDS = [0, 150, 400, 800, 1500];

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
  { label: '+40 ❄️', color: '#e63946', type: 'coins', amount: 40 },
  { label: '+4 ✨', color: '#2a9d8f', type: 'magicDust', amount: 4 },
  { label: '+60 ⭐', color: '#457b9d', type: 'rep', amount: 60 },
  { label: '+80 ❄️', color: '#e76f51', type: 'coins', amount: 80 },
  { label: '+5 🌲🧶', color: '#2d6a4f', type: 'mats', amount: 5 },
  { label: '+120 ❄️', color: '#9b5de5', type: 'coins', amount: 120 },
  { label: '+2 🎟️', color: '#f4a261', type: 'tickets', amount: 2 },
  { label: 'JACKPOT 220❄️', color: '#d90429', type: 'jackpot', amount: 220 },
];

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

function getPlayerKey(guildId, userId) {
  return `santa:player:${guildId || 'global'}:${userId}`;
}

function getGuildSettingsKey(guildId) {
  return `santa:guild:${guildId}`;
}

function getLeaderboardKey(guildId) {
  return `santa:leaderboard:${guildId || 'global'}`;
}

function createOrder(workshopLevel = 1) {
  const customer = ORDER_CUSTOMERS[Math.floor(Math.random() * ORDER_CUSTOMERS.length)];
  const recipe = TOY_RECIPES[Math.floor(Math.random() * TOY_RECIPES.length)];
  const roll = Math.random();
  const isRush = roll < 0.25;
  const isSpecial = !isRush && roll < 0.5;
  const qty = workshopLevel >= 3 && Math.random() < 0.35 ? 2 : 1;
  const multiplier = isRush ? 2.0 : isSpecial ? 1.5 : 1.0;

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
    rewardCoins: Math.round(recipe.baseCoins * qty * multiplier),
    rewardRep: Math.round(recipe.baseRep * qty * multiplier),
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
    },
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

export function computePendingIdleMaterials(player, now = Date.now()) {
  const elapsedMs = Math.max(0, now - (player.lastCollectAt || now));
  const elapsedMinutes = Math.min(MAX_IDLE_MINUTES, elapsedMs / 60000);
  const levelMultiplier = 1 + (Math.max(1, player.workshopLevel || 1) - 1) * 0.35;
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
    const rate = meta.baseRatePerMin * levelMultiplier + (helperBonuses[key] || 0);
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

export function getHelperUpgradeCost(helperDef, currentLevel = 0) {
  return Math.round(helperDef.baseCost * Math.pow(1.55, Math.max(0, currentLevel)));
}

export function getUpgradeCost(level) {
  return Math.round(90 * Math.pow(1.6, Math.max(0, level - 1)));
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
      await ch.send(content).catch(() => {});
    }
  } catch {}
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

async function updateLeaderboard(client, guildId, player) {
  const key = getLeaderboardKey(guildId);
  const list = (await getDatabaseValue(client, key, [])) || [];
  const filtered = Array.isArray(list) ? list.filter((e) => String(e.userId) !== String(player.userId)) : [];
  filtered.push({
    userId: String(player.userId),
    username: player.username,
    avatarUrl: player.avatarUrl || null,
    reputation: player.reputation || 0,
    snowCoins: player.snowCoins || 0,
    workshopLevel: player.workshopLevel || 1,
    equippedFrame: player.equippedFrame || null,
  });
  filtered.sort((a, b) => (b.reputation - a.reputation) || (b.snowCoins - a.snowCoins));
  await setDatabaseValue(client, key, filtered.slice(0, 25));
}

export async function getSantaLeaderboard(client, guildId) {
  const list = await getDatabaseValue(client, getLeaderboardKey(guildId), []);
  return Array.isArray(list) ? list : [];
}

export async function getOrCreateSantaPlayer(client, { userId, username, avatarUrl, guildId = 'global' }) {
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
  const player = await getOrCreateSantaPlayer(client, identity);
  const today = getTodayKey();
  const riddle = getDailyRiddle(today);
  const idle = computePendingIdleMaterials(player);
  const leaderboard = await getSantaLeaderboard(client, guildId);
  const guildConfig = await getSantaGuildConfig(client, guildId);
  const serverTree = await getServerTree(client, guildId);

  return {
    player,
    idle,
    today,
    checkedInToday: player.lastCheckinDate === today,
    riddleSolvedToday: player.lastRiddleDate === today,
    riddle: {
      id: riddle.id,
      question: riddle.question,
      options: riddle.options,
    },
    upgradeCost: getUpgradeCost(player.workshopLevel || 1),
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
    serverTree,
    wheelSegments: WHEEL_SEGMENTS,
    recipes: TOY_RECIPES,
    shopItems: SHOP_ITEMS,
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
    const bonus = player.workshopLevel >= 4 ? 2 : 1;
    player.materials[picked] = (player.materials[picked] || 0) + bonus;
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

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: 'Chính xác! +55 ❄️, +15 ⭐ Danh vọng, +3 ✨ Bụi phép, +2 🎀 Ruy băng!',
    state: await buildSantaStatePayload(client, identity),
  };
}

export async function handleSantaCraft(client, identity, toyId) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);
  const recipe = TOY_RECIPES.find((r) => r.id === toyId);

  if (!recipe) {
    return { ok: false, message: 'Công thức đồ chơi không tồn tại!', state: await buildSantaStatePayload(client, identity) };
  }

  for (const [mat, req] of Object.entries(recipe.ingredients)) {
    if ((player.materials[mat] || 0) < req) {
      return {
        ok: false,
        message: `Thiếu ${MATERIALS[mat].icon} ${MATERIALS[mat].name} để chế tạo ${recipe.name}!`,
        state: await buildSantaStatePayload(client, identity),
      };
    }
  }

  for (const [mat, req] of Object.entries(recipe.ingredients)) {
    player.materials[mat] -= req;
  }
  player.toys[recipe.id] = (player.toys[recipe.id] || 0) + 1;
  player.totalCrafted = (player.totalCrafted || 0) + 1;

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    message: `Chế tạo thành công 1 ${recipe.icon} ${recipe.name}!`,
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
  if ((player.toys[order.toyId] || 0) < order.qty) {
    return {
      ok: false,
      message: `Bạn cần ${order.qty} ${recipe?.icon || ''} ${recipe?.name || ''} để giao đơn này!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  const tree = await getServerTree(client, guildId);
  const buffMult = tree.buffActive ? 2 : 1;

  player.toys[order.toyId] -= order.qty;
  const gainedCoins = order.rewardCoins * buffMult;
  player.snowCoins += gainedCoins;
  player.reputation += order.rewardRep;
  if (order.rewardTickets) {
    player.luckyTickets = (player.luckyTickets || 0) + order.rewardTickets;
  }
  player.totalDelivered = (player.totalDelivered || 0) + 1;
  player.orders.splice(idx, 1, createOrder(player.workshopLevel || 1));

  await savePlayer(client, guildId, player);
  const ticketNote = order.rewardTickets ? ` & +${order.rewardTickets} 🎟️` : '';
  const buffNote = buffMult > 1 ? ' (x2 Cây Thông!)' : '';
  return {
    ok: true,
    message: `Giao hàng cho ${order.customerIcon} ${order.customerName} thành công! Nhận +${gainedCoins} ❄️, +${order.rewardRep} ⭐${ticketNote}${buffNote}`,
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
  if (currentLv >= 10) {
    return { ok: false, message: `${helperDef.name} đã đạt cấp tối đa (Cấp 10)!`, state: await buildSantaStatePayload(client, identity) };
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
  if (currentLevel >= 10) {
    return { ok: false, message: 'Xưởng Yêu Tinh đã đạt cấp tối đa (Cấp 10)!', state: await buildSantaStatePayload(client, identity) };
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
  const item = SHOP_ITEMS.find((i) => i.id === itemId);

  if (!item) {
    return { ok: false, message: 'Vật phẩm không tồn tại!', state: await buildSantaStatePayload(client, identity) };
  }

  if (item.type === 'frame' && player.ownedFrames.includes(item.id)) {
    return { ok: false, message: 'Bạn đã sở hữu khung avatar này rồi!', state: await buildSantaStatePayload(client, identity) };
  }

  if (item.type === 'role' && player.hasEventRole) {
    return { ok: false, message: 'Bạn đã nhận Role Sự Kiện Noel rồi!', state: await buildSantaStatePayload(client, identity) };
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
    player.luckyTickets = (player.luckyTickets || 0) + 1;
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

export async function handleSantaSpinWheel(client, identity) {
  const guildId = identity.guildId || 'global';
  const player = await getOrCreateSantaPlayer(client, identity);

  if ((player.luckyTickets || 0) <= 0) {
    return {
      ok: false,
      message: 'Bạn đã hết Vé Quay Số! Hãy ghé Shop Giáng Sinh mua thêm nhé 🎟️',
      state: await buildSantaStatePayload(client, identity),
    };
  }

  player.luckyTickets -= 1;
  const wheelIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
  const seg = WHEEL_SEGMENTS[wheelIndex];
  let prizeText = seg.label;

  if (seg.type === 'coins') {
    player.snowCoins += seg.amount;
    prizeText = `+${seg.amount} ❄️ Xu Tuyết!`;
  } else if (seg.type === 'magicDust') {
    player.materials.magicDust += seg.amount;
    prizeText = `+${seg.amount} ✨ Bụi phép!`;
  } else if (seg.type === 'rep') {
    player.reputation += seg.amount;
    prizeText = `+${seg.amount} ⭐ Điểm Danh Vọng!`;
  } else if (seg.type === 'mats') {
    player.materials.wood += seg.amount;
    player.materials.fabric += seg.amount;
    prizeText = `+${seg.amount} 🌲 Gỗ thông & +${seg.amount} 🧶 Vải đỏ!`;
  } else if (seg.type === 'tickets') {
    player.luckyTickets += seg.amount;
    prizeText = `+${seg.amount} 🎟️ Vé Quay Số!`;
  } else if (seg.type === 'jackpot') {
    player.snowCoins += seg.amount;
    player.reputation += 40;
    prizeText = `JACKPOT! +${seg.amount} ❄️ Xu Tuyết & +40 ⭐ Danh Vọng!`;
    announceToDiscordChannel(
      client,
      guildId,
      `🎰 **JACKPOT ĐÊM NOEL!** Chúc mừng <@${player.userId}> vừa quay trúng **+${seg.amount} ❄️ Xu Tuyết** tại Vòng Quay Xưởng Quà Ông Già Noel!`,
    );
  }

  await savePlayer(client, guildId, player);
  return {
    ok: true,
    wheelIndex,
    prizeText,
    message: `🎡 Trúng thưởng: ${prizeText}`,
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
  player.likedToday = player.likedToday || {};

  if (action === 'gift') {
    const giftToy = toyId || Object.keys(player.toys || {}).find((k) => (player.toys[k] || 0) > 0);
    if (!giftToy || (player.toys[giftToy] || 0) < 1) {
      return { ok: false, message: 'Bạn cần có ít nhất 1 món đồ chơi trong kho để tặng bạn!', state: await buildSantaStatePayload(client, identity) };
    }
    player.toys[giftToy] -= 1;
    player.reputation += 15;
    friend.toys = friend.toys || {};
    friend.toys[giftToy] = (friend.toys[giftToy] || 0) + 1;
    friend.reputation = (friend.reputation || 0) + 15;

    await savePlayer(client, guildId, friend);
    await savePlayer(client, guildId, player);
    const recipe = TOY_RECIPES.find((r) => r.id === giftToy);
    return {
      ok: true,
      message: `🎁 Đã tặng ${recipe?.icon || ''} ${recipe?.name || 'đồ chơi'} cho ${friend.username}! Cả 2 nhận +15 ⭐!`,
      state: await buildSantaStatePayload(client, identity),
    };
  }

  if (player.likedToday[targetUserId] === today) {
    return { ok: false, message: `Hôm nay bạn đã thả tim giúp xưởng ${friend.username} rồi!`, state: await buildSantaStatePayload(client, identity) };
  }

  player.likedToday[targetUserId] = today;
  player.reputation += 10;
  friend.reputation = (friend.reputation || 0) + 10;
  friend.snowCoins = (friend.snowCoins || 0) + 15;

  await savePlayer(client, guildId, friend);
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
