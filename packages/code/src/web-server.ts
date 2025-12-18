/**
 * Web Server for GUI mode (code --web)
 *
 * Serves:
 * - Lens API at /lens (lens-server handles base path automatically)
 * - Static files from code-web/dist
 */

import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensServer } from "@sylphx/lens-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface WebServerConfig {
	lensServer: LensServer;
	port?: number;
}

export interface WebServerResult {
	server: Server;
	port: number;
	url: string;
}

/**
 * Find an available port starting from the given port (like Vite)
 */
async function findAvailablePort(startPort: number): Promise<number> {
	let port = startPort;
	while (port < 65535) {
		try {
			const server = Bun.serve({ port, fetch: () => new Response("") });
			server.stop();
			return port;
		} catch {
			port++;
		}
	}
	throw new Error("No available port found");
}

/**
 * Start HTTP server for web GUI
 */
export async function startWebServer(config: WebServerConfig): Promise<WebServerResult> {
	const { lensServer, port: requestedPort = 3000 } = config;

	// Find an available port
	const port = await findAvailablePort(requestedPort);
	if (port !== requestedPort) {
		console.log(`   Port ${requestedPort} in use, using ${port}`);
	}

	// Find web dist path
	const webDistPath = resolve(__dirname, "..", "..", "code-web", "dist");
	const hasWebDist = existsSync(webDistPath);

	if (hasWebDist) {
		console.log(`   Static files: ${webDistPath}`);
	} else {
		console.log(`   ⚠ Web UI not built: ${webDistPath}`);
	}

	const server = Bun.serve({
		port,
		// Disable idle timeout for SSE connections (default is 10s)
		idleTimeout: 0,
		async fetch(req) {
			const url = new URL(req.url);

			// CORS preflight
			if (req.method === "OPTIONS") {
				return new Response(null, {
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Accept",
					},
				});
			}

			// Lens API - pass directly to lensServer (handles base path automatically)
			if (url.pathname.startsWith("/lens")) {
				const response = await lensServer(req);
				// Add CORS headers
				response.headers.set("Access-Control-Allow-Origin", "*");
				return response;
			}

			// Static files
			if (hasWebDist) {
				const filePath = join(webDistPath, url.pathname);
				const file = Bun.file(filePath);

				if (await file.exists()) {
					return new Response(file);
				}

				// SPA fallback
				const indexFile = Bun.file(join(webDistPath, "index.html"));
				if (await indexFile.exists()) {
					return new Response(indexFile, {
						headers: { "Content-Type": "text/html" },
					});
				}
			}

			// Fallback
			return new Response(
				`<html>
					<body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
						<h1>🚀 Sylphx Code Server</h1>
						<p>Server is running, but Web UI is not built yet.</p>
						<p><strong>To build:</strong> <code>cd packages/code-web && bun run build</code></p>
						<p><strong>Lens API:</strong> Available at <code>/lens</code></p>
					</body>
				</html>`,
				{ headers: { "Content-Type": "text/html" } }
			);
		},
	});

	const url = `http://localhost:${port}`;

	console.log(`\n🚀 Sylphx Code Web`);
	console.log(`   URL: ${url}`);
	console.log(`   Lens: ${url}/lens`);

	return { server: server as unknown as Server, port, url };
}
