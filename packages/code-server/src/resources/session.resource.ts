/**
 * Session Resource - Lens Definition
 *
 * Replaces session.router.ts with declarative resource definition.
 * Provides unified field-level subscriptions with automatic:
 * - Streaming fields (title with onStart/onDelta/onEnd)
 * - Regular fields (status, model, etc with onChange)
 * - Optimistic updates
 * - Update strategy encoding/decoding
 */

import { defineResource } from "@sylphx/lens-core";
import { z } from "zod";

/**
 * Session Resource Definition
 *
 * Solves the granularity problem:
 * - BEFORE: session.update, session.status.updated, session.title.start/delta/end (混亂)
 * - AFTER: Unified field-level subscriptions (統一)
 *
 * All fields use the same subscription API but with different handlers:
 * - title: Streaming field (onStart/onDelta/onEnd) for AI generation
 * - status, model, provider: Regular fields (onChange)
 */
export const Session = defineResource({
	name: "session",

	fields: z.object({
		// Primary key
		id: z.string(),

		// AI Configuration
		provider: z.string(), // 'anthropic', 'openai', etc
		model: z.string(), // 'claude-3.5-sonnet', etc
		agentId: z.string(), // 'coder', 'writer', etc

		// Session metadata
		title: z.string(), // ✅ STREAMING FIELD: AI-generated, uses delta strategy
		enabledRuleIds: z.array(z.string()),

		// Timestamps
		created_at: z.number(), // Unix timestamp
		updated_at: z.number(), // Unix timestamp

		// Computed at runtime (not stored)
		// modelStatus: 'available' | 'unavailable' | 'unknown'
		// messageCount: number
	}),

	/**
	 * Update Strategy Configuration
	 *
	 * Automatic strategy selection:
	 * - title: Delta strategy (streaming, 57% bandwidth savings)
	 * - provider, model, agentId: Value strategy (small values)
	 * - enabledRuleIds: Patch strategy (array operations)
	 */
	updateStrategy: {
		mode: "auto",

		// Mark streaming fields
		// These fields will emit onStart/onDelta/onEnd events
		streamingFields: ["title"],
	},

	// Table name in database (defaults to 'session')
	tableName: "sessions",

	/**
	 * Computed Fields
	 *
	 * NOT stored in database, calculated at runtime
	 */
	computed: {
		/**
		 * Display name for UI
		 */
		displayName: (session) => {
			return session.title || `Session ${session.id.slice(0, 8)}`;
		},
	},

	/**
	 * Lifecycle Hooks
	 *
	 * Intercept CRUD operations for business logic
	 */
	hooks: {
		beforeCreate: async (data) => {
			// Set timestamps
			const now = Date.now();
			return {
				...data,
				created_at: now,
				updated_at: now,
			};
		},

		afterCreate: async (session, ctx) => {
			// Publish session-created event
			if (ctx?.eventStream) {
				await ctx.eventStream.publish("session-events", {
					type: "session-created" as const,
					sessionId: session.id,
					provider: session.provider,
					model: session.model,
				});
			}
		},

		beforeUpdate: async (id, data) => {
			// Update timestamp
			return {
				...data,
				updated_at: Date.now(),
			};
		},

		afterUpdate: async (session, data, ctx) => {
			// Publish field-specific update events
			// These events trigger field-level subscriptions
			if (ctx?.eventStream) {
				// For each updated field, publish a field update event
				const updatedFields = Object.keys(data);

				for (const fieldName of updatedFields) {
					const value = (session as any)[fieldName];

					// Publish to field-specific channel
					await ctx.eventStream.publish(`session:${session.id}:field:${fieldName}`, {
						entityId: session.id,
						fieldName,
						type: "change",
						value,
					});
				}

				// Also publish to general session-events channel (for backward compatibility)
				await ctx.eventStream.publish("session-events", {
					type: "session-updated" as const,
					sessionId: session.id,
				});
			}
		},

		beforeDelete: async (id, ctx) => {
			// Clear ask queue before deleting
			// This would need to be imported from the service
			// For now, just a placeholder
			console.log(`[Session.beforeDelete] Clearing ask queue for ${id}`);
		},

		afterDelete: async (id, ctx) => {
			// Publish session-deleted event
			if (ctx?.eventStream) {
				await ctx.eventStream.publish("session-events", {
					type: "session-deleted" as const,
					sessionId: id,
				});
			}
		},
	},
});

/**
 * Type exports for use in application
 */
export type SessionEntity = z.infer<typeof Session.definition.fields>;
export type SessionInput = Partial<SessionEntity>;
