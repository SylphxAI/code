/**
 * Subscription System Types
 *
 * ARCHITECTURE:
 * - Event-driven real-time updates
 * - Observable-based subscription pattern
 * - Automatic cache invalidation
 */

import type { Observable } from 'rxjs';
import type {
	ResourceDefinition,
	SelectionSet,
	EventStream,
	ResourceLoader,
} from '../resource/types.js';

/**
 * Resource event types
 */
export type ResourceEventType =
	| 'resource:created'
	| 'resource:updated'
	| 'resource:deleted'
	| 'relationship:added'
	| 'relationship:removed';

/**
 * Base resource event
 */
export interface BaseResourceEvent {
	type: ResourceEventType;
	resource: string;
	timestamp: number;
}

/**
 * Resource created event
 */
export interface ResourceCreatedEvent extends BaseResourceEvent {
	type: 'resource:created';
	entity: any;
}

/**
 * Resource updated event
 */
export interface ResourceUpdatedEvent extends BaseResourceEvent {
	type: 'resource:updated';
	id: string;
	changes: Record<string, any>;
	entity: any;
}

/**
 * Resource deleted event
 */
export interface ResourceDeletedEvent extends BaseResourceEvent {
	type: 'resource:deleted';
	id: string;
}

/**
 * Relationship added event
 * Fired when a relationship is established (e.g., new step added to message)
 */
export interface RelationshipAddedEvent extends BaseResourceEvent {
	type: 'relationship:added';
	parentId: string;
	relationshipName: string;
	childId: string;
}

/**
 * Relationship removed event
 */
export interface RelationshipRemovedEvent extends BaseResourceEvent {
	type: 'relationship:removed';
	parentId: string;
	relationshipName: string;
	childId: string;
}

/**
 * Union of all resource events
 */
export type ResourceEvent =
	| ResourceCreatedEvent
	| ResourceUpdatedEvent
	| ResourceDeletedEvent
	| RelationshipAddedEvent
	| RelationshipRemovedEvent;

/**
 * Subscription context
 * Available to subscription handlers
 */
export interface SubscriptionContext {
	eventStream: EventStream;
	loader: ResourceLoader;
	db: any;
	userId?: string;
	requestId: string;
}

/**
 * Subscription options
 */
export interface SubscriptionOptions {
	/** Include relationship updates */
	includeRelationships?: boolean;

	/** Debounce time in ms (default: 0) */
	debounce?: number;

	/** Buffer time in ms (default: 0) */
	buffer?: number;

	/** Skip initial fetch */
	skipInitial?: boolean;
}

/**
 * Query result with subscription
 */
export interface QueryResult<T> {
	/** Current data */
	data: T;

	/** Observable for updates */
	updates$: Observable<T>;

	/** Unsubscribe function */
	unsubscribe: () => void;
}

/**
 * List query result with subscription
 */
export interface ListQueryResult<T> {
	/** Current data */
	data: T[];

	/** Observable for updates */
	updates$: Observable<T[]>;

	/** Unsubscribe function */
	unsubscribe: () => void;
}
