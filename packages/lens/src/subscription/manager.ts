/**
 * Subscription Manager
 *
 * ARCHITECTURE:
 * - Manages resource subscriptions
 * - Merges events into cached data
 * - Handles nested relationship updates
 * - Provides Observable-based API
 */

import { Subject, Observable, merge, of } from 'rxjs';
import {
	map,
	filter,
	scan,
	startWith,
	shareReplay,
	debounceTime,
	bufferTime,
	mergeMap,
} from 'rxjs/operators';
import type {
	ResourceDefinition,
	SelectionSet,
	ResourceLoader,
	QueryOptions,
} from '../resource/types.js';
import type {
	SubscriptionContext,
	SubscriptionOptions,
	ResourceEvent,
	ResourceUpdatedEvent,
	ResourceDeletedEvent,
	RelationshipAddedEvent,
	RelationshipRemovedEvent,
} from './types.js';

/**
 * Subscription Manager
 *
 * Handles real-time subscriptions to resource changes
 *
 * @example
 * ```typescript
 * const manager = new SubscriptionManager();
 *
 * // Subscribe to single resource
 * const message$ = await manager.subscribeToResource(
 *   Message.definition,
 *   'msg-1',
 *   { include: { steps: true } },
 *   context
 * );
 *
 * message$.subscribe(message => {
 *   console.log('Updated:', message);
 * });
 * ```
 */
export class SubscriptionManager {
	/**
	 * Subscribe to a single resource
	 *
	 * Returns Observable that emits:
	 * - Initial data (unless skipInitial is true)
	 * - Updates when resource changes
	 * - null when resource is deleted
	 */
	async subscribeToResource<T>(
		resource: ResourceDefinition,
		id: string,
		options: QueryOptions & SubscriptionOptions,
		context: SubscriptionContext
	): Promise<Observable<T | null>> {
		// Fetch initial data
		const initial = options.skipInitial
			? null
			: await this.fetchResource<T>(resource, id, options, context);

		// Subscribe to resource channel
		const channel = `resource:${resource.name}:${id}`;
		const updates$ = context.eventStream.subscribe(channel);

		// Subscribe to global resource updates (for list queries)
		const globalChannel = `resource:${resource.name}`;
		const globalUpdates$ = context.eventStream.subscribe(globalChannel);

		// Merge both streams
		const events$ = merge(updates$, globalUpdates$).pipe(
			filter((event: any) => {
				// Filter events relevant to this resource instance
				if (event.type === 'resource:updated' && event.id === id) return true;
				if (event.type === 'resource:deleted' && event.id === id) return true;
				if (event.type === 'relationship:added' && event.parentId === id) return true;
				if (event.type === 'relationship:removed' && event.parentId === id)
					return true;
				return false;
			})
		);

		// Apply debounce/buffer if specified
		let processedEvents$ = events$;
		if (options.debounce) {
			processedEvents$ = processedEvents$.pipe(debounceTime(options.debounce));
		}
		if (options.buffer) {
			processedEvents$ = processedEvents$.pipe(
				bufferTime(options.buffer),
				filter((events) => events.length > 0),
				map((events) => events[events.length - 1]) // Take latest
			);
		}

		// Merge events into current state
		return processedEvents$.pipe(
			startWith(initial),
			scan(
				async (currentPromise: Promise<T | null>, event: any) => {
					const current = await currentPromise;

					if (!event) return initial; // Initial value

					return await this.applyEvent(current, event, resource, options, context);
				},
				Promise.resolve(initial)
			),
			mergeMap((promise) => promise), // Flatten promises
			shareReplay(1) // Share subscription and replay last value
		) as Observable<T | null>;
	}

	/**
	 * Subscribe to list of resources
	 *
	 * Returns Observable that emits updated list when:
	 * - Resource created (added to list)
	 * - Resource updated (updated in list)
	 * - Resource deleted (removed from list)
	 */
	async subscribeToList<T>(
		resource: ResourceDefinition,
		options: QueryOptions & SubscriptionOptions,
		context: SubscriptionContext
	): Promise<Observable<T[]>> {
		// PLACEHOLDER: Full implementation requires list query support
		console.warn(
			`[SubscriptionManager] List subscription for ${resource.name} - Full implementation pending`
		);

		// Subscribe to global resource channel
		const channel = `resource:${resource.name}`;
		const events$ = context.eventStream.subscribe(channel);

		// Start with empty list
		const initial: T[] = [];

		return events$.pipe(
			startWith(null),
			scan(async (currentPromise: Promise<T[]>, event: any) => {
				const current = await currentPromise;

				if (!event) return initial;

				return await this.applyListEvent(current, event, resource, options, context);
			}, Promise.resolve(initial)),
			mergeMap((promise) => promise),
			shareReplay(1)
		) as Observable<T[]>;
	}

