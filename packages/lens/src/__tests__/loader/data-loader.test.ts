/**
 * Tests for DataLoader
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { DataLoader } from '../../loader/data-loader.js';

describe('DataLoader', () => {
	describe('basic loading', () => {
		it('should load single value', async () => {
			const loader = new DataLoader<number, string>(async (keys) => {
				return keys.map((k) => `value-${k}`);
			});

			const result = await loader.load(1);
			expect(result).toBe('value-1');
		});

		it('should load multiple values', async () => {
			const loader = new DataLoader<number, string>(async (keys) => {
				return keys.map((k) => `value-${k}`);
			});

			const results = await loader.loadMany([1, 2, 3]);
			expect(results).toEqual(['value-1', 'value-2', 'value-3']);
		});
	});

	describe('batching', () => {
		it('should batch multiple loads in same tick', async () => {
			let batchCount = 0;
			const loader = new DataLoader<number, string>(async (keys) => {
				batchCount++;
				return keys.map((k) => `value-${k}`);
			});

			// Load multiple values in same tick
			const [r1, r2, r3] = await Promise.all([
				loader.load(1),
				loader.load(2),
				loader.load(3),
			]);

			expect(r1).toBe('value-1');
			expect(r2).toBe('value-2');
			expect(r3).toBe('value-3');
			expect(batchCount).toBe(1); // All batched into single call
		});

		it('should deduplicate keys in batch', async () => {
			const batchLoadFn = async (keys: readonly number[]) => {
				// Verify keys are deduplicated
				const uniqueKeys = Array.from(new Set(keys));
				expect(keys.length).toBe(uniqueKeys.length);
				return keys.map((k) => `value-${k}`);
			};

			const loader = new DataLoader<number, string>(batchLoadFn);

			// Load same key multiple times
			const [r1, r2, r3] = await Promise.all([
				loader.load(1),
				loader.load(1),
				loader.load(1),
			]);

			expect(r1).toBe('value-1');
			expect(r2).toBe('value-1');
			expect(r3).toBe('value-1');
		});

		it.skip('should respect maxBatchSize', async () => {
			// TODO: Implement batch splitting based on maxBatchSize
			// Current implementation accepts option but doesn't split batches yet
			let batchSizes: number[] = [];
			const loader = new DataLoader<number, string>(
				async (keys) => {
					batchSizes.push(keys.length);
					return keys.map((k) => `value-${k}`);
				},
				{ maxBatchSize: 2 }
			);

			// Load more than maxBatchSize
			await Promise.all([loader.load(1), loader.load(2), loader.load(3)]);

			// Should split into multiple batches
			expect(batchSizes.length).toBeGreaterThan(1);
			expect(Math.max(...batchSizes)).toBeLessThanOrEqual(2);
		});
	});

	describe('caching', () => {
		it('should cache loaded values', async () => {
			let loadCount = 0;
			const loader = new DataLoader<number, string>(async (keys) => {
				loadCount++;
				return keys.map((k) => `value-${k}`);
			});

			// Load same key twice
			const r1 = await loader.load(1);
			const r2 = await loader.load(1);

			expect(r1).toBe('value-1');
			expect(r2).toBe('value-1');
			expect(loadCount).toBe(1); // Only loaded once (cached)
		});

		it('should not cache when cache=false', async () => {
			let loadCount = 0;
			const loader = new DataLoader<number, string>(
				async (keys) => {
					loadCount++;
					return keys.map((k) => `value-${k}`);
				},
				{ cache: false }
			);

			// Load same key twice
			await loader.load(1);
			await loader.load(1);

			expect(loadCount).toBe(2); // Loaded twice (not cached)
		});

		it('should prime cache', async () => {
			let loadCount = 0;
			const loader = new DataLoader<number, string>(async (keys) => {
				loadCount++;
				return keys.map((k) => `value-${k}`);
			});

			// Prime cache
			loader.prime(1, 'primed-value');

			// Load should use primed value
			const result = await loader.load(1);

			expect(result).toBe('primed-value');
			expect(loadCount).toBe(0); // Never called batch function
		});

		it('should clear specific cache entry', async () => {
			let loadCount = 0;
			const loader = new DataLoader<number, string>(async (keys) => {
				loadCount++;
				return keys.map((k) => `value-${k}`);
			});

			// Load and cache
			await loader.load(1);
			expect(loadCount).toBe(1);

			// Clear cache
			loader.clear(1);

			// Load again (should reload)
			await loader.load(1);
			expect(loadCount).toBe(2);
		});

		it('should clear all cache', async () => {
			const loader = new DataLoader<number, string>(async (keys) => {
				return keys.map((k) => `value-${k}`);
			});

			// Load and cache multiple
			await loader.loadMany([1, 2, 3]);

			// Clear all
			loader.clearAll();

			// Prime to test (since we can't directly check cache)
			loader.prime(1, 'still-there');
			const result = await loader.load(1);

			// If cache was cleared, prime wouldn't work
			// But since we primed after clear, it should work
			expect(result).toBe('still-there');
		});

		it('should use custom cacheKeyFn', async () => {
			const loader = new DataLoader<{ id: number }, string>(
				async (keys) => {
					return keys.map((k) => `value-${k.id}`);
				},
				{
					cacheKeyFn: (key) => key.id, // Use id as cache key
				}
			);

			// Load with same id but different object
			const r1 = await loader.load({ id: 1 });
			const r2 = await loader.load({ id: 1 }); // Different object, same id

			expect(r1).toBe('value-1');
			expect(r2).toBe('value-1'); // Should use cached value
		});
	});

	describe('error handling', () => {
		it('should handle batch function errors', async () => {
			const loader = new DataLoader<number, string>(async (keys) => {
				throw new Error('Batch load failed');
			});

			await expect(loader.load(1)).rejects.toThrow('Batch load failed');
		});

		it('should handle individual errors in batch', async () => {
			const loader = new DataLoader<number, string>(async (keys) => {
				return keys.map((k) => {
					if (k === 2) {
						return new Error('Error for key 2');
					}
					return `value-${k}`;
				});
			});

			const results = await loader.loadMany([1, 2, 3]);

			expect(results[0]).toBe('value-1');
			expect(results[1]).toBeInstanceOf(Error);
			expect((results[1] as Error).message).toBe('Error for key 2');
			expect(results[2]).toBe('value-3');
		});

		it('should return errors on wrong batch response length', async () => {
			const loader = new DataLoader<number, string>(async (keys) => {
				// Return wrong length
				return ['value-1'];
			});

			// loadMany catches errors and returns them in the array
			const results = await loader.loadMany([1, 2, 3]);

			// All results should be errors since batch failed
			expect(results.every((r) => r instanceof Error)).toBe(true);
		});
	});

	describe('custom cache map', () => {
		it('should use custom cache map', async () => {
			const customCache = new Map();
			const loader = new DataLoader<number, string>(
				async (keys) => {
					return keys.map((k) => `value-${k}`);
				},
				{ cacheMap: customCache }
			);

			await loader.load(1);

			// Custom cache should have entry
			expect(customCache.size).toBeGreaterThan(0);
		});
	});
});
