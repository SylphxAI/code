/**
 * Lens Provider for code-client
 * Provides type-safe Lens client to all React components via Context
 */

import type { LensObject } from "@sylphx/lens-core";
import { InProcessTransport } from "@sylphx/lens-core";
import { createLensClient, type LensClient } from "@sylphx/lens-client";
import { createContext, type ReactNode, useContext, useMemo } from "react";

/**
 * Lens Client type (typed with API)
 */
export type TypedLensClient<TApi extends LensObject<any>> = LensClient<TApi>;

/**
 * React Context for Lens client
 */
const LensContext = createContext<LensClient<any> | null>(null);

/**
 * Provider props
 */
export interface LensProviderProps<TApi extends LensObject<any>> {
	api: TApi;
	context: any;
	optimistic?: boolean;
	children: ReactNode;
}

/**
 * LensProvider - Provides Lens client to React tree
 * Also initializes global client for Zustand stores
 */
export function LensProvider<TApi extends LensObject<any>>({
	api,
	context,
	optimistic = true,
	children,
}: LensProviderProps<TApi>) {
	const client = useMemo(() => {
		const transport = new InProcessTransport({ api, context });
		return createLensClient<TApi>({
			transport,
			optimistic,
		});
	}, [api, context, optimistic]);

	// Initialize global client for Zustand stores (cannot use React Context)
	_initGlobalClient(client);

	// @ts-expect-error - JSX works with both React and Preact runtimes
	return <LensContext.Provider value={client}>{children}</LensContext.Provider>;
}

/**
 * Hook to access Lens client
 * Must be used within LensProvider
 */
export function useLensClient<TApi extends LensObject<any>>(): LensClient<TApi> {
	const client = useContext(LensContext);

	if (!client) {
		throw new Error(
			"useLensClient must be used within LensProvider. " +
				"Wrap your app with <LensProvider api={api} context={context}>...</LensProvider>",
		);
	}

	return client as LensClient<TApi>;
}

/**
 * Helper: Create in-process Lens client
 * Zero-overhead communication for embedded server
 */
export function createInProcessClient<TApi extends LensObject<any>>(
	api: TApi,
	context: any,
	optimistic = true,
): LensClient<TApi> {
	const transport = new InProcessTransport({ api, context });
	return createLensClient<TApi>({
		transport,
		optimistic,
	});
}

// ============================================================================
// Internal: Global Client for Zustand Stores
// ============================================================================
// Zustand stores cannot use React hooks, so they need global client access
// This is INTERNAL API - React components should use useLensClient() hook

/**
 * Global Lens client instance for Zustand stores
 * @internal DO NOT USE in React components - use useLensClient() hook
 */
let _globalClientForStores: LensClient<any> | null = null;

/**
 * Initialize global client for Zustand stores
 * Called automatically by LensProvider
 * @internal
 */
export function _initGlobalClient(client: LensClient<any>) {
	_globalClientForStores = client;
}

/**
 * Get Lens client for Zustand stores
 * @internal DO NOT USE in React components - use useLensClient() hook
 */
export function getLensClient<TApi extends LensObject<any>>(): LensClient<TApi> {
	if (!_globalClientForStores) {
		throw new Error("Lens client not initialized. Ensure LensProvider wraps your app.");
	}
	return _globalClientForStores as LensClient<TApi>;
}
