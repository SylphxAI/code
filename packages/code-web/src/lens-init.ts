/**
 * Lens Client Initialization for Web UI
 * Creates HTTP client and initializes global client for signals
 *
 * This avoids importing React-specific lens-provider code which causes bundling issues
 * Uses the new transport-based architecture.
 */

import { createClient, http, type LensClient } from "@lens/client";

// Same key as lens-provider.tsx for consistency across all modules
const GLOBAL_CLIENT_KEY = "__lensClient__" as const;

// Server URL for HTTP transport
const serverUrl = "http://localhost:3000/lens";

// Create Lens client with HTTP transport (sync)
export const lensClient: LensClient<any, any> = createClient({
	transport: http({
		url: serverUrl,
	}),
});

// Initialize global client for Zen signals using globalThis
// This ensures consistency with lens-provider.tsx and lens-client-global.ts
(globalThis as any)[GLOBAL_CLIENT_KEY] = lensClient;

console.log(`[Lens] HTTP client initialized for ${serverUrl}`);
