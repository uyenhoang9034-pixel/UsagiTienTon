/**
 * prismHandler.js
 * Quản lý toàn bộ nghiệp vụ, cơ sở dữ liệu PostgreSQL và tương tác cho "Sắc Màu Định Mệnh".
 * Đã nâng cấp:
 * - Hệ thống Xu Cầu Vồng & Rớt đồ kỷ niệm (Loot Drop 10% / 5% / 2%)
 * - Bùa Hộ Mệnh (chặn trừ điểm) & Xúc Xắc May Mắn (x2 / x3 điểm)
 * - Túi đồ cá nhân & Tặng quà cho Crush
 * - Tiệm Tạp Hóa Sắc Màu & Hộp Mù Bí Ẩn
 * - Nhiệm Vụ Ngày (Daily Quests tự động reset)
 */

import { ChannelType, MessageFlags } from 'discord.js';
import { pgDb } from '../utils/database.js';
import { logger } from '../utils/logger.js';
import {
  IDENTITY_PROFILES,
  PRISM_ITEMS,
  STORY_SCENARIOS,
  OUTFIT_THEMES,
  OUTFIT_TOPS,
  OUTFIT_BOTTOMS,
  OUTFIT_ACCESSORIES,
  OUTFIT_FRIEND_PRAISES,
  CRUSH_MESSAGES,
  CRUSH_BRANCHES,
  CRUSH_GIFT_REACTIONS,
  RAINBOW_STREET_EVENTS,
  calculatePointChanges,
  randomRange,
  rollLootDrop,
  openMysteryBox,
  getOrGenerateDailyQuests,
  formatWithIdentity,
  formatPointChanges,
  PRISM_EMOJIS,
} from '../data/prismData.js';
import {
  IS_COMPONENTS_V2,
  buildPrismClaimSuccessPayload,
  buildPrismIdentitySelectPayload,
  buildPrismHubPayload,
  buildPrismStoryPayload,
  buildPrismStoryResultPayload,
  buildPrismOutfitPayload,
  buildPrismOutfitResultPayload,
  buildPrismChatPayload,
  buildPrismCrushModal,
  buildPrismChatResultPayload,
  buildPrismSpinPayload,
  buildPrismSpinResultPayload,
  buildPrismBagPayload,
  buildPrismShopPayload,
  buildPrismQuestsPayload,
  buildPrismLeaderboardPayload,
} from './prismUI.js';

export const PRISM_ROLE_ID = process.env.PRISM_ROLE_ID || '1571137417250078791';
export const PRISM_CHANNEL_ID = process.env.PRISM_CHANNEL_ID || '1571146973522821202';

let isTableInitialized = false;

/**
 * Lấy đối tượng PostgreSQL pool
 */
async function getPool() {
  if (!pgDb.pool) {
    try {
      await pgDb.connect();
    } catch (err) {
      logger.error('[Prism] Failed to connect to pgDb:', err);
    }
  }
  return pgDb.pool;
}

/**
 * Tự động khởi tạo bảng prism_players và tự động ALTER TABLE bổ sung các cột mới nếu chưa có
 */
