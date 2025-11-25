/**
 * Headless Mode - Execute prompt and stream response
 *
 * ARCHITECTURE: React Ink component using LensProvider
 * - Uses useLensClient() hook (NOT getLensClient())
 * - Wrapped in LensProvider just like TUI mode
 * - Ink renders to stdout in raw mode
 *
 * Event Flow:
 * 1. Load AI config and validate provider
 * 2. Call triggerStream mutation → Get sessionId
 * 3. Subscribe to session events with replayLast=0 (no replay needed)
 * 4. Print text-delta events to stdout (streaming output)
 * 5. Wait for complete/error event
 * 6. Exit process with appropriate code (0 = success, 1 = error)
 */

import { useLensClient } from "@sylphx/code-client";
import { loadAIConfig } from "@sylphx/code-core";
import chalk from "chalk";
import { Box, Text, render } from "ink";
import React, { useEffect, useState } from "react";

interface HeadlessOptions {
	continue?: boolean;
	verbose?: boolean;
}

interface HeadlessProps {
	prompt: string;
	options: HeadlessOptions;
}

/**
 * HeadlessApp - React component for headless mode
 * Uses useLensClient() hook to get the Lens client
 */
function HeadlessApp({ prompt, options }: HeadlessProps) {
	const client = useLensClient();
	const [error, setError] = useState<string | null>(null);
	const [output, setOutput] = useState("");
	const [isComplete, setIsComplete] = useState(false);

	useEffect(() => {
		let mounted = true;

		async function runHeadless() {
			try {
				// Load AI config to get default provider/model
				const configResult = await loadAIConfig();
				if (!configResult.success) {
					setError(`Failed to load AI config: ${configResult.error.message}`);
					process.exit(1);
					return;
				}

				const aiConfig = configResult.data;
				const provider = aiConfig.defaultProvider || "openrouter";
				const model = aiConfig.providers?.[provider]?.defaultModel || "x-ai/grok-code-fast-1";

				// Validate provider configuration
				if (!aiConfig.defaultProvider || !aiConfig.providers?.[provider]?.apiKey) {
					console.error(chalk.red("\n✗ No AI provider configured"));
					console.error(chalk.yellow("\nTo use headless mode:"));
					console.error(chalk.dim("  1. Run in TUI mode: bun dev"));
					console.error(chalk.dim("  2. Use /provider command to configure your API key"));
					console.error(chalk.dim("  3. Then try headless mode again\n"));
					process.exit(1);
					return;
				}

				// Handle continue mode: load last session
				let sessionId: string | null = null;
				if (options.continue) {
					const lastSession = await client.getLastSession();
					if (lastSession) {
						sessionId = lastSession.id;
					}
				}

				// Trigger streaming via mutation
				let hasOutput = false;
				let streamSessionId = sessionId;

				// Parse user input into content parts
				const content = [{ type: "text" as const, content: prompt }];

				// Start streaming
				const triggerResult = await client.triggerStream({
					sessionId: streamSessionId,
					provider: sessionId ? undefined : provider,
					model: sessionId ? undefined : model,
					content,
				});

				// Use returned sessionId if lazy session was created
				if (triggerResult.sessionId) {
					streamSessionId = triggerResult.sessionId;
				}

				if (!streamSessionId) {
					setError("Failed to get session ID");
					process.exit(1);
					return;
				}

				// Subscribe to session events
				await new Promise<void>((resolve, reject) => {
					client.subscribeToSession({
						sessionId: streamSessionId!,
						replayLast: 0,
					}).subscribe({
						next: (storedEvent: any) => {
							if (!mounted) return;

							const event = storedEvent.payload;
							switch (event.type) {
								case "session-created":
									if (options.verbose) {
										console.error(chalk.dim(`Session: ${event.sessionId}`));
									}
									break;

								case "text-delta":
									process.stdout.write(event.text);
									hasOutput = true;
									break;

								case "tool-call":
									if (options.verbose) {
										console.error(chalk.yellow(`\n[Tool: ${event.toolName}]`));
									}
									break;

								case "tool-result":
									if (options.verbose) {
										console.error(
											chalk.dim(`[Result: ${JSON.stringify(event.result).substring(0, 100)}...]`),
										);
									}
									break;

								case "complete":
									if (options.verbose) {
										console.error(chalk.dim(`\n\n[Complete]`));
										if (event.usage) {
											console.error(chalk.dim(`Tokens: ${event.usage.totalTokens || "N/A"}`));
										}
									}
									resolve();
									break;

								case "error":
									console.error(chalk.red(`\n✗ Error: ${event.error}`));
									reject(new Error(event.error));
									break;
							}
						},
						error: (err: Error) => {
							console.error(chalk.red(`\n✗ Subscription error: ${err.message}`));
							reject(err);
						},
						complete: () => {
							if (!hasOutput) {
								console.error(
									chalk.yellow("\n⚠️  No output received. Model may not support tool calling."),
								);
								reject(new Error("No output received"));
							} else {
								resolve();
							}
						},
					});
				});

				// Success
				if (mounted) {
					setIsComplete(true);
					process.exit(0);
				}
			} catch (err) {
				if (!mounted) return;

				const errorMsg = err instanceof Error ? err.message : String(err);
				console.error(chalk.red("\n✗ Error:"), errorMsg);

				if (err instanceof Error && "statusCode" in err && (err as any).statusCode === 401) {
					console.error(chalk.yellow("\nThis usually means:"));
					console.error(chalk.dim("  • Invalid or missing API key"));
					console.error(chalk.dim("  • API key has expired"));
					console.error(chalk.dim("  • Authentication credentials not found\n"));
					console.error(chalk.green("To fix: Configure your provider settings"));
				}

				if (options.verbose && err instanceof Error) {
					console.error(chalk.dim("\nStack trace:"));
					console.error(chalk.dim(err.stack));
				}
				process.exit(1);
			}
		}

		runHeadless();

		return () => {
			mounted = false;
		};
	}, [client, prompt, options]);

	// Minimal UI - headless mode outputs to stdout directly
	// This component is invisible but provides React context for useLensClient()
	if (error) {
		return (
			<Box flexDirection="column">
				<Text color="red">Error: {error}</Text>
			</Box>
		);
	}

	// Return nothing visible - output goes directly to stdout
	return null;
}

/**
 * Run headless mode with React + Lens architecture
 *
 * @param prompt - User prompt to send to AI
 * @param options - Headless options (continue, verbose)
 * @param lensServer - Lens server instance for in-process transport
 */
export async function runHeadless(
	prompt: string,
	options: HeadlessOptions,
	lensServer: any,
): Promise<void> {
	const React = await import("react");
	const { LensProvider } = await import("@sylphx/code-client");

	// Render HeadlessApp wrapped in LensProvider (same pattern as TUI)
	render(
		React.createElement(
			LensProvider,
			{ server: lensServer },
			React.createElement(HeadlessApp, { prompt, options }),
		),
	);
}
