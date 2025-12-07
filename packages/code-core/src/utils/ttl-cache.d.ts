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
export declare class TTLCacheManager<T> {
    private ttl;
    private name?;
    private cache;
    constructor(ttl: number, // Time-to-live in milliseconds
    name?: string | undefined);
    /**
     * Get value from cache
     * Returns null if:
     * - Key doesn't exist
     * - Entry has expired (auto-deleted)
     */
    get(key: string): T | null;
    /**
     * Set value in cache with current timestamp
     * Overwrites existing value if key exists
     */
    set(key: string, value: T): void;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Delete specific key
     */
    delete(key: string): boolean;
    /**
     * Clear all cached entries
     */
    clear(): void;
    /**
     * Get current cache size (includes expired entries until accessed)
     */
    size(): number;
    /**
     * Clean up expired entries (optional manual cleanup)
     * Usually not needed as entries are cleaned on access
     */
    cleanup(): number;
    /**
     * Get all valid (non-expired) keys
     */
    keys(): string[];
    /**
     * Get cache stats for debugging
     */
    getStats(): {
        name?: string;
        totalEntries: number;
        validEntries: number;
        ttlMs: number;
    };
}
//# sourceMappingURL=ttl-cache.d.ts.map