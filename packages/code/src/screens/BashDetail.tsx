/**
 * Bash Detail Screen
 * Full-screen view of a single bash process with streaming output
 */

import { useTRPCClient } from "@sylphx/code-client";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import Spinner from "../components/Spinner.js";

interface BashDetailProps {
	bashId: string;
	onClose: () => void;
}

export default function BashDetail({ bashId, onClose }: BashDetailProps) {
	const trpc = useTRPCClient();
	const [output, setOutput] = useState<string>("");
	const [process, setProcess] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [scrollOffset, setScrollOffset] = useState(0);

	// Load process info
	useEffect(() => {
		const loadProcess = async () => {
			try {
				const result = await trpc.bash.get.query({ bashId });
				setProcess(result);
				setLoading(false);
			} catch (error) {
				console.error("[BashDetail] Failed to load process:", error);
				setLoading(false);
			}
		};

		loadProcess();
	}, [bashId, trpc]);

	// Subscribe to output stream
	useEffect(() => {
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
							setOutput(""); // Clear on restart
						} else if (event.payload?.type === "completed" || event.payload?.type === "failed") {
							// Reload process info to get final status
							trpc.bash.get
								.query({ bashId })
								.then((result) => setProcess(result))
								.catch(console.error);
						}
					},
					onError: (err: any) => {
						console.error("[BashDetail] Subscription error:", err);
					},
				},
			);
		} catch (error) {
			console.error("[BashDetail] Failed to subscribe:", error);
		}

		return () => {
			if (subscription) {
				subscription.unsubscribe();
			}
		};
	}, [bashId, trpc]);

	// Keyboard controls
	useInput(
		(input, key) => {
			if (key.escape || input === "q") {
				onClose();
				return;
			}

			const outputLines = output.split("\n");

			// Scroll up
			if (key.upArrow || input === "k") {
				setScrollOffset((prev) => Math.max(0, prev - 1));
				return;
			}

			// Scroll down
			if (key.downArrow || input === "j") {
				const maxOffset = Math.max(0, outputLines.length - 30); // Show 30 lines at a time
				setScrollOffset((prev) => Math.min(maxOffset, prev + 1));
				return;
			}

			// Page up
			if (key.pageUp) {
				setScrollOffset((prev) => Math.max(0, prev - 30));
				return;
			}

			// Page down
			if (key.pageDown) {
				const maxOffset = Math.max(0, outputLines.length - 30);
				setScrollOffset((prev) => Math.min(maxOffset, prev + 30));
				return;
			}

			// Home - scroll to top
			if (input === "g") {
				setScrollOffset(0);
				return;
			}

			// End - scroll to bottom
			if (input === "G") {
				const maxOffset = Math.max(0, outputLines.length - 30);
				setScrollOffset(maxOffset);
				return;
			}

			// Kill bash
			if (input === "K") {
				trpc.bash.kill
					.mutate({ bashId })
					.then(() => {
						// Reload process info
						return trpc.bash.get.query({ bashId });
					})
					.then((result) => setProcess(result))
					.catch((error) => console.error("[BashDetail] Failed to kill:", error));
				return;
			}

			// Demote to background
			if (input === "B") {
				if (process?.isActive) {
					trpc.bash.demote
						.mutate({ bashId })
						.then(() => {
							// Reload process info
							return trpc.bash.get.query({ bashId });
						})
						.then((result) => setProcess(result))
						.catch((error) => console.error("[BashDetail] Failed to demote:", error));
				}
				return;
			}

			// Promote to active
			if (input === "A") {
				if (!process?.isActive && process?.status === "running") {
					trpc.bash.promote
						.mutate({ bashId })
						.then(() => {
							// Reload process info
							return trpc.bash.get.query({ bashId });
						})
						.then((result) => setProcess(result))
						.catch((error) => console.error("[BashDetail] Failed to promote:", error));
				}
				return;
			}
		},
		{ isActive: true },
	);

	const formatDuration = (ms: number): string => {
		const seconds = Math.floor(ms / 1000);
		if (seconds < 60) return `${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
		const hours = Math.floor(minutes / 60);
		return `${hours}h ${minutes % 60}m`;
	};

	const getStatusColor = (status: string): "green" | "red" | "yellow" | "blue" | "gray" => {
		switch (status) {
			case "running":
				return "green";
			case "failed":
				return "red";
			case "killed":
				return "yellow";
			case "completed":
				return "blue";
			default:
				return "gray";
		}
	};

	if (loading) {
		return (
			<Box flexDirection="column" width="100%" height="100%" padding={1}>
				<Box>
					<Spinner />
					<Text> Loading bash process...</Text>
				</Box>
			</Box>
		);
	}

	if (!process) {
		return (
			<Box flexDirection="column" width="100%" height="100%" padding={1}>
				<Text color="red">Bash process not found</Text>
				<Box marginTop={1}>
					<Text dimColor>Press ESC or q to close</Text>
				</Box>
			</Box>
		);
	}

	const outputLines = output.split("\n");
	const visibleLines = outputLines.slice(scrollOffset, scrollOffset + 30);

	return (
		<Box flexDirection="column" width="100%" height="100%" padding={1}>
			{/* Header */}
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Bash Process Details
				</Text>
				<Text dimColor> │ {bashId.slice(0, 8)}</Text>
			</Box>

			{/* Process Info */}
			<Box marginBottom={1} flexDirection="column">
				<Box>
					<Text bold>Command: </Text>
					<Text>{process.command}</Text>
				</Box>
				<Box>
					<Text bold>Status: </Text>
					<Text color={getStatusColor(process.status)}>{process.status.toUpperCase()}</Text>
					{process.isActive && (
						<Text color="blue" bold>
							{" "}
							[ACTIVE]
						</Text>
					)}
					{process.mode === "background" && !process.isActive && <Text dimColor> [BACKGROUND]</Text>}
				</Box>
				<Box>
					<Text bold>Duration: </Text>
					<Text>{formatDuration(process.duration)}</Text>
					{process.exitCode !== null && (
						<>
							<Text bold> Exit Code: </Text>
							<Text color={process.exitCode === 0 ? "green" : "red"}>{process.exitCode}</Text>
						</>
					)}
				</Box>
				<Box>
					<Text bold>CWD: </Text>
					<Text dimColor>{process.cwd}</Text>
				</Box>
			</Box>

			{/* Controls */}
			<Box marginBottom={1}>
				<Text dimColor>
					↑↓/jk Scroll • PgUp/PgDn Page • g/G Top/Bottom • K Kill
					{process.isActive && " • B Demote"}
					{!process.isActive && process.status === "running" && " • A Promote"} • ESC/q Close
				</Text>
			</Box>

			{/* Output */}
			<Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="gray">
				{visibleLines.length === 0 ? (
					<Box padding={1}>
						<Text dimColor>No output yet...</Text>
					</Box>
				) : (
					visibleLines.map((line, i) => {
						const lineNum = scrollOffset + i + 1;
						return (
							<Text key={`${lineNum}-${line.slice(0, 20)}`} dimColor>
								{`${lineNum.toString().padStart(6)} │ ${line}`}
							</Text>
						);
					})
				)}
			</Box>

			{/* Scroll Indicator */}
			{outputLines.length > 30 && (
				<Box marginTop={1}>
					<Text dimColor>
						Lines {scrollOffset + 1}-{Math.min(scrollOffset + 30, outputLines.length)} of{" "}
						{outputLines.length}
					</Text>
				</Box>
			)}
		</Box>
	);
}
