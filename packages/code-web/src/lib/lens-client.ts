/**
 * Browser-safe Lens Client
 *
 * This client is designed for browser use only, without importing
 * from code-server which pulls in Node.js-only dependencies.
 *
 * Types are defined locally rather than inferred from AppRouter.
 */

import { createClient } from "@sylphx/lens-react";
import { http, type Transport } from "@sylphx/lens-client";

// =============================================================================
// Client Type (browser-safe, no server imports)
// =============================================================================

export type CodeClient = ReturnType<typeof createClient>;

// =============================================================================
// Module Singleton
// =============================================================================

let _client: CodeClient | null = null;

export function createCodeClient(transport: Transport): CodeClient {
	return createClient({ transport });
}

export function initClient(client: CodeClient): void {
	_client = client;
}

export function getClient(): CodeClient {
	if (!_client) {
		throw new Error("Lens client not initialized. Call initClient() first.");
	}
	return _client;
}

export function useLensClient(): CodeClient {
	return getClient();
}

// Re-export transport factory
export { http };
export type { Transport };
