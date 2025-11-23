/**
 * Subscription System
 *
 * Real-time updates for resources
 *
 * @example
 * ```typescript
 * import { SubscriptionManager } from '@sylphx/lens/subscription';
 *
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

// Subscription Manager
export { SubscriptionManager, createSubscriptionManager } from './manager.js';

// Types
export type {
	ResourceEvent,
	ResourceEventType,
	ResourceCreatedEvent,
	ResourceUpdatedEvent,
	ResourceDeletedEvent,
	RelationshipAddedEvent,
	RelationshipRemovedEvent,
	SubscriptionContext,
	SubscriptionOptions,
	QueryResult,
	ListQueryResult,
} from './types.js';
