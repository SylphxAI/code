/**
 * Lens Builders with Optimistic Plugin
 *
 * Creates typed query/mutation builders with optimistic update support.
 * All operations should import { query, mutation } from this file.
 *
 * Features:
 * - Type-safe context (LensContext)
 * - Optimistic updates via .optimistic() method
 * - Live subscriptions via .subscribe() method
 */

import { lens, isLiveQueryDef } from "@sylphx/lens-core";
import { optimisticPlugin, type ServerPlugin } from "@sylphx/lens-server";
import type { LensContext } from "./context.js";

/**
 * LiveQuery Metadata Plugin
 *
 * Marks LiveQueryDef operations (queries with .subscribe()) as subscriptions
 * in the handshake metadata, so clients know to maintain persistent connections.
 *
 * This is necessary because lens-server's default metadata building only
 * detects generator functions as subscriptions, not LiveQueryDef operations.
 */
function liveQueryMetadataPlugin(): ServerPlugin {
	return {
		enhanceOperationMeta: (ctx) => {
			// Check if this is a LiveQueryDef (query with _mode: "live")
			if (ctx.type === "query" && isLiveQueryDef(ctx.definition)) {
				// Mark as subscription so client maintains persistent connection
				ctx.meta.type = "subscription";
			}
		},
	};
}

/**
 * Create Lens builders with plugins
 *
 * Usage:
 * ```typescript
 * import { query, mutation } from "./builders.js";
 *
 * export const getSession = query()
 *   .input(z.object({ id: z.string() }))
 *   .returns(Session)
 *   .resolve(...)
 *   .subscribe(...)  // For live updates
 *
 * export const createSession = mutation()
 *   .input(...)
 *   .returns(Session)
 *   .optimistic("create")  // For optimistic updates
 *   .resolve(...)
 * ```
 */
const builders = lens<LensContext>().withPlugins([
	optimisticPlugin(),
	liveQueryMetadataPlugin(),
]);

export const { query, mutation, plugins } = builders;
