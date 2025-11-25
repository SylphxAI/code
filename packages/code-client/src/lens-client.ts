/**
 * Type-safe Lens Client for Code Project
 * Pre-configured with Code API types
 *
 * Design: Singleton client with API type baked in
 * - No need to pass <API> type parameter every time
 * - Single source of truth for API type
 * - Cleaner imports and usage
 *
 * Usage:
 * ```typescript
 * import { lensClient, useLensClient } from "@sylphx/code-client";
 *
 * // Non-React (Zen signals, utility functions)
 * const session = await lensClient.queries.getSession({ id: sessionId });
 *
 * // React components (hooks)
 * const client = useLensClient();
 * const session = await client.queries.getSession({ id: sessionId });
 * ```
 */

import type { LensClient } from "@lens/client";
import {
	getLensClient as getLensClientGeneric,
	useLensClient as useLensClientGeneric,
} from "./lens-provider.js";

// Import server types for type inference
import type { AppRouter } from "@sylphx/code-server";

// Extract query and mutation types from router
type Queries = AppRouter extends { queries: infer Q } ? Q : any;
type Mutations = AppRouter extends { mutations: infer M } ? M : any;

/**
 * Type-safe Lens client for Code API
 * Pre-configured with API type - no manual type parameter needed
 *
 * For non-React code (Zen signals, utility functions, etc.)
 * React components should use useLensClient() hook instead
 *
 * @example
 * ```ts
 * import { lensClient } from "@sylphx/code-client";
 *
 * const session = await lensClient.queries.getSession({ id: sessionId });
 * ```
 */
export const lensClient: LensClient<any, any> = new Proxy(
	{} as LensClient<any, any>,
	{
		get: (_target, prop) => {
			// Lazy initialization - get client when first accessed
			const client = getLensClientGeneric();
			// Forward all property accesses to the actual client
			return (client as any)[prop];
		},
	},
);

/**
 * React hook to access type-safe Lens client
 * Pre-configured with API type - no manual type parameter needed
 *
 * Must be used within LensProvider
 *
 * @example
 * ```tsx
 * import { useLensClient } from "@sylphx/code-client";
 *
 * function MyComponent() {
 *   const client = useLensClient();
 *   const session = await client.queries.getSession({ id: sessionId });
 * }
 * ```
 */
export function useLensClient(): LensClient<any, any> {
	return useLensClientGeneric();
}

/**
 * Legacy exports for backward compatibility
 * @deprecated Use lensClient or useLensClient instead
 */
export function getLensClient(): LensClient<any, any> {
	return getLensClientGeneric();
}
