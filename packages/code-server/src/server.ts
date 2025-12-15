/**
 * CodeServer
 * Embeddable Lens server for in-process or HTTP
 *
 * Design Philosophy:
 * - Default: In-process (zero overhead, direct function calls)
 * - Optional: HTTP server (Web GUI, remote connections)
 * - Lens-only architecture (no tRPC)
 */

import type { Server } from "node:http";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express, type Request, type Response } from "express";
import {
	type AppContext,
	closeAppContext,
	createAppContext,
	initializeAppContext,
} from "./context.js";
import { createLensServer, appRouter, type AppRouter } from "./lens/server.js";
import { createHandler, type LensServer } from "@sylphx/lens-server";

export interface ServerConfig {
	/**
	 * Database path (default: ~/.sylphx-flow/sessions.db)
	 */
	dbPath?: string;
	/**
	 * Port for optional HTTP server (default: 3000)
	 */
	port?: number;
	/**
	 * AI config path (default: ~/.sylphx-flow/ai-config.json)
	 */
	aiConfigPath?: string;
	/**
	 * Working directory for agent/rule managers (default: process.cwd())
	 */
	cwd?: string;
}

/**
 * CodeServer - Embeddable Lens server
 *
 * Usage:
 *
 * // In-process (TUI, fast):
 * const server = new CodeServer({ dbPath: '...' });
 * await server.initialize();
 * const lensServer = server.getLensServer();
 *
 * // HTTP (Web GUI, remote):
 * const server = new CodeServer({ port: 3000 });
 * await server.initialize();
 * await server.startHTTP();
 */
export class CodeServer {
	private config: Required<ServerConfig>;
	private httpServer?: Server;
	private expressApp?: Express;
	private initialized = false;
	private appContext?: AppContext;
	private lensServer?: LensServer;

	constructor(config: ServerConfig = {}) {
		this.config = {
			dbPath: config.dbPath ?? "", // Empty string = use default from getDatabase()
			port: config.port ?? 3000,
			aiConfigPath: config.aiConfigPath ?? "", // Empty string = use default
			cwd: config.cwd ?? process.cwd(),
		};
	}

	/**
	 * Initialize server resources (database, agent/rule managers)
	 * Must be called before getLensServer() or startHTTP()
	 * Uses functional provider pattern via AppContext
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// Create and initialize AppContext (functional provider pattern)
		this.appContext = createAppContext({
			cwd: this.config.cwd,
			database: this.config.dbPath ? { url: this.config.dbPath } : undefined,
		});

		await initializeAppContext(this.appContext);

		// Initialize Lens server
		this.lensServer = createLensServer(this.appContext);

		this.initialized = true;
	}

	/**
	 * Get AppRouter for type inference
	 */
	getRouter(): AppRouter {
		return appRouter;
	}

	/**
	 * Start HTTP server for Web GUI or remote connections
	 * Returns the HTTP server instance
	 */
	async startHTTP(port?: number): Promise<Server> {
		if (!this.initialized) {
			throw new Error("Server not initialized. Call initialize() first.");
		}

		const finalPort = port ?? this.config.port;

		// Create Express app if not already created
		if (!this.expressApp) {
			this.expressApp = express();

			// Standard Lens HTTP handler (supports /__lens/metadata, /__lens/sse, etc.)
			const lensHandler = createHandler(this.lensServer!, {
				pathPrefix: "/lens",
			});

			// Parse JSON body for Lens requests
			this.expressApp.use("/lens", express.json());

			// CORS for development (web app on different port)
			this.expressApp.use("/lens", (_req, res, next) => {
				res.header("Access-Control-Allow-Origin", "*");
				res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
				res.header("Access-Control-Allow-Headers", "Content-Type");
				next();
			});

			// Handle CORS preflight (use regex for Express 5 compatibility)
			this.expressApp.options(/^\/lens(\/.*)?$/, (_req, res) => {
				res.sendStatus(204);
			});

			// Lens route handler - adapter from Web API handler to Express
			const handleLensRequest = async (req: Request, res: Response) => {
				try {
					// Convert Express request to Web API Request
					const url = `${req.protocol}://${req.get("host")}${req.originalUrl}`;
					const webRequest = new globalThis.Request(url, {
						method: req.method,
						headers: req.headers as HeadersInit,
						body: ["GET", "HEAD"].includes(req.method)
							? undefined
							: JSON.stringify(req.body),
					});

					// Call lens handler
					const webResponse = await lensHandler(webRequest);

					// Handle SSE response
					if (webResponse.headers.get("content-type")?.includes("text/event-stream")) {
						res.setHeader("Content-Type", "text/event-stream");
						res.setHeader("Cache-Control", "no-cache");
						res.setHeader("Connection", "keep-alive");
						res.flushHeaders();

						const reader = webResponse.body?.getReader();
						if (reader) {
							const decoder = new TextDecoder();
							while (true) {
								const { done, value } = await reader.read();
								if (done) break;
								res.write(decoder.decode(value, { stream: true }));
							}
						}
						res.end();
						return;
					}

					// Regular response
					res.status(webResponse.status);
					webResponse.headers.forEach((value, key) => {
						res.setHeader(key, value);
					});
					const body = await webResponse.text();
					res.send(body);
				} catch (error) {
					console.error("[Lens HTTP] Error:", error);
					res.status(500).json({ error: "Internal server error" });
				}
			};

			// Register handler for all /lens routes (use regex for Express 5)
			this.expressApp.all(/^\/lens(\/.*)?$/, handleLensRequest);

			console.log("✅ Lens HTTP handler initialized (standard protocol)");
			console.log("   - Endpoint: /lens/*");
			console.log("   - Metadata: /lens/__lens/metadata");
			console.log("   - SSE: /lens/__lens/sse");

			// Static files for Web UI
			await this.setupStaticFiles();
		}

		return new Promise((resolve, reject) => {
			this.httpServer = this.expressApp
				?.listen(finalPort, () => {
					console.log(`\n🚀 Sylphx Code Server`);
					console.log(`   HTTP Server: http://localhost:${finalPort}`);
					console.log(`   Lens Endpoint: http://localhost:${finalPort}/lens`);
					console.log(`\n📡 Accepting connections from:`);
					console.log(`   - code (TUI): in-process Lens`);
					console.log(`   - code-web (GUI): HTTP Lens`);
					console.log(`\n💾 All clients share same data source\n`);
					resolve(this.httpServer!);
				})
				.on("error", (err: any) => {
					if (err.code === "EADDRINUSE") {
						console.log(`ℹ️  Server already running on port ${finalPort}`);
						console.log(`   Clients can connect to: http://localhost:${finalPort}`);
						// Return null to indicate server already running
						resolve(null as any);
					} else {
						reject(err);
					}
				});
		});
	}

