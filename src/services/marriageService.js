import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

import {
  getMarriageKey,
  getMarriageRegistryKey,
} from '../utils/database/keys.js';

import { MARRIAGE_CONFIG, MARRY_EMOJIS, MARRY_RANK_EMOJIS } from '../config/marriageConfig.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

/**
 * Message Flag Discord Components V2
 */
export const IS_COMPONENTS_V2 = 1 << 15; // 32768

export const MARRIAGE_INTERACT_COOLDOWN_MS = MARRIAGE_CONFIG.interact.cooldownMs;
export const MARRIAGE_DAILY_COOLDOWN_MS = MARRIAGE_CONFIG.checkIn.cooldownMs;
export const MARRIAGE_GIFT_COOLDOWN_MS = MARRIAGE_CONFIG.gifts.cooldownMs;

export const LOVE_GIFTS = MARRIAGE_CONFIG.gifts.items;
export const LOVE_LEVELS = MARRIAGE_CONFIG.levels;

export function getLoveLevel(points = 0) {
  let matched = LOVE_LEVELS[0];
  for (const tier of LOVE_LEVELS) {
    if (points >= tier.min) {
      matched = tier;
    } else {
      break;
    }
  }
  return matched;
}

/**
 * Chuẩn hoá dữ liệu người dùng sang dạng hỗ trợ nhiều bạn đời (Đa thê đa phu / Hậu cung)
 */
export function normalizeUserMarriage(raw, userId) {
  if (!raw || typeof raw !== 'object') {
    return { userId, spouses: {} };
  }

  if (raw.spouses && typeof raw.spouses === 'object') {
    return {
      userId: raw.userId || userId,
      spouses: raw.spouses,
    };
  }

  // Tương thích ngược: nếu trước đó đã lưu dạng 1 bạn đời duy nhất
  if (raw.spouseId) {
    return {
      userId,
      spouses: {
        [raw.spouseId]: {
          spouseId: raw.spouseId,
          marriedAt: raw.marriedAt || Date.now(),
          lovePoints: raw.lovePoints || 100,
          bio: raw.bio || 'Bên nhau trọn đời!',
          ring: raw.ring || '💍 Nhẫn Ước Hẹn Vĩnh Cửu',
          lastInteractedAt: raw.lastInteractedAt || null,
          lastDailyAt: raw.lastDailyAt || null,
          lastGiftAt: raw.lastGiftAt || null,
          streak: raw.streak || 0,
          proposalMessage: raw.proposalMessage || '',
        },
      },
    };
  }

  return { userId, spouses: {} };
}

export async function getUserMarriage(client, guildId, userId) {
  if (!guildId || !userId) return { userId, spouses: {} };
  const key = getMarriageKey(guildId, userId);
  const raw = await getDatabaseValue(client, key, null);
  return normalizeUserMarriage(raw, userId);
}

export async function saveUserMarriage(client, guildId, userId, data) {
  const key = getMarriageKey(guildId, userId);
  await setDatabaseValue(client, key, data);
}

export function areMarried(user1Data, user2Id) {
  return Boolean(user1Data?.spouses?.[user2Id]);
}

export function getSpouseList(userData) {
  if (!userData?.spouses) return [];
  return Object.values(userData.spouses);
}

export function getCoupleKey(user1Id, user2Id) {
  return [String(user1Id), String(user2Id)].sort().join(':');
}

export async function createMarriage(client, guildId, user1Id, user2Id, options = {}) {
  if (!guildId || !user1Id || !user2Id) return false;

  const now = Date.now();
  const bio = (options.bio || 'Bên nhau trọn đời!').trim().slice(0, 120);
  const proposalMessage = (options.proposalMessage || '').trim().slice(0, 150);

  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const relationshipForU1 = {
    spouseId: user2Id,
    marriedAt: now,
    lovePoints: 100,
    bio,
    ring: '💍 Nhẫn Ước Hẹn Vĩnh Cửu',
    lastInteractedAt: null,
    lastDailyAt: null,
    lastGiftAt: null,
    streak: 0,
    proposalMessage,
  };

  const relationshipForU2 = {
    ...relationshipForU1,
    spouseId: user1Id,
  };

  u1.spouses[user2Id] = relationshipForU1;
  u2.spouses[user1Id] = relationshipForU2;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  // Cập nhật guild registry
  const registryKey = getMarriageRegistryKey(guildId);
  const currentRegistry = (await getDatabaseValue(client, registryKey, [])) || [];
  const coupleKey = getCoupleKey(user1Id, user2Id);

  const filtered = Array.isArray(currentRegistry)
    ? currentRegistry.filter((item) => item.coupleKey !== coupleKey)
    : [];

  filtered.push({
    coupleKey,
    user1Id,
    user2Id,
    marriedAt: now,
  });

  await setDatabaseValue(client, registryKey, filtered);
  return true;
}

