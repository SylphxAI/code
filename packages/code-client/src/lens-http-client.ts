/**
 * Lens HTTP Transport for Web UI
 *
 * Simple fetch-based transport that communicates with LensServer over HTTP.
 * This is a temporary implementation until lens packages can be properly linked.
 */

import type { Observable } from "rxjs";

/**
 * Simple HTTP Transport for Lens
 *
 * NOTE: This is a simplified implementation. The full transport
 * should be from @sylphx/lens-transport-http once workspace linking is resolved.
 */
export class SimpleHTTPTransport {
	constructor(private config: { url: string; headers?: Record<string, string>; timeout?: number }) {}

	async request(path: string[], input: any): Promise<any> {
		const url = `${this.config.url}/${path.join("/")}`;

		const response = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				...this.config.headers,
			},
			body: JSON.stringify(input),
			signal: AbortSignal.timeout(this.config.timeout || 30000),
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return await response.json();
	}

	stream(path: string[], input: any): Observable<any> {
		// TODO: Implement SSE streaming support
		throw new Error("Streaming not yet implemented in SimpleHTTPTransport");
	}
}

/**
 * Create simple HTTP transport for web UI
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
	return new SimpleHTTPTransport({
		url: `${url}/lens`,
		headers: {
			"Content-Type": "application/json",
		},
		timeout: 30000,
	});
}
