/**
 * LRU (Least Recently Used) Cache
 * Evicts oldest entry when size limit reached
 *
 * Use cases:
 * - Base context token cache (max 100 entries)
 * - Message token cache (max 1000 entries)
 */
export declare class LRUCache<K, V> {
    private cache;
    private maxSize;
    constructor(maxSize: number);
    /**
     * Get value from cache
     * Moves entry to end (most recently used)
     */
    get(key: K): V | undefined;
    /**
     * Set value in cache
     * Evicts oldest entry if at capacity
     */
    set(key: K, value: V): void;
    /**
     * Check if key exists
     */
    has(key: K): boolean;
    /**
     * Get cache size
     */
    get size(): number;
    /**
     * Clear all entries
     */
    clear(): void;
    /**
     * Delete specific entry
     */
    delete(key: K): boolean;
}
//# sourceMappingURL=lru-cache.d.ts.map