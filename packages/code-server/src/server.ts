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
import express, { type Express } from "express";
import {
	type AppContext,
	closeAppContext,
	createAppContext,
	initializeAppContext,
} from "./context.js";
import { initializeLensAPI } from "./lens/index.js";
import { createLensHTTPHandler } from "./lens/http-handler.js";
import { createLensServer, appRouter, type AppRouter } from "./lens/server.js";
import type { LensServer } from "@sylphx/lens-server";

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

			// Lens HTTP middleware
			// Initialize Lens API with AppContext (context is pre-bound)
			const lensAPI = initializeLensAPI(this.appContext!);
			const lensHandler = createLensHTTPHandler(lensAPI);

			// Parse JSON body for Lens requests
			this.expressApp.use("/lens", express.json());
			this.expressApp.post("/lens", lensHandler);

			console.log("✅ Lens HTTP handler initialized");
			console.log("   - Endpoint: POST /lens");
			console.log("   - Context: Pre-bound with AppContext");

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
	 */
	private async setupStaticFiles(): Promise<void> {
		if (!this.expressApp) return;

		try {
			const { existsSync } = await import("node:fs");
			const { resolve } = await import("node:path");

			if (existsSync("./src/web/dist")) {
				this.expressApp.use(express.static("./src/web/dist"));

				// SPA fallback - serve index.html for all non-API routes
				this.expressApp.use((req, res, next) => {
					// Skip if it's a Lens request
					if (req.path.startsWith("/lens")) {
						return next();
					}

					// Serve index.html for all other routes (SPA routing)
					res.sendFile(resolve("./src/web/dist/index.html"));
				});
			} else {
				// Development mode - no static files yet
				this.expressApp.get("/", (_req, res) => {
					res.send(`
            <html>
              <body style="font-family: sans-serif; padding: 40px; max-width: 600px; margin: 0 auto;">
                <h1>🚀 Sylphx Code Server</h1>
                <p>Server is running, but Web UI is not built yet.</p>
                <p><strong>To build the Web UI:</strong></p>
                <pre>cd src/web && bun install && bun run build</pre>
                <p><strong>API Status:</strong> ✅ Lens endpoints available at <code>/lens</code></p>
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
