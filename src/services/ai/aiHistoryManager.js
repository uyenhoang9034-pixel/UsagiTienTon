import { AI_CONFIG } from './aiConfig.js';
import { logger } from '../../utils/logger.js';

class AIHistoryManager {
  constructor() {
    this.histories = new Map();
    this.maxMessages = AI_CONFIG.history.maxMessages || 10;
    this.ttlMs = AI_CONFIG.history.ttlMs || 30 * 60 * 1000;

    // Định kỳ dọn rác bộ nhớ mỗi 10 phút để tối ưu RAM trên Railway
    setInterval(() => this.cleanupExpired(), 10 * 60 * 1000).unref();
  }

  getKey(channelId, userId) {
    return `${channelId}:${userId}`;
  }

  getHistory(channelId, userId) {
    const key = this.getKey(channelId, userId);
    const entry = this.histories.get(key);
    if (!entry) return [];

    if (Date.now() - entry.lastUpdated > this.ttlMs) {
      this.histories.delete(key);
      return [];
    }

    return entry.messages;
  }

  addUserMessage(channelId, userId, content) {
    this.addMessage(channelId, userId, 'user', content);
  }

  addAssistantMessage(channelId, userId, content) {
    this.addMessage(channelId, userId, 'assistant', content);
  }

  addMessage(channelId, userId, role, content) {
    const key = this.getKey(channelId, userId);
    let entry = this.histories.get(key);

    if (!entry || Date.now() - entry.lastUpdated > this.ttlMs) {
      entry = {
        messages: [],
        lastUpdated: Date.now(),
      };
      this.histories.set(key, entry);
    }

    entry.messages.push({
      role,
      content: String(content || '').trim(),
    });

    // Giữ số lượng tin nhắn trong giới hạn
    if (entry.messages.length > this.maxMessages) {
      entry.messages = entry.messages.slice(-this.maxMessages);
    }

    entry.lastUpdated = Date.now();
  }

  clearHistory(channelId, userId) {
    const key = this.getKey(channelId, userId);
    this.histories.delete(key);
  }

  cleanupExpired() {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.histories.entries()) {
      if (now - entry.lastUpdated > this.ttlMs) {
        this.histories.delete(key);
        cleaned += 1;
      }
    }
    if (cleaned > 0) {
      logger.debug(`[AI History] Cleaned up ${cleaned} expired conversation sessions.`);
    }
  }
}

export const aiHistoryManager = new AIHistoryManager();
export default aiHistoryManager;
