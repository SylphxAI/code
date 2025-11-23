/**
 * Lens HTTP Transport for Web UI
 *
 * Factory for creating HTTPTransport from @sylphx/lens-transport-http.
 */

import { HTTPTransport } from "@sylphx/lens-transport-http";

/**
 * Create HTTP transport for web UI
 *
 * @param url - Base URL for the server (e.g., 'http://localhost:3000')
 * @returns Transport object that can be passed to LensProvider
 *
 * @example
 * ```ts
 * import { createHTTPTransport } from "@sylphx/code-client";
 * import { LensProvider } from "@sylphx/code-client";
 * import { api } from "@sylphx/code-api";
 *
 * const transport = createHTTPTransport("http://localhost:3000");
 *
 * <LensProvider api={api} transport={transport} optimistic={true}>
 *   <App />
 * </LensProvider>
 * ```
 */
export function createHTTPTransport(url: string) {
	return new HTTPTransport({
		url: `${url}/lens`,
		headers: {
			"Content-Type": "application/json",
		},
		timeout: 30000,
	});
}
