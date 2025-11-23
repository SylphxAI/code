/**
 * Global Lens Client Access (Framework-Agnostic)
 *
 * This module provides access to the global Lens client without React dependencies.
 * Used by Zen signals which need to work in both React and non-React environments.
 *
 * Initialization:
 * - React apps: Use LensProvider which calls _initGlobalClient
 * - Web UI (Preact): Set window.__lensClient directly
 * - Node/TUI: Use createInProcessLensClient
 */

import type { LensClient } from "@sylphx/lens-client";

/**
 * Get global Lens client
 * Works in both browser (window.__lensClient) and Node (module-level global)
 *
 * @throws Error if client not initialized
 */
export function getLensClientGlobal<TApi = any>(): LensClient<TApi> {
	// Browser: check window.__lensClient first
	if (typeof window !== 'undefined' && (window as any).__lensClient) {
		return (window as any).__lensClient;
	}

	// Node/TUI: check module-level global (set by LensProvider)
	if (_globalClient) {
		return _globalClient as LensClient<TApi>;
	}

	throw new Error(
		"Lens client not initialized. " +
		"In React apps, wrap with <LensProvider>. " +
		"In Web UI, import lens-init. " +
		"In Node/TUI, call _initGlobalLensClient()."
	);
}

/**
 * Module-level global for Node/TUI environments
 * Set by LensProvider or _initGlobalLensClient
 */
let _globalClient: LensClient<any> | null = null;

/**
 * Initialize global Lens client (Node/TUI)
 * Called by LensProvider automatically
 *
 * @internal
 */
export function _initGlobalLensClient(client: LensClient<any>) {
	_globalClient = client;
}
