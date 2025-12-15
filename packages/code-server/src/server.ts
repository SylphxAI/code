/**
 * CodeServer
 * Embeddable Lens server (in-process only)
 *
 * HTTP serving is handled by the `code` package when --web is used.
 */

import {
	type AppContext,
	closeAppContext,
	createAppContext,
	initializeAppContext,
} from "./context.js";
import { createLensServer, appRouter, type AppRouter } from "./lens/server.js";
import type { LensServer } from "@sylphx/lens-server";

export interface ServerConfig {
	/**
	 * Database path (default: ~/.sylphx-flow/sessions.db)
	 */
	dbPath?: string;
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
 * const server = new CodeServer({ dbPath: '...' });
 * await server.initialize();
 * const lensServer = server.getLensServer();
 *
 * // Use with direct transport (in-process)
 * const client = createClient({ transport: direct({ app: lensServer }) });
 */
export class CodeServer {
	private config: Required<ServerConfig>;
	private initialized = false;
	private appContext?: AppContext;
	private lensServer?: LensServer;

	constructor(config: ServerConfig = {}) {
		this.config = {
			dbPath: config.dbPath ?? "", // Empty string = use default from getDatabase()
			aiConfigPath: config.aiConfigPath ?? "", // Empty string = use default
			cwd: config.cwd ?? process.cwd(),
		};
	}

	/**
	 * Initialize server resources (database, agent/rule managers)
	 * Must be called before getLensServer()
	 */
	async initialize(): Promise<void> {
		if (this.initialized) {
			return;
		}

		// Create and initialize AppContext
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
	 * Close and cleanup resources
	 */
	async close(): Promise<void> {
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
	 * Get AppContext (for direct access to services)
	 */
	getAppContext(): AppContext {
		if (!this.initialized || !this.appContext) {
			throw new Error("Server not initialized. Call initialize() first.");
		}
		return this.appContext;
	}

	/**
	 * Get Lens server for direct transport
	 */
	getLensServer(): LensServer {
		if (!this.initialized || !this.lensServer) {
			throw new Error("Server not initialized. Call initialize() first.");
		}
		return this.lensServer;
	}
}
