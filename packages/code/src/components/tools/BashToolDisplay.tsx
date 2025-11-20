/**
 * Bash Tool Display (TUI)
 * Shows real-time streaming bash output during tool execution
 */

import { useTRPCClient } from "@sylphx/code-client";
import type { ToolDisplayProps } from "@sylphx/code-client";
import { truncateString, getRelativePath } from "@sylphx/code-core";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import { useElapsedTime } from "../../hooks/client/useElapsedTime.js";
import Spinner from "../Spinner.js";

export function BashToolDisplay(props: ToolDisplayProps) {
	const { name, status: toolStatus, duration, startTime, input, result } = props;
	const trpc = useTRPCClient();
	const [output, setOutput] = useState<string>("");
	const [bashId, setBashId] = useState<string | null>(null);
	const [bashStatus, setBashStatus] = useState<string | null>(null);
	const [bashStartTime, setBashStartTime] = useState<number | null>(null);
	const [bashDuration, setBashDuration] = useState<number | null>(null);

	// Use bash process status if available, otherwise fall back to tool status
	const status = bashStatus || toolStatus;
	const isRunning = status === "running";

	// Calculate real-time elapsed time based on bash process
	const { display: durationDisplay } = useElapsedTime({
		startTime: bashStartTime || startTime,
		duration: bashDuration || duration,
		isRunning,
	});

	// Extract bash_id from result (set when tool starts)
	useEffect(() => {
		if (result && typeof result === "object" && "bash_id" in result) {
			setBashId((result as any).bash_id);
			// Initialize bash status as running (tool just started it)
			setBashStatus("running");
			setBashStartTime(Date.now());
		}
	}, [result]);

	// Subscribe to bash output stream and status changes
	useEffect(() => {
		if (!bashId) {
			setOutput("");
			setBashStatus(null);
			setBashStartTime(null);
			setBashDuration(null);
			return;
		}

		const channel = `bash:${bashId}`;
		let subscription: any = null;

		try {
			subscription = trpc.events.subscribe.subscribe(
				{ channel, fromCursor: undefined },
				{
					onData: (event: any) => {
						const payload = event.payload;

						if (payload?.type === "output") {
							const chunk = payload.output;
							setOutput((prev) => prev + chunk.data);
						} else if (payload?.type === "started") {
							setOutput(""); // Clear on start
							setBashStatus("running");
							setBashStartTime(payload.timestamp || Date.now());
						} else if (
							payload?.type === "completed" ||
							payload?.type === "failed" ||
							payload?.type === "killed"
						) {
							setBashStatus(payload.type);
							setBashDuration(Date.now() - (bashStartTime || Date.now()));
						} else if (payload?.type === "timeout") {
							setBashStatus("running"); // Still running, just moved to background
						}
					},
					onError: (err: any) => {
						console.error("[BashToolDisplay] Subscription error:", err);
					},
				},
			);
		} catch (error) {
			console.error("[BashToolDisplay] Failed to subscribe:", error);
		}

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, [bashId, trpc, bashStartTime]);

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

	// Extract mode from result
	const mode =
		result && typeof result === "object" && "mode" in result
			? String((result as any).mode)
			: "active";
	const isBackgroundMode = mode === "background";

	// Format output for display
	const outputLines = output.split("\n").filter((line) => line.trim() !== "");
	const displayLines = outputLines.slice(0, 50); // Show max 50 lines
	const hasMore = outputLines.length > 50;

	// Extract error from result if tool failed
	const errorMessage =
		status === "failed" && result && typeof result === "object" && "error" in result
			? String((result as any).error)
			: null;

	return (
		<Box flexDirection="column">
			{/* Tool header */}
			<Box>
				{status === "running" && (
					<>
						<Spinner color="yellow" />
						<Text> </Text>
					</>
				)}
				{status === "completed" && <Text color="green">✓ </Text>}
				{status === "failed" && <Text color="red">✗ </Text>}
				<Text bold>Bash</Text>
				<Text> {commandDisplay}</Text>
				{durationDisplay && (status === "completed" || status === "running") && (
					<Text dimColor> {durationDisplay}</Text>
				)}
				{!isBackgroundMode && timeout && status === "running" && (
					<Text dimColor> (timeout: {Math.floor(timeout / 1000)}s)</Text>
				)}
			</Box>

			{/* Error message (if tool failed) */}
			{status === "failed" && errorMessage && (
				<Box marginLeft={2} marginTop={1}>
					<Text color="red">Tool Error: {errorMessage}</Text>
				</Box>
			)}

			{/* Background mode - show summary only, no streaming output */}
			{isBackgroundMode && status !== "failed" && (
				<Box marginLeft={2} flexDirection="column">
					<Text dimColor>
						Running in background. Use Ctrl+P to view all processes or check bash:{bashId.slice(0, 8)}
					</Text>
				</Box>
			)}

			{/* Active mode - show real-time streaming output */}
			{!isBackgroundMode && displayLines.length > 0 && (
				<Box flexDirection="column" marginLeft={2}>
					{displayLines.map((line, i) => (
						<Text key={`${i}-${line.slice(0, 20)}`} dimColor>
							{line}
						</Text>
					))}
					{hasMore && (
						<Text dimColor>
							... {outputLines.length - 50} more lines (use Bash Processes screen to view all)
						</Text>
					)}
				</Box>
			)}

			{/* Status messages */}
			{!isBackgroundMode && status === "completed" && displayLines.length === 0 && (
				<Box marginLeft={2}>
					<Text dimColor>Command completed (no output)</Text>
				</Box>
			)}

			{status === "failed" && displayLines.length === 0 && !bashId && (
				<Box marginLeft={2}>
					<Text color="red">Failed to start bash process</Text>
				</Box>
			)}

			{/* Active mode hint - show Ctrl+B to demote */}
			{!isBackgroundMode && status === "running" && bashId && (
				<Box marginLeft={2}>
					<Text dimColor>Ctrl+B to background</Text>
				</Box>
			)}
		</Box>
	);
}
