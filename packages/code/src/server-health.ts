/**
 * Server Health Utilities
 * HTTP utilities for checking server availability
 */

import { getServerURL } from "@sylphx/code-core";

/**
 * Check if HTTP server is running at given URL
 */
export async function checkServer(serverUrl?: string): Promise<boolean> {
	const url = serverUrl || process.env.CODE_SERVER_URL || getServerURL();

	try {
		const response = await fetch(url, { method: "HEAD" });
		return response.ok;
	} catch (_error) {
		return false;
	}
}

/**
 * Wait for HTTP server to be ready
 */
export async function waitForServer(
	serverUrl?: string,
	timeoutMs: number = 5000,
): Promise<boolean> {
	const startTime = Date.now();

	while (Date.now() - startTime < timeoutMs) {
		if (await checkServer(serverUrl)) {
			return true;
		}
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	return false;
}
