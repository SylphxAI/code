/**
 * Bash Detail Screen
 * Full-screen view of a single bash process with streaming output
 */

import {
	useTRPCClient,
	useBashProcessDetails,
	useBashProcessOutputs,
	useBashProcessDetailsLoading,
	setBashProcessDetail as setBashProcessDetailSignal,
	setBashProcessOutput as setBashProcessOutputSignal,
	setBashProcessDetailLoading as setBashProcessDetailLoadingSignal,
} from "@sylphx/code-client";
import { Box, Text, useInput } from "ink";
import { useEffect } from "react";
import Spinner from "../components/Spinner.js";
import { useThemeColors, getColors } from "../theme.js";

interface BashDetailProps {
	bashId: string;
	onClose: () => void;
}

export default function BashDetail({ bashId, onClose }: BashDetailProps) {
	const trpc = useTRPCClient();
	const colors = useThemeColors();
	const processDetails = useBashProcessDetails();
	const processOutputs = useBashProcessOutputs();
	const processLoading = useBashProcessDetailsLoading();

	const output = processOutputs[bashId] || "";
	const process = processDetails[bashId] || null;
	const loading = processLoading[bashId] || false;

	// Load process info
	useEffect(() => {
		const loadProcess = async () => {
			try {
				setBashProcessDetailLoadingSignal(bashId, true);
				const result = await trpc.bash.get.query({ bashId });
				setBashProcessDetailSignal(bashId, result);
				setBashProcessDetailLoadingSignal(bashId, false);
			} catch (error) {
				console.error("[BashDetail] Failed to load process:", error);
				setBashProcessDetailLoadingSignal(bashId, false);
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
							setBashProcessOutputSignal(bashId, (prev) => prev + chunk.data);
						} else if (event.payload?.type === "started") {
							setBashProcessOutputSignal(bashId, ""); // Clear on restart
						} else if (event.payload?.type === "completed" || event.payload?.type === "failed") {
							// Reload process info to get final status
							trpc.bash.get
								.query({ bashId })
								.then((result) => setBashProcessDetailSignal(bashId, result))
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

			// Kill bash
			if (input === "K") {
				trpc.bash.kill
					.mutate({ bashId })
					.then(() => {
						// Reload process info
						return trpc.bash.get.query({ bashId });
					})
					.then((result) => setBashProcessDetailSignal(bashId, result))
					.catch((error) => console.error("[BashDetail] Failed to kill:", error));
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

	const getStatusColor = (status: string): string => {
		switch (status) {
			case "running":
				return colors.success;
			case "failed":
				return colors.error;
			case "killed":
				return colors.warning;
			case "completed":
				return colors.secondary;
			default:
				return colors.textDim;
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
				<Text color={colors.error}>Bash process not found</Text>
				<Box marginTop={1}>
					<Text color={colors.textDim}>Press ESC or q to close</Text>
				</Box>
			</Box>
		);
	}

	const outputLines = output.split("\n");

	return (
		<Box flexDirection="column" width="100%" padding={1}>
			{/* Header */}
			<Box marginBottom={1}>
				<Text bold color={colors.primary}>
					Bash Process Details
				</Text>
				<Text color={colors.textDim}> │ {bashId.slice(0, 8)}</Text>
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
						<Text color={colors.secondary} bold>
							{" "}
							[ACTIVE]
						</Text>
					)}
					{process.mode === "background" && !process.isActive && <Text color={colors.textDim}> [BACKGROUND]</Text>}
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
					<Text color={colors.textDim}>{process.cwd}</Text>
				</Box>
			</Box>

			{/* Controls */}
			<Box marginBottom={1}>
				<Text color={colors.textDim}>
					K Kill
					{!process.isActive && process.status === "running" && " • A Promote"} • ESC/q Close
				</Text>
			</Box>

			{/* Output - Full scrollable view */}
			<Box marginBottom={1}>
				<Text color={colors.textDim}>─────────────────────────────────────────────────────────────</Text>
			</Box>

			{outputLines.length === 0 ? (
				<Box>
					<Text color={colors.textDim}>No output yet...</Text>
				</Box>
			) : (
				<Box flexDirection="column">
					{outputLines.map((line, i) => (
						<Text key={`line-${i}`}>{line}</Text>
					))}
				</Box>
			)}

			<Box marginTop={1}>
				<Text color={colors.textDim}>─────────────────────────────────────────────────────────────</Text>
			</Box>
		</Box>
	);
}
