/**
 * Tests for API Generator
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany, belongsTo } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';
import { generateResourceAPI, generateAllAPIs } from '../../codegen/api-generator.js';
import { createLoader } from '../../loader/resource-loader.js';
import type { QueryContext } from '../../resource/types.js';

describe('API Generator', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	const mockDb = {}; // Mock database
	const mockEventStream = {
		publish: async (channel: string, event: any) => {
			console.log(`[Test] Published to ${channel}:`, event);
		},
		subscribe: (channel: string) => {
			throw new Error('Not implemented in tests');
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

	describe('generateResourceAPI', () => {
		it('should generate complete API for resource', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
			});

			const api = generateResourceAPI(Message.definition);

			expect(api).toHaveProperty('getById');
			expect(api).toHaveProperty('list');
			expect(api).toHaveProperty('create');
			expect(api).toHaveProperty('update');
			expect(api).toHaveProperty('delete');
		});

		it('should generate query handlers with correct structure', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const api = generateResourceAPI(Message.definition);

			// Query handlers should have query and subscribe methods
			expect(api.get).toHaveProperty('query');
			expect(api.get).toHaveProperty('subscribe');
			expect(api.list).toHaveProperty('query');
			expect(api.list).toHaveProperty('subscribe');
		});

		it('should generate mutation handlers', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const api = generateResourceAPI(Message.definition);

			// Mutation handlers should be functions
			expect(typeof api.create).toBe('function');
			expect(typeof api.update).toBe('function');
			expect(typeof api.delete).toBe('function');
		});
	});

	describe('generateAllAPIs', () => {
		it('should generate APIs for multiple resources', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const Step = defineResource({
				name: 'step',
				fields: z.object({ id: z.string(), message_id: z.string() }),
			});

			const apis = generateAllAPIs([Message.definition, Step.definition]);

			expect(apis).toHaveProperty('message');
			expect(apis).toHaveProperty('step');
			expect(apis.message).toHaveProperty('getById');
			expect(apis.step).toHaveProperty('getById');
		});

		it('should generate independent APIs', () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const Step = defineResource({
				name: 'step',
				fields: z.object({ id: z.string() }),
			});

			const apis = generateAllAPIs([Message.definition, Step.definition]);

			// Each API should be independent
			expect(apis.message).not.toBe(apis.step);
		});
	});

	describe('Generated API - Integration', () => {
		it('should execute getById query', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
			});

			const api = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				role: 'user',
			});

			const result = await api.get.query({ id: 'msg-1' }, {}, ctx);

			expect(result).toEqual({
				id: 'msg-1',
				role: 'user',
			});
		});

		it('should execute list query', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
			});

			const api = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			// List returns empty array (DB integration pending)
			const result = await api.list.query({}, {}, ctx);

			expect(result).toEqual([]);
		});

		it('should execute create mutation', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
			});

			const api = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			const result = await api.create(
				{
					id: 'msg-1',
					role: 'user',
					content: 'Hello',
				},
				{},
				ctx
			);

			expect(result).toMatchObject({
				id: expect.any(String),
				role: 'user',
				content: 'Hello',
			});
		});

		it('should execute update mutation', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
			});

			const api = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				role: 'user',
				content: 'Original',
			});

			const result = await api.update(
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
		});

		it('should execute delete mutation', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const api = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			// Should not throw
			await expect(api.delete({ id: 'msg-1' }, {}, ctx)).resolves.toBeUndefined();
		});
	});
});
