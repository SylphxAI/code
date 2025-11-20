/**
 * Bash List Screen
 * Shows all bash processes, press k to kill, Enter to view details
 */

import { useTRPCClient } from "@sylphx/code-client";
import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import Spinner from "../components/Spinner.js";

interface BashProcess {
	id: string;
	command: string;
	mode: "active" | "background";
	status: "running" | "completed" | "failed" | "killed" | "timeout";
	isActive: boolean;
	duration: number;
	exitCode: number | null;
	cwd: string;
}

interface BashListProps {
	onClose: () => void;
	onSelectBash: (bashId: string) => void;
}

export default function BashList({ onClose, onSelectBash }: BashListProps) {
	const trpc = useTRPCClient();
	const [processes, setProcesses] = useState<BashProcess[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [loading, setLoading] = useState(true);

	// Load bash list
	useEffect(() => {
		const loadProcesses = async () => {
			try {
				const result = await trpc.bash.list.query();
				setProcesses(result);
				setLoading(false);
			} catch (error) {
				console.error("[BashList] Failed to load processes:", error);
				setLoading(false);
			}
		};

		loadProcesses();
		const interval = setInterval(loadProcesses, 2000); // Refresh every 2s

		return () => clearInterval(interval);
	}, [trpc]);

	// Keyboard navigation
	useInput(
		(input, key) => {
			if (key.escape || input === "q") {
				onClose();
				return;
			}

			if (key.upArrow || input === "k") {
				setSelectedIndex((prev) => Math.max(0, prev - 1));
				return;
			}

			if (key.downArrow || input === "j") {
				setSelectedIndex((prev) => Math.min(processes.length - 1, prev + 1));
				return;
			}

			if (key.return) {
				if (processes[selectedIndex]) {
					onSelectBash(processes[selectedIndex].id);
				}
				return;
			}

			// Kill selected bash
			if (input === "K") {
				if (processes[selectedIndex]) {
					const bashId = processes[selectedIndex].id;
					trpc.bash.kill
						.mutate({ bashId })
						.catch((error) => console.error("[BashList] Failed to kill:", error));
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

	return (
		<Box flexDirection="column" width="100%" height="100%" padding={1}>
			{/* Header */}
			<Box marginBottom={1}>
				<Text bold color="cyan">
					Bash Processes
				</Text>
				<Text dimColor>
					{" "}
					│ {processes.length} total, {processes.filter((p) => p.status === "running").length} running
				</Text>
			</Box>

			<Box marginBottom={1}>
				<Text dimColor>↑↓ Navigate • Enter View • K Kill • ESC/q Close</Text>
			</Box>

			{/* Process List */}
			<Box flexDirection="column" flexGrow={1}>
				{loading ? (
					<Box>
						<Spinner />
						<Text> Loading...</Text>
					</Box>
				) : processes.length === 0 ? (
					<Text dimColor>No bash processes</Text>
				) : (
					processes.map((proc, index) => {
						const isSelected = index === selectedIndex;
						return (
							<Box key={proc.id} marginBottom={0}>
								<Box width={2}>{isSelected ? <Text color="cyan">▶ </Text> : <Text>  </Text>}</Box>

								<Box width={10}>
									{proc.isActive && <Text color="blue" bold>[ACTIVE] </Text>}
									{proc.mode === "background" && !proc.isActive && <Text dimColor>[BG] </Text>}
								</Box>

								<Box width={12}>
									<Text color={getStatusColor(proc.status)} bold>
										{proc.status.toUpperCase()}
									</Text>
								</Box>

								<Box width={10}>
									<Text dimColor>{formatDuration(proc.duration)}</Text>
								</Box>

								<Box flexGrow={1}>
									<Text bold={isSelected}>{proc.command.slice(0, 60)}</Text>
								</Box>
							</Box>
						);
					})
				)}
			</Box>
		</Box>
	);
}