	/**
	 * Fetch resource data
	 */
	private async fetchResource<T>(
		resource: ResourceDefinition,
		id: string,
		options: QueryOptions,
		context: SubscriptionContext
	): Promise<T | null> {
		// Load from loader (uses cache/batching)
		const entity = await context.loader.load<T>(resource.name, id);

		if (!entity) return null;

		// Handle field selection
		if (options.select) {
			return this.applySelection(entity, options.select);
		}

		// Handle relationship inclusion
		if (options.include) {
			return await this.loadRelationships(entity, options.include, resource, context);
		}

		return entity;
	}

	/**
	 * Apply event to current state
	 */
	private async applyEvent<T>(
		current: T | null,
		event: ResourceEvent,
		resource: ResourceDefinition,
		options: QueryOptions,
		context: SubscriptionContext
	): Promise<T | null> {
		switch (event.type) {
			case 'resource:updated':
				return this.applyUpdate(current, event, resource, options, context);

			case 'resource:deleted':
				return null; // Resource deleted

			case 'relationship:added':
			case 'relationship:removed':
				// Reload relationships
				if (current && options.includeRelationships !== false) {
					return await this.reloadRelationships(current, resource, options, context);
				}
				return current;

			default:
				return current;
		}
	}

	/**
	 * Apply update event to current state
	 */
	private async applyUpdate<T>(
		current: T | null,
		event: ResourceUpdatedEvent,
		resource: ResourceDefinition,
		options: QueryOptions,
		context: SubscriptionContext
	): Promise<T | null> {
		if (!current) {
			// If we don't have current state, fetch from loader
			return await this.fetchResource<T>(
				resource,
				event.id,
				options,
				context
			);
		}

		// Merge changes into current state
		const updated = {
			...current,
			...event.changes,
		};

		// Reload relationships if included
		if (options.include) {
			return await this.loadRelationships(
				updated,
				options.include,
				resource,
				context
			);
		}

		return updated as T;
	}

	/**
	 * Apply event to list
	 */
	private async applyListEvent<T>(
		current: T[],
		event: ResourceEvent,
		resource: ResourceDefinition,
		options: QueryOptions,
		context: SubscriptionContext
	): Promise<T[]> {
		switch (event.type) {
			case 'resource:created':
				// Add to list
				return [...current, event.entity as T];

			case 'resource:updated': {
				// Update in list
				const index = current.findIndex((item: any) => item.id === event.id);
				if (index === -1) return current;

				const updated = [...current];
				updated[index] = { ...updated[index], ...event.changes };
				return updated;
			}

			case 'resource:deleted': {
				// Remove from list
				return current.filter((item: any) => item.id !== event.id);
			}

			default:
				return current;
		}
	}

	/**
	 * Apply field selection
	 */
	private applySelection<T>(entity: T, selection: Record<string, any>): Partial<T> {
		const result: any = {};

		for (const [key, value] of Object.entries(selection)) {
			if (value === true && key in (entity as any)) {
				result[key] = (entity as any)[key];
			} else if (typeof value === 'object' && value.select) {
				if ((entity as any)[key]) {
					result[key] = this.applySelection((entity as any)[key], value.select);
				}
			}
		}

		return result;
	}

	/**
	 * Load relationships for entity
	 */
	private async loadRelationships<T>(
		entity: T,
		include: Record<string, boolean | QueryOptions>,
		resource: ResourceDefinition,
		context: SubscriptionContext
	): Promise<T> {
		const result = { ...entity };

		for (const [relationshipName, includeOptions] of Object.entries(include)) {
			const relationship = resource.relationships?.[relationshipName];

			if (!relationship) {
				console.warn(
					`[SubscriptionManager] Unknown relationship "${relationshipName}" on ${resource.name}`
				);
				continue;
			}

			// PLACEHOLDER: Full relationship loading
			console.warn(
				`[SubscriptionManager] Loading relationship ${resource.name}.${relationshipName} - Integration pending`
			);

			(result as any)[relationshipName] = null;
		}

		return result;
	}

	/**
	 * Reload relationships after relationship event
	 */
	private async reloadRelationships<T>(
		entity: T,
		resource: ResourceDefinition,
		options: QueryOptions,
		context: SubscriptionContext
	): Promise<T> {
		if (!options.include) return entity;

		return await this.loadRelationships(entity, options.include, resource, context);
	}
}

/**
 * Create subscription manager instance
 */
export function createSubscriptionManager(): SubscriptionManager {
	return new SubscriptionManager();
}
