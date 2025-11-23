/**
 * Tests for Subscription Manager
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { Subject } from 'rxjs';
import { z } from 'zod';
import { defineResource } from '../../resource/define-resource.js';
import { hasMany } from '../../resource/relationships.js';
import { ResourceRegistry } from '../../resource/registry.js';
import { SubscriptionManager } from '../../subscription/manager.js';
import { createLoader } from '../../loader/resource-loader.js';
import type { SubscriptionContext } from '../../subscription/types.js';

describe('Subscription Manager', () => {
	beforeEach(() => {
		ResourceRegistry.clear();
	});

	const mockDb = {};

	function createMockContext(): SubscriptionContext {
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

	describe('subscribeToResource', () => {
		it('should create subscription to resource', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				role: 'user',
				content: 'Original',
			});

			const observable = await manager.subscribeToResource(
				Message.definition,
				'msg-1',
				{},
				ctx
			);

			expect(observable).toBeDefined();
		});

		it('should emit initial value', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					role: z.enum(['user', 'assistant']),
					content: z.string(),
				}),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				role: 'user',
				content: 'Original',
			});

			const observable = await manager.subscribeToResource(
				Message.definition,
				'msg-1',
				{},
				ctx
			);

			const values: any[] = [];
			const subscription = observable.subscribe((value) => {
				values.push(value);
			});

			// Wait for initial value
			await new Promise((resolve) => setTimeout(resolve, 100));

			expect(values.length).toBeGreaterThan(0);
			expect(values[0]).toMatchObject({
				id: 'msg-1',
				role: 'user',
				content: 'Original',
			});

			subscription.unsubscribe();
		});

		it('should emit updates when resource changes', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({
					id: z.string(),
					content: z.string(),
				}),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', {
				id: 'msg-1',
				content: 'Original',
			});

			const observable = await manager.subscribeToResource(
				Message.definition,
				'msg-1',
				{},
				ctx
			);

			const values: any[] = [];
			const subscription = observable.subscribe((value) => {
				values.push(value);
			});

			// Wait for initial
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Publish update event
			await ctx.eventStream.publish('resource:message:msg-1', {
				type: 'resource:updated',
				resource: 'message',
				id: 'msg-1',
				changes: { content: 'Updated' },
				timestamp: Date.now(),
			});

			// Wait for update
			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(values.length).toBeGreaterThanOrEqual(2);
			expect(values[values.length - 1]).toMatchObject({
				id: 'msg-1',
				content: 'Updated',
			});

			subscription.unsubscribe();
		});

		it('should emit null when resource is deleted', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			// Prime cache
			ctx.loader.prime('message', 'msg-1', { id: 'msg-1' });

			const observable = await manager.subscribeToResource(
				Message.definition,
				'msg-1',
				{},
				ctx
			);

			const values: any[] = [];
			const subscription = observable.subscribe((value) => {
				values.push(value);
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Publish delete event
			await ctx.eventStream.publish('resource:message:msg-1', {
				type: 'resource:deleted',
				resource: 'message',
				id: 'msg-1',
				timestamp: Date.now(),
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(values[values.length - 1]).toBeNull();

			subscription.unsubscribe();
		});

		it('should skip initial value when skipInitial is true', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			const observable = await manager.subscribeToResource(
				Message.definition,
				'msg-1',
				{ skipInitial: true },
				ctx
			);

			const values: any[] = [];
			const subscription = observable.subscribe((value) => {
				values.push(value);
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Should start with null (no initial fetch)
			expect(values[0]).toBeNull();

			subscription.unsubscribe();
		});
	});

	describe('subscribeToList', () => {
		it('should create list subscription', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			const observable = await manager.subscribeToList(Message.definition, {}, ctx);

			expect(observable).toBeDefined();
		});

		it('should emit empty list initially', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			const observable = await manager.subscribeToList(Message.definition, {}, ctx);

			const values: any[] = [];
			const subscription = observable.subscribe((value) => {
				values.push(value);
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			expect(values.length).toBeGreaterThan(0);
			expect(values[0]).toEqual([]);

			subscription.unsubscribe();
		});

		it('should add created resources to list', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string(), content: z.string() }),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			const observable = await manager.subscribeToList(Message.definition, {}, ctx);

			const values: any[] = [];
			const subscription = observable.subscribe((value) => {
				values.push(value);
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Publish create event
			await ctx.eventStream.publish('resource:message', {
				type: 'resource:created',
				resource: 'message',
				entity: { id: 'msg-1', content: 'Hello' },
				timestamp: Date.now(),
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			const lastValue = values[values.length - 1];
			expect(lastValue).toHaveLength(1);
			expect(lastValue[0]).toMatchObject({
				id: 'msg-1',
				content: 'Hello',
			});

			subscription.unsubscribe();
		});

		it('should update resources in list', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string(), content: z.string() }),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			const observable = await manager.subscribeToList(Message.definition, {}, ctx);

			const values: any[] = [];
			const subscription = observable.subscribe((value) => {
				values.push(value);
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Add item
			await ctx.eventStream.publish('resource:message', {
				type: 'resource:created',
				resource: 'message',
				entity: { id: 'msg-1', content: 'Original' },
				timestamp: Date.now(),
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Update item
			await ctx.eventStream.publish('resource:message', {
				type: 'resource:updated',
				resource: 'message',
				id: 'msg-1',
				changes: { content: 'Updated' },
				timestamp: Date.now(),
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			const lastValue = values[values.length - 1];
			expect(lastValue[0]).toMatchObject({
				id: 'msg-1',
				content: 'Updated',
			});

			subscription.unsubscribe();
		});

		it('should remove deleted resources from list', async () => {
			const Message = defineResource({
				name: 'message',
				fields: z.object({ id: z.string() }),
			});

			const manager = new SubscriptionManager();
			const ctx = createMockContext();

			const observable = await manager.subscribeToList(Message.definition, {}, ctx);

			const values: any[] = [];
			const subscription = observable.subscribe((value) => {
				values.push(value);
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Add item
			await ctx.eventStream.publish('resource:message', {
				type: 'resource:created',
				resource: 'message',
				entity: { id: 'msg-1' },
				timestamp: Date.now(),
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			// Delete item
			await ctx.eventStream.publish('resource:message', {
				type: 'resource:deleted',
				resource: 'message',
				id: 'msg-1',
				timestamp: Date.now(),
			});

			await new Promise((resolve) => setTimeout(resolve, 50));

			const lastValue = values[values.length - 1];
			expect(lastValue).toEqual([]);

			subscription.unsubscribe();
		});
	});
});
