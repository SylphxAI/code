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
/**
 * Cache Manager Class
 * Manages all LRU caches in the system
 */
class CacheManager {
    caches = new Map();
    /**
     * Register a cache with the manager
     *
     * @param name Unique identifier for the cache
     * @param cache LRU cache instance
     * @param description Human-readable description of what this cache stores
     */
    register(name, cache, description) {
        if (this.caches.has(name)) {
            console.warn(`[CacheManager] Cache "${name}" already registered, overwriting`);
        }
        this.caches.set(name, {
            cache,
            description,
            hits: 0,
            misses: 0,
        });
    }
    /**
     * Unregister a cache from the manager
     *
     * @param name Cache identifier
     * @returns true if cache was unregistered, false if not found
     */
    unregister(name) {
        return this.caches.delete(name);
    }
    /**
     * Record a cache hit for statistics
     * Call this when cache.get() returns a value
     *
     * @param name Cache identifier
     */
    recordHit(name) {
        const entry = this.caches.get(name);
        if (entry) {
            entry.hits++;
        }
    }
    /**
     * Record a cache miss for statistics
     * Call this when cache.get() returns undefined
     *
     * @param name Cache identifier
     */
    recordMiss(name) {
        const entry = this.caches.get(name);
        if (entry) {
            entry.misses++;
        }
    }
    /**
     * Get statistics for all caches
     *
     * @returns Array of cache statistics
     */
    getStats() {
        const stats = [];
        for (const [name, entry] of this.caches.entries()) {
            const totalRequests = entry.hits + entry.misses;
            const hitRate = totalRequests > 0 ? entry.hits / totalRequests : 0;
            const missRate = totalRequests > 0 ? entry.misses / totalRequests : 0;
            stats.push({
                name,
                description: entry.description,
                size: entry.cache.size,
                maxSize: entry.cache.maxSize,
                hitRate,
                missRate,
                hits: entry.hits,
                misses: entry.misses,
            });
        }
        return stats;
    }
    /**
     * Get statistics for a specific cache
     *
     * @param name Cache identifier
     * @returns Cache statistics or null if cache not found
     */
    getCacheStats(name) {
        const entry = this.caches.get(name);
        if (!entry) {
            return null;
        }
        const totalRequests = entry.hits + entry.misses;
        const hitRate = totalRequests > 0 ? entry.hits / totalRequests : 0;
        const missRate = totalRequests > 0 ? entry.misses / totalRequests : 0;
        return {
            name,
            description: entry.description,
            size: entry.cache.size,
            maxSize: entry.cache.maxSize,
            hitRate,
            missRate,
            hits: entry.hits,
            misses: entry.misses,
        };
    }
    /**
     * Clear a specific cache
     *
     * @param name Cache identifier
     * @returns true if cache was cleared, false if not found
     */
    clear(name) {
        const entry = this.caches.get(name);
        if (!entry) {
            return false;
        }
        entry.cache.clear();
        entry.hits = 0;
        entry.misses = 0;
        return true;
    }
    /**
     * Clear all registered caches
     */
    clearAll() {
        for (const [_name, entry] of this.caches.entries()) {
            entry.cache.clear();
            entry.hits = 0;
            entry.misses = 0;
        }
    }
    /**
     * Get list of all registered cache names
     *
     * @returns Array of cache names
     */
    getCacheNames() {
        return Array.from(this.caches.keys());
    }
    /**
     * Check if a cache is registered
     *
     * @param name Cache identifier
     * @returns true if cache is registered
     */
    has(name) {
        return this.caches.has(name);
    }
    /**
     * Get total number of registered caches
     *
     * @returns Number of caches
     */
    get count() {
        return this.caches.size;
    }
    /**
     * Format cache statistics as a human-readable string
     * Useful for debugging and logging
     *
     * @returns Formatted string with all cache statistics
     */
    formatStats() {
        const stats = this.getStats();
        if (stats.length === 0) {
            return "No caches registered";
        }
        let output = `\n=== Cache Statistics (${stats.length} caches) ===\n`;
        for (const stat of stats) {
            const hitRatePercent = (stat.hitRate * 100).toFixed(1);
            const missRatePercent = (stat.missRate * 100).toFixed(1);
            const fillPercent = ((stat.size / stat.maxSize) * 100).toFixed(1);
            output += `\n${stat.name}:\n`;
            output += `  Description: ${stat.description}\n`;
            output += `  Size: ${stat.size} / ${stat.maxSize} (${fillPercent}% full)\n`;
            output += `  Hits: ${stat.hits} (${hitRatePercent}%)\n`;
            output += `  Misses: ${stat.misses} (${missRatePercent}%)\n`;
        }
        return output;
    }
}
/**
 * Global cache manager instance
 * Use this singleton for all cache registration and management
 */
export const cacheManager = new CacheManager();
//# sourceMappingURL=cache-manager.js.map