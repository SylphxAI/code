/**
 * Tests for Query Handlers
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany, belongsTo } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';
import { generateGetById, generateList } from '../../codegen/query-handlers.js';
import { createLoader } from '../../loader/resource-loader.js';
import type { QueryContext } from '../../resource/types.js';

describe('Query Handlers', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	const mockDb = {};
	const mockEventStream = {
		publish: async () => {},
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

	describe('generateGetById', () => {
		it('should generate getById handler', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateGetById(Message.definition);

			expect(handler).toHaveProperty('query');
			expect(handler).toHaveProperty('subscribe');
			expect(typeof handler.query).toBe('function');
		});

		it('should load entity from loader', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
			});

			const handler = generateGetById(Message.definition);
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				role: 'user',
			});

			const result = await handler.query({ id: 'msg-1' }, {}, ctx);

			expect(result).toEqual({
				id: 'msg-1',
				role: 'user',
			});
		});

		it('should return null for non-existent entity', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateGetById(Message.definition);
			const ctx = createMockContext();

			const result = await handler.query({ id: 'missing' }, {}, ctx);

			expect(result).toBeNull();
		});

		it('should apply field selection', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
			});

			const handler = generateGetById(Message.definition);
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				role: 'user',
				content: 'Hello',
			});

			const result = await handler.query(
				{ id: 'msg-1' },
				{
					select: {
						id: true,
						role: true,
						// content not selected
					},
				},
				ctx
			);

			expect(result).toEqual({
				id: 'msg-1',
				role: 'user',
			});
			expect(result).not.toHaveProperty('content');
		});

		it('should handle relationship inclusion', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const Step = defineResource({
				name: 'step',
				fields: z.object({ id: z.string(), message_id: z.string() }),
			});

			const handler = generateGetById(Message.definition);
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', { id: 'msg-1' });

			const result = await handler.query(
				{ id: 'msg-1' },
				{
					include: {
						steps: true,
					},
				},
				ctx
			);

			// Relationship loading returns null (DB integration pending)
			expect(result).toHaveProperty('steps');
			expect(result.steps).toBeNull();
		});
	});

	describe('generateList', () => {
		it('should generate list handler', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateList(Message.definition);

			expect(handler).toHaveProperty('query');
			expect(handler).toHaveProperty('subscribe');
			expect(typeof handler.query).toBe('function');
		});

		it('should return empty array (DB integration pending)', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateList(Message.definition);
			const ctx = createMockContext();

			const result = await handler.query({}, {}, ctx);

			expect(result).toEqual([]);
		});

		it('should accept list options', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
			});

			const handler = generateList(Message.definition);
			const ctx = createMockContext();

			// Should not throw
			const result = await handler.query(
				{
					where: { role: 'user' },
					orderBy: { id: 'asc' },
					limit: 10,
					offset: 0,
				},
				{},
				ctx
			);

			expect(result).toEqual([]);
		});
	});

	describe('Subscription Handlers', () => {
		it('should have subscribe method on getById', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateGetById(Message.definition);

			expect(handler.subscribe).toBeDefined();
			expect(typeof handler.subscribe).toBe('function');
		});

		it('should return subscription object', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const handler = generateGetById(Message.definition);
			const ctx = createMockContext();

			const subscription = handler.subscribe!(
				{ id: 'msg-1' },
				{},
				{},
				ctx
			);

			expect(subscription).toHaveProperty('unsubscribe');
			expect(typeof subscription.unsubscribe).toBe('function');
		});
	});
});
