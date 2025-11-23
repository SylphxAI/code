/**
 * Tests for Mutation Handlers
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { ResourceRegistry } from '../../resource/registry.js';
import {
	generateCreate,
	generateUpdate,
	generateDelete,
} from '../../codegen/mutation-handlers.js';
import { createLoader } from '../../loader/resource-loader.js';
import type { QueryContext } from '../../resource/types.js';

describe('Mutation Handlers', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	const mockDb = {};
	const mockEventStream = {
		publish: async (channel: string, event: any) => {
			console.log(`[Test] Published to ${channel}:`, event);
		},
		subscribe: () => {
			throw new Error('Not implemented');
		},
	};

	function createMockContext(): QueryContext {
		return {
			loader: createLoader(mockDb),
			db: mockDb,
			eventStream: mockEventStream as any,
			requestId: 'test-req-1',
		};
	}

	describe('generateCreate', () => {
		it('should generate create handler', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
			});

			const handler = generateCreate(Message.definition);

			expect(typeof handler).toBe('function');
		});

		it('should create entity with provided ID', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
			});

			const handler = generateCreate(Message.definition);
			const ctx = createMockContext();

			const result = await handler(
				{
					id: 'msg-1',
					role: 'user',
					content: 'Hello',
				},
				{},
				ctx
			);

			expect(result).toMatchObject({
				id: 'msg-1', // Should use provided ID
				role: 'user',
				content: 'Hello',
			});
		});

		it('should validate input with schema', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
			});

			const handler = generateCreate(Message.definition);
			const ctx = createMockContext();

			// Invalid role should throw
			await expect(
				handler(
					{
						id: 'msg-1',
						role: 'invalid' as any,
					},
					{},
					ctx
				)
			).rejects.toThrow();
		});

		it('should execute beforeCreate hook', async () => {
			let hookCalled = false;

			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
				hooks: {
					beforeCreate: async (data) => {
						hookCalled = true;
						return { ...data, role: 'assistant' as const };
					},
				},
			});

			const handler = generateCreate(Message.definition);
			const ctx = createMockContext();

			const result = await handler(
				{
					id: 'msg-1',
					role: 'user',
				},
				{},
				ctx
			);

			expect(hookCalled).toBe(true);
			expect(result.role).toBe('assistant'); // Modified by hook
		});

		it('should execute afterCreate hook', async () => {
			let hookCalled = false;

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				hooks: {
					afterCreate: async (entity) => {
						hookCalled = true;
					},
				},
			});

			const handler = generateCreate(Message.definition);
			const ctx = createMockContext();

			await handler({ id: 'msg-1' }, {}, ctx);

			expect(hookCalled).toBe(true);
		});

		it('should skip hooks when skipHooks is true', async () => {
			let hookCalled = false;

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				hooks: {
					beforeCreate: async (data) => {
						hookCalled = true;
						return data;
					},
				},
			});

			const handler = generateCreate(Message.definition);
			const ctx = createMockContext();

			await handler({ id: 'msg-1' }, { skipHooks: true }, ctx);

			expect(hookCalled).toBe(false);
		});
	});

	describe('generateUpdate', () => {
		it('should generate update handler', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateUpdate(Message.definition);

			expect(typeof handler).toBe('function');
		});

		it('should update entity and clear cache', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
			});

			const handler = generateUpdate(Message.definition);
			const ctx = createMockContext();

			// Prime cache with original
			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				role: 'user',
				content: 'Original',
			});

			const result = await handler(
				{
					where: { id: 'msg-1' },
					data: { content: 'Updated' },
				},
				{},
				ctx
			);

			expect(result).toMatchObject({
				id: 'msg-1',
				role: 'user',
				content: 'Updated',
			});

			// Cache should be updated
			const cached = await ctx.loader.load('message', 'msg-1');
			expect(cached).toEqual(result);
		});

		it('should validate partial update', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
			});

			const handler = generateUpdate(Message.definition);
			const ctx = createMockContext();

			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				role: 'user',
			});

			// Invalid role should throw
			await expect(
				handler(
					{
						where: { id: 'msg-1' },
						data: { role: 'invalid' as any },
					},
					{},
					ctx
				)
			).rejects.toThrow();
		});

		it('should execute beforeUpdate hook', async () => {
			let hookCalled = false;

			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					content: z.string(),
				}),
				hooks: {
					beforeUpdate: async (id, data) => {
						hookCalled = true;
						return { ...data, content: 'Modified by hook' };
					},
				},
			});

			const handler = generateUpdate(Message.definition);
			const ctx = createMockContext();

			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				content: 'Original',
			});

			const result = await handler(
				{
					where: { id: 'msg-1' },
					data: { content: 'Updated' },
				},
				{},
				ctx
			);

			expect(hookCalled).toBe(true);
			expect(result.content).toBe('Modified by hook');
		});

		it('should execute afterUpdate hook', async () => {
			let hookCalled = false;

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string(), content: z.string() }),
				hooks: {
					afterUpdate: async (entity) => {
						hookCalled = true;
					},
				},
			});

			const handler = generateUpdate(Message.definition);
			const ctx = createMockContext();

			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				content: 'Original',
			});

			await handler(
				{
					where: { id: 'msg-1' },
					data: { content: 'Updated' },
				},
				{},
				ctx
			);

			expect(hookCalled).toBe(true);
		});
	});

	describe('generateDelete', () => {
		it('should generate delete handler', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateDelete(Message.definition);

			expect(typeof handler).toBe('function');
		});

		it('should delete entity and clear cache', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateDelete(Message.definition);
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', { id: 'msg-1' });

			// Delete
			await handler({ id: 'msg-1' }, {}, ctx);

			// Cache should be cleared
			const cached = await ctx.loader.load('message', 'msg-1');
			expect(cached).toBeNull();
		});

		it('should execute beforeDelete hook', async () => {
			let hookCalled = false;

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				hooks: {
					beforeDelete: async (id) => {
						hookCalled = true;
					},
				},
			});

			const handler = generateDelete(Message.definition);
			const ctx = createMockContext();

			await handler({ id: 'msg-1' }, {}, ctx);

			expect(hookCalled).toBe(true);
		});

		it('should execute afterDelete hook', async () => {
			let hookCalled = false;

			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				hooks: {
					afterDelete: async (id) => {
						hookCalled = true;
					},
				},
			});

			const handler = generateDelete(Message.definition);
			const ctx = createMockContext();

			await handler({ id: 'msg-1' }, {}, ctx);

			expect(hookCalled).toBe(true);
		});
	});
});
