// rateLimiter.js

import { logger } from './logger.js';

const rateLimitStore = new Map();

// Dọn các key cooldown cũ theo chu kỳ để user/command chỉ dùng một lần
// không bị giữ trong RAM cho tới lần restart tiếp theo.
// Mỗi entry giữ chính windowMs của nó để không làm thay đổi policy hiện tại.
const CLEANUP_INTERVAL_MS = 5 * 60_000;

function cleanupExpiredRateLimits() {
  const now = Date.now();

  for (const [key, entry] of rateLimitStore) {
    const windowMs = Number(entry?.windowMs) > 0 ? entry.windowMs : 60_000;
    if (!entry || now - entry.windowStart > windowMs) {
      rateLimitStore.delete(key);
    }
  }
}

const cleanupTimer = setInterval(cleanupExpiredRateLimits, CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

export async function checkRateLimit(key, maxAttempts = 5, windowMs = 60000) {
  try {
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      rateLimitStore.set(key, {
        count: 1,
        windowStart: now,
        windowMs
      });
      return true;
    }

    // Giữ policy mới nhất nếu caller thay đổi windowMs trong runtime.
    entry.windowMs = windowMs;

    if (entry.count < maxAttempts) {
      entry.count++;
      return true;
    }

    logger.debug(`Rate limit exceeded for ${key}`);
    return false;
  } catch (error) {
    logger.error('Error checking rate limit:', error);
    return true;
  }
}

export function getRateLimitStatus(key, windowMs = 60000) {
  const entry = rateLimitStore.get(key);
  if (!entry) {
    return { limited: false, remaining: windowMs };
  }

  const elapsed = Date.now() - entry.windowStart;
  const remaining = Math.max(0, windowMs - elapsed);

  // Nếu entry đã hết hạn thì xóa ngay thay vì chờ cleanup timer.
  if (remaining <= 0) {
    rateLimitStore.delete(key);
    return { limited: false, remaining: 0, attempts: entry.count };
  }

  return {
    limited: true,
    remaining,
    attempts: entry.count
  };
}

export function clearRateLimit(key) {
  rateLimitStore.delete(key);
}

export function clearAllRateLimits() {
  rateLimitStore.clear();
  logger.info('All rate limits cleared');
}
