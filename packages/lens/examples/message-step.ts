/**
 * Example: Message and Step Resources
 *
 * Demonstrates complete resource definition with:
 * - Relationships (hasMany, belongsTo)
 * - Lifecycle hooks
 * - Computed fields
 * - CRUD operations
 * - Subscriptions
 */

import { defineResource, hasMany, belongsTo } from '../src/resource';
import { generateResourceAPI } from '../src/codegen';
import { createLoader } from '../src/loader';
import { z } from 'zod';

// ============================================================================
// Resource Definitions
// ============================================================================

/**
 * Message Resource
 *
 * Represents a conversation message with steps
 */
export const Message = defineResource({
	name: 'message',

	fields: z.object({
		id: z.string(),
		session_id: z.string(),
		role: z.enum(['user', 'assistant', 'system']),
		content: z.string(),
		created_at: z.date(),
		updated_at: z.date(),
	}),

	relationships: {
		session: belongsTo('session', {
			foreignKey: 'session_id',
		}),

		steps: hasMany('step', {
			foreignKey: 'message_id',
			orderBy: { created_at: 'asc' },
		}),
	},

	computed: {
		// Computed field: word count
		wordCount: (message) => {
			return message.content.split(/\s+/).length;
		},

		// Async computed field: sentiment analysis
		sentiment: async (message, ctx) => {
			// PLACEHOLDER: Call sentiment analysis service
			return 'neutral';
		},
	},

	hooks: {
		beforeCreate: async (data) => {
			// Auto-set timestamps
			return {
				...data,
				created_at: new Date(),
				updated_at: new Date(),
			};
		},

		afterCreate: async (entity) => {
			// Send notification after message created
			console.log(`[Hook] Message created: ${entity.id}`);
		},

		beforeUpdate: async (id, data) => {
			// Auto-update timestamp
			return {
				...data,
				updated_at: new Date(),
			};
		},

		afterUpdate: async (entity) => {
			// Invalidate caches
			console.log(`[Hook] Message updated: ${entity.id}`);
		},

		beforeDelete: async (id) => {
			// Archive before deletion
			console.log(`[Hook] Archiving message: ${id}`);
		},

		afterDelete: async (id) => {
			// Cleanup related data
			console.log(`[Hook] Message deleted: ${id}`);
		},
	},

	tableName: 'messages', // Optional: override default table name
});

/**
 * Step Resource
 *
 * Represents a processing step within a message
 */
export const Step = defineResource({
	name: 'step',

	fields: z.object({
		id: z.string(),
		message_id: z.string(),
		type: z.enum(['thinking', 'action', 'observation']),
		output: z.string(),
		created_at: z.date(),
	}),

	relationships: {
		message: belongsTo('message', {
			foreignKey: 'message_id',
		}),
	},

	hooks: {
		beforeCreate: async (data) => {
			return {
				...data,
				created_at: new Date(),
			};
		},
	},

	tableName: 'steps',
});

/**
 * Session Resource (simplified)
 */
export const Session = defineResource({
	name: 'session',

	fields: z.object({
		id: z.string(),
		user_id: z.string(),
		title: z.string(),
		created_at: z.date(),
	}),

	relationships: {
		messages: hasMany('message', {
			foreignKey: 'session_id',
			orderBy: { created_at: 'asc' },
		}),
	},
});

// ============================================================================
// Generate APIs
// ============================================================================

export const messageAPI = generateResourceAPI(Message.definition);
export const stepAPI = generateResourceAPI(Step.definition);
export const sessionAPI = generateResourceAPI(Session.definition);

// ============================================================================
// Usage Examples
// ============================================================================

