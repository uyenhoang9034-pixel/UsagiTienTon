import {
  getUserMarriage,
  areMarried,
  getSpouseList,
  getCoupleKey,
  addCoupleLovePoints,
} from './marriageService.js';

import { logger } from '../utils/logger.js';

import { MARRIAGE_CONFIG } from '../config/marriageConfig.js';

const MENTION_COOLDOWN_MS = MARRIAGE_CONFIG.mention.cooldownMs;
const MENTION_LOVE_POINTS = MARRIAGE_CONFIG.mention.points;
const MENTION_REACTION_EMOJI = MARRIAGE_CONFIG.mention.reactionEmoji;

const mentionCooldownMap = new Map();

// Tự động dọn dẹp các cặp đã hết hạn cooldown mỗi 10 phút để tránh rò rỉ RAM
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of mentionCooldownMap.entries()) {
    if (now - timestamp > MENTION_COOLDOWN_MS) {
      mentionCooldownMap.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

/**
 * Xử lý khi thành viên gửi tin nhắn có tag (@đối phương)
 * Nếu người được tag là bạn đời: cộng thêm +5 Điểm Thân Mật và thả reaction 💕
 */
export async function handleMarriageMention(message, client) {
  if (message.author?.bot || !message.guild) {
    return;
  }

  // Nếu tin nhắn không có tag ai hoặc không có mentions
  if (!message.mentions?.users || message.mentions.users.size === 0) {
    return;
  }

  const guildId = message.guild.id;
  const authorId = message.author.id;

  try {
    const authorData = await getUserMarriage(client, guildId, authorId);
    const spouseList = getSpouseList(authorData);

    if (spouseList.length === 0) {
      return;
    }

    const now = Date.now();
    let hasAwarded = false;

    for (const [targetId, targetUser] of message.mentions.users) {
      if (targetUser.bot || targetId === authorId) {
        continue;
      }

      if (areMarried(authorData, targetId)) {
        const coupleKey = `${guildId}:${getCoupleKey(authorId, targetId)}`;
        const lastTime = mentionCooldownMap.get(coupleKey) || 0;

        if (now - lastTime >= MENTION_COOLDOWN_MS) {
          mentionCooldownMap.set(coupleKey, now);

          await addCoupleLovePoints(
            client,
            guildId,
            authorId,
            targetId,
            MENTION_LOVE_POINTS,
          );

          hasAwarded = true;
          logger.debug(`Awarded mention intimacy points for couple ${authorId} & ${targetId}`);
        }
      }
    }

    if (hasAwarded) {
      const botMember = message.guild.members?.me;
      const canReact =
        message.channel?.permissionsFor?.(botMember)?.has('AddReactions') ?? true;

      if (canReact) {
        const emojiMatch = MENTION_REACTION_EMOJI.match(/:(\d+)>$/);
        const emojiToReact = emojiMatch ? emojiMatch[1] : MENTION_REACTION_EMOJI;
        await message.react(emojiToReact).catch(() => message.react('💕').catch(() => {}));
      }
    }
  } catch (error) {
    logger.debug('Error in handleMarriageMention:', error.message);
  }
}
