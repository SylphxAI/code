/**
 * End-to-End Integration Tests
 *
 * Tests the complete resource system flow:
 * - Resource definition
 * - API generation
 * - Query execution
 * - Mutations
 * - Subscriptions
 * - DataLoader batching
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Subject } from 'rxjs';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany, belongsTo } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';
import { generateResourceAPI } from '../../codegen/api-generator.js';
import { createLoader } from '../../loader/resource-loader.js';
import type { QueryContext } from '../../resource/types.js';

describe('End-to-End Integration', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	const mockDb = {};

	function createMockContext(): QueryContext {
		const eventSubjects = new Map<string, Subject<any>>();

		return {
			loader: createLoader(mockDb),
			db: mockDb,
			eventStream: {
				publish: async (channel: string, event: any) => {
					const subject = eventSubjects.get(channel);
					if (subject) {
						subject.next(event);
					}
				},
				subscribe: (channel: string) => {
					if (!eventSubjects.has(channel)) {
						eventSubjects.set(channel, new Subject());
					}
					return eventSubjects.get(channel)!.asObservable();
				},
			},
			requestId: 'test-req-1',
		};
	}

	describe('Complete Resource Lifecycle', () => {
		it('should support full CRUD + subscription flow', async () => {
			// Define resource
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const Step = defineResource({
				name: 'step',
				fields: z.object({
					id: z.string(),
					message_id: z.string(),
					type: z.string(),
				}),
				relationships: {
					message: belongsTo('message', { foreignKey: 'message_id' }),
				},
			});

			// Generate APIs
			const messageAPI = generateResourceAPI(Message.definition);
			const stepAPI = generateResourceAPI(Step.definition);

			const ctx = createMockContext();

			// CREATE
			const created = await messageAPI.create(
				{
					id: 'msg-1',
					role: 'user',
					content: 'Hello',
				},
				{},
				ctx
			);

			expect(created).toMatchObject({
				id: 'msg-1',
				role: 'user',
				content: 'Hello',
			});

			// READ (getById)
			ctx.loader.prime('message', 'msg-1', created);
			const fetched = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);

			expect(fetched).toEqual(created);

			// UPDATE
			const updated = await messageAPI.update(
				{
					where: { id: 'msg-1' },
					data: { content: 'Updated' },
				},
				{},
				ctx
			);

			expect(updated.content).toBe('Updated');

			// DELETE
			await messageAPI.delete({ id: 'msg-1' }, {}, ctx);

			// Verify deleted (cache cleared)
			const afterDelete = await ctx.loader.load('message', 'msg-1');
			expect(afterDelete).toBeNull();
		});

		it('should support relationships', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					content: z.string(),
				}),
				relationships: {
					steps: hasMany('step', { foreignKey: 'message_id' }),
				},
			});

			const Step = defineResource({
				name: 'step',
				fields: z.object({
					id: z.string(),
					message_id: z.string(),
					type: z.string(),
				}),
			});

			const messageAPI = generateResourceAPI(Message.definition);
			const stepAPI = generateResourceAPI(Step.definition);

			const ctx = createMockContext();

			// Create message
			const message = await messageAPI.create(
				{
					id: 'msg-1',
					content: 'Hello',
				},
				{},
				ctx
			);

			// Create steps
			const step1 = await stepAPI.create(
				{
					id: 'step-1',
					message_id: 'msg-1',
					type: 'thinking',
				},
				{},
				ctx
			);

			const step2 = await stepAPI.create(
				{
					id: 'step-2',
					message_id: 'msg-1',
					type: 'action',
				},
				{},
				ctx
			);

			expect(step1.message_id).toBe('msg-1');
			expect(step2.message_id).toBe('msg-1');
		});

		it('should support lifecycle hooks', async () => {
			const hooksCalled: string[] = [];

			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					content: z.string(),
				}),
				hooks: {
					beforeCreate: async (data) => {
						hooksCalled.push('beforeCreate');
						return { ...data, content: data.content?.toUpperCase() };
					},
					afterCreate: async (entity) => {
						hooksCalled.push('afterCreate');
					},
					beforeUpdate: async (id, data) => {
						hooksCalled.push('beforeUpdate');
						return data;
					},
					afterUpdate: async (entity) => {
						hooksCalled.push('afterUpdate');
					},
					beforeDelete: async (id) => {
						hooksCalled.push('beforeDelete');
					},
					afterDelete: async (id) => {
						hooksCalled.push('afterDelete');
					},
				},
			});

			const messageAPI = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			// Create
			const created = await messageAPI.create(
				{
					id: 'msg-1',
					content: 'hello',
				},
				{},
				ctx
			);

			expect(created.content).toBe('HELLO'); // Modified by hook
			expect(hooksCalled).toContain('beforeCreate');
			expect(hooksCalled).toContain('afterCreate');

			// Update
			ctx.loader.prime('message', 'msg-1', created);
			await messageAPI.update(
				{
					where: { id: 'msg-1' },
					data: { content: 'world' },
				},
				{},
				ctx
			);

			expect(hooksCalled).toContain('beforeUpdate');
			expect(hooksCalled).toContain('afterUpdate');

			// Delete
			await messageAPI.delete({ id: 'msg-1' }, {}, ctx);

			expect(hooksCalled).toContain('beforeDelete');
			expect(hooksCalled).toContain('afterDelete');
		});

		it('should publish events for subscriptions', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					content: z.string(),
				}),
			});

			const messageAPI = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			const events: any[] = [];
			ctx.eventStream.subscribe('resource:message:created').subscribe((event) => {
				events.push(event);
			});

			ctx.eventStream
				.subscribe('resource:message:msg-1:updated')
				.subscribe((event) => {
					events.push(event);
				});

			// Create
			const created = await messageAPI.create(
				{
					id: 'msg-1',
					content: 'Hello',
				},
				{},
				ctx
			);

			// Update
			ctx.loader.prime('message', 'msg-1', created);
			await messageAPI.update(
				{
					where: { id: 'msg-1' },
					data: { content: 'Updated' },
				},
				{},
				ctx
			);

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(events.length).toBeGreaterThanOrEqual(2);
			expect(events[0].type).toBe('resource:created');
			expect(events[1].type).toBe('resource:updated');
		});
	});

	describe('DataLoader Integration', () => {
		it('should batch multiple loads in same tick', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string(), content: z.string() }),
			});

			const messageAPI = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			// Prime cache with data
			ctx.loader.prime('message', 'msg-1', { id: 'msg-1', content: 'One' });
			ctx.loader.prime('message', 'msg-2', { id: 'msg-2', content: 'Two' });
			ctx.loader.prime('message', 'msg-3', { id: 'msg-3', content: 'Three' });

			// Load multiple in parallel (should batch)
			const [m1, m2, m3] = await Promise.all([
				messageAPI.getById.query({ id: 'msg-1' }, {}, ctx),
				messageAPI.getById.query({ id: 'msg-2' }, {}, ctx),
				messageAPI.getById.query({ id: 'msg-3' }, {}, ctx),
			]);

			expect(m1?.content).toBe('One');
			expect(m2?.content).toBe('Two');
			expect(m3?.content).toBe('Three');
		});

		it('should cache loaded values', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const messageAPI = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', { id: 'msg-1' });

			// Load twice
			const r1 = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);
			const r2 = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);

			// Should return same instance (cached)
			expect(r1).toBe(r2);
		});
	});

	describe('Type Safety', () => {
		it('should validate create input with Zod', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
				}),
			});

			const messageAPI = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			// Invalid role should throw
			await expect(
				messageAPI.create(
					{
						id: 'msg-1',
						role: 'invalid' as any,
					},
					{},
					ctx
				)
			).rejects.toThrow();
		});

		it('should validate update input with Zod', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					count: z.number(),
				}),
			});

			const messageAPI = generateResourceAPI(Message.definition);
			const ctx = createMockContext();

			ctx.loader.prime('message', 'msg-1', { id: 'msg-1', count: 0 });

			// Invalid type should throw
			await expect(
				messageAPI.update(
					{
						where: { id: 'msg-1' },
						data: { count: 'invalid' as any },
					},
					{},
					ctx
				)
			).rejects.toThrow();
		});
	});
});
