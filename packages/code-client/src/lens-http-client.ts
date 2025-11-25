/**
 * Lens HTTP Client for Web UI
 *
 * Factory for creating HTTP Lens clients using @lens/client.
 * Uses the new transport-based architecture.
 */

import { createClient, http, type LensClient, type Transport } from "@lens/client";

/**
 * Create HTTP Lens client for web UI
 *
 * @param url - Base URL for the server (e.g., 'http://localhost:3000')
 * @returns LensClient configured with HTTP transport
 *
 * @example
 * ```ts
 * import { createHTTPLensClient } from "@sylphx/code-client";
 *
 * const client = createHTTPLensClient("http://localhost:3000");
 *
 * // Use the client
 * const session = await client.queries.getSession({ id: sessionId });
 * ```
 */
export function createHTTPLensClient(url: string): LensClient<any, any> {
	return createClient({
		transport: http({
			url: `${url}/lens`,
		}),
	});
}

/**
 * Create HTTP transport for Lens client
 * Use this to pass to LensProvider's transport prop
 *
 * @param url - Base URL for the server (e.g., 'http://localhost:3000')
 * @returns HTTP transport that can be passed to LensProvider
 */
export function createHTTPTransport(url: string): Transport {
	return http({
		url: `${url}/lens`,
	});
}