export async function deleteMarriage(client, guildId, user1Id, user2Id) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const coupleData = u1.spouses[user2Id];
  if (!coupleData) return false;

  delete u1.spouses[user2Id];
  delete u2.spouses[user1Id];

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  // Xóa khỏi registry
  const registryKey = getMarriageRegistryKey(guildId);
  const currentRegistry = (await getDatabaseValue(client, registryKey, [])) || [];
  const coupleKey = getCoupleKey(user1Id, user2Id);

  if (Array.isArray(currentRegistry)) {
    const filtered = currentRegistry.filter((item) => item.coupleKey !== coupleKey);
    await setDatabaseValue(client, registryKey, filtered);
  }

  return coupleData;
}

export async function interactMarriage(client, guildId, user1Id, user2Id, actionType) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses[user2Id];
  const rel2 = u2.spouses[user1Id];

  if (!rel1 || !rel2) return { error: 'NOT_MARRIED' };

  const now = Date.now();
  const lastTime = Math.max(rel1.lastInteractedAt || 0, rel2.lastInteractedAt || 0);

  if (lastTime && now - lastTime < MARRIAGE_INTERACT_COOLDOWN_MS) {
    const remainingMs = MARRIAGE_INTERACT_COOLDOWN_MS - (now - lastTime);
    return {
      error: 'COOLDOWN',
      remainingMs,
      data: rel1,
    };
  }

  const pointGains = {
    hon: 25,
    om: 20,
    date: 30,
    tangqua: 35,
    xoadau: 20,
  };

  const gained = pointGains[actionType] || 20;
  const currentPoints = Math.max(rel1.lovePoints || 0, rel2.lovePoints || 0);
  const newPoints = currentPoints + gained;

  rel1.lovePoints = newPoints;
  rel1.lastInteractedAt = now;
  rel2.lovePoints = newPoints;
  rel2.lastInteractedAt = now;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  return {
    success: true,
    pointsGained: gained,
    totalPoints: newPoints,
    level: getLoveLevel(newPoints),
  };
}

export async function dailyLoveCheckIn(client, guildId, user1Id, user2Id) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses[user2Id];
  const rel2 = u2.spouses[user1Id];

  if (!rel1 || !rel2) return { error: 'NOT_MARRIED' };

  const now = Date.now();
  const lastDaily = Math.max(rel1.lastDailyAt || 0, rel2.lastDailyAt || 0);

  if (lastDaily && now - lastDaily < MARRIAGE_DAILY_COOLDOWN_MS) {
    const remainingMs = MARRIAGE_DAILY_COOLDOWN_MS - (now - lastDaily);
    return {
      error: 'COOLDOWN',
      remainingMs,
      data: rel1,
    };
  }

  // Tính chuỗi streak (nếu quá 36 tiếng không điểm danh thì đứt chuỗi)
  const oneDayAndHalf = 36 * 60 * 60 * 1000;
  let streak = rel1.streak || 0;
  if (lastDaily && now - lastDaily <= oneDayAndHalf) {
    streak += 1;
  } else {
    streak = 1;
  }

  const basePoints = 50;
  const streakBonus = Math.min(50, streak * 5); // Thưởng thêm tối đa +50 từ streak
  const totalGained = basePoints + streakBonus;

  const currentPoints = Math.max(rel1.lovePoints || 0, rel2.lovePoints || 0);
  const newPoints = currentPoints + totalGained;

  rel1.lovePoints = newPoints;
  rel1.lastDailyAt = now;
  rel1.streak = streak;

  rel2.lovePoints = newPoints;
  rel2.lastDailyAt = now;
  rel2.streak = streak;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  return {
    success: true,
    pointsGained: totalGained,
    basePoints,
    streakBonus,
    streak,
    totalPoints: newPoints,
    level: getLoveLevel(newPoints),
  };
}

