/**
 * Lens Client for Sylphx Code
 *
 * Simple client setup. Types inferred from server.
 */

import { createClient } from "@sylphx/lens-react";
import { direct, http, type Transport } from "@sylphx/lens-client";

// =============================================================================
// Client Type
// =============================================================================

// Dynamic client type - methods are accessed dynamically at runtime
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type CodeClient = Record<string, any>;

// =============================================================================
// Factory
// =============================================================================

export function createCodeClient(transport: Transport): CodeClient {
	return createClient({ transport }) as CodeClient;
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
