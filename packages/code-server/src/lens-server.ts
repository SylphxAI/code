/**
 * LensServer
 * Embeddable Lens server for in-process or HTTP/SSE
 *
 * Design:
 * - Default: InProcessTransport (zero overhead, direct function calls)
 * - Optional: HTTP + SSE server (Web GUI, remote connections)
 * - Replaces tRPC with Lens framework
 */

import type { Server } from "node:http";
import express, { type Express } from "express";
import { InProcessTransport } from "@sylphx/lens-core";
import { createLensHTTPHandler } from "@sylphx/lens-server";
import { api } from "@sylphx/code-api";
import {
	type AppContext,
	closeAppContext,
	createAppContext,
	initializeAppContext,
} from "./context.js";

export interface LensServerConfig {
	/** Database path (default: ~/.sylphx-flow/sessions.db) */
	dbPath?: string;
	/** Port for optional HTTP server (default: 3000) */
	port?: number;
	/** AI config path (default: ~/.sylphx-flow/ai-config.json) */
	aiConfigPath?: string;
	/** Working directory (default: process.cwd()) */
	cwd?: string;
}

/**
 * LensServer - Embeddable Lens server
 *
 * Usage:
 *
 * // In-process (TUI, fast):
 * const server = new LensServer({ dbPath: '...' });
 * await server.initialize();
 * const client = server.createClient(); // Returns Lens client with InProcessTransport
 *
 * // HTTP + SSE (Web GUI):
 * const server = new LensServer({ dbPath: '...', port: 3000 });
 * await server.initialize();
 * await server.listen(); // Starts HTTP server on port 3000
 */
export class LensServer {
	private config: Required<LensServerConfig>;
	private appContext: AppContext | null = null;
	private httpServer: Server | null = null;
	private expressApp: Express | null = null;
	public inProcessTransport: InProcessTransport | null = null;

	constructor(config: LensServerConfig = {}) {
		this.config = {
			dbPath: config.dbPath || "~/.sylphx-flow/sessions.db",
			port: config.port || 3000,
			aiConfigPath: config.aiConfigPath || "~/.sylphx-flow/ai-config.json",
			cwd: config.cwd || process.cwd(),
		};
	}

	/**
	 * Initialize server (create AppContext)
	 */
	async initialize(): Promise<void> {
		this.appContext = await createAppContext({
			dbPath: this.config.dbPath,
			aiConfigPath: this.config.aiConfigPath,
			cwd: this.config.cwd,
		});

		await initializeAppContext(this.appContext);

		// Create CodeContext for Lens API (transforms AppContext to expected shape)
		const { loadAIConfig } = await import("@sylphx/code-core");

		// Get repositories from database
		const sessionRepository = this.appContext.database.getRepository();
		const messageRepository = this.appContext.database.getMessageRepository();
		const todoRepository = this.appContext.database.getTodoRepository();

		// Load AI config
		let aiConfig = { providers: {} };
		try {
			const result = await loadAIConfig();
			console.log("[LensServer] loadAIConfig result:", result);
			if (result.success) {
				aiConfig = result.data;
				console.log("[LensServer] Loaded aiConfig providers:", Object.keys(aiConfig.providers || {}));
			} else {
				console.error("[LensServer] loadAIConfig failed:", result);
			}
		} catch (error) {
			console.error("[LensServer] Failed to load AI config:", error);
		}

		const codeContext = {
			sessionRepository,
			messageRepository,
			todoRepository,
			aiConfig,
			appContext: this.appContext, // Pass full AppContext with all services
		};

		console.log("[LensServer] CodeContext created with providers:", Object.keys(codeContext.aiConfig.providers || {}));
		console.log("[LensServer] CodeContext keys:", Object.keys(codeContext));
		console.log("[LensServer] CodeContext.aiConfig type:", typeof codeContext.aiConfig);
		console.log("[LensServer] CodeContext.aiConfig.providers type:", typeof codeContext.aiConfig.providers);

		// Create InProcessTransport with CodeContext
		this.inProcessTransport = new InProcessTransport({
			api,
			context: codeContext,
		});

		console.log(`[LensServer] Initialized (db: ${this.config.dbPath})`);
	}

	/**
	 * Create Lens client for in-process use (TUI)
	 * Returns InProcessTransport for zero-overhead function calls
	 */
	createInProcessTransport(): InProcessTransport {
		if (!this.inProcessTransport) {
			throw new Error("Server not initialized. Call initialize() first.");
		}
		return this.inProcessTransport;
	}