export async function sendLoveGift(client, guildId, user1Id, user2Id, giftKey) {
  const gift = LOVE_GIFTS[giftKey];
  if (!gift) return { error: 'INVALID_GIFT' };

  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses[user2Id];
  const rel2 = u2.spouses[user1Id];

  if (!rel1 || !rel2) return { error: 'NOT_MARRIED' };

  const now = Date.now();
  const lastGift = Math.max(rel1.lastGiftAt || 0, rel2.lastGiftAt || 0);

  if (lastGift && now - lastGift < MARRIAGE_GIFT_COOLDOWN_MS) {
    const remainingMs = MARRIAGE_GIFT_COOLDOWN_MS - (now - lastGift);
    return {
      error: 'COOLDOWN',
      remainingMs,
      gift,
    };
  }

  const currentPoints = Math.max(rel1.lovePoints || 0, rel2.lovePoints || 0);
  const newPoints = currentPoints + gift.points;

  rel1.lovePoints = newPoints;
  rel1.lastGiftAt = now;
  rel2.lovePoints = newPoints;
  rel2.lastGiftAt = now;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  return {
    success: true,
    gift,
    pointsGained: gift.points,
    totalPoints: newPoints,
    level: getLoveLevel(newPoints),
  };
}

export async function updateMarriageBio(client, guildId, user1Id, user2Id, newBio) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses[user2Id];
  const rel2 = u2.spouses[user1Id];

  if (!rel1 || !rel2) return false;

  const cleanBio = newBio.trim().slice(0, 120);
  rel1.bio = cleanBio;
  rel2.bio = cleanBio;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);
  return true;
}

export async function addCoupleLovePoints(client, guildId, user1Id, user2Id, pointsToAdd) {
  const u1 = await getUserMarriage(client, guildId, user1Id);
  const u2 = await getUserMarriage(client, guildId, user2Id);

  const rel1 = u1.spouses?.[user2Id];
  const rel2 = u2.spouses?.[user1Id];

  if (!rel1 || !rel2) return null;

  const currentPoints = Math.max(rel1.lovePoints || 0, rel2.lovePoints || 0);
  const newPoints = currentPoints + pointsToAdd;

  rel1.lovePoints = newPoints;
  rel2.lovePoints = newPoints;

  await saveUserMarriage(client, guildId, user1Id, u1);
  await saveUserMarriage(client, guildId, user2Id, u2);

  return {
    totalPoints: newPoints,
    level: getLoveLevel(newPoints),
  };
}

export async function getTopMarriages(client, guildId, limit = 10) {
  const registryKey = getMarriageRegistryKey(guildId);
  const registry = (await getDatabaseValue(client, registryKey, [])) || [];
  if (!Array.isArray(registry) || registry.length === 0) return [];

  const results = [];
  const visitedCouples = new Set();

  for (const item of registry) {
    if (visitedCouples.has(item.coupleKey)) continue;
    visitedCouples.add(item.coupleKey);

    const u1 = await getUserMarriage(client, guildId, item.user1Id);
    const rel = u1.spouses?.[item.user2Id];

    if (rel) {
      results.push({
        user1Id: item.user1Id,
        user2Id: item.user2Id,
        marriedAt: rel.marriedAt || item.marriedAt,
        lovePoints: rel.lovePoints || 0,
        bio: rel.bio || '',
        ring: rel.ring || '💍 Nhẫn Ước Hẹn Vĩnh Cửu',
        level: getLoveLevel(rel.lovePoints || 0),
        streak: rel.streak || 0,
      });
    }
  }

  results.sort((a, b) => b.lovePoints - a.lovePoints);
  return results.slice(0, limit);
}

/**
 * =========================================================================
 * BỘ TẠO PAYLOAD DISCORD COMPONENTS V2 CHO TOÀN BỘ HỆ THỐNG KẾT HÔN
 * - Tuân thủ 100% chuẩn Discord Message Components V2 (flags: 32768)
 * - Sử dụng Container (type: 17) màu mặc định của Discord (không có accent_color viền hồng)
 * - Toàn bộ title chuẩn định dạng: (trangtrig2) **TITLE** (trangtrig3)
 * =========================================================================
 */

/**
 * 1. Payload V2 gửi lời cầu hôn (/marry cauhon)
 */
