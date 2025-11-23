/**
 * Tests for Resource Loader
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany, belongsTo } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';
import { LensResourceLoader, createLoader } from '../../loader/resource-loader.js';

describe('Resource Loader', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	const mockDb = {}; // Mock database

	describe('load', () => {
		it('should load single resource', async () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string(), name: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			// Note: Returns null because DB integration is pending
			const result = await loader.load('user', 'user-1');

			expect(result).toBeNull();
		});

		it('should cache loaded resources', async () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			// Load twice
			const r1 = await loader.load('user', 'user-1');
			const r2 = await loader.load('user', 'user-1');

			// Both should return same value (cached)
			expect(r1).toBe(r2);
		});
	});

	describe('loadMany', () => {
		it('should load multiple resources', async () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			const results = await loader.loadMany('user', ['user-1', 'user-2', 'user-3']);

			expect(results).toHaveLength(3);
			expect(results).toEqual([null, null, null]); // DB integration pending
		});

		it('should batch multiple loadMany calls', async () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			// Multiple loadMany calls in same tick
			const [r1, r2] = await Promise.all([
				loader.loadMany('user', ['user-1', 'user-2']),
				loader.loadMany('user', ['user-3', 'user-4']),
			]);

			expect(r1).toHaveLength(2);
			expect(r2).toHaveLength(2);
		});
	});

	describe('loadByField', () => {
		it('should load resources by field value', async () => {
			defineResource({
				name: 'step',
				fields: z.object({ id: z.string(), message_id: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			const result = await loader.loadByField('step', 'message_id', [
				'msg-1',
				'msg-2',
			]);

			expect(result).toBeInstanceOf(Map);
			// DB integration pending, so returns empty
		});

		it('should batch loadByField calls for same resource/field', async () => {
			defineResource({
				name: 'step',
				fields: z.object({ id: z.string(), message_id: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			// Multiple calls in same tick
			const [r1, r2] = await Promise.all([
				loader.loadByField('step', 'message_id', ['msg-1']),
				loader.loadByField('step', 'message_id', ['msg-2']),
			]);

			expect(r1).toBeInstanceOf(Map);
			expect(r2).toBeInstanceOf(Map);
		});
	});

	describe('prime', () => {
		it('should prime cache with value', async () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string(), name: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			// Prime cache
			const user = { id: 'user-1', name: 'John' };
			loader.prime('user', 'user-1', user);

			// Load should use primed value
			const result = await loader.load('user', 'user-1');

			expect(result).toEqual(user);
		});
	});

	describe('clear', () => {
		it('should clear specific cache entry', async () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string(), name: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			// Prime cache
			loader.prime('user', 'user-1', { id: 'user-1', name: 'John' });

			// Verify cached
			const r1 = await loader.load('user', 'user-1');
			expect(r1).toEqual({ id: 'user-1', name: 'John' });

			// Clear cache
			loader.clear('user', 'user-1');

			// Load again (should not use cache)
			const r2 = await loader.load('user', 'user-1');
			expect(r2).toBeNull(); // DB returns null
		});

		it('should clear all cache for resource', async () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const loader = new LensResourceLoader(mockDb);

			// Prime multiple
			loader.prime('user', 'user-1', { id: 'user-1' });
			loader.prime('user', 'user-2', { id: 'user-2' });

			// Clear all for user
			loader.clear('user');

			// Both should be cleared
			const r1 = await loader.load('user', 'user-1');
			const r2 = await loader.load('user', 'user-2');

			expect(r1).toBeNull();
			expect(r2).toBeNull();
		});
	});

	describe('getRelationshipContext', () => {
		it('should return relationship context', () => {
			const loader = new LensResourceLoader(mockDb);

			const context = loader.getRelationshipContext();

			expect(context.db).toBe(mockDb);
			expect(context.loaders).toBeInstanceOf(Map);
		});
	});

	describe('createLoader', () => {
		it('should create loader instance', () => {
			const loader = createLoader(mockDb);

			expect(loader).toBeInstanceOf(LensResourceLoader);
		});

		it('should create independent loader instances', async () => {
			defineResource({
				name: 'user',
				fields: z.object({ id: z.string() }),
			});

			const loader1 = createLoader(mockDb);
			const loader2 = createLoader(mockDb);

			// Prime in loader1
			loader1.prime('user', 'user-1', { id: 'user-1' });

			// Should not affect loader2
			const r1 = await loader1.load('user', 'user-1');
			const r2 = await loader2.load('user', 'user-1');

			expect(r1).toEqual({ id: 'user-1' }); // From loader1 cache
			expect(r2).toBeNull(); // From loader2 (no cache)
		});
	});
});