export async function examples(ctx: any) {
	// ------------------------------------------------------------------------
	// CREATE
	// ------------------------------------------------------------------------

	const newMessage = await messageAPI.create(
		{
			id: 'msg-1',
			session_id: 'session-1',
			role: 'user',
			content: 'Hello, how can you help me today?',
		},
		{},
		ctx
	);

	console.log('Created:', newMessage);

	// ------------------------------------------------------------------------
	// READ (getById)
	// ------------------------------------------------------------------------

	// Simple fetch
	const message = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);

	// With relationship inclusion
	const messageWithSteps = await messageAPI.getById.query(
		{ id: 'msg-1' },
		{
			include: {
				steps: true, // Auto-loads all steps
				session: true, // Auto-loads session
			},
		},
		ctx
	);

	// With field selection
	const messagePartial = await messageAPI.getById.query(
		{ id: 'msg-1' },
		{
			select: {
				id: true,
				content: true,
				// Other fields excluded
			},
		},
		ctx
	);

	// ------------------------------------------------------------------------
	// LIST
	// ------------------------------------------------------------------------

	// All messages
	const allMessages = await messageAPI.list.query({}, {}, ctx);

	// Filtered list
	const userMessages = await messageAPI.list.query(
		{
			where: {
				role: 'user',
			},
			orderBy: {
				created_at: 'desc',
			},
			limit: 10,
		},
		{},
		ctx
	);

	// ------------------------------------------------------------------------
	// UPDATE
	// ------------------------------------------------------------------------

	const updated = await messageAPI.update(
		{
			where: { id: 'msg-1' },
			data: {
				content: 'Updated content',
			},
		},
		{},
		ctx
	);

	console.log('Updated:', updated);

	// Skip hooks
	const updatedNoHooks = await messageAPI.update(
		{
			where: { id: 'msg-1' },
			data: { content: 'Update without hooks' },
		},
		{ skipHooks: true },
		ctx
	);

	// ------------------------------------------------------------------------
	// DELETE
	// ------------------------------------------------------------------------

	await messageAPI.delete({ id: 'msg-1' }, {}, ctx);

	// ------------------------------------------------------------------------
	// SUBSCRIPTIONS
	// ------------------------------------------------------------------------

	// Subscribe to single message
	const subscription = messageAPI.getById.subscribe(
		{ id: 'msg-1' },
		{
			include: {
				steps: true,
			},
		},
		{
			onData: (message) => {
				// Emitted on initial load and every update
				console.log('Message updated:', message);
			},
			onError: (error) => {
				console.error('Subscription error:', error);
			},
			onComplete: () => {
				console.log('Subscription complete');
			},
		},
		ctx
	);

	// Later: cleanup
	subscription.unsubscribe();

	// Subscribe to list
	const listSubscription = messageAPI.list.subscribe(
		{
			where: { role: 'user' },
		},
		{},
		{
			onData: (messages) => {
				console.log(`${messages.length} user messages`);
			},
		},
		ctx
	);

	// ------------------------------------------------------------------------
	// RELATIONSHIPS
	// ------------------------------------------------------------------------

	// Create related step
	const step = await stepAPI.create(
		{
			id: 'step-1',
			message_id: 'msg-1',
			type: 'thinking',
			output: 'Processing user request...',
		},
		{},
		ctx
	);

	// Fetch message with steps
	const messageWithRelations = await messageAPI.getById.query(
		{ id: 'msg-1' },
		{
			include: {
				steps: true,
			},
		},
		ctx
	);

	console.log('Message with steps:', messageWithRelations);

	// ------------------------------------------------------------------------
	// BATCHING & CACHING
	// ------------------------------------------------------------------------

	// These 3 loads are automatically batched into 1 query
	const [m1, m2, m3] = await Promise.all([
		messageAPI.getById.query({ id: 'msg-1' }, {}, ctx),
		messageAPI.getById.query({ id: 'msg-2' }, {}, ctx),
		messageAPI.getById.query({ id: 'msg-3' }, {}, ctx),
	]);

	// This returns cached value (no database query)
	const cached = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);

	// ------------------------------------------------------------------------
	// SESSION WITH MESSAGES
	// ------------------------------------------------------------------------

	const session = await sessionAPI.getById.query(
		{ id: 'session-1' },
		{
			include: {
				messages: {
					select: {
						id: true,
						role: true,
						content: true,
						steps: true, // Nested relationship
					},
				},
			},
		},
		ctx
	);

	console.log('Session with messages and steps:', session);
}

// ============================================================================
// Type Inference Examples
// ============================================================================

// Full type inference from resource definitions
type MessageType = typeof Message.entity; // Inferred from Zod schema
type MessageRelationships = typeof Message.relationships; // Inferred

// API types are fully inferred
type MessageAPIType = typeof messageAPI;

// Query result types
async function typedExample(ctx: any) {
	// Type is inferred as Message | null
	const message = await messageAPI.getById.query({ id: 'msg-1' }, {}, ctx);

	if (message) {
		// TypeScript knows all fields exist
		console.log(message.id);
		console.log(message.role);
		console.log(message.content);
	}

	// Type is inferred as Message[]
	const messages = await messageAPI.list.query({}, {}, ctx);

	// TypeScript knows array methods and element types
	const userMessages = messages.filter((m) => m.role === 'user');
}
