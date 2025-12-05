/**
 * Headless Mode - Execute prompt and stream response
 *
 * ARCHITECTURE: React Ink component using LensProvider + Lens Live Query
 * - Uses useLensClient() for mutations (triggerStream)
 * - Uses useQuery(getSession) for streaming state (automatic updates via emit)
 * - Lens handles all synchronization automatically
 *
 * Data Flow:
 * 1. Load AI config and validate provider
 * 2. Create or get session
 * 3. useQuery(getSession) subscribes to session data
 * 4. Call triggerStream mutation → Server starts streaming
 * 5. Server uses emit API → session.textContent updates automatically
 * 6. Print textContent delta to stdout
 * 7. Wait for session.streamingStatus === "idle"
 * 8. Exit process
 */

import { useQuery, useLensClient } from "@sylphx/code-client";
import { loadAIConfig } from "@sylphx/code-core";
import chalk from "chalk";
import { Box, Text, render } from "ink";
import React, { useEffect, useState, useRef } from "react";

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
 * Uses useQuery(getSession) - data updates automatically via emit
 */
function HeadlessApp({ prompt, options }: HeadlessProps) {
	const client = useLensClient();
	const [error, setError] = useState<string | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const lastPrintedLengthRef = useRef(0);
	const wasStreamingRef = useRef(false);

	// Live Query: Subscribe to session data
	// When server uses emit.delta("textContent", ...), this data updates automatically
	// Use skip when no session ID (Apollo/GraphQL pattern)
	const { data: session } = useQuery(
		(lensClient) => lensClient.getSession,
		{ id: sessionId ?? "" },
		{ skip: !sessionId }
	);

	// Effect: Print new text content as it streams
	useEffect(() => {
		if (!session?.textContent) return;

		const fullText = session.textContent;
		const newText = fullText.slice(lastPrintedLengthRef.current);

		if (newText) {
			process.stdout.write(newText);
			lastPrintedLengthRef.current = fullText.length;
		}
	}, [session?.textContent]);

	// Effect: Handle completion and errors
	useEffect(() => {
		if (!session) return;

		// Track if we've started streaming
		if (session.streamingStatus === "streaming") {
			wasStreamingRef.current = true;
		}

		// Handle error
		if (session.streamingStatus === "error" && session.streamingError) {
			console.error(chalk.red(`\n✗ Error: ${session.streamingError}`));
			process.exit(1);
		}

		// Stream completed (was streaming, now idle)
		if (session.streamingStatus === "idle" && wasStreamingRef.current) {
			if (options.verbose) {
				console.error(chalk.dim(`\n\n[Complete]`));
				if (session.totalTokens) {
					console.error(chalk.dim(`Tokens: ${session.totalTokens}`));
				}
			}
			process.exit(0);
		}
	}, [session?.streamingStatus, session?.streamingError, options.verbose]);

	// Effect: Trigger streaming on mount
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
				let existingSessionId: string | null = null;
				if (options.continue) {
					const lastSession = await client.getLastSession().select({ id: true });
					if (lastSession) {
						existingSessionId = lastSession.id;
					}
				}

				// Parse user input into content parts
				const content = [{ type: "text" as const, content: prompt }];

				// Trigger streaming via mutation
				const triggerResult = await client.triggerStream({
					sessionId: existingSessionId,
					provider: existingSessionId ? undefined : provider,
					model: existingSessionId ? undefined : model,
					content,
				}).select({
					sessionId: true,
				});

				if (!mounted) return;

				if (!triggerResult.sessionId) {
					setError("Failed to get session ID");
					process.exit(1);
					return;
				}

				if (options.verbose) {
					console.error(chalk.dim(`Session: ${triggerResult.sessionId}`));
				}

				// Set sessionId to activate useQuery subscription
				setSessionId(triggerResult.sessionId);
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
