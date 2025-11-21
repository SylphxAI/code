/**
 * Bash Tool Display (TUI)
 * Shows real-time streaming bash output during tool execution
 */

import { useTRPCClient } from "@sylphx/code-client";
import type { ToolDisplayProps } from "@sylphx/code-client";
import { truncateString, getRelativePath } from "@sylphx/code-core";
import { Text } from "ink";
import { useEffect, useRef, useState } from "react";
import { useElapsedTime } from "../../hooks/client/useElapsedTime.js";
import { BaseToolDisplay } from "../BaseToolDisplay.js";
import { getColors } from "../../utils/theme/index.js";

export function BashToolDisplay(props: ToolDisplayProps) {
	const { name, status, duration, startTime, input, result } = props;
	const trpc = useTRPCClient();
	const colors = getColors();
	const [output, setOutput] = useState<string>("");
	const [bashId, setBashId] = useState<string | null>(null);
	const [bashStatus, setBashStatus] = useState<string | null>(null);
	const [bashMode, setBashMode] = useState<"active" | "background">("active");

	// Bash mode - for display logic only (streaming vs result, hints, etc.)
	const isBackgroundMode = bashMode === "background";
	const isRunning = status === "running";

	// Calculate real-time elapsed time
	// ALWAYS use tool's startTime and duration from server (source of truth)
	// This ensures duration is consistent across screen switches and multi-client sync
	const { display: durationDisplay } = useElapsedTime({
		startTime,
		duration,
		isRunning,
	});

	// Extract bash_id from result OR discover it from bash:all events
	// For background/demoted bash: bash_id is in result immediately
	// For active bash: result is null while running, need to discover bash_id via bash:all
	useEffect(() => {
		// Case 1: bash_id is in result (background mode or demoted active)
		if (result && typeof result === "object" && "bash_id" in result) {
			setBashId((result as any).bash_id);
			setBashStatus("running");
			// Initialize mode from result if provided
			if ("mode" in result) {
				setBashMode((result as any).mode);
			}
			return;
		}

		// Case 2: Tool is running but no result yet (active mode still blocking)
		// Discover bash_id by matching command+cwd from bash:all events
		if (status === "running" && input?.command) {
			const command = String(input.command);
			const cwd = input.cwd ? String(input.cwd) : process.cwd();

			// Subscribe to bash:all to discover bashId
			const subscription = trpc.events.subscribe.subscribe(
				{ channel: "bash:all", fromCursor: { timestamp: (startTime || Date.now()) - 1000, sequence: 0 } },
				{
					onData: (event: any) => {
						const payload = event.payload;

						// Match by command + cwd
						if (
							payload?.type === "started" &&
							payload?.command === command &&
							payload?.cwd === cwd
						) {
							setBashId(payload.bashId);
							setBashStatus("running");
							// Unsubscribe from bash:all once we found the match
							subscription.unsubscribe();
						}
					},
					onError: (err: any) => {
						console.error("[BashToolDisplay] bash:all subscription error:", err);
					},
				},
			);

			return () => {
				subscription.unsubscribe();
			};
		}

		// Case 3: Tool not running or no command - clear bashId
		setBashId(null);
	}, [result, status, input?.command, input?.cwd, startTime, trpc]);

	// Use ref to track subscription to prevent double subscription in React StrictMode
	const subscriptionRef = useRef<any>(null);

	// Subscribe to bash output stream with cursor-based replay
	// Only for ACTIVE mode - background bash doesn't stream, uses result directly
	useEffect(() => {
		if (!bashId) {
			setOutput("");
			setBashStatus(null);
			return;
		}

		// Background bash: Don't subscribe, just use result
		if (bashMode === "background") {
			return;
		}

		// Prevent double subscription (React StrictMode calls useEffect twice in dev)
		if (subscriptionRef.current) {
			return;
		}

		const channel = `bash:${bashId}`;

		try {
			// Use cursor-based replay to get all historical events
			// fromCursor: { timestamp: 0, sequence: 0 } = replay from beginning
			const subscription = trpc.events.subscribe.subscribe(
				{ channel, fromCursor: { timestamp: 0, sequence: 0 } },
				{
					onData: (event: any) => {
						const payload = event.payload;

						if (payload?.type === "output") {
							const chunk = payload.output;
							setOutput((prev) => prev + chunk.data);
						} else if (payload?.type === "started") {
							// Don't clear output on started - we may have historical output from getStatus
							setBashStatus("running");
						} else if (
							payload?.type === "completed" ||
							payload?.type === "failed" ||
							payload?.type === "killed"
						) {
							setBashStatus(payload.type);
						} else if (payload?.type === "timeout") {
							setBashStatus("running"); // Still running, just moved to background
							setBashMode("background"); // Demoted to background
						} else if (payload?.type === "mode-changed") {
							// Handle mode change (Ctrl+B demote or promote)
							setBashMode(payload.mode);
						}
					},
					onError: (err: any) => {
						console.error("[BashToolDisplay] Subscription error:", err);
					},
				},
			);

			// Store in ref to prevent double subscription
			subscriptionRef.current = subscription;
		} catch (error) {
			console.error("[BashToolDisplay] Failed to subscribe:", error);
		}

		return () => {
			if (subscriptionRef.current) {
				subscriptionRef.current.unsubscribe();
				subscriptionRef.current = null;
			}
		};
	}, [bashId, bashMode, trpc]); // Re-subscribe if mode changes (active ↔ background)

	// Format command display
	const command = input?.command ? String(input.command) : "";
	const cwd = input?.cwd ? String(input.cwd) : "";
	const runInBackground = input?.run_in_background;
	const timeout = input?.timeout ? Number(input.timeout) : null;

	let commandDisplay = truncateString(command, 80);
	if (runInBackground) {
		commandDisplay += " [background]";
	}
	if (cwd && cwd !== process.cwd()) {
		commandDisplay += ` [in ${getRelativePath(cwd)}]`;
	}

	// Get output - different logic for active vs background
	const finalOutput = (() => {
		// Background bash: Always use result (no streaming)
		if (isBackgroundMode) {
			if (result && typeof result === "object") {
				const stdout = "stdout" in result ? String((result as any).stdout) : "";
				const stderr = "stderr" in result ? String((result as any).stderr) : "";
				return stderr || stdout; // Prefer stderr if exists (usually errors)
			}
			return "";
		}

		// Active bash: Prefer result if completed (more reliable), otherwise use streaming
		if (status === "completed" || status === "failed") {
			if (result && typeof result === "object") {
				const stdout = "stdout" in result ? String((result as any).stdout) : "";
				const stderr = "stderr" in result ? String((result as any).stderr) : "";
				// Prefer stderr (errors), but always return stdout if it has content
				if (stderr) return stderr;
				if (stdout) return stdout;
			}
		}

		// Active bash running: Use streaming output
		if (output) return output;

		return "";
	})();

	// Format output for display
	const outputLines = finalOutput.split("\n").filter((line) => line.trim() !== "");
	const displayLines = outputLines.slice(0, 50); // Show max 50 lines
	const hasMore = outputLines.length > 50;

	// Extract error from result if tool failed
	const errorMessage =
		status === "failed" && result && typeof result === "object" && "error" in result
			? String((result as any).error)
			: null;

	// Prepare extra header info (timeout)
	const extraHeaderInfo =
		!isBackgroundMode && timeout && status === "running" ? (
			<Text color={colors.textDim}> (timeout: {Math.floor(timeout / 1000)}s)</Text>
		) : undefined;

	// Prepare summary content (one-line status messages and hints)
	const summary = (() => {
		// Error message
		if (status === "failed" && errorMessage) {
			return <Text color={colors.error}>Tool Error: {errorMessage}</Text>;
		}

		// Background mode summary
		if (isBackgroundMode && status !== "failed") {
			return (
				<Text color={colors.textDim}>
					Running in background. Use Ctrl+P to view all processes or check bash:
					{bashId?.slice(0, 8) || "unknown"}
				</Text>
			);
		}

		// Active mode - completed without bash_id (normal completion)
		if (!isBackgroundMode && status === "completed" && !bashId) {
			if (displayLines.length === 0) {
				return <Text color={colors.textDim}>Command completed (no output)</Text>;
			}
			// Has output, will show in details
			return undefined;
		}

		// Active mode - completed with no output (streaming case)
		if (!isBackgroundMode && status === "completed" && displayLines.length === 0) {
			return <Text color={colors.textDim}>Command completed (no output)</Text>;
		}

		// Failed to start bash process
		if (status === "failed" && displayLines.length === 0 && !bashId) {
			return <Text color={colors.error}>Failed to start bash process</Text>;
		}

		// Active mode hint - show Ctrl+B to demote (only when running with bashId)
		if (!isBackgroundMode && status === "running" && bashId) {
			return <Text color={colors.textDim}>Ctrl+B to background</Text>;
		}

		return undefined;
	})();

	// Prepare details content (streaming output)
	const details =
		!isBackgroundMode && displayLines.length > 0 ? (
			<>
				{displayLines.map((line, i) => (
					<Text key={`${i}-${line.slice(0, 20)}`} color={colors.textDim}>
						{line}
					</Text>
				))}
				{hasMore && (
					<Text color={colors.textDim}>
						... {outputLines.length - 50} more lines (use Bash Processes screen to view all)
					</Text>
				)}
			</>
		) : undefined;

	return (
		<BaseToolDisplay
			status={status}
			toolName="Bash"
			args={commandDisplay}
			duration={durationDisplay}
			extraHeaderInfo={extraHeaderInfo}
			summary={summary}
			details={details}
		/>
	);
}
