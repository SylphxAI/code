/**
 * Lens context provider
 */

import type { LensClient } from "@sylphx/lens-client";
import type { LensTransport } from "@sylphx/lens-core";
import { createLensClient, InMemoryCache, type LensCache } from "@sylphx/lens-client";
import { createContext, useContext, useMemo, type ReactNode } from "react";

export interface LensContextValue {
	transport: LensTransport;
	client: LensClient<any>;
	cache: LensCache;
}

const LensContext = createContext<LensContextValue | null>(null);

export interface LensProviderProps {
	transport: LensTransport;
	/** Enable optimistic updates (default: true) */
	optimistic?: boolean;
	/** Custom cache implementation (default: InMemoryCache) */
	cache?: LensCache;
	children: ReactNode;
}

/**
 * Lens provider component
 *
 * Provides Lens client with transport, cache, and optimistic updates support.
 *
 * @example
 * ```tsx
 * import { LensProvider } from '@sylphx/lens-react';
 * import { HTTPTransport } from '@sylphx/lens-transport-http';
 *
 * const transport = new HTTPTransport({ url: 'http://localhost:3000/lens' });
 *
 * function App() {
 *   return (
 *     <LensProvider transport={transport} optimistic={true}>
 *       <YourApp />
 *     </LensProvider>
 *   );
 * }
 * ```
 */
export function LensProvider({
	transport,
	optimistic = true,
	cache: customCache,
	children
}: LensProviderProps) {
	const value = useMemo(() => {
		const cache = customCache ?? new InMemoryCache();
		const client = createLensClient({
			transport,
			optimistic,
			cache
		});

		return { transport, client, cache };
	}, [transport, optimistic, customCache]);

	return (
		<LensContext.Provider value={value}>
			{children}
		</LensContext.Provider>
	);
}

/**
 * Hook to access Lens context
 */
export function useLensContext(): LensContextValue {
	const context = useContext(LensContext);
	if (!context) {
		throw new Error("useLensContext must be used within LensProvider");
	}
	return context;
}
