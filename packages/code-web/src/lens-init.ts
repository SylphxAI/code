/**
 * Lens Client Initialization for Web UI
 *
 * Uses lens-react v4 pattern with module singleton.
 * Creates HTTP client and initializes global client for signals.
 */

import { createCodeClient, http, initClient, type CodeClient } from "@sylphx/code-client";

// Server URL for HTTP transport
const serverUrl = "http://localhost:3000/lens";

// Create Lens client with HTTP transport
export const client: CodeClient = createCodeClient(http({ url: serverUrl }));

// Initialize global client for signals and utilities
initClient(client);

console.log(`[Lens] HTTP client initialized for ${serverUrl}`);
