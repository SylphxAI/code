/**
 * Lens Client Factory for Code Project
 *
 * Clean, type-safe lens integration following lens-react patterns.
 *
 * Architecture:
 * - @sylphx/lens-react: createClient<Router>({ transport }) → TypedClient<Router>
 * - @sylphx/lens-client: Transports (direct, http, etc.)
 * - Module singleton pattern (no Context Provider needed)
 *
 * Usage:
 * ```typescript
 * // TUI (in-process with emit support)
 * import { createCodeClient, direct, initClient } from "@sylphx/code-client";
 * const client = createCodeClient(direct({ app: lensServer }));
 * initClient(client); // Register for global access
 *
 * // Web (HTTP transport)
 * import { createCodeClient, http, initClient } from "@sylphx/code-client";
 * const client = createCodeClient(http({ url: "/api/lens" }));
 * initClient(client); // Register for global access
 *
 * // React components (hooks):
 * const { data, loading } = client.getSession({ id });
 *
 * // Promise-based (SSR, utilities, signals):
 * const session = await client.getSession.fetch({ id });
 *
 * // From signals (after initialization):
 * import { getClient } from "@sylphx/code-client";
 * const client = getClient();
 * ```
 */
import { createClient } from "@sylphx/lens-react";
import { direct, http, } from "@sylphx/lens-client";
// =============================================================================
// Factory
// =============================================================================
/**
 * Create a type-safe Code client with any transport
 *
 * @param transport - Transport configuration (direct, http, etc.)
 * @returns Fully typed Code client
 *
 * @example
 * ```typescript
 * // TUI with direct transport (supports emit API)
 * const client = createCodeClient(direct({ app: lensServer }));
 *
 * // Web with HTTP transport
 * const client = createCodeClient(http({ url: "/api/lens" }));
 * ```
 */
export function createCodeClient(transport) {
    // createClient returns a dynamically-typed proxy that matches our CodeClient interface
    // The cast is safe because the proxy handles all endpoint calls at runtime
    return createClient({ transport });
}
// =============================================================================
// Transport Re-exports
// =============================================================================
export { 
// Transports
direct, http, };
// =============================================================================
// Global Client (Module Singleton)
// =============================================================================
// Storage key for global client
const GLOBAL_CLIENT_KEY = "__lensCodeClient__";
/**
 * Module-level client storage
 * Allows signals and utilities to access the client after initialization
 */
let _globalClient = null;
/**
 * Initialize the global client instance
 * Call this after creating the client to enable global access
 *
 * @param client - The created CodeClient instance
 *
 * @example
 * ```typescript
 * const client = createCodeClient(direct({ app: lensServer }));
 * initClient(client);
 * ```
 */
export function initClient(client) {
    _globalClient = client;
    // Also store in globalThis for cross-module access
    globalThis[GLOBAL_CLIENT_KEY] = client;
}
/**
 * Get the global client instance
 * Throws if client not initialized
 *
 * @returns The initialized CodeClient
 * @throws Error if client not initialized via initClient()
 *
 * @example
 * ```typescript
 * const client = getClient();
 * const session = await client.getSession.fetch({ id });
 * ```
 */
export function getClient() {
    // Try module-level first, then globalThis
    const client = _globalClient || globalThis[GLOBAL_CLIENT_KEY];
    if (!client) {
        throw new Error("Lens client not initialized. " +
            "Call initClient(createCodeClient(transport)) before using getClient().");
    }
    return client;
}
/**
 * Check if client is initialized
 *
 * @returns true if client is available
 */
export function isClientInitialized() {
    return _globalClient != null || globalThis[GLOBAL_CLIENT_KEY] != null;
}
// Note: LensRouter type export removed - using explicit CodeClient interface instead
// The bundler doesn't preserve createLensServer return types, so type inference doesn't work
// =============================================================================
// React Hooks (for backward compatibility)
// =============================================================================
/**
 * React hook to get the Lens client
 * Use this in React components to access the client
 *
 * Note: This is just a function that returns getClient().
 * The actual React hooks are in lens-react's client.xxx() methods.
 *
 * @returns The initialized CodeClient
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const client = useLensClient();
 *   const { data } = client.getSession({ input: { id } });
 * }
 * ```
 */
export function useLensClient() {
    return getClient();
}
/**
 * LensProvider - No-op wrapper for backward compatibility
 * With module singleton pattern, no provider is needed.
 * This is kept for code that hasn't been migrated yet.
 */
export function LensProvider({ children }) {
    return children;
}
/**
 * useQuery - Stub for backward compatibility
 * In lens-react v4, use client.queryName() directly as a hook
 * @deprecated Use client.queryName({ input }) directly
 */
export function useQuery(_queryFn, _deps = []) {
    // Note: This stub exists for type compatibility
    // Actual implementations should use client.xxx() directly
    throw new Error("useQuery is deprecated. Use client.xxx({ input }) directly in React components.");
}
//# sourceMappingURL=lens.js.map