export function buildProposalPayloadV2({
  targetId,
  authorId,
  proposalMessage = '',
  acceptBtnId,
  declineBtnId,
  avatarUrl,
}) {
  const proposalRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(acceptBtnId)
      .setLabel(MARRIAGE_CONFIG.proposal.buttonAccept.label)
      .setEmoji(MARRIAGE_CONFIG.proposal.buttonAccept.emoji)
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(declineBtnId)
      .setLabel(MARRIAGE_CONFIG.proposal.buttonDecline.label)
      .setEmoji(MARRIAGE_CONFIG.proposal.buttonDecline.emoji)
      .setStyle(ButtonStyle.Danger),
  );

  const descContent = MARRIAGE_CONFIG.proposal.embedDescription(
    authorId,
    targetId,
    proposalMessage,
  );

  const containerComponents = [
    {
      type: 10,
      content: MARRIAGE_CONFIG.proposal.embedTitle,
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: MARRIAGE_CONFIG.proposal.embedContent(targetId, authorId),
    },
  ];

  if (avatarUrl) {
    containerComponents.push({
      type: 9,
      components: [
        {
          type: 10,
          content: descContent,
        },
      ],
      accessory: {
        type: 11,
        media: {
          url: avatarUrl,
        },
        description: 'Avatar',
      },
    });
  } else {
    containerComponents.push({
      type: 10,
      content: descContent,
    });
  }

  containerComponents.push(
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: MARRIAGE_CONFIG.proposal.embedFooter,
    },
    proposalRow.toJSON(),
  );

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: containerComponents,
      },
    ],
  };
}

/**
 * 2. Payload V2 chúc mừng hôn lễ thành công
 */
export function buildWeddingSuccessPayloadV2({
  authorId,
  targetId,
  gifUrl = MARRIAGE_CONFIG.images.weddingGif,
}) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingSuccessTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingSuccessContent,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingSuccessDescription(authorId, targetId),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 12,
            items: [
              {
                media: {
                  url: gifUrl,
                },
                description: 'Hôn Lễ Thành Công',
              },
            ],
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingSuccessFooter,
          },
        ],
      },
    ],
  };
}

/**
 * 3. Payload V2 lời cầu hôn bị từ chối
 */
export function buildWeddingDeclinedPayloadV2({ authorId, targetId }) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingDeclinedTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingDeclinedDescription(authorId, targetId),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingDeclinedFooter,
          },
        ],
      },
    ],
  };
}

/**
 * 4. Payload V2 lời cầu hôn hết hạn 20 phút
 */
export function buildWeddingTimeoutPayloadV2({ authorId, targetId }) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingTimeoutTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.proposal.weddingTimeoutDescription(authorId, targetId),
          },
        ],
      },
    ],
  };
}

/**
 * 5. Payload V2 xem danh sách hậu cung (/marry xem)
 */
export function buildHaremPayloadV2({ targetUser, spouseList }) {
  const haremLines = spouseList.map((rel, index) => {
    const levelInfo = getLoveLevel(rel.lovePoints || 0);
    const daysTogether = Math.max(1, Math.floor((Date.now() - rel.marriedAt) / 86400000));
    return MARRIAGE_CONFIG.profile.formatHaremItem(index, rel, levelInfo, daysTogether);
  });

  const username = targetUser?.username || targetUser?.tag || 'bạn';
  const avatarUrl = targetUser?.displayAvatarURL ? targetUser.displayAvatarURL({ dynamic: true }) : null;
  const content =
    haremLines.join('\n\n') +
    `\n\n💡 *Mẹo: Dùng \`/marry xem thanhvien:@${username} bandoi:@tên_bạn_đời\` để xem Giấy Chứng Nhận Kết Hôn chi tiết nhé!*`;

  const containerComponents = [
    {
      type: 10,
      content: MARRIAGE_CONFIG.profile.haremTitle,
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
  ];

  if (avatarUrl) {
    containerComponents.push({
      type: 9,
      components: [
        {
          type: 10,
          content,
        },
      ],
      accessory: {
        type: 11,
        media: {
          url: avatarUrl,
        },
        description: `Avatar ${username}`,
      },
    });
  } else {
    containerComponents.push({
      type: 10,
      content,
    });
  }

  containerComponents.push(
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: MARRIAGE_CONFIG.profile.haremFooter,
    },
  );

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: containerComponents,
      },
    ],
  };
}

