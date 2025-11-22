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
 * const session = await lensClient.session.getById.query({ sessionId });
 *
 * // React components (hooks)
 * const client = useLensClient();
 * const session = await client.session.getById.query({ sessionId });
 * ```
 */

import type { API } from "@sylphx/code-api";
import type { LensClient } from "@sylphx/lens-client";
import {
	getLensClient as getLensClientGeneric,
	useLensClient as useLensClientGeneric,
} from "./lens-provider.js";

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
 * const session = await lensClient.session.getById.query({ sessionId });
 * const processes = await lensClient.bash.list.query();  // ✅ No brackets if void input!
 * ```
 */
export const lensClient: LensClient<API> = new Proxy({} as LensClient<API>, {
	get: (_target, prop) => {
		// Lazy initialization - get client when first accessed
		const client = getLensClientGeneric<API>();
		// Forward all property accesses to the actual client
		return (client as any)[prop];
	},
});

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
 *   const session = await client.session.getById.query({ sessionId });
 *   const processes = await client.bash.list.query();  // ✅ No brackets if void input!
 * }
 * ```
 */
export function useLensClient(): LensClient<API> {
	return useLensClientGeneric<API>();
}

/**
 * Legacy exports for backward compatibility
 * @deprecated Use lensClient or useLensClient instead
 */
export function getLensClient(): LensClient<API> {
	return getLensClientGeneric<API>();
}
