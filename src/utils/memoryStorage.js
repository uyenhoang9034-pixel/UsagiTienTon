// memoryStorage.js

import { logger } from './logger.js';

const CLEANUP_INTERVAL_MS = 5 * 60_000;

class MemoryStorage {
    constructor() {
        this.data = new Map();
        this.expirationTimes = new Map();

        // TTL trước đây chỉ được dọn khi đúng key được đọc/list lại.
        // Cleanup định kỳ giúp các key không còn được truy cập cũng được giải phóng.
        this.cleanupTimer = setInterval(() => {
            this.cleanupExpired();
        }, CLEANUP_INTERVAL_MS);
        this.cleanupTimer.unref?.();
    }

    cleanupExpired() {
        const now = Date.now();

        for (const [key, expirationTime] of this.expirationTimes) {
            if (now > expirationTime) {
                this.data.delete(key);
                this.expirationTimes.delete(key);
            }
        }
    }

    async get(key, defaultValue = null) {
        const value = this.data.get(key);
        
        if (this.expirationTimes.has(key)) {
            const expirationTime = this.expirationTimes.get(key);
            if (Date.now() > expirationTime) {
                this.data.delete(key);
                this.expirationTimes.delete(key);
                return defaultValue;
            }
        }
        
        return value !== undefined ? value : defaultValue;
    }

    async set(key, value, ttl = null) {
        this.data.set(key, value);
        
        if (ttl && ttl > 0) {
            this.expirationTimes.set(key, Date.now() + (ttl * 1000));
        } else {
            // Nếu cùng key trước đó có TTL rồi được ghi lại thành persistent,
            // phải bỏ expiration cũ để tránh xóa nhầm dữ liệu mới.
            this.expirationTimes.delete(key);
        }
        
        return true;
    }

    async delete(key) {
        this.data.delete(key);
        this.expirationTimes.delete(key);
        return true;
    }

    async list(prefix) {
        const keys = [];
        for (const key of this.data.keys()) {
            if (key.startsWith(prefix)) {
                if (this.expirationTimes.has(key)) {
                    const expirationTime = this.expirationTimes.get(key);
                    if (Date.now() > expirationTime) {
                        this.data.delete(key);
                        this.expirationTimes.delete(key);
                        continue;
                    }
                }
                keys.push(key);
            }
        }
        return keys;
    }

    async exists(key) {
        const value = this.data.get(key);
        
        if (this.expirationTimes.has(key)) {
            const expirationTime = this.expirationTimes.get(key);
            if (Date.now() > expirationTime) {
                this.data.delete(key);
                this.expirationTimes.delete(key);
                return false;
            }
        }
        
        return value !== undefined;
    }

    async increment(key, amount = 1) {
        const current = await this.get(key, 0);
        const newValue = current + amount;
        await this.set(key, newValue);
        return newValue;
    }

    async decrement(key, amount = 1) {
        const current = await this.get(key, 0);
        const newValue = current - amount;
        await this.set(key, newValue);
        return newValue;
    }

    async clear() {
        this.data.clear();
        this.expirationTimes.clear();
        return true;
    }
}

export { MemoryStorage };