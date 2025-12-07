/**
 * Cache Manager
 * Unified cache management system for all LRU caches across the codebase
 *
 * ARCHITECTURE: Central registry pattern
 * - Single source of truth for all caches
 * - Unified stats and management API
 * - Enables cache observability and debugging
 *
 * FEATURES:
 * - Register caches with descriptive names
 * - Get stats for all caches or individual cache
 * - Clear individual cache or all caches
 * - Monitor cache performance
 *
 * USAGE:
 * ```typescript
 * import { cacheManager } from "./cache-manager.js";
 * import { LRUCache } from "../utils/lru-cache.js";
 *
 * const myCache = new LRUCache<string, number>(100);
 * cacheManager.register("my-cache", myCache, "Description of what this caches");
 *
 * // Later: Get stats
 * const stats = cacheManager.getStats();
 * console.log(stats);
 *
 * // Clear specific cache
 * cacheManager.clear("my-cache");
 *
 * // Clear all caches
 * cacheManager.clearAll();
 * ```
 */
import type { LRUCache } from "../utils/lru-cache.js";
/**
 * Cache statistics for a single cache
 */
export interface CacheStats {
    name: string;
    description: string;
    size: number;
    maxSize: number;
    hitRate: number;
    missRate: number;
    hits: number;
    misses: number;
}
/**
 * Cache Manager Class
 * Manages all LRU caches in the system
 */
declare class CacheManager {
    private caches;
    /**
     * Register a cache with the manager
     *
     * @param name Unique identifier for the cache
     * @param cache LRU cache instance
     * @param description Human-readable description of what this cache stores
     */
    register<K, V>(name: string, cache: LRUCache<K, V>, description: string): void;
    /**
     * Unregister a cache from the manager
     *
     * @param name Cache identifier
     * @returns true if cache was unregistered, false if not found
     */
    unregister(name: string): boolean;
    /**
     * Record a cache hit for statistics
     * Call this when cache.get() returns a value
     *
     * @param name Cache identifier
     */
    recordHit(name: string): void;
    /**
     * Record a cache miss for statistics
     * Call this when cache.get() returns undefined
     *
     * @param name Cache identifier
     */
    recordMiss(name: string): void;
    /**
     * Get statistics for all caches
     *
     * @returns Array of cache statistics
     */
    getStats(): CacheStats[];
    /**
     * Get statistics for a specific cache
     *
     * @param name Cache identifier
     * @returns Cache statistics or null if cache not found
     */
    getCacheStats(name: string): CacheStats | null;
    /**
     * Clear a specific cache
     *
     * @param name Cache identifier
     * @returns true if cache was cleared, false if not found
     */
    clear(name: string): boolean;
    /**
     * Clear all registered caches
     */
    clearAll(): void;
    /**
     * Get list of all registered cache names
     *
     * @returns Array of cache names
     */
    getCacheNames(): string[];
    /**
     * Check if a cache is registered
     *
     * @param name Cache identifier
     * @returns true if cache is registered
     */
    has(name: string): boolean;
    /**
     * Get total number of registered caches
     *
     * @returns Number of caches
     */
    get count(): number;
    /**
     * Format cache statistics as a human-readable string
     * Useful for debugging and logging
     *
     * @returns Formatted string with all cache statistics
     */
    formatStats(): string;
}
/**
 * Global cache manager instance
 * Use this singleton for all cache registration and management
 */
export declare const cacheManager: CacheManager;
export {};
//# sourceMappingURL=cache-manager.d.ts.map