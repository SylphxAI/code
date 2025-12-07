/**
 * Bash Detail Screen
 * Full-screen view of a single bash process with streaming output
 */

import { useLensClient } from "@sylphx/code-client";
import {
	useBashProcessDetails,
	useBashProcessOutputs,
	useBashProcessDetailsLoading,
	setBashProcessDetail,
	setBashProcessOutput,
	setBashProcessDetailLoading,
} from "../bash-state.js";
import { Box, Text, useInput } from "ink";
import { useEffect } from "react";
import Spinner from "../components/Spinner.js";
import { useThemeColors, getColors } from "../theme.js";

interface BashDetailProps {
	bashId: string;
	onClose: () => void;
}

export default function BashDetail({ bashId, onClose }: BashDetailProps) {
	const client = useLensClient();
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
				setBashProcessDetailLoading(bashId, true);
				const result = await client.getBash.fetch({ input: { bashId } });
				setBashProcessDetail(bashId, result);
				setBashProcessDetailLoading(bashId, false);
			} catch (error) {
				console.error("[BashDetail] Failed to load process:", error);
				setBashProcessDetailLoading(bashId, false);
			}
		};

		loadProcess();
	}, [bashId, client]);

	// Subscribe to output stream
	// TODO: Migrate to lens events - currently using polling instead
	// The lens client has subscribeToSession but may not have bash-specific event subscriptions
	// For now, we rely on the initial load and manual refresh (kill/promote actions reload the process)
	useEffect(() => {
		// Polling fallback: refresh process data every few seconds
		const interval = setInterval(async () => {
			try {
				const result = await client.getBash.fetch({ input: { bashId } });
				setBashProcessDetail(bashId, result);
			} catch (error) {
				console.error("[BashDetail] Failed to refresh process:", error);
			}
		}, 2000); // Poll every 2 seconds

		return () => {
			clearInterval(interval);
		};
	}, [bashId, client]);

	// Keyboard controls
	useInput(
		(input, key) => {
			if (key.escape || input === "q") {
				onClose();
				return;
			}

			// Kill bash
			if (input === "K") {
				client.killBash
					.fetch({ input: { bashId } })
					.then(() => {
						// Reload process info
						return client.getBash.fetch({ input: { bashId } });
					})
					.then((result) => setBashProcessDetail(bashId, result))
					.catch((error) => console.error("[BashDetail] Failed to kill:", error));
				return;
			}

			// Promote to active
			if (input === "A") {
				if (!process?.isActive && process?.status === "running") {
					client.promoteBash
						.fetch({ input: { bashId } })
						.then(() => {
							// Reload process info
							return client.getBash.fetch({ input: { bashId } });
						})
						.then((result) => setBashProcessDetail(bashId, result))
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
