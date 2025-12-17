/**
 * Web Server for GUI mode (code --web)
 *
 * Serves:
 * - Lens API over HTTP at /lens
 *   - POST / for queries/mutations (via direct app)
 *   - GET /{path}?_sse=1 for subscriptions (custom SSE handler)
 * - Static files from code-web/dist
 */

import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LensServer } from "@sylphx/lens-server";

/**
 * Custom SSE handler that sends the full Result envelope.
 *
 * The lens-server handleWebSSE sends value.data (unwrapped) but
 * the lens-client expects the full Result envelope { "$": "snapshot", "data": ... }.
 */
function handleSSE(
	server: LensServer,
	path: string,
	url: URL,
	signal?: AbortSignal,
): Response {
	const inputParam = url.searchParams.get("input");

	// Parse input with error handling
	let input: unknown;
	if (inputParam) {
		try {
			input = JSON.parse(inputParam);
		} catch (parseError) {
			const encoder = new TextEncoder();
			const errorStream = new ReadableStream({
				start(controller) {
					const errMsg = parseError instanceof Error ? parseError.message : "Invalid JSON";
					const data = `event: error\ndata: ${JSON.stringify({ error: `Invalid input JSON: ${errMsg}` })}\n\n`;
					controller.enqueue(encoder.encode(data));
					controller.close();
				},
			});
			return new Response(errorStream, {
				headers: {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					Connection: "keep-alive",
				},
			});
		}
	}

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			try {
				const result = server.execute({ path, input });

				if (result && typeof result === "object" && "subscribe" in result) {
					const observable = result as {
						subscribe: (handlers: {
							next: (value: unknown) => void;
							error: (err: Error) => void;
							complete: () => void;
						}) => { unsubscribe: () => void };
					};

					const subscription = observable.subscribe({
						next: (value) => {
							// Send the FULL Result envelope, not just value.data
							const data = `data: ${JSON.stringify(value)}\n\n`;
							controller.enqueue(encoder.encode(data));
						},
						error: (err) => {
							const data = `event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`;
							controller.enqueue(encoder.encode(data));
							controller.close();
						},
						complete: () => {
							controller.close();
						},
					});

					// Clean up on abort
					if (signal) {
						signal.addEventListener("abort", () => {
							subscription.unsubscribe();
							controller.close();
						});
					}
				}
			} catch (execError) {
				const errMsg = execError instanceof Error ? execError.message : "Internal error";
				const data = `event: error\ndata: ${JSON.stringify({ error: errMsg })}\n\n`;
				controller.enqueue(encoder.encode(data));
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}

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
		async fetch(req) {
			const url = new URL(req.url);

			// CORS preflight - handle before routing
			if (req.method === "OPTIONS") {
				return new Response(null, {
					headers: {
						"Access-Control-Allow-Origin": "*",
						"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
						"Access-Control-Allow-Headers": "Content-Type, Accept",
					},
				});
			}

			// Lens API
			if (url.pathname.startsWith("/lens")) {
				// Strip /lens prefix to get the operation path
				const operationPath = url.pathname.replace(/^\/lens\/?/, "");

				// Check for SSE subscription request
				// httpSse client uses GET with _sse=1 query param or Accept: text/event-stream
				const isSSE =
					url.searchParams.get("_sse") === "1" ||
					req.headers.get("accept") === "text/event-stream";

				if (isSSE && operationPath) {
					// Handle SSE subscription with custom handler that sends full Result envelope
					const sseUrl = new URL(req.url);
					sseUrl.pathname = "/" + operationPath;
					const response = handleSSE(lensServer, operationPath, sseUrl, req.signal);

					// Add CORS headers
					const headers = new Headers(response.headers);
					headers.set("Access-Control-Allow-Origin", "*");
					return new Response(response.body, {
						status: response.status,
						headers,
					});
				}

				// For non-SSE requests, use direct app
				const lensUrl = new URL(req.url);
				lensUrl.pathname = operationPath ? "/" + operationPath : "/";
				const lensReq = new Request(lensUrl.toString(), req);

				// Call the lens server directly (it's a callable interface)
				const response = await lensServer(lensReq);

				// Add CORS headers
				const headers = new Headers(response.headers);
				headers.set("Access-Control-Allow-Origin", "*");
				return new Response(response.body, {
					status: response.status,
					headers,
				});
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
