/**
 * Lens API Integration Layer
 *
 * Initializes Lens with existing Code infrastructure:
 * - DatabaseAdapter: Wraps SessionRepository, MessageRepository
 * - EventStream: AppEventStream with native pattern matching
 * - Resources: Session, Message (future)
 *
 * Architecture:
 * - NO adapters/workarounds - only clean interfaces
 * - AppEventStream enhanced with subscribePattern support
 * - Existing repositories wrapped, not replaced
 * - Type-safe, declarative resource definitions
 */

import type { QueryContext } from "@sylphx/lens-core";
import type { AppContext } from "../context.js";
import { Session } from "../resources/session.resource.js";
import { createLensDatabaseAdapter } from "../adapters/database.adapter.js";
import { createLensEventStream } from "../services/lens-event-stream.js";
import { createSessionExtendedAPI } from "./session-extended-api.js";

/**
 * Initialize Lens API with Code's infrastructure
 *
 * @param appContext - Code's application context
 * @returns Lens resources with pre-bound context + extended operations
 */
export function initializeLensAPI(appContext: AppContext) {
	// Create database adapter from existing repositories
	const db = createLensDatabaseAdapter(
		appContext.database.getRepository(),
		appContext.database.getMessageRepository(),
	);

	// Create event stream from AppEventStream
	const eventStream = createLensEventStream(appContext.eventStream);

	// Create Lens query context
	const ctx: QueryContext = {
		db,
		eventStream,
		// Future: Add user context for auth/permissions
	};

	// Create extended operations
	const sessionExtended = createSessionExtendedAPI(appContext, ctx);

	return {
		/**
		 * Session Resource API
		 *
		 * Combines:
		 * 1. Lens auto-generated CRUD (create, get, list, update, delete)
		 * 2. Extended business operations (compact, search, getContextInfo, etc.)
		 *
		 * Unified field-level subscriptions:
		 * - title: Streaming field (onStart/onDelta/onEnd)
		 * - status, model, provider: Regular fields (onChange)
		 *
		 * Replaces 700+ lines of tRPC router.
		 */
		Session: {
			// ========== Lens Core CRUD ==========

			// Pre-bind context for convenience
			get: {
				query: (input, options?) => Session.api.get.query(input, options, ctx),
				subscribe: (input, options?, handlers?) =>
					Session.api.get.subscribe(input, options, handlers, ctx),
			},
			list: {
				query: (input?) => Session.api.list.query(input, ctx),
				subscribe: (input?, handlers?) => Session.api.list.subscribe(input, handlers, ctx),
			},
			create: {
				mutate: (input, options?) => Session.api.create.mutate(input, options, ctx),
			},
			update: {
				mutate: (input, options?) => Session.api.update.mutate(input, options, ctx),
			},
			delete: {
				mutate: (input) => Session.api.delete.mutate(input, ctx),
			},

			// ========== Extended Operations ==========

			/**
			 * Get last session (for headless mode)
			 */
			getLast: () => sessionExtended.getLast(),

			/**
			 * Search sessions by title
			 */
			search: (query: string, limit?: number, cursor?: number) =>
				sessionExtended.search(query, limit, cursor),

			/**
			 * Get session count
			 */
			getCount: () => sessionExtended.getCount(),

			/**
			 * Update specific fields (field-level mutations)
			 */
			updateTitle: (sessionId: string, title: string) =>
				sessionExtended.updateTitle(sessionId, title),
			updateModel: (sessionId: string, model: string) =>
				sessionExtended.updateModel(sessionId, model),
			updateProvider: (sessionId: string, provider: string) =>
				sessionExtended.updateProvider(sessionId, provider),
			updateRules: (sessionId: string, enabledRuleIds: string[]) =>
				sessionExtended.updateRules(sessionId, enabledRuleIds),
			updateAgent: (sessionId: string, agentId: string) =>
				sessionExtended.updateAgent(sessionId, agentId),

			/**
			 * Compact session (remove intermediate tool results)
			 */
			compact: (sessionId: string) => sessionExtended.compact(sessionId),

			/**
			 * Get context info (tokens, costs)
			 */
			getContextInfo: (sessionId: string) => sessionExtended.getContextInfo(sessionId),

			/**
			 * Get total tokens across all sessions
			 */
			getTotalTokens: () => sessionExtended.getTotalTokens(),
		},

		/**
		 * Context for custom operations
		 */
		ctx,
	};
}

/**
 * Type exports
 */
export type LensAPI = ReturnType<typeof initializeLensAPI>;
