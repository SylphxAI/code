/**
 * Global Lens Client Access (Framework-Agnostic)
 *
 * This module provides access to the global Lens client without React dependencies.
 * Used by Zen signals which need to work in both React and non-React environments.
 *
 * Initialization:
 * - React apps: Use LensProvider which calls _initGlobalLensClient
 * - Web UI: Set window.__lensClient directly
 * - Node/TUI: Use createInProcessLensClient
 */

import type { LensClient } from "@lens/client";

// Same key as lens-provider.tsx for consistency
const GLOBAL_CLIENT_KEY = "__lensClient__" as const;

/**
 * Get global Lens client
 * Uses globalThis to ensure single instance across all modules
 *
 * @throws Error if client not initialized
 */
export function getLensClientGlobal(): LensClient<any, any> {
	const client = (globalThis as any)[GLOBAL_CLIENT_KEY];
	if (!client) {
		throw new Error(
			"Lens client not initialized. " +
				"In React apps, wrap with <LensProvider>. " +
				"In Web UI, import lens-init. " +
				"In Node/TUI, call _initGlobalLensClient().",
		);
	}
	return client;
}

/**
 * Initialize global Lens client (Node/TUI)
 * Called by LensProvider automatically
 *
 * @internal
 */
export function _initGlobalLensClient(client: LensClient<any, any>) {
	(globalThis as any)[GLOBAL_CLIENT_KEY] = client;
}

/**
 * Check if global client is initialized
 */
export function isGlobalLensClientInitialized(): boolean {
	return (globalThis as any)[GLOBAL_CLIENT_KEY] != null;
}
