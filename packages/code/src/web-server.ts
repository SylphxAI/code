/**
 * Web Server for GUI mode (code --web)
 *
 * Serves:
 * - Lens API over HTTP at /lens
 * - Static files from code-web/dist
 */

import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensServer } from "@sylphx/lens-server";
import { createHandler } from "@sylphx/lens-server";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface WebServerConfig {
	lensServer: LensServer;
	port?: number;
}

/**
 * Start HTTP server for web GUI
 */
export async function startWebServer(config: WebServerConfig): Promise<Server> {
	const { lensServer, port = 3000 } = config;

	// Use Bun.serve for simplicity (native fetch handler)
	const handler = createHandler(lensServer, {
		pathPrefix: "/lens",
	});

	// Find web dist path
	const webDistPath = resolve(__dirname, "..", "..", "code-web", "dist");
	const hasWebDist = existsSync(webDistPath);

	if (hasWebDist) {
		console.log(`   Static files: ${webDistPath}`);
	} else {
		console.log(`   ⚠ Web UI not built: ${webDistPath}`);
	}

	let server;
	try {
		server = Bun.serve({
			port,
			async fetch(req) {
			const url = new URL(req.url);

			// Lens API requests
			if (url.pathname.startsWith("/lens")) {
				return handler(req);
			}

			// Static files
			if (hasWebDist) {
				// Try to serve static file
				const filePath = join(webDistPath, url.pathname);
				const file = Bun.file(filePath);

				if (await file.exists()) {
					return new Response(file);
				}

				// SPA fallback - serve index.html
				const indexFile = Bun.file(join(webDistPath, "index.html"));
				if (await indexFile.exists()) {
					return new Response(indexFile, {
						headers: { "Content-Type": "text/html" },
					});
				}
			}

			// Fallback message
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
	} catch (error: any) {
		if (error.code === "EADDRINUSE" || error.message?.includes("address already in use")) {
			console.error(`\n❌ Port ${port} is already in use`);
			console.error(`   Kill existing process: lsof -ti :${port} | xargs kill`);
			process.exit(1);
		}
		throw error;
	}

	console.log(`\n🚀 Sylphx Code Web`);
	console.log(`   URL: http://localhost:${port}`);
	console.log(`   Lens: http://localhost:${port}/lens`);

	// Return a mock Server object for compatibility
	return server as unknown as Server;
}