	/**
	 * Setup static file serving for Web UI
	 * Resolves path relative to this package to find sibling code-web package
	 */
	private async setupStaticFiles(): Promise<void> {
		if (!this.expressApp) return;

		try {
			// Get path relative to this file's location
			const __filename = fileURLToPath(import.meta.url);
			const __dirname = dirname(__filename);

			// Navigate from code-server/src (or dist) to code-web/dist
			// Works for both development (src) and production (dist)
			const webDistPath = resolve(__dirname, "..", "..", "code-web", "dist");

			if (existsSync(webDistPath)) {
				console.log(`   - Static files: ${webDistPath}`);
				this.expressApp.use(express.static(webDistPath));

				// SPA fallback - serve index.html for all non-API routes
				this.expressApp.use((req, res, next) => {
					// Skip if it's a Lens request
					if (req.path.startsWith("/lens")) {
						return next();
					}

					// Serve index.html for all other routes (SPA routing)
					res.sendFile(join(webDistPath, "index.html"));
				});
			} else {
				// Development mode - no static files yet, show helpful message
				console.log(`   ⚠ Web UI not built at: ${webDistPath}`);
				this.expressApp.get("/", (_req, res) => {
					res.send(`
            <html>
              <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1>🚀 Sylphx Code Server</h1>
                <p>Server is running, but Web UI is not built yet.</p>
                <p><strong>To build the Web UI:</strong></p>
                <pre>cd packages/code-web && bun install && bun run build</pre>
                <p><strong>API Status:</strong> ✅ Lens endpoints available at <code>/lens</code></p>
                <p><strong>Development:</strong> Run <code>bun dev:web</code> for hot-reload dev server on port 5173</p>
              </body>
            </html>
          `);
				});
			}
		} catch (error) {
			console.error("Error setting up static files:", error);
		}
	}

	/**
	 * Close HTTP server and cleanup resources
	 */
	async close(): Promise<void> {
		if (this.httpServer) {
			await new Promise<void>((resolve, reject) => {
				this.httpServer?.close((err) => {
					if (err) reject(err);
					else resolve();
				});
			});
		}

		// Cleanup AppContext
		if (this.appContext) {
			await closeAppContext(this.appContext);
		}
	}

	/**
	 * Check if server is initialized
	 */
	isInitialized(): boolean {
		return this.initialized;
	}

	/**
	 * Check if HTTP server is running
	 */
	isHTTPRunning(): boolean {
		return this.httpServer?.listening;
	}

	/**
	 * Get AppContext (for embedded mode only)
	 * Allows direct access to services when running in-process
	 */
	getAppContext(): AppContext {
		if (!this.initialized || !this.appContext) {
			throw new Error("Server not initialized. Call initialize() first.");
		}
		return this.appContext;
	}

	/**
	 * Get Lens server for in-process transport
	 * Returns the Lens server instance that implements LensServerInterface
	 * Used with inProcess({ server }) transport for zero-overhead communication
	 */
	getLensServer(): LensServer {
		if (!this.initialized || !this.lensServer) {
			throw new Error("Server not initialized. Call initialize() first.");
		}
		return this.lensServer;
	}
}
