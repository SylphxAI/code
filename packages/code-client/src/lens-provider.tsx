/**
 * Lens Provider for code-client
 * Provides type-safe Lens client to all React components via Context
 *
 * Uses the new @lens/client package with transport-based architecture
 */

import {
	createClient,
	inProcess,
	http,
	type LensClient,
	type LensServerInterface,
	type Transport,
} from "@lens/client";
import { createContext, type ReactNode, useContext, useMemo, useEffect } from "react";

/**
 * React Context for Lens client
 */
const LensContext = createContext<LensClient<any, any> | null>(null);

/**
 * Provider props
 */
export interface LensProviderProps {
	/** Server URL for HTTP transport (e.g., "http://localhost:3000/lens") */
	serverUrl?: string;
	/** Lens server instance for in-process transport (for TUI mode) */
	server?: LensServerInterface;
	/** Pre-configured transport */
	transport?: Transport;
	children: ReactNode;
}

/**
 * LensProvider - Provides Lens client to React tree
 * Supports both HTTP (Web) and in-process (TUI) transports
 */
export function LensProvider({
	serverUrl,
	server,
	transport: providedTransport,
	children,
}: LensProviderProps) {
	const client = useMemo(() => {
		// Determine which transport to use
		let transport: Transport;

		if (providedTransport) {
			// Use provided transport directly
			transport = providedTransport;
		} else if (server) {
			// TUI mode: in-process communication with Lens server
			transport = inProcess({ server });
		} else if (serverUrl) {
			// Web mode: HTTP communication
			transport = http({ url: serverUrl });
		} else {
			throw new Error(
				"LensProvider requires either serverUrl, server, or transport prop"
			);
		}

		const newClient = createClient({ transport });

		// Initialize global client SYNCHRONOUSLY before first render
		// This ensures getLensClient() works in child components' render phase
		_initGlobalClient(newClient);

		// Also initialize lens-client-global for framework-agnostic access
		try {
			const { _initGlobalLensClient } = require("./lens-client-global.js");
			_initGlobalLensClient(newClient);
		} catch {
			// Ignore if lens-client-global is not available
		}

		return newClient;
	}, [serverUrl, server, providedTransport]);

	return (
		<LensContext.Provider value={client}>{children}</LensContext.Provider>
	);
}

/**
 * Hook to access Lens client
 * Must be used within LensProvider
 */
export function useLensClient(): LensClient<any, any> {
	const client = useContext(LensContext);

	if (!client) {
		throw new Error(
			"useLensClient must be used within LensProvider. " +
				"Wrap your app with <LensProvider serverUrl='...' />",
		);
	}

	return client;
}

/**
 * Helper: Create in-process Lens client
 * Zero-overhead communication for embedded server
 */
export function createInProcessClient(server: LensServerInterface): LensClient<any, any> {
	return createClient({
		transport: inProcess({ server }),
	});
}

/**
 * Helper: Create HTTP Lens client
 * For web browser connections
 */
export function createHttpClient(serverUrl: string): LensClient<any, any> {
	return createClient({
		transport: http({ url: serverUrl }),
	});
}

// ============================================================================
// Internal: Global Client for Non-React Code
// ============================================================================
// Zustand stores and utility functions cannot use React hooks,
// so they need global client access.
// Uses globalThis to ensure single instance across all module duplicates.

// Use Symbol to ensure unique key even if module is duplicated
const GLOBAL_CLIENT_KEY = "__lensClient__" as const;

/**
 * Initialize global client
 * Called automatically by LensProvider
 * Uses globalThis to avoid module duplication issues
 * @internal
 */
export function _initGlobalClient(client: LensClient<any, any> | null) {
	if (client) {
		(globalThis as any)[GLOBAL_CLIENT_KEY] = client;
	}
}

/**
 * Get Lens client for non-React code
 * @internal DO NOT USE in React components - use useLensClient() hook
 */
export function getLensClient(): LensClient<any, any> {
	const client = (globalThis as any)[GLOBAL_CLIENT_KEY];
	if (!client) {
		throw new Error(
			"Lens client not initialized. Ensure LensProvider wraps your app.",
		);
	}
	return client;
}
