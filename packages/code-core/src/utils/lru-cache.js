/**
 * LRU (Least Recently Used) Cache
 * Evicts oldest entry when size limit reached
 *
 * Use cases:
 * - Base context token cache (max 100 entries)
 * - Message token cache (max 1000 entries)
 */
export class LRUCache {
    cache;
    maxSize;
    constructor(maxSize) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }
    /**
     * Get value from cache
     * Moves entry to end (most recently used)
     */
    get(key) {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }
    /**
     * Set value in cache
     * Evicts oldest entry if at capacity
     */
    set(key, value) {
        // Remove if exists (to re-add at end)
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                this.cache.delete(firstKey);
            }
        }
        this.cache.set(key, value);
    }
    /**
     * Check if key exists
     */
    has(key) {
        return this.cache.has(key);
    }
    /**
     * Get cache size
     */
    get size() {
        return this.cache.size;
    }
    /**
     * Clear all entries
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Delete specific entry
     */
    delete(key) {
        return this.cache.delete(key);
    }
}
//# sourceMappingURL=lru-cache.js.map