/**
 * 6. Payload V2 Giấy Chứng Nhận Kết Hôn (/marry xem)
 */
export function buildCertPayloadV2({ targetUser, spouseId, targetSpouseRel }) {
  const marriedTimestamp = Math.floor(targetSpouseRel.marriedAt / 1000);
  const daysTogether = Math.max(1, Math.floor((Date.now() - targetSpouseRel.marriedAt) / 86400000));
  const levelInfo = getLoveLevel(targetSpouseRel.lovePoints || 0);
  const username = targetUser?.username || targetUser?.tag || 'bạn';
  const avatarUrl = targetUser?.displayAvatarURL ? targetUser.displayAvatarURL({ dynamic: true }) : null;

  const desc = MARRIAGE_CONFIG.profile.certDescription(
    targetUser.id,
    spouseId,
    targetSpouseRel.bio,
  );

  const containerComponents = [
    {
      type: 10,
      content: MARRIAGE_CONFIG.profile.certTitle,
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
  ];

  if (avatarUrl) {
    containerComponents.push({
      type: 9,
      components: [
        {
          type: 10,
          content: desc,
        },
      ],
      accessory: {
        type: 11,
        media: {
          url: avatarUrl,
        },
        description: `Avatar ${username}`,
      },
    });
  } else {
    containerComponents.push({
      type: 10,
      content: desc,
    });
  }

  const fieldsContent =
    `<a:heartg1:1545307544808071258> **Ngày Thành Hôn:** <t:${marriedTimestamp}:D> (<t:${marriedTimestamp}:R>)\n` +
    `<a:heartg1:1545307544808071258> **Thời Gian Bên Nhau:** ${daysTogether} ngày hạnh phúc\n` +
    `<a:trangtrig46:1547240249761996812> **Điểm Thân Mật:** ${(targetSpouseRel.lovePoints || 0).toLocaleString()} điểm\n` +
    `<a:heartg1:1545307544808071258> **Cấp Bậc Tình Yêu:** ${levelInfo.icon} **${levelInfo.name}** *(Danh hiệu: ${levelInfo.title})*\n` +
    `<a:trangtrig45:1547239010190237819> **Chuỗi Điểm Danh:** ${targetSpouseRel.streak || 0} ngày liên tục`;

  containerComponents.push(
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: fieldsContent,
    },
    {
      type: 14,
      divider: true,
      spacing: 1,
    },
    {
      type: 10,
      content: MARRIAGE_CONFIG.profile.certFooter,
    },
  );

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: containerComponents,
      },
    ],
  };
}

/**
 * 7. Payload V2 thông báo chưa kết hôn (/marry xem)
 */
export function buildSinglePayloadV2(isSelf, targetId) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: isSelf
              ? MARRIAGE_CONFIG.profile.singleSelf
              : MARRIAGE_CONFIG.profile.singleOther(targetId),
          },
        ],
      },
    ],
  };
}

/**
 * 8. Payload V2 Tương tác hâm nóng tình cảm (/marry tuongtac)
 */
export function buildInteractPayloadV2({ quote, pointsGained, totalPoints, level }) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.interact.embedTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              `${quote}\n\n` +
              `> <:jz1:1546149460751552572> Hai bạn được cộng **+${pointsGained} <a:trangtrig46:1547240249761996812> Điểm Thân Mật**!\n` +
              `> <:jz1:1546149460751552572> Tổng điểm hiện tại: **${totalPoints.toLocaleString()}** điểm (${level.icon} ${level.name})`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.interact.embedFooter,
          },
        ],
      },
    ],
  };
}

/**
 * 9. Payload V2 Điểm danh uyên ương hàng ngày (/marry diemdanh)
 */
export function buildCheckInPayloadV2({
  u1,
  u2,
  gained,
  base,
  streakBonus,
  streak,
  total,
  levelName,
}) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.checkIn.embedTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.checkIn.description(
              u1,
              u2,
              gained,
              base,
              streakBonus,
              streak,
              total,
              levelName,
            ),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.checkIn.embedFooter,
          },
        ],
      },
    ],
  };
}

/**
 * 10. Payload V2 Tặng quà tình yêu (/marry tangqua)
 */
