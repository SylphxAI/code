/**
 * Lens Client Initialization for Web UI
 * Creates HTTP transport and initializes global client for signals
 *
 * This avoids importing React-specific lens-provider code which causes bundling issues
 */

import { createHTTPTransport } from "@sylphx/lens-transport-http";
import { createLensClient } from "@sylphx/lens-client";

// Create HTTP transport to server
const transport = createHTTPTransport({
	url: "http://localhost:3000/lens",
});

// Create Lens client
export const lensClient = createLensClient({ transport });

// Initialize global client for Zen signals
// This is a simplified version of _initGlobalClient that avoids React dependencies
if (typeof window !== 'undefined') {
	// @ts-ignore - Attaching to window for global access
	window.__lensClient = lensClient;
}

console.log("[Lens] HTTP client initialized for http://localhost:3000/lens");
