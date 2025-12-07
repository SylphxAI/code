/**
 * Bash Management Screen
 * Real-time bash process management with streaming output
 *
 * MIGRATED: zen signals → Lens client (2025-01-24)
 * - Uses getClient() instead of lensClient module export
 * - TODO: Implement bash output subscription using Lens subscriptions
 */

import { getClient } from "@sylphx/code-client";
import { useEffect, useState } from "preact/hooks";

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

export function BashScreen() {
	const [processes, setProcesses] = useState<BashProcess[]>([]);
	const [selectedBashId, setSelectedBashId] = useState<string | null>(null);
	const [output, setOutput] = useState<string>("");

	// Load bash list
	useEffect(() => {
		const loadProcesses = async () => {
			const client = getClient();
			if (!client) {
				console.warn("[BashScreen] Lens client not initialized");
				return;
			}

			try {
				const result = await client.listBashProcesses.fetch({});
				const data = (result as any)?.data || result || [];
				setProcesses(data);
			} catch (error) {
				console.error("[BashScreen] Failed to load processes:", error);
			}
		};

		loadProcesses();
		const interval = setInterval(loadProcesses, 2000); // Refresh every 2s

		return () => clearInterval(interval);
	}, []);

	// TODO: Migrate bash output subscription to Lens subscriptions
	// For now, real-time output is disabled until Lens subscription support is added
	useEffect(() => {
		if (!selectedBashId) {
			setOutput("");
			return;
		}

		setOutput("[Real-time output subscription not yet implemented with Lens]\n");

		// TODO: Replace with Lens subscription when available
		// const subscription = lensClient.bash.getOutput.subscribe({ bashId: selectedBashId })
		//   .subscribe({
		//     next: (event) => { ... },
		//     error: (err) => { ... }
		//   });

		return () => {
			// cleanup
		};
	}, [selectedBashId]);

	const handleKill = async (bashId: string) => {
		const client = getClient();
		if (!client) return;

		try {
			await client.killBashProcess.fetch({ input: { bashId } });
			console.log(`[BashScreen] Killed bash ${bashId}`);
		} catch (error) {
			console.error("[BashScreen] Failed to kill:", error);
		}
	};

	const handleDemote = async (bashId: string) => {
		const client = getClient();
		if (!client) return;

		try {
			await client.demoteBashProcess.fetch({ input: { bashId } });
			console.log(`[BashScreen] Demoted bash ${bashId}`);
		} catch (error) {
			console.error("[BashScreen] Failed to demote:", error);
		}
	};

	const handlePromote = async (bashId: string) => {
		const client = getClient();
		if (!client) return;

		try {
			await client.promoteBashProcess.fetch({ input: { bashId } });
			console.log(`[BashScreen] Promoted bash ${bashId}`);
		} catch (error) {
			console.error("[BashScreen] Failed to promote:", error);
		}
	};

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
				return "text-green-500";
			case "completed":
				return "text-blue-500";
			case "failed":
				return "text-red-500";
			case "killed":
				return "text-orange-500";
			case "timeout":
				return "text-yellow-500";
			default:
				return "text-gray-500";
		}
	};

	return (
		<div class="bash-screen flex flex-col h-full">
			<div class="bash-header p-4 border-b border-gray-700">
				<h1 class="text-xl font-bold">Bash Processes</h1>
				<p class="text-sm text-gray-400 mt-1">
					{processes.length} process{processes.length !== 1 ? "es" : ""} ({processes.filter((p) => p.status === "running").length} running)
				</p>
			</div>

			<div class="bash-body flex flex-1 overflow-hidden">
				{/* Process List */}
				<div class="bash-list w-1/3 border-r border-gray-700 overflow-y-auto">
					{processes.length === 0 ? (
						<div class="p-4 text-gray-400">No bash processes</div>
					) : (
						<div class="divide-y divide-gray-700">
							{processes.map((proc) => (
								<div
									key={proc.id}
									class={`p-3 cursor-pointer hover:bg-gray-800 ${selectedBashId === proc.id ? "bg-gray-800" : ""}`}
									onClick={() => setSelectedBashId(proc.id)}
								>
									<div class="flex items-center justify-between mb-1">
										<div class="flex items-center gap-2">
											{proc.isActive && <span class="text-xs bg-blue-600 px-1.5 py-0.5 rounded">ACTIVE</span>}
											{proc.mode === "background" && <span class="text-xs bg-gray-600 px-1.5 py-0.5 rounded">BG</span>}
											<span class={`text-xs font-mono ${getStatusColor(proc.status)}`}>{proc.status.toUpperCase()}</span>
										</div>
										<span class="text-xs text-gray-400">{formatDuration(proc.duration)}</span>
									</div>
									<div class="text-sm font-mono truncate">{proc.command}</div>
									<div class="text-xs text-gray-500 mt-1 truncate">{proc.cwd}</div>
								</div>
							))}
						</div>
					)}
				</div>

				{/* Process Details & Output */}
				<div class="bash-details flex-1 flex flex-col">
					{selectedBashId ? (
						<>
							{/* Action Bar */}
							<div class="bash-actions p-3 border-b border-gray-700 flex gap-2">
								<button
									onClick={() => handleKill(selectedBashId)}
									class="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-sm"
								>
									Kill
								</button>
								{processes.find((p) => p.id === selectedBashId)?.isActive && (
									<button
										onClick={() => handleDemote(selectedBashId)}
										class="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
									>
										Demote to Background (Ctrl+B)
									</button>
								)}
								{processes.find((p) => p.id === selectedBashId)?.mode === "background" &&
									processes.find((p) => p.id === selectedBashId)?.status === "running" && (
										<button
											onClick={() => handlePromote(selectedBashId)}
											class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-sm"
										>
											Promote to Active
										</button>
									)}
								<button
									onClick={() => setOutput("")}
									class="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-sm ml-auto"
								>
									Clear Output
								</button>
							</div>

							{/* Output */}
							<div class="bash-output flex-1 overflow-y-auto bg-black p-4">
								<pre class="text-sm font-mono text-green-400 whitespace-pre-wrap">{output || "[No output yet]"}</pre>
							</div>
						</>
					) : (
						<div class="flex items-center justify-center h-full text-gray-400">
							Select a bash process to view output
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