export async function ensurePrismTable() {
  if (isTableInitialized) return;
  try {
    const pool = await getPool();
    if (!pool) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS prism_players (
        user_id VARCHAR(32) PRIMARY KEY,
        thread_id VARCHAR(32) UNIQUE,
        hub_message_id VARCHAR(32),
        identity_key VARCHAR(32),
        slay_points INT DEFAULT 0,
        heart_points INT DEFAULT 0,
        rebel_points INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Tự động bổ sung các cột mới nếu chưa tồn tại
    await pool.query(`
      ALTER TABLE prism_players ADD COLUMN IF NOT EXISTS rainbow_coins INT DEFAULT 0;
      ALTER TABLE prism_players ADD COLUMN IF NOT EXISTS inventory JSONB DEFAULT '{}'::jsonb;
      ALTER TABLE prism_players ADD COLUMN IF NOT EXISTS active_buffs JSONB DEFAULT '{"amulet": 0, "dice": 0}'::jsonb;
      ALTER TABLE prism_players ADD COLUMN IF NOT EXISTS daily_quests JSONB DEFAULT '{}'::jsonb;
    `);

    isTableInitialized = true;
    logger.info('[Prism] Table prism_players verified & upgraded with new columns.');
  } catch (error) {
    logger.error('[Prism] ensurePrismTable error:', error);
  }
}

/**
 * Lấy thông tin người chơi từ DB
 */
export async function getPrismPlayer(userId) {
  await ensurePrismTable();
  const pool = await getPool();
  if (!pool) return null;
  const res = await pool.query('SELECT * FROM prism_players WHERE user_id = $1 LIMIT 1', [userId]);
  return res.rows[0] || null;
}

/**
 * Âm thầm cập nhật tin nhắn Bảng Game Tổng Hợp gốc trong Thread
 */
export async function updateHubMessage(client, threadId, hubMessageId, playerRecord) {
  try {
    if (!threadId || !hubMessageId || !playerRecord) return;
    const thread = await client.channels.fetch(threadId).catch(() => null);
    if (!thread || !thread.isThread?.()) return;

    const hubMsg = await thread.messages.fetch(hubMessageId).catch(() => null);
    if (!hubMsg) return;

    const payload = buildPrismHubPayload(playerRecord);
    await hubMsg.edit(payload).catch((err) => {
      logger.warn(`[Prism] Failed to silently update hub message: ${err.message}`);
    });
  } catch (error) {
    logger.error('[Prism] updateHubMessage error:', error);
  }
}

/**
 * Cập nhật tiến độ nhiệm vụ ngày trong object quests
 */
function updateQuestProgressInternal(storedQuests, actionType) {
  const questData = getOrGenerateDailyQuests(storedQuests);
  let changed = false;

  for (const q of questData.quests) {
    if (q.action === actionType && q.progress < q.target) {
      q.progress = Math.min(q.target, q.progress + 1);
      changed = true;
    }
  }

  return { questData, changed };
}

/**
 * Xử lý tính điểm chung sau mỗi lượt mini-game:
 * 1. Kiểm tra Buff (Xúc Xắc May Mắn x2/x3 điểm cộng, Bùa Hộ Mệnh chặn trừ điểm)
 * 2. Thưởng Xu Cầu Vồng (+10 đến +25 Xu)
 * 3. Tỷ lệ Rớt Đồ Kỷ Niệm (10% Thường, 5% Hiếm, 2% Cực Hiếm)
 * 4. Cập nhật tiến độ Nhiệm vụ ngày
 * 5. Lưu vào Database và trả về thông tin đầy đủ
 */
async function processGameEndRewards(player, rawPointChanges, questType, client) {
  const pool = await getPool();
  const userId = player.user_id;

  const buffs = { ...(player.active_buffs || { amulet: 0, dice: 0 }) };
  const inv = { ...(player.inventory || {}) };

  let diceMultiplier = 1;
  let amuletTriggered = false;

  // 1. Kiểm tra Xúc Xắc May Mắn (dice > 0)
  if (buffs.dice > 0) {
    diceMultiplier = Math.random() < 0.5 ? 2 : 3;
    buffs.dice -= 1;
  }

  // 2. Tính điểm cuối cùng
  const finalPoints = { slay: rawPointChanges.slay || 0, heart: rawPointChanges.heart || 0, rebel: rawPointChanges.rebel || 0 };

  // Nhân điểm cộng nếu có xúc xắc
  if (diceMultiplier > 1) {
    if (finalPoints.slay > 0) finalPoints.slay *= diceMultiplier;
    if (finalPoints.heart > 0) finalPoints.heart *= diceMultiplier;
    if (finalPoints.rebel > 0) finalPoints.rebel *= diceMultiplier;
  }

  // Kiểm tra Bùa Hộ Mệnh nếu có điểm bị trừ
  const hasNegative = finalPoints.slay < 0 || finalPoints.heart < 0 || finalPoints.rebel < 0;
  if (hasNegative && buffs.amulet > 0) {
    amuletTriggered = true;
    buffs.amulet -= 1;
    if (finalPoints.slay < 0) finalPoints.slay = 0;
    if (finalPoints.heart < 0) finalPoints.heart = 0;
    if (finalPoints.rebel < 0) finalPoints.rebel = 0;
  }

  // 3. Thưởng Xu Cầu Vồng (+10 ~ +25)
  const coinsGained = randomRange(10, 25);

  // 4. Tỷ lệ rớt đồ kỷ niệm
  const lootDropped = rollLootDrop();
  if (lootDropped) {
    inv[lootDropped.itemKey] = (inv[lootDropped.itemKey] || 0) + 1;
  }

  // 5. Cập nhật nhiệm vụ ngày
  const { questData } = updateQuestProgressInternal(player.daily_quests, questType);

  // 6. Ghi vào PostgreSQL
  const res = await pool.query(
    `
      UPDATE prism_players
      SET slay_points = GREATEST(0, slay_points + $1),
          heart_points = GREATEST(0, heart_points + $2),
          rebel_points = GREATEST(0, rebel_points + $3),
          rainbow_coins = rainbow_coins + $4,
          inventory = $5::jsonb,
          active_buffs = $6::jsonb,
          daily_quests = $7::jsonb
      WHERE user_id = $8
      RETURNING *;
    `,
    [
      finalPoints.slay,
      finalPoints.heart,
      finalPoints.rebel,
      coinsGained,
      JSON.stringify(inv),
      JSON.stringify(buffs),
      JSON.stringify(questData),
      userId,
    ],
  );

  const updatedPlayer = res.rows[0];

  // Âm thầm cập nhật lại Bảng Game Tổng Hợp
  if (updatedPlayer?.thread_id && updatedPlayer?.hub_message_id) {
    updateHubMessage(client, updatedPlayer.thread_id, updatedPlayer.hub_message_id, updatedPlayer);
  }

  return {
    updatedPlayer,
    finalPoints,
    diceMultiplier,
    amuletTriggered,
    coinsGained,
    lootDropped,
  };
}

/**
 * BƯỚC 2: Xử lý khi user bấm nút "Nhận Role" (customId: prism_claim_role)
 */
export async function handlePrismClaimRole(interaction, client) {
  await ensurePrismTable();
  const guild = interaction.guild;
  const user = interaction.user;
  const member = interaction.member;

  // 1. Cấp Role Game
  if (PRISM_ROLE_ID && member && !member.roles.cache.has(PRISM_ROLE_ID)) {
    await member.roles.add(PRISM_ROLE_ID).catch((err) => {
      logger.warn(`[Prism] Could not grant role ${PRISM_ROLE_ID} to ${user.id}: ${err.message}`);
    });
  }

  // 2. Kiểm tra Private Thread đã có chưa và còn tồn tại không
  const existingPlayer = await getPrismPlayer(user.id);
  let thread = null;

  if (existingPlayer?.thread_id) {
    thread = await guild.channels.fetch(existingPlayer.thread_id).catch(() => null);
  }

  // Nếu thread chưa có hoặc đã bị xóa -> Tạo Private Thread mới trong kênh chỉ định
  if (!thread) {
    let targetChannel = interaction.channel;
    if (PRISM_CHANNEL_ID) {
      const designated = await guild.channels.fetch(PRISM_CHANNEL_ID).catch(() => null);
      if (designated && typeof designated.threads?.create === 'function') {
        targetChannel = designated;
      }
    }

    thread = await targetChannel.threads.create({
      name: `sắc-màu-${user.username}`,
      type: ChannelType.PrivateThread,
      invitable: false,
      reason: `Khu vực chơi game Sắc Màu Định Mệnh riêng tư cho ${user.tag}`,
    });

    // Kéo duy nhất user vào thread
    await thread.members.add(user.id).catch((err) => {
      logger.warn(`[Prism] Could not add user ${user.id} to thread: ${err.message}`);
    });

    // Gửi Màn Hình Chọn Vai cố định vào trong thread
    const hubMsg = await thread.send(buildPrismIdentitySelectPayload('pansexual'));

    // Lưu thread_id và hub_message_id vào DB
    const pool = await getPool();
    if (pool) {
      await pool.query(
        `
          INSERT INTO prism_players (user_id, thread_id, hub_message_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id) DO UPDATE SET
            thread_id = EXCLUDED.thread_id,
            hub_message_id = EXCLUDED.hub_message_id;
        `,
        [user.id, thread.id, hubMsg.id],
      );
    }
  }

  // 3. Phản hồi tin nhắn ẩn Ephemeral tại kênh sảnh dẫn link tới Private Thread
  const payload = buildPrismClaimSuccessPayload(PRISM_ROLE_ID, thread.id, guild.id);
  return interaction.reply(payload);
}

/**
 * BƯỚC 3: Chọn bản dạng từ StringSelectMenu (customId: prism_select_identity)
 */
export async function handlePrismSelectIdentity(interaction) {
  const selectedKey = interaction.values?.[0] || 'pansexual';
  const payload = buildPrismIdentitySelectPayload(selectedKey);
  return interaction.update(payload);
}

/**
 * BƯỚC 3: Bấm nút "Bắt Đầu Hành Trình" (customId: prism_start_journey:selectedKey)
 */
export async function handlePrismStartJourney(interaction, client, args) {
  await ensurePrismTable();
  const selectedKey = args?.[0] || 'pansexual';
  const profile = IDENTITY_PROFILES[selectedKey] || IDENTITY_PROFILES.pansexual;
  const userId = interaction.user.id;

  const player = await getPrismPlayer(userId);
  if (player?.identity_key) {
    // Đã chọn vai từ trước -> chuyển sang Bảng Game Tổng Hợp
    return interaction.update(buildPrismHubPayload(player));
  }

  const pool = await getPool();
  if (pool) {
    await pool.query(
      `
        UPDATE prism_players
        SET identity_key = $1,
            slay_points = slay_points + $2,
            heart_points = heart_points + $3,
            rebel_points = rebel_points + $4
        WHERE user_id = $5;
      `,
      [
        selectedKey,
        profile.initialPoints.slay,
        profile.initialPoints.heart,
        profile.initialPoints.rebel,
        userId,
      ],
    );
  }

  const updatedPlayer = await getPrismPlayer(userId);
  return interaction.update(buildPrismHubPayload(updatedPlayer));
}

/**
 * BƯỚC 4: Các nút bấm trên Bảng Game Tổng Hợp (Mở tin nhắn ẩn Ephemeral)
 */
export async function handlePrismHubAction(interaction, client, action) {
  await ensurePrismTable();
  const userId = interaction.user.id;
  const player = await getPrismPlayer(userId);

  if (!player || !player.identity_key) {
    return interaction.reply({
      flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
      components: [
        {
          type: 17,
          components: [
            {
              type: 10,
              content: 'Bạn cần bấm chọn một Bản dạng giới trước khi bước vào các hoạt động!',
            },
          ],
        },
      ],
    });
  }

  // Mini-game 1: Tình Huống Khó Đỡ
  if (action === 'prism_mg_story') {
    const scenarioIdx = Math.floor(Math.random() * STORY_SCENARIOS.length);
    return interaction.reply(buildPrismStoryPayload(scenarioIdx, player));
  }

  // Mini-game 2: Sàn Diễn Outfit
  if (action === 'prism_mg_outfit') {
    const themeIdx = Math.floor(Math.random() * OUTFIT_THEMES.length);
    return interaction.reply(buildPrismOutfitPayload(themeIdx, 0, 0, 0, player));
  }

  // Mini-game 3: Chat Chit Cùng Crush
  if (action === 'prism_mg_chat') {
    const messageIdx = Math.floor(Math.random() * CRUSH_MESSAGES.length);
    return interaction.reply(buildPrismChatPayload(messageIdx, CRUSH_MESSAGES[messageIdx], player));
  }

  // Mini-game 4: Vòng Quay Định Mệnh
  if (action === 'prism_mg_spin') {
    return interaction.reply(buildPrismSpinPayload(player));
  }

  // Tính năng 5: Túi Đồ
  if (action === 'prism_bag') {
    return interaction.reply(buildPrismBagPayload(player));
  }

  // Tính năng 6: Cửa Hàng
  if (action === 'prism_shop') {
    return interaction.reply(buildPrismShopPayload(player));
  }

  // Tính năng 7: Nhiệm Vụ Ngày
  if (action === 'prism_quests') {
    const questData = getOrGenerateDailyQuests(player.daily_quests);
    if (!player.daily_quests || player.daily_quests.date !== questData.date) {
      const pool = await getPool();
      if (pool) {
        await pool.query('UPDATE prism_players SET daily_quests = $1::jsonb WHERE user_id = $2', [
          JSON.stringify(questData),
          player.user_id,
        ]);
        player.daily_quests = questData;
      }
    }
    return interaction.reply(buildPrismQuestsPayload(player, questData));
  }

  // Xem Điểm & BXH Top 10
  if (action === 'prism_leaderboard') {
    const pool = await getPool();
    let topPlayers = [];
    let userRank = null;

    if (pool) {
      const topRes = await pool.query(`
        SELECT user_id, identity_key, slay_points, heart_points, rebel_points,
               (slay_points + heart_points + rebel_points) AS total_points
        FROM prism_players
        WHERE identity_key IS NOT NULL
        ORDER BY total_points DESC
        LIMIT 10;
      `);
      topPlayers = topRes.rows;

      const rankRes = await pool.query(
        `
          SELECT COUNT(*) + 1 AS rank
          FROM prism_players
          WHERE (slay_points + heart_points + rebel_points) > 
                ($1 + $2 + $3)
            AND identity_key IS NOT NULL;
        `,
        [player.slay_points, player.heart_points, player.rebel_points],
      );
      userRank = rankRes.rows[0]?.rank || 1;
    }

    return interaction.reply(buildPrismLeaderboardPayload(player, topPlayers, userRank));
  }
}

/**
 * Xử lý khi chọn đáp án A/B/C ở Mini-game 1
 */
export async function handlePrismStoryChoice(interaction, client, args) {
  const scenarioIdx = parseInt(args?.[0], 10) || 0;
  const choiceKey = args?.[1] || 'A';

  const scenario = STORY_SCENARIOS[scenarioIdx] || STORY_SCENARIOS[0];
  const choice = scenario.choices[choiceKey] || scenario.choices.A;

  const player = await getPrismPlayer(interaction.user.id);
  const rawPoints = calculatePointChanges(choice.points);

  const rewardInfo = await processGameEndRewards(player, rawPoints, 'story', client);

  return interaction.update(
    buildPrismStoryResultPayload(choice.summary, rewardInfo.finalPoints, rewardInfo.updatedPlayer, rewardInfo),
  );
}

/**
 * Mini-game 1: Bấm "Tiếp Tục Hành Trình" -> Random tình huống mới
 */
export async function handlePrismStoryNext(interaction) {
  const player = await getPrismPlayer(interaction.user.id);
  const nextIdx = Math.floor(Math.random() * STORY_SCENARIOS.length);
  return interaction.update(buildPrismStoryPayload(nextIdx, player));
}

/**
 * Mini-game 2: Cập nhật món đồ khi chọn Select Menu
 */
export async function handlePrismOutfitSelect(interaction, type, args) {
  const player = await getPrismPlayer(interaction.user.id);
  const themeIdx = parseInt(args?.[0], 10) || 0;
  let topIdx = 0;
  let bottomIdx = 0;
  let accIdx = 0;

  const selectedVal = parseInt(interaction.values?.[0], 10) || 0;

  if (type === 'top') {
    topIdx = selectedVal;
    bottomIdx = parseInt(args?.[1], 10) || 0;
    accIdx = parseInt(args?.[2], 10) || 0;
  } else if (type === 'bot') {
    topIdx = parseInt(args?.[1], 10) || 0;
    bottomIdx = selectedVal;
    accIdx = parseInt(args?.[2], 10) || 0;
  } else if (type === 'acc') {
    topIdx = parseInt(args?.[1], 10) || 0;
    bottomIdx = parseInt(args?.[2], 10) || 0;
    accIdx = selectedVal;
  }

  return interaction.update(buildPrismOutfitPayload(themeIdx, topIdx, bottomIdx, accIdx, player));
}

/**
 * Mini-game 2: Chốt bộ & Chấm điểm
 */
export async function handlePrismOutfitSubmit(interaction, client, args) {
  const topId = parseInt(args?.[1], 10) || 0;
  const bottomId = parseInt(args?.[2], 10) || 0;
  const accId = parseInt(args?.[3], 10) || 0;

  const top = OUTFIT_TOPS[topId] || OUTFIT_TOPS[0];
  const bottom = OUTFIT_BOTTOMS[bottomId] || OUTFIT_BOTTOMS[0];
  const acc = OUTFIT_ACCESSORIES[accId] || OUTFIT_ACCESSORIES[0];

  const pTop = calculatePointChanges(top.points);
  const pBot = calculatePointChanges(bottom.points);
  const pAcc = calculatePointChanges(acc.points);

  const friendBonusSlay = randomRange(3, 8);
  const friendBonusHeart = randomRange(2, 7);

  const rawTotal = {
    slay: pTop.slay + pBot.slay + pAcc.slay + friendBonusSlay,
    heart: pTop.heart + pBot.heart + pAcc.heart + friendBonusHeart,
    rebel: pTop.rebel + pBot.rebel + pAcc.rebel,
  };

  const praiseText =
    OUTFIT_FRIEND_PRAISES[Math.floor(Math.random() * OUTFIT_FRIEND_PRAISES.length)];

  const player = await getPrismPlayer(interaction.user.id);
  const rewardInfo = await processGameEndRewards(player, rawTotal, 'outfit', client);

  return interaction.update(
    buildPrismOutfitResultPayload(praiseText, rewardInfo.finalPoints, rewardInfo.updatedPlayer, rewardInfo),
  );
}

/**
 * Mini-game 3: Bấm nút "Nhập Tin Nhắn" -> Mở Modal chữ thuần
 */
export async function handlePrismCrushOpenModal(interaction, args) {
  const messageIdx = parseInt(args?.[0], 10) || 0;
  const modal = buildPrismCrushModal(messageIdx);
  return interaction.showModal(modal);
}

/**
 * Mini-game 3: Xử lý Submit Modal
 */
export async function handlePrismCrushModalSubmit(interaction, client, args) {
  const userMsg = interaction.fields.getTextInputValue('prism_crush_input') || '';
  const lowerMsg = userMsg.toLowerCase();

  let branch = CRUSH_BRANCHES.defaultBranch;

  if (CRUSH_BRANCHES.sweet.keywords.some((kw) => lowerMsg.includes(kw))) {
    branch = CRUSH_BRANCHES.sweet;
  } else if (CRUSH_BRANCHES.funny.keywords.some((kw) => lowerMsg.includes(kw))) {
    branch = CRUSH_BRANCHES.funny;
  } else if (CRUSH_BRANCHES.shy.keywords.some((kw) => lowerMsg.includes(kw))) {
    branch = CRUSH_BRANCHES.shy;
  }

  const rawPoints = calculatePointChanges(branch.points);
  const player = await getPrismPlayer(interaction.user.id);
  const rewardInfo = await processGameEndRewards(player, rawPoints, 'chat', client);

  return interaction.update(
    buildPrismChatResultPayload(userMsg, branch.reply, rewardInfo.finalPoints, rewardInfo.updatedPlayer, rewardInfo),
  );
}

/**
 * Mini-game 4: Bấm "Quay Ngay!" hoặc "Quay Lần Nữa"
 */
export async function handlePrismSpinRoll(interaction, client) {
  const eventIdx = Math.floor(Math.random() * RAINBOW_STREET_EVENTS.length);
  const eventItem = RAINBOW_STREET_EVENTS[eventIdx];

  const rawPoints = calculatePointChanges(eventItem.points);
  const player = await getPrismPlayer(interaction.user.id);
  const rewardInfo = await processGameEndRewards(player, rawPoints, 'spin', client);

  return interaction.update(
    buildPrismSpinResultPayload(eventItem.desc, rewardInfo.finalPoints, rewardInfo.updatedPlayer, rewardInfo),
  );
}

/**
 * TÚI ĐỒ: Sử dụng vật phẩm
 */
export async function handlePrismBagUseItem(interaction, client) {
  const itemKey = interaction.values?.[0];
  const player = await getPrismPlayer(interaction.user.id);
  const inv = { ...(player?.inventory || {}) };
  const buffs = { ...(player?.active_buffs || { amulet: 0, dice: 0 }) };

  if (!inv[itemKey] || inv[itemKey] <= 0) {
    return interaction.update(
      buildPrismBagPayload(player, '❌ Bạn không có vật phẩm này trong túi để sử dụng!'),
    );
  }

  // Trừ 1 món
  inv[itemKey] -= 1;
  let notice = '';
  let pointDelta = { slay: 0, heart: 0, rebel: 0 };

  if (itemKey === 'lollipop') {
    const pts = randomRange(8, 15);
    pointDelta.heart += pts;
    notice = `✅ Bạn đã ngậm **Kẹo Mút Lục Sắc**, tâm hồn ngập tràn sự chân thành (+**${pts}** ${PRISM_EMOJIS.heartg3} Chân thành)!`;
  } else if (itemKey === 'fan') {
    const pts = randomRange(15, 25);
    pointDelta.slay += pts;
    notice = `✅ Bạn đã xòe **Quạt Xếp Ánh Kim**, thần thái tỏa sáng ngút ngàn (+**${pts}** ${PRISM_EMOJIS.trangtrig41} Thần thái)!`;
  } else if (itemKey === 'crown') {
    const slayPts = randomRange(20, 35);
    const heartPts = randomRange(20, 35);
    const rebelPts = randomRange(20, 35);
    pointDelta.slay += slayPts;
    pointDelta.heart += heartPts;
    pointDelta.rebel += rebelPts;
    notice = `👑 Bạn đã đội **Vương Miện Tự Hào**, toàn bộ chỉ số bùng nổ (+**${slayPts}** Thần thái | +**${heartPts}** Chân thành | +**${rebelPts}** Nổi loạn)!`;
  } else if (itemKey === 'amulet') {
    buffs.amulet = (buffs.amulet || 0) + 1;
    notice = `🛡️ Bạn đã kích hoạt **Bùa Hộ Mệnh**! Sẵn sàng bảo vệ và chặn 1 lần bị trừ điểm ở lượt mini-game bất kỳ.`;
  } else if (itemKey === 'dice') {
    buffs.dice = (buffs.dice || 0) + 1;
    notice = `🎲 Bạn đã kích hoạt **Xúc Xắc May Mắn**! Lượt chơi mini-game tiếp theo sẽ được nhân đôi (x2) hoặc nhân ba (x3) toàn bộ điểm cộng.`;
  }

  // Cập nhật tiến độ nhiệm vụ ngày
  const { questData } = updateQuestProgressInternal(player.daily_quests, 'use_item');

  const pool = await getPool();
  const res = await pool.query(
    `
      UPDATE prism_players
      SET slay_points = GREATEST(0, slay_points + $1),
          heart_points = GREATEST(0, heart_points + $2),
          rebel_points = GREATEST(0, rebel_points + $3),
          inventory = $4::jsonb,
          active_buffs = $5::jsonb,
          daily_quests = $6::jsonb
      WHERE user_id = $7
      RETURNING *;
    `,
    [
      pointDelta.slay,
      pointDelta.heart,
      pointDelta.rebel,
      JSON.stringify(inv),
      JSON.stringify(buffs),
      JSON.stringify(questData),
      interaction.user.id,
    ],
  );

  const updatedPlayer = res.rows[0];
  if (updatedPlayer?.thread_id && updatedPlayer?.hub_message_id) {
    updateHubMessage(client, updatedPlayer.thread_id, updatedPlayer.hub_message_id, updatedPlayer);
  }

  return interaction.update(buildPrismBagPayload(updatedPlayer, notice));
}

/**
 * TÚI ĐỒ: Tặng quà cho Crush
 */
export async function handlePrismBagGiftCrush(interaction, client) {
  const giftKey = interaction.values?.[0];
  const player = await getPrismPlayer(interaction.user.id);
  const inv = { ...(player?.inventory || {}) };

  if (!inv[giftKey] || inv[giftKey] <= 0) {
    return interaction.update(
      buildPrismBagPayload(player, '❌ Bạn chưa có món quà này trong túi! Hãy ghé Cửa Hàng để sắm cho người ấy nhé.'),
    );
  }

  inv[giftKey] -= 1;
  const profile = IDENTITY_PROFILES[player?.identity_key] || IDENTITY_PROFILES.pansexual;

  let pointDelta = { slay: 0, heart: 0, rebel: 0 };
  if (giftKey === 'boba') {
    pointDelta.heart += randomRange(12, 20);
    pointDelta.slay += randomRange(8, 15);
  } else if (giftKey === 'flowers') {
    pointDelta.heart += randomRange(18, 28);
    pointDelta.slay += randomRange(10, 18);
  } else if (giftKey === 'movie_tickets') {
    pointDelta.heart += randomRange(25, 40);
    pointDelta.slay += randomRange(15, 25);
  }

  const dialogues = CRUSH_GIFT_REACTIONS[giftKey] || CRUSH_GIFT_REACTIONS.boba;
  const rawDialogue = dialogues[Math.floor(Math.random() * dialogues.length)];
  const dialogueFormatted = formatWithIdentity(rawDialogue, profile);

  const notice = `${dialogueFormatted}\n\n**Điểm thưởng nhận được:** ${formatPointChanges(pointDelta)}`;

  // Cập nhật nhiệm vụ ngày
  const { questData } = updateQuestProgressInternal(player.daily_quests, 'gift');

  const pool = await getPool();
  const res = await pool.query(
    `
      UPDATE prism_players
      SET slay_points = GREATEST(0, slay_points + $1),
          heart_points = GREATEST(0, heart_points + $2),
          rebel_points = GREATEST(0, rebel_points + $3),
          inventory = $4::jsonb,
          daily_quests = $5::jsonb
      WHERE user_id = $6
      RETURNING *;
    `,
    [
      pointDelta.slay,
      pointDelta.heart,
      pointDelta.rebel,
      JSON.stringify(inv),
      JSON.stringify(questData),
      interaction.user.id,
    ],
  );

  const updatedPlayer = res.rows[0];
  if (updatedPlayer?.thread_id && updatedPlayer?.hub_message_id) {
    updateHubMessage(client, updatedPlayer.thread_id, updatedPlayer.hub_message_id, updatedPlayer);
  }

  return interaction.update(buildPrismBagPayload(updatedPlayer, notice));
}

/**
 * CỬA HÀNG: Mua Vật Phẩm Kỷ Niệm / Bùa Hỗ Trợ / Hộp Mù Bí Ẩn
 */
export async function handlePrismShopBuyItem(interaction, client) {
  const itemKey = interaction.values?.[0];
  const item = PRISM_ITEMS[itemKey];

  if (!item || !item.price) {
    return interaction.update(buildPrismShopPayload(await getPrismPlayer(interaction.user.id), '❌ Vật phẩm không hợp lệ!'));
  }

  const player = await getPrismPlayer(interaction.user.id);
  const currentCoins = player?.rainbow_coins || 0;

  if (currentCoins < item.price) {
    return interaction.update(
      buildPrismShopPayload(player, `❌ Bạn không đủ Xu Cầu Vồng để mua món này! (Cần **${item.price}** ${PRISM_EMOJIS.xucauvong}, bạn đang có **${currentCoins}** Xu)`),
    );
  }

  const inv = { ...(player?.inventory || {}) };
  let newCoins = currentCoins - item.price;
  let notice = '';

  if (itemKey === 'mystery_box') {
    const boxResult = openMysteryBox();
    if (boxResult.type === 'item') {
      inv[boxResult.itemKey] = (inv[boxResult.itemKey] || 0) + 1;
      notice = `🎁 **Mở Hộp Mù Bí Ẩn thành công!**\nBạn đã trúng: ${boxResult.emoji} **${boxResult.name}**! Vật phẩm đã được chuyển vào Túi đồ.`;
    } else {
      newCoins += boxResult.coins;
      notice = `🎁 **Mở Hộp Mù Bí Ẩn:**\nChúc bạn may mắn lần sau! Hộp mù hoàn lại cho bạn ${boxResult.emoji} **${boxResult.name}**!`;
    }
  } else {
    inv[itemKey] = (inv[itemKey] || 0) + 1;
    notice = `✅ Bạn đã mua thành công 1 **${item.name}** với giá **${item.price}** Xu Cầu Vồng!`;
  }

  const pool = await getPool();
  const res = await pool.query(
    `
      UPDATE prism_players
      SET rainbow_coins = $1,
          inventory = $2::jsonb
      WHERE user_id = $3
      RETURNING *;
    `,
    [newCoins, JSON.stringify(inv), interaction.user.id],
  );

  const updatedPlayer = res.rows[0];
  if (updatedPlayer?.thread_id && updatedPlayer?.hub_message_id) {
    updateHubMessage(client, updatedPlayer.thread_id, updatedPlayer.hub_message_id, updatedPlayer);
  }

  return interaction.update(buildPrismShopPayload(updatedPlayer, notice));
}

/**
 * CỬA HÀNG: Mua Quà Tặng Crush
 */
export async function handlePrismShopBuyGift(interaction, client) {
  const giftKey = interaction.values?.[0];
  const item = PRISM_ITEMS[giftKey];

  if (!item || !item.price) {
    return interaction.update(buildPrismShopPayload(await getPrismPlayer(interaction.user.id), '❌ Món quà không hợp lệ!'));
  }

  const player = await getPrismPlayer(interaction.user.id);
  const currentCoins = player?.rainbow_coins || 0;

  if (currentCoins < item.price) {
    return interaction.update(
      buildPrismShopPayload(player, `❌ Bạn không đủ Xu Cầu Vồng để mua món này! (Cần **${item.price}** ${PRISM_EMOJIS.xucauvong}, bạn đang có **${currentCoins}** Xu)`),
    );
  }

  const inv = { ...(player?.inventory || {}) };
  const newCoins = currentCoins - item.price;
  inv[giftKey] = (inv[giftKey] || 0) + 1;

  const notice = `✅ Bạn đã mua thành công 1 **${item.name}** với giá **${item.price}** Xu Cầu Vồng! Món quà đã sẵn sàng trong Túi đồ để tặng Crush.`;

  const pool = await getPool();
  const res = await pool.query(
    `
      UPDATE prism_players
      SET rainbow_coins = $1,
          inventory = $2::jsonb
      WHERE user_id = $3
      RETURNING *;
    `,
    [newCoins, JSON.stringify(inv), interaction.user.id],
  );

  const updatedPlayer = res.rows[0];
  if (updatedPlayer?.thread_id && updatedPlayer?.hub_message_id) {
    updateHubMessage(client, updatedPlayer.thread_id, updatedPlayer.hub_message_id, updatedPlayer);
  }

  return interaction.update(buildPrismShopPayload(updatedPlayer, notice));
}

/**
 * NHIỆM VỤ NGÀY: Nhận tất cả thưởng đã xong
 */
export async function handlePrismQuestsClaimAll(interaction, client) {
  const player = await getPrismPlayer(interaction.user.id);
  const questData = getOrGenerateDailyQuests(player?.daily_quests);

  let totalReward = 0;
  let countClaimed = 0;

  for (const q of questData.quests) {
    if (q.progress >= q.target && !q.claimed) {
      totalReward += q.reward;
      q.claimed = true;
      countClaimed += 1;
    }
  }

  if (countClaimed === 0) {
    return interaction.update(
      buildPrismQuestsPayload(player, questData, 'ℹ️ Không có phần thưởng nhiệm vụ nào chưa nhận!'),
    );
  }

  const newCoins = (player?.rainbow_coins || 0) + totalReward;

  const pool = await getPool();
  const res = await pool.query(
    `
      UPDATE prism_players
      SET rainbow_coins = $1,
          daily_quests = $2::jsonb
      WHERE user_id = $3
      RETURNING *;
    `,
    [newCoins, JSON.stringify(questData), interaction.user.id],
  );

  const updatedPlayer = res.rows[0];
  if (updatedPlayer?.thread_id && updatedPlayer?.hub_message_id) {
    updateHubMessage(client, updatedPlayer.thread_id, updatedPlayer.hub_message_id, updatedPlayer);
  }

  const notice = `🎉 **Chúc mừng!** Bạn đã nhận thành công +**${totalReward}** ${PRISM_EMOJIS.xucauvong} Xu Cầu Vồng từ **${countClaimed}** nhiệm vụ hoàn thành!`;
  return interaction.update(buildPrismQuestsPayload(updatedPlayer, questData, notice));
}
