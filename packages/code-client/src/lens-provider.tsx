/**
 * Lens Provider for code-client
 * Provides type-safe Lens client to all React components via Context
 *
 * Uses the new @sylphx/lens-react 2.2.0 tRPC-style API
 *
 * Architecture:
 * - LensProvider initializes both raw and typed clients
 * - Raw client (lens-client) is used for mutations and direct queries
 * - Typed client (lens-react) provides React hooks with tRPC-style API
 * - Global clients are initialized synchronously for immediate availability
 *
 * Note: The typedClientFactory prop is required because bun monorepo workspaces
 * can't resolve @sylphx/lens-react from code-client's context. The consuming
 * package (packages/code) imports createClient and passes it here.
 */

import {
	createClient as createRawClient,
	inProcess,
	http,
	type LensClient,
	type LensServerInterface,
	type Transport,
} from "@sylphx/lens-client";
import type { LensRouter as AppRouter } from "@sylphx/code-server";
import React, { type ReactNode, useMemo, createContext, useContext } from "react";
import { _initGlobalClient, _initTypedClient } from "./lens-client.js";

/**
 * Type for createClient factory from @sylphx/lens-react
 */
export type TypedClientFactory = <TRouter>(options: { transport: Transport }) => any;

/**
 * Type for LensProvider component from @sylphx/lens-react (legacy)
 */
export type LensReactProviderType = React.ComponentType<{
	client: LensClient<any, any>;
	children: ReactNode;
}>;

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
	/**
	 * Factory function to create typed client (from @sylphx/lens-react createClient)
	 * Required for tRPC-style hooks to work
	 */
	typedClientFactory?: TypedClientFactory;
	/**
	 * LensProvider component from @sylphx/lens-react (legacy)
	 * Required for backward compatibility with useQuery/useMutation hooks
	 */
	LensReactProvider?: LensReactProviderType;
	children: ReactNode;
}

// Context for the raw client (used by legacy useLensClient hook)
const LensClientContext = createContext<LensClient<any, any> | null>(null);

/**
 * LensProvider - Provides Lens client to React tree
 * Supports both HTTP (Web) and in-process (TUI) transports
 */
export function LensProvider({
	serverUrl,
	server,
	transport: providedTransport,
	typedClientFactory,
	LensReactProvider,
	children,
}: LensProviderProps) {
	const rawClient = useMemo(() => {
		// Determine which transport to use
		let transport: Transport;

		if (providedTransport) {
			// Use provided transport directly
			transport = providedTransport;
		} else if (server) {
			// TUI mode: in-process communication with Lens server
			transport = inProcess({ app: server });
		} else if (serverUrl) {
			// Web mode: HTTP communication
			transport = http({ url: serverUrl });
		} else {
			throw new Error(
				"LensProvider requires either serverUrl, server, or transport prop"
			);
		}

		// Create raw client for non-React code
		const rawClient = createRawClient({ transport });

		// Initialize global raw client SYNCHRONOUSLY before first render
		_initGlobalClient(rawClient);

		// Create and initialize typed client for React hooks
		// This must happen synchronously before children render
		if (typedClientFactory) {
			const typedClient = typedClientFactory<AppRouter>({ transport });
			_initTypedClient(typedClient);
		} else {
			console.warn("typedClientFactory not provided - typed client unavailable. Pass createClient from @sylphx/lens-react.");
		}

		return rawClient;
	}, [serverUrl, server, providedTransport, typedClientFactory]);

	// Wrap with lens-react's LensProvider for legacy useQuery/useMutation hooks
	const content = (
		<LensClientContext.Provider value={rawClient}>
			{children}
		</LensClientContext.Provider>
	);

	// If LensReactProvider is provided, wrap with it for backward compatibility
	if (LensReactProvider) {
		return (
			<LensReactProvider client={rawClient}>
				{content}
			</LensReactProvider>
		);
	}

	return content;
}

/**
 * Hook to get raw Lens client (for backward compatibility)
 */
export function useLensClientFromContext(): LensClient<any, any> {
	const client = useContext(LensClientContext);
	if (!client) {
		throw new Error(
			"useLensClient must be used within a <LensProvider>. " +
			"Make sure to wrap your app with <LensProvider>."
		);
	}
	return client;
}

// ============================================================================
// Helper functions for creating clients
// ============================================================================

/**
 * Helper: Create in-process Lens client
 * Zero-overhead communication for embedded server
 */
export function createInProcessClient(server: LensServerInterface): LensClient<any, any> {
	return createRawClient({
		transport: inProcess({ server }),
	});
}

/**
 * Helper: Create HTTP Lens client
 * For web browser connections
 */
export function createHttpClient(serverUrl: string): LensClient<any, any> {
	return createRawClient({
		transport: http({ url: serverUrl }),
	});
}

// Re-export _initGlobalClient for external use
export { _initGlobalClient } from "./lens-client.js";

// Re-export getLensClient for backward compatibility
export { getLensClient } from "./lens-client.js";

// Note: useLensClient is now exported from @sylphx/lens-react via index.ts
