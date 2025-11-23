/**
 * Lens Provider for code-client
 * Provides type-safe Lens client to all React components via Context
 */

import type { LensObject } from "@sylphx/lens-core";
import { InProcessTransport } from "@sylphx/lens-core";
import {
	createLensClient,
	type LensClient,
} from "@sylphx/lens-client";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { optimisticManagerV2, type OptimisticManagerV2 } from "./optimistic/index.js";

/**
 * Lens Client type (typed with API)
 */
export type TypedLensClient<TApi extends LensObject<any>> = LensClient<TApi>;

/**
 * React Context for Lens client
 */
const LensContext = createContext<LensClient<any> | null>(null);

/**
 * React Context for OptimisticManagerV2
 */
const OptimisticManagerContext = createContext<OptimisticManagerV2 | null>(null);

/**
 * Provider props
 */
export interface LensProviderProps<TApi extends LensObject<any>> {
	api: TApi;
	context?: any; // Optional if transport is provided
	transport?: any; // Optional pre-configured transport (use instead of creating new one)
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
	transport: providedTransport,
	optimistic = true,
	children,
}: LensProviderProps<TApi>) {
	// Use global OptimisticManagerV2 singleton (same instance used everywhere)
	// This ensures optimistic updates created in mutations are reconciled correctly
	// when server events arrive through subscriptions
	const optimisticManager = optimistic ? optimisticManagerV2 : null;

	const client = useMemo(() => {
		// Use provided transport if available, otherwise create new one
		const transport = providedTransport || new InProcessTransport({ api, context });

		return createLensClient<TApi>({
			transport,
			schema: api, // Pass API schema for optimistic metadata
			optimisticManager: optimisticManager || undefined,
		});
	}, [api, context, providedTransport, optimisticManager]);

	// Initialize global client and manager for Zustand stores (cannot use React Context)
	_initGlobalClient(client);
	_initGlobalOptimisticManager(optimisticManager);

	// @ts-expect-error - JSX works with both React and Preact runtimes
	return (
		<LensContext.Provider value={client}>
			<OptimisticManagerContext.Provider value={optimisticManager}>
				{children}
			</OptimisticManagerContext.Provider>
		</LensContext.Provider>
	);
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

	// Create OptimisticManager if optimistic updates are enabled
	const optimisticManager = optimistic ? new OptimisticManager({ debug: false }) : undefined;

	return createLensClient<TApi>({
		transport,
		schema: api, // Pass API schema for optimistic metadata
		optimisticManager,
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

// ============================================================================
// Internal: Global OptimisticManager for Zustand Stores
// ============================================================================
// Zustand stores cannot use React hooks, so they need global manager access
// This is INTERNAL API - React components should use useOptimisticManager() hook

/**
 * Global OptimisticManagerV2 instance for Zustand stores
 * @internal DO NOT USE in React components - use useOptimisticManager() hook
 */
let _globalOptimisticManager: OptimisticManagerV2 | null = null;

/**
 * Initialize global OptimisticManagerV2 for Zustand stores
 * Called automatically by LensProvider
 * @internal
 */
export function _initGlobalOptimisticManager(manager: OptimisticManagerV2 | null) {
	_globalOptimisticManager = manager;
}

/**
 * Get OptimisticManagerV2 for Zustand stores
 * @internal DO NOT USE in React components - use useOptimisticManager() hook
 */
export function getOptimisticManager(): OptimisticManagerV2 | null {
	return _globalOptimisticManager;
}

/**
 * Hook to access OptimisticManagerV2
 * Must be used within LensProvider
 * Returns null if optimistic updates are disabled
 */
export function useOptimisticManager(): OptimisticManagerV2 | null {
	return useContext(OptimisticManagerContext);
}
