/**
 * LRU (Least Recently Used) Cache
 * Evicts oldest entry when size limit reached
 *
 * Use cases:
 * - Base context token cache (max 100 entries)
 * - Message token cache (max 1000 entries)
 */

export class LRUCache<K, V> {
	private cache: Map<K, V>;
	private maxSize: number;

	constructor(maxSize: number) {
		this.cache = new Map<K, V>();
		this.maxSize = maxSize;
	}

	/**
	 * Get value from cache
	 * Moves entry to end (most recently used)
	 */
	get(key: K): V | undefined {
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
	set(key: K, value: V): void {
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
	has(key: K): boolean {
		return this.cache.has(key);
	}

	/**
	 * Get cache size
	 */
	get size(): number {
		return this.cache.size;
	}

	/**
	 * Clear all entries
	 */
	clear(): void {
		this.cache.clear();
	}

	/**
	 * Delete specific entry
	 */
	delete(key: K): boolean {
		return this.cache.delete(key);
	}
}
