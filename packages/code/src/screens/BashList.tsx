/**
 * Bash List Screen
 * Shows all bash processes, press K to kill, Enter to view details
 *
 * ARCHITECTURE: lens-react hooks pattern
 * - Queries: client.queryName({ input, skip }) → { data, loading, error, refetch }
 * - Mutations: const { mutate } = client.mutationName({}) then call mutate({ input })
 */

import { useLensClient, type BashProcess } from "@sylphx/code-client";
import {
	useBashProcesses,
	useBashProcessesLoading,
	setBashProcesses,
	setBashProcessesLoading,
} from "../bash-state.js";
import { Box, Text } from "ink";
import { useEffect, useMemo, useRef } from "react";
import Spinner from "../components/Spinner.js";
import { SelectionOptionsList } from "../components/selection/SelectionOptionsList.js";
import { useSelection, type SelectionOption } from "../hooks/useSelection.js";
import { useThemeColors, getColors } from "../theme.js";

interface BashListProps {
	onClose: () => void;
	onSelectBash: (bashId: string) => void;
}

// Format duration helper
function formatDuration(ms: number): string {
	const seconds = Math.floor(ms / 1000);
	if (seconds < 60) return `${seconds}s`;
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
	const hours = Math.floor(minutes / 60);
	return `${hours}h ${minutes % 60}m`;
}

// Status color helper
function getStatusColor(status: string): "green" | "red" | "yellow" | "blue" | "gray" {
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
}

export default function BashList({ onClose, onSelectBash }: BashListProps) {
	const client = useLensClient();
	const colors = useThemeColors();
	const processes = useBashProcesses();
	const loading = useBashProcessesLoading();
	const subscriptionRef = useRef<any>(null);

	// Query hook for bash list
	const bashListQuery = client.listBash({});

	// Mutation hook
	const { mutate: killBashMutate } = client.killBash({});

	// Sync query state to global signals
	useEffect(() => {
		setBashProcessesLoading(bashListQuery.loading);
	}, [bashListQuery.loading]);

	useEffect(() => {
		if (bashListQuery.data) {
			setBashProcesses(bashListQuery.data as BashProcess[]);
		}
	}, [bashListQuery.data]);

	// Transform processes to SelectionOption[]
	const options: SelectionOption[] = useMemo(
		() =>
			processes.map((proc) => {
				const modeLabel = proc.isActive ? "[ACTIVE]" : proc.mode === "background" ? "[BG]" : "";
				const statusLabel = proc.status.toUpperCase();
				const durationLabel = formatDuration(proc.duration);

				return {
					label: proc.command,
					value: proc.id,
					description: `${modeLabel} ${statusLabel} • ${durationLabel}`,
					badge: {
						text: statusLabel,
						color: getStatusColor(proc.status),
					},
				};
			}),
		[processes],
	);

	// Selection hook with custom key handlers
	const selection = useSelection({
		options,
		filter: false, // No filter for bash list
		onSelect: (value) => {
			if (typeof value === "string") {
				onSelectBash(value);
			}
		},
		onCancel: onClose,
		onCustomInput: (char, key) => {
			// 'q' to close
			if (char === "q") {
				onClose();
				return true; // Consumed
			}

			// 'K' to kill selected process
			if (char === "K") {
				const selectedProc = processes[selection.selectedIndex];
				if (selectedProc) {
					killBashMutate({ args: { bashId: selectedProc.id } })
						.then(() => bashListQuery.refetch())
						.catch((error) => console.error("[BashList] Failed to kill:", error));
				}
				return true; // Consumed
			}

			// 'j'/'k' vim navigation
			if (char === "j") {
				selection.moveDown();
				return true; // Consumed
			}

			if (char === "k") {
				selection.moveUp();
				return true; // Consumed
			}

			return false; // Not consumed, use default handlers
		},
	});

	return (
		<Box flexDirection="column" width="100%" height="100%" padding={1}>
			{/* Header */}
			<Box marginBottom={1}>
				<Text bold color={colors.primary}>
					Bash Processes
				</Text>
				<Text color={colors.textDim}>
					{" "}
					│ {processes.length} total, {processes.filter((p) => p.status === "running").length} running
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text color={colors.textDim}>↑↓/j/k Navigate • Enter View • K Kill • ESC/q Close</Text>
			</Box>

			{/* Process List */}
			<Box flexDirection="column" flexGrow={1}>
				{loading ? (
					<Box>
						<Spinner />
						<Text> Loading...</Text>
					</Box>
				) : (
					<SelectionOptionsList
						options={selection.filteredOptions}
						selectedIndex={selection.selectedIndex}
						emptyMessage="No bash processes"
						maxVisible={10}
					/>
				)}
			</Box>
		</Box>
	);
}
