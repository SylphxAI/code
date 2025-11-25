/**
 * Sylphx Code API - Type Definitions
 *
 * This file provides backward-compatible type exports.
 * The actual API implementation is now in @sylphx/code-server/src/lens/
 * using the new Lens Three-Layer Architecture.
 *
 * @deprecated Use @lens/client with server types instead
 */

// Re-export schemas - these are still used for type definitions
export * from "./schemas/index.js";

// Placeholder API object for backward compatibility
// The actual implementation is in packages/code-server/src/lens/
export const api = {
	_deprecated: true as const,
	_message: "API has moved to @sylphx/code-server/src/lens/" as const,
};

export type API = typeof api;
