/**
 * Browser-safe Lens Client
 *
 * Uses type-only import from code-server for full TypeScript support.
 * Type imports are erased at runtime, so no Node.js dependencies are bundled.
 */

import { createClient, type TypedClient } from "@sylphx/lens-react";
import { http, type Transport } from "@sylphx/lens-client";
import type { AppRouter } from "@sylphx/code-server";

// =============================================================================
// Client Type (fully typed from AppRouter)
// =============================================================================

export type CodeClient = TypedClient<AppRouter>;

// =============================================================================
// Module Singleton
// =============================================================================

let _client: CodeClient | null = null;

export function createCodeClient(transport: Transport): CodeClient {
	return createClient<AppRouter>({ transport });
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
