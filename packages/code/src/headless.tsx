/**
 * Headless Mode - Execute prompt and stream response
 *
 * ARCHITECTURE: Lens Live Query pattern
 * - Uses listMessages.useQuery() which is a Live Query with .subscribe()
 * - Server streams updates via emit.push() for new messages
 * - Client receives live updates as messages are created/updated
 *
 * Data Flow:
 * 1. Load AI config and validate provider
 * 2. Trigger streaming via mutation
 * 3. Subscribe to listMessages Live Query
 * 4. Server emits message-created events → client receives updates
 * 5. Extract text content from messages and print to stdout
 * 6. Wait for completion (session status === "idle")
 * 7. Exit process
 */

import { useLensClient } from "@sylphx/code-client";
import { loadAIConfig } from "@sylphx/code-core";
import chalk from "chalk";
import { Box, Text, render } from "ink";
import React, { useEffect, useState, useRef, useMemo } from "react";
import { useMessages } from "./hooks/client/useMessages.js";

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
 * Uses Lens Live Query pattern with listMessages
 */
function HeadlessApp({ prompt, options }: HeadlessProps) {
	const [error, setError] = useState<string | null>(null);
	const [sessionId, setSessionId] = useState<string | null>(null);
	const lastPrintedLengthRef = useRef(0);
	const wasStreamingRef = useRef(false);

	// Use lens client hook
	const client = useLensClient();

	// Query hooks - use .useQuery() for React hook pattern
	const sessionQuery = client.getSession.useQuery({
		input: { id: sessionId || "" },
		skip: !sessionId,
	});

	const lastSessionQuery = client.getLastSession.useQuery({
		skip: !options.continue,
	});

	// Use Live Query for messages - this is where streaming happens
	const { messages } = useMessages(sessionId);

	// Mutation hooks - use .useMutation() for React hook pattern
	const { mutate: triggerStreamMutate } = client.triggerStream.useMutation();

	// Extract session from query
	const session = sessionQuery.data;

	// Compute text content from messages
	const textContent = useMemo(() => {
		if (!messages || messages.length === 0) return "";

		// Find the last assistant message
		const assistantMessages = messages.filter(m => m.role === "assistant");
		if (assistantMessages.length === 0) return "";

		const lastMessage = assistantMessages[assistantMessages.length - 1];

		// Extract text from all steps and parts
		let text = "";
		for (const step of lastMessage.steps || []) {
			for (const part of step.parts || []) {
				if (part.type === "text") {
					text += part.content || "";
				}
			}
		}
		return text;
	}, [messages]);

	// Effect: Print new text content as it streams
	useEffect(() => {
		if (!textContent) return;

		const newText = textContent.slice(lastPrintedLengthRef.current);

		if (newText) {
			process.stdout.write(newText);
			lastPrintedLengthRef.current = textContent.length;
		}
	}, [textContent]);

	// Effect: Handle completion and errors
	useEffect(() => {
		if (!session) return;

		// Track if we've started streaming
		if ((session as any).status === "streaming") {
			wasStreamingRef.current = true;
		}

		// Handle error
		if ((session as any).status === "error") {
			console.error(chalk.red(`\n✗ Error: Session error`));
			process.exit(1);
		}

		// Stream completed (was streaming, now completed/idle)
		const isCompleted = (session as any).status === "completed" || (session as any).status === "idle";
		if (isCompleted && wasStreamingRef.current) {
			if (options.verbose) {
				console.error(chalk.dim(`\n\n[Complete]`));
			}
			process.exit(0);
		}
	}, [(session as any)?.status, options.verbose]);

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
				if (options.continue && lastSessionQuery.data) {
					existingSessionId = (lastSessionQuery.data as any).id;
				}

				// Parse user input into content parts
				const content = [{ type: "text" as const, content: prompt }];

				// Trigger streaming via mutation
				const triggerResult = await triggerStreamMutate({
					input: {
						sessionId: existingSessionId,
						provider: existingSessionId ? undefined : provider,
						model: existingSessionId ? undefined : model,
						content,
					},
				}) as { sessionId?: string };

				if (!mounted) return;

				if (!triggerResult.sessionId) {
					setError("Failed to get session ID");
					process.exit(1);
					return;
				}

				if (options.verbose) {
					console.error(chalk.dim(`Session: ${triggerResult.sessionId}`));
				}

				// Set sessionId to activate hook subscription
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
	}, [triggerStreamMutate, lastSessionQuery.data, prompt, options]);

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
 * Note: Client must be initialized via initClient() before calling this
 *
 * @param prompt - User prompt to send to AI
 * @param options - Headless options (continue, verbose)
 * @param _lensServer - Lens server instance (unused - client already initialized)
 */
export async function runHeadless(
	prompt: string,
	options: HeadlessOptions,
	_lensServer: any,
): Promise<void> {
	const React = await import("react");

	// No provider needed - lens-react v4 uses module singleton pattern
	// Client is already initialized via initClient() in index.ts
	render(
		React.createElement(HeadlessApp, { prompt, options }),
	);
}