export function buildGiftPayloadV2({
  userId,
  spouseId,
  gift,
  pointsGained,
  totalPoints,
  level,
}) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.gifts.embedTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content:
              `<@${userId}> đã gửi tặng đến <@${spouseId}> một món quà ngọt ngào!\n\n` +
              `${gift.icon} **${gift.name}** (+${pointsGained} <a:trangtrig46:1547240249761996812>): *${gift.desc}*\n\n` +
              `> <:jz1:1546149460751552572> Nhận ngay: **+${pointsGained} <a:trangtrig46:1547240249761996812> Điểm Thân Mật**!\n` +
              `> <:jz1:1546149460751552572> Tổng Điểm Thân Mật: **${totalPoints.toLocaleString()}** điểm (${level.icon} ${level.name})`,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.gifts.embedFooter,
          },
        ],
      },
    ],
  };
}

/**
 * 11. Payload V2 Cập nhật lời thề ước (/marry loinhac)
 */
export function buildVowsPayloadV2(spouseId, newBio) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.vows.title,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.vows.success(spouseId, newBio),
          },
        ],
      },
    ],
  };
}

/**
 * 12. Payload V2 Xác nhận ly hôn (/marry lyhon)
 */
export function buildDivorceConfirmPayloadV2(spouseId, confirmBtnId, cancelBtnId) {
  const divorceRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(confirmBtnId)
      .setLabel(MARRIAGE_CONFIG.divorce.buttonConfirm.label)
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(cancelBtnId)
      .setLabel(MARRIAGE_CONFIG.divorce.buttonCancel.label)
      .setEmoji(MARRIAGE_CONFIG.divorce.buttonCancel.emoji)
      .setStyle(ButtonStyle.Secondary),
  );

  return {
    flags: MessageFlags.Ephemeral | IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.divorce.confirmTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.divorce.confirmDescription(spouseId),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.divorce.confirmFooter,
          },
          divorceRow.toJSON(),
        ],
      },
    ],
  };
}

/**
 * 13. Payload V2 Thông báo kết thúc hôn nhân khi ly hôn thành công
 */
export function buildDivorceAnnouncementPayloadV2(authorId, spouseId) {
  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.divorce.announcementTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.divorce.announcementDescription(authorId, spouseId),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.divorce.announcementFooter,
          },
        ],
      },
    ],
  };
}

/**
 * 14. Payload V2 Bảng Vàng Couple (/marry bxh)
 * - Đổi emoji trái tim đỏ giữa 2 tên nhân vật thành <a:heartg7:1567818322718761100>
 * - Số trước mỗi couple đổi thành emoji số (1-5)
 * - Chỉ hiện tối đa 5 couple điểm cao nhất
 */
export function buildLeaderboardPayloadV2(topList = []) {
  if (!topList || topList.length === 0) {
    return {
      flags: IS_COMPONENTS_V2,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: MARRIAGE_CONFIG.leaderboard.embedTitle,
            },
            {
              type: 14,
              divider: true,
              spacing: 1,
            },
            {
              type: 10,
              content: MARRIAGE_CONFIG.leaderboard.emptyMessage,
            },
          ],
        },
      ],
    };
  }

  const heartEmoji = MARRY_EMOJIS.HEART_BXH;
  const displayList = topList.slice(0, 5);

  const lines = displayList.map((item, index) => {
    const rankEmoji = MARRY_RANK_EMOJIS[index] || `#${index + 1}`;
    const daysTogether = Math.max(1, Math.floor((Date.now() - item.marriedAt) / 86400000));
    return (
      `${rankEmoji} **<@${item.user1Id}>** ${heartEmoji} **<@${item.user2Id}>**\n` +
      `> <a:trangtrig46:1547240249761996812> **${item.lovePoints.toLocaleString()}** điểm · ${item.level.icon} *${item.level.name}* (${item.level.title}) · **${daysTogether}** ngày bên nhau (<a:trangtrig45:1547239010190237819> Chuỗi: **${item.streak || 0}** ngày)`
    );
  });

  return {
    flags: IS_COMPONENTS_V2,
    components: [
      {
        type: 17,
        components: [
          {
            type: 10,
            content: MARRIAGE_CONFIG.leaderboard.embedTitle,
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: lines.join('\n\n'),
          },
          {
            type: 14,
            divider: true,
            spacing: 1,
          },
          {
            type: 10,
            content: MARRIAGE_CONFIG.leaderboard.embedFooter,
          },
        ],
      },
    ],
  };
}
