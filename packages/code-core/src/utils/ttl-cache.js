/**
 * TTL Cache Manager
 * Composable in-memory cache with time-to-live expiration
 *
 * Features:
 * - Automatic expiration based on TTL
 * - Type-safe generic implementation
 * - Shared across providers for consistency
 * - Zero dependencies
 *
 * Use cases:
 * - Model lists from provider APIs (1 hour TTL)
 * - Provider metadata (1 hour TTL)
 * - Any cacheable data with expiration needs
 */
export class TTLCacheManager {
    ttl;
    name;
    cache = new Map();
    constructor(ttl, // Time-to-live in milliseconds
    name) {
        this.ttl = ttl;
        this.name = name;
    }
    /**
     * Get value from cache
     * Returns null if:
     * - Key doesn't exist
     * - Entry has expired (auto-deleted)
     */
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        // Check if expired
        const age = Date.now() - entry.timestamp;
        if (age > this.ttl) {
            // Expired - delete and return null
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    /**
     * Set value in cache with current timestamp
     * Overwrites existing value if key exists
     */
    set(key, value) {
        this.cache.set(key, {
            value,
            timestamp: Date.now(),
        });
    }
    /**
     * Check if key exists and is not expired
     */
    has(key) {
        return this.get(key) !== null;
    }
    /**
     * Delete specific key
     */
    delete(key) {
        return this.cache.delete(key);
    }
    /**
     * Clear all cached entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Get current cache size (includes expired entries until accessed)
     */
    size() {
        return this.cache.size;
    }
    /**
     * Clean up expired entries (optional manual cleanup)
     * Usually not needed as entries are cleaned on access
     */
    cleanup() {
        let removed = 0;
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age > this.ttl) {
                this.cache.delete(key);
                removed++;
            }
        }
        return removed;
    }
    /**
     * Get all valid (non-expired) keys
     */
    keys() {
        const validKeys = [];
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            const age = now - entry.timestamp;
            if (age <= this.ttl) {
                validKeys.push(key);
            }
        }
        return validKeys;
    }
    /**
     * Get cache stats for debugging
     */
    getStats() {
        const validKeys = this.keys();
        return {
            name: this.name,
            totalEntries: this.cache.size,
            validEntries: validKeys.length,
            ttlMs: this.ttl,
        };
    }
}
//# sourceMappingURL=ttl-cache.js.map