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
	const { name, status, duration, startTime, input, result } = props;
	const trpc = useTRPCClient();
	const [output, setOutput] = useState<string>("");
	const [bashId, setBashId] = useState<string | null>(null);

	// Calculate real-time elapsed time
	const { display: durationDisplay } = useElapsedTime({
		startTime,
		duration,
		isRunning: status === "running",
	});

	// Extract bash_id from result (set when tool starts)
	useEffect(() => {
		if (result && typeof result === "object" && "bash_id" in result) {
			setBashId((result as any).bash_id);
		}
	}, [result]);

	// Subscribe to bash output stream
	useEffect(() => {
		if (!bashId) {
			setOutput("");
			return;
		}

		const channel = `bash:${bashId}`;
		let subscription: any = null;

		try {
			subscription = trpc.events.subscribe.subscribe(
				{ channel, fromCursor: undefined },
				{
					onData: (event: any) => {
						if (event.payload?.type === "output") {
							const chunk = event.payload.output;
							setOutput((prev) => prev + chunk.data);
						} else if (event.payload?.type === "started") {
							setOutput(""); // Clear on start
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
	}, [bashId, trpc]);

	// Format command display
	const command = input?.command ? String(input.command) : "";
	const cwd = input?.cwd ? String(input.cwd) : "";
	const runInBackground = input?.run_in_background;

	let commandDisplay = truncateString(command, 80);
	if (runInBackground) {
		commandDisplay += " [background]";
	}
	if (cwd && cwd !== process.cwd()) {
		commandDisplay += ` [in ${getRelativePath(cwd)}]`;
	}

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
			</Box>

			{/* Error message (if tool failed) */}
			{status === "failed" && errorMessage && (
				<Box marginLeft={2} marginTop={1}>
					<Text color="red">Tool Error: {errorMessage}</Text>
				</Box>
			)}

			{/* Real-time output (show for running, completed, AND failed) */}
			{displayLines.length > 0 && (
				<Box flexDirection="column" marginLeft={2}>
					{displayLines.map((line, i) => (
						<Text key={`${i}-${line.slice(0, 20)}`} dimColor>
							{`${(i + 1).toString().padStart(6)} │ ${line}`}
						</Text>
					))}
					{hasMore && (
						<Text dimColor>
							{"       ... "}
							{outputLines.length - 50} more lines (use Bash Processes screen to view all)
						</Text>
					)}
				</Box>
			)}

			{/* Status messages */}
			{status === "completed" && displayLines.length === 0 && (
				<Box marginLeft={2}>
					<Text dimColor>Command completed (no output)</Text>
				</Box>
			)}

			{status === "failed" && displayLines.length === 0 && !bashId && (
				<Box marginLeft={2}>
					<Text color="red">Failed to start bash process</Text>
				</Box>
			)}

			{/* Running hint */}
			{status === "running" && bashId && (
				<Box marginLeft={2}>
					<Text dimColor>Ctrl+B to background · Ctrl+P to view all</Text>
				</Box>
			)}
		</Box>
	);
}
