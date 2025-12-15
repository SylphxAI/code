#!/usr/bin/env bun

/**
 * Sylphx Code - Unified CLI Tool
 *
 * Architecture:
 * - Embedded CodeServer (in-process tRPC by default)
 * - Optional HTTP server for Web GUI (--web flag)
 * - Optional remote connection (--server-url flag)
 *
 * Modes:
 * - TUI (default): code
 * - Headless: code "prompt"
 * - TUI + Web: code --web
 * - Standalone server: code --server
 * - Remote TUI: code --server-url http://host:port
 */

// Install global unhandled rejection handler to prevent crashes
// This is a safety net for errors that escape all other error handling
process.on("unhandledRejection", (reason, _promise) => {
	// Check for NoOutputGeneratedError first (abort case)
	if (reason && typeof reason === "object" && "name" in reason) {
		const errorName = (reason as any).name;
		if (errorName === "NoOutputGeneratedError" || errorName === "AI_NoOutputGeneratedError") {
			// This is expected when user aborts streaming (ESC key)
			// AI SDK throws this error internally when abortSignal is triggered
			// Silently ignore - abort is handled properly in streaming.service.ts
			return;
		}
	}

	// Log other errors
	console.error("[CRITICAL] Unhandled Promise Rejection:");
	console.error("Reason:", reason);

	// Log error cause if available (for wrapped errors)
	if (reason && typeof reason === "object" && "cause" in reason && reason.cause) {
		console.error("Underlying cause:", reason.cause);
	}

	// Log but don't exit - let the app continue running
	console.error("[CRITICAL] Non-stream error - logging but continuing");
});

// Install uncaught exception handler
process.on("uncaughtException", (error) => {
	console.error("[CRITICAL] Uncaught Exception:");
	console.error(error);

	// For uncaught exceptions, we should exit as the process state may be corrupted
	console.error("[CRITICAL] Process will exit due to uncaught exception");
	process.exit(1);
});

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	// New Lens client factory
	createCodeClient,
	direct,
	initClient,
	// Legacy tRPC (will be removed after migration)
	// createInProcessClient,
	// TRPCProvider,
	// type TypedTRPCClient,
} from "@sylphx/code-client";
import { CodeServer, createLensServer } from "@sylphx/code-server";
import chalk from "chalk";
import { Command } from "commander";
import { checkServer } from "./server-health.js";

// Read version from package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const VERSION = packageJson.version;

/**
 * Global embedded servers
 * Used for in-process mode
 */
let embeddedServer: CodeServer | null = null;
let lensServer: ReturnType<typeof createLensServer> | null = null;

/**
 * Initialize embedded servers for in-process use
 */
async function initEmbeddedServers(_options: { quiet?: boolean } = {}): Promise<{
	codeServer: CodeServer;
	lensServer: ReturnType<typeof createLensServer>;
}> {
	if (embeddedServer && lensServer) {
		return { codeServer: embeddedServer, lensServer };
	}

	// Initialize tRPC server (legacy, will be removed)
	embeddedServer = new CodeServer();
	await embeddedServer.initialize();

	// Register embedded server for context access (TUI only)
	const { setEmbeddedServer } = await import("./embedded-context.js");
	setEmbeddedServer(embeddedServer);

	// Initialize Lens server (new) - uses factory function with AppContext
	lensServer = embeddedServer.getLensServer();

	// Auto-connect to enabled MCP servers (async, don't wait)
	const { getMCPManager } = await import("@sylphx/code-core");
	const mcpManager = getMCPManager();
	mcpManager.connectToEnabledServers().catch((error) => {
		console.error(chalk.red("Failed to auto-connect MCP servers:"), error);
	});

	return { codeServer: embeddedServer, lensServer };
}

/**
 * Main CLI entry point
 */
