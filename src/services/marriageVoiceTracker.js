import {
  getUserMarriage,
  areMarried,
  getCoupleKey,
  addCoupleLovePoints,
} from './marriageService.js';

import { MARRIAGE_CONFIG } from '../config/marriageConfig.js';
import { logger } from '../utils/logger.js';

// Cứ 30 phút cùng phòng voice = +30 Điểm Thân Mật 💕
export const VOICE_TARGET_MINUTES = MARRIAGE_CONFIG.voice.targetMinutes;
export const VOICE_LOVE_POINTS_REWARD = MARRIAGE_CONFIG.voice.pointsReward;

// Bộ đếm phút treo voice của từng cặp: `${guildId}:${coupleKey}` -> minutes (số phút đã tích lũy)
const coupleVoiceMinutes = new Map();

// Cache kiểm tra quan hệ hôn nhân tránh query DB liên tục: `${guildId}:${coupleKey}` -> { isMarried, expiresAt }
const marriageCheckCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

let voiceInterval = null;

async function isPairMarriedWithCache(client, guildId, u1Id, u2Id) {
  const coupleKey = `${guildId}:${getCoupleKey(u1Id, u2Id)}`;
  const now = Date.now();
  const cached = marriageCheckCache.get(coupleKey);

  if (cached && now < cached.expiresAt) {
    return cached.isMarried;
  }

  try {
    const u1Data = await getUserMarriage(client, guildId, u1Id);
    const isMarried = areMarried(u1Data, u2Id);

    marriageCheckCache.set(coupleKey, {
      isMarried,
      expiresAt: now + CACHE_TTL_MS,
    });

    return isMarried;
  } catch {
    return false;
  }
}

/**
 * Quét toàn bộ voice channels mỗi phút một lần
 */
async function tickMarriageVoice(client) {
  if (!client?.guilds?.cache) return;

  for (const guild of client.guilds.cache.values()) {
    try {
      for (const channel of guild.channels.cache.values()) {
        if (!channel?.isVoiceBased?.()) continue;

        // Lấy tất cả thành viên người thật trong phòng (loại trừ bot)
        const members = Array.from(channel.members.values()).filter(
          (m) => !m.user?.bot,
        );

        if (members.length < 2) continue;

        // Quét từng cặp thành viên trong phòng voice
        for (let i = 0; i < members.length; i++) {
          for (let j = i + 1; j < members.length; j++) {
            const u1 = members[i].id;
            const u2 = members[j].id;

            const isMarried = await isPairMarriedWithCache(client, guild.id, u1, u2);
            if (!isMarried) continue;

            const coupleKey = `${guild.id}:${getCoupleKey(u1, u2)}`;
            const currentMins = (coupleVoiceMinutes.get(coupleKey) || 0) + 1;

            if (currentMins >= VOICE_TARGET_MINUTES) {
              coupleVoiceMinutes.set(coupleKey, 0);

              const result = await addCoupleLovePoints(
                client,
                guild.id,
                u1,
                u2,
                VOICE_LOVE_POINTS_REWARD,
              );

              if (result) {
                logger.info(
                  `Awarded voice intimacy points (+${VOICE_LOVE_POINTS_REWARD}) for couple ${u1} & ${u2}`,
                );

                try {
                  if (channel.isTextBased?.()) {
                    await channel.send({
                      content: MARRIAGE_CONFIG.voice.messageText(
                        u1,
                        u2,
                        channel.id,
                        VOICE_LOVE_POINTS_REWARD,
                        result.totalPoints,
                        result.level.icon,
                        result.level.name,
                      ),
                    });
                  }
                } catch (sendErr) {
                  logger.debug('Could not send voice intimacy announcement:', sendErr.message);
                }
              }
            } else {
              coupleVoiceMinutes.set(coupleKey, currentMins);
            }
          }
        }
      }
    } catch (err) {
      logger.debug('Error in tickMarriageVoice for guild:', err.message);
    }
  }
}

/**
 * Khởi động interval theo dõi voice theo phút
 */
export function startMarriageVoiceTracker(client) {
  if (voiceInterval) {
    clearInterval(voiceInterval);
  }

  // Quét mỗi 60 giây (1 phút)
  voiceInterval = setInterval(() => {
    tickMarriageVoice(client).catch((err) => {
      logger.error('Error in marriage voice tick:', err);
    });
  }, 60 * 1000);

  logger.info('Marriage Voice Tracker started (checking every 60s, +30 💕 per 30 mins together).');
}

/**
 * Xử lý khi thành viên rời hoặc đổi phòng voice để dọn dẹp bộ đếm
 */
export async function handleMarriageVoiceState(oldState, newState) {
  const oldChannelId = oldState?.channelId;
  const newChannelId = newState?.channelId;

  // Nếu người đó rời phòng hoặc đổi sang phòng khác
  if (oldChannelId && oldChannelId !== newChannelId) {
    const userId = oldState.id;
    const guildId = oldState.guild.id;

    // Reset bộ đếm phút của các cặp liên quan đến user này trong guild
    for (const [key] of coupleVoiceMinutes.entries()) {
      if (key.startsWith(`${guildId}:`) && key.includes(userId)) {
        coupleVoiceMinutes.delete(key);
      }
    }
  }
}
