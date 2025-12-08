/**
 * Lens Client for Sylphx Code
 *
 * TypeScript-first: Types auto-inferred from server's AppRouter.
 */

import { createClient, type TypedClient } from "@sylphx/lens-react";
import { direct, http, type Transport } from "@sylphx/lens-client";
import type { AppRouter } from "@sylphx/code-server";

// =============================================================================
// Client Type (inferred from AppRouter)
// =============================================================================

export type CodeClient = TypedClient<AppRouter>;

// =============================================================================
// Factory
// =============================================================================

export function createCodeClient(transport: Transport): CodeClient {
	return createClient<AppRouter>({ transport });
}

// =============================================================================
// Module Singleton
// =============================================================================

let _client: CodeClient | null = null;

export function initClient(client: CodeClient): void {
	_client = client;
}

export function getClient(): CodeClient {
	if (!_client) {
		throw new Error("Lens client not initialized. Call initClient() first.");
	}
	return _client;
}

export function isClientInitialized(): boolean {
	return _client != null;
}

export function useLensClient(): CodeClient {
	return getClient();
}

// =============================================================================
// Re-exports
// =============================================================================

export { direct, http };
export type { Transport };
