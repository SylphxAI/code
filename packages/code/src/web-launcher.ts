/**
 * Web Launcher
 * Opens browser for Web GUI mode
 */

import { getServerURL } from "@sylphx/code-core";
import chalk from "chalk";

/**
 * Launch Web GUI mode
 * Opens browser to the web UI
 */
export async function launchWeb(): Promise<void> {
	console.error(chalk.cyan("Launching Web GUI..."));

	// Open browser
	const url = process.env.CODE_SERVER_URL || getServerURL();
	console.error(chalk.cyan(`\nOpening browser: ${url}`));

	try {
		const open = (await import("open")).default;
		await open(url);

		console.error(chalk.green("\n✓ Browser opened"));
		console.error(chalk.dim("\nServer is running in background"));
		console.error(chalk.dim("Press Ctrl+C to exit (server will keep running)"));

		// Keep process alive
		process.stdin.resume();
	} catch (_error) {
		console.error(chalk.yellow("\n⚠ Failed to open browser"));
		console.error(chalk.cyan(`\nPlease open manually: ${url}`));
		process.exit(1);
	}
}