	/**
	 * Get AppContext (for direct access to repositories)
	 */
	getAppContext(): AppContext {
		if (!this.appContext) {
			throw new Error("Server not initialized. Call initialize() first.");
		}
		return this.appContext;
	}

	/**
	 * Start HTTP + SSE server for remote connections (Web GUI)
	 */
	async listen(): Promise<void> {
		if (!this.appContext) {
			throw new Error("Server not initialized. Call initialize() first.");
		}

		this.expressApp = express();

		// CORS for Web GUI
		this.expressApp.use((req, res, next) => {
			res.header("Access-Control-Allow-Origin", "*");
			res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			res.header("Access-Control-Allow-Headers", "Content-Type");
			if (req.method === "OPTIONS") {
				res.sendStatus(200);
			} else {
				next();
			}
		});

		// JSON body parser
		this.expressApp.use(express.json());

		// Create Lens server with HTTP/SSE handlers
		const { createLensServer } = await import("@sylphx/lens-server");

		// Create CodeContext for Lens API (transforms AppContext to expected shape)
		const { loadAIConfig } = await import("@sylphx/code-core");

		// Get repositories from database
		const sessionRepository = this.appContext.database.getRepository();
		const messageRepository = this.appContext.database.getMessageRepository();
		const todoRepository = this.appContext.database.getTodoRepository();

		// Load AI config
		let aiConfig = { providers: {} };
		try {
			const result = await loadAIConfig();
			if (result.success) {
				aiConfig = result.data;
			}
		} catch (error) {
			console.error("Failed to load AI config:", error);
		}

		const codeContext = {
			sessionRepository,
			messageRepository,
			todoRepository,
			aiConfig,
			appContext: this.appContext, // Pass full AppContext with all services
		};

		const lensServer = createLensServer(api, {
			context: codeContext,
		});

		// HTTP endpoint for queries/mutations
		this.expressApp.post("/lens", lensServer.handler);

		// SSE endpoint for subscriptions
		this.expressApp.get("/lens/subscribe", (req, res) => {
			const { data } = req.query;
			if (!data || typeof data !== "string") {
				res.status(400).send("Missing or invalid 'data' parameter");
				return;
			}

			try {
				const request = JSON.parse(data);

				res.setHeader("Content-Type", "text/event-stream");
				res.setHeader("Cache-Control", "no-cache");
				res.setHeader("Connection", "keep-alive");

				// Create SSE-compatible handler
				// SSE sends server-sent events, similar to WebSocket but one-way
				const subscription = lensServer.wsHandler({
					send: (message: string) => {
						res.write(`data: ${message}\n\n`);
					},
					on: (event: string, handler: (...args: any[]) => void) => {
						if (event === "message") {
							// Send initial subscription request
							handler(JSON.stringify({
								id: "sse-subscription",
								type: "request",
								payload: request,
							}));
						} else if (event === "close") {
							req.on("close", handler);
						}
					},
				});

				req.on("close", () => {
					// Cleanup will be handled by wsHandler's close event
				});
			} catch (error) {
				console.error("[LensServer] SSE error:", error);
				res.status(500).send("Subscription error");
			}
		});

		// Start listening
		return new Promise((resolve) => {
			this.httpServer = this.expressApp!.listen(this.config.port, () => {
				console.log(`[LensServer] HTTP + SSE listening on port ${this.config.port}`);
				console.log(`  HTTP: http://localhost:${this.config.port}/lens`);
				console.log(`  SSE:  http://localhost:${this.config.port}/lens/subscribe`);
				resolve();
			});
		});
	}

	/**
	 * Stop server and cleanup resources
	 */
	async close(): Promise<void> {
		// Close HTTP server
		if (this.httpServer) {
			await new Promise<void>((resolve) => {
				this.httpServer!.close(() => resolve());
			});
			this.httpServer = null;
			this.expressApp = null;
		}

		// Close in-process transport
		if (this.inProcessTransport) {
			this.inProcessTransport.close?.();
			this.inProcessTransport = null;
		}

		// Close AppContext
		if (this.appContext) {
			await closeAppContext(this.appContext);
			this.appContext = null;
		}

		console.log("[LensServer] Closed");
	}
}