async function main() {
	const program = new Command();

	program
		.name("sylphx-code")
		.description("Sylphx Code - AI development assistant")
		.version(VERSION, "-V, --version", "Show version number")
		.helpOption("-h, --help", "Display help for command")
		.argument("[prompt]", "Prompt to send to AI (headless mode)")
		.option("-p, --print", "Print mode (headless)")
		.option("-c, --continue", "Continue last session")
		.option("--web", "Launch Web GUI (starts HTTP server)")
		.option("--server", "Start standalone HTTP server only")
		.option("--server-url <url>", "Connect to remote server (HTTP tRPC)")
		.option("-q, --quiet", "Quiet mode")
		.option("-v, --verbose", "Verbose mode")
		.action(async (prompt, options) => {
			// Standalone server mode
			if (options.server) {
				console.log(chalk.cyan("Starting standalone HTTP server..."));
				console.log(chalk.dim("Use Ctrl+C to stop"));

				const server = new CodeServer();
				await server.initialize();

				// Start web server
				const { startWebServer } = await import("./web-server.js");
				await startWebServer({ lensServer: server.getLensServer(), port: 3000 });

				// Keep process alive
				await new Promise(() => {});
				return;
			}

			if (options.serverUrl) {
				// Remote mode: Connect to existing HTTP server
				if (!options.quiet) {
					console.error(chalk.dim(`Connecting to remote server: ${options.serverUrl}`));
				}

				// Check if server is available
				const available = await checkServer(options.serverUrl);
				if (!available) {
					console.error(chalk.red(`✗ Server not available at ${options.serverUrl}`));
					console.error(chalk.yellow("\nOptions:"));
					console.error(chalk.dim("  1. Check server URL"));
					console.error(chalk.dim("  2. Start server: code --server"));
					process.exit(1);
				}

				// TODO: Remote mode not yet implemented with new Lens client
				// For now, only in-process mode is supported
				console.error(chalk.yellow("Remote mode not yet implemented with new Lens architecture"));
				console.error(chalk.dim("Use in-process mode instead (remove --server-url flag)"));
				process.exit(1);
			}

			// In-process mode (default): Embed servers
			// Headless mode should be quiet by default (unless --verbose)
			const isHeadless = Boolean(prompt || options.print);
			const shouldBeQuiet = isHeadless ? !options.verbose : options.quiet;

			const { codeServer, lensServer: lens } = await initEmbeddedServers({ quiet: shouldBeQuiet });

			// Create Lens client with direct transport (in-process)
			// This is the new pattern - no Context Provider needed
			const lensClient = createCodeClient(direct({ app: lens }));
			initClient(lensClient); // Register for global access (signals, utilities)

			// Store lens server globally for TUI
			lensServer = lens;

			// If --web flag, start HTTP server and open browser (GUI mode only)
			if (options.web) {
				if (!options.quiet) {
					console.error(chalk.dim("Starting HTTP server for Web GUI..."));
				}

				// Start web server (in code package, not code-server)
				const { startWebServer } = await import("./web-server.js");
				await startWebServer({ lensServer: lens, port: 3000 });

				// Open browser and wait (no TUI needed)
				const { launchWeb } = await import("./web-launcher.js");
				await launchWeb();
				return; // GUI mode - don't start TUI
			}

			// Headless mode: if prompt provided OR --print flag
			if (prompt || options.print) {
				if (!prompt) {
					console.error(chalk.red("Error: No prompt provided"));
					console.error(chalk.dim('Usage: sylphx-code "your prompt here"'));
					console.error(chalk.dim('   or: sylphx-code -c "your prompt"'));
					process.exit(1);
				}

				// Headless mode uses same React + LensProvider pattern as TUI
				// No global client needed - component uses useLensClient() hook
				if (!lensServer) {
					console.error(chalk.red("Error: Lens server not initialized"));
					process.exit(1);
				}

				const { runHeadless } = await import("./headless.js");
				await runHeadless(prompt, options, lensServer);
				return;
			}

			// TUI mode (default)
			const React = await import("react");
			const { render } = await import("ink");
			const { default: App } = await import("./App.js");

			// NOTE: Signal initialization timing issue - module resolution prevents pre-render init
			// Tracked in: .sylphx/technical-debt.md (Medium Priority #6)
			// Current workaround: Runtime initialization (works but not optimal)
			// const { initializeSignals } = await import('./signal-init.js');
			// initializeSignals();

			if (!embeddedServer) {
				throw new Error("Embedded server not initialized");
			}

			// Lens client already initialized above via initClient()
			// No providers needed - lens-react v4 uses module singleton pattern
			// Components access client via getClient() or lens-react hooks
			render(React.createElement(App));
		});

	try {
		await program.parseAsync(process.argv);
	} catch (error) {
		console.error("Error:", error instanceof Error ? error.message : String(error));
		process.exit(1);
	}
}

// Run main
main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
