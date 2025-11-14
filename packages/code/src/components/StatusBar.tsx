/**
 * Status Bar Component
 * Display important session info at the bottom
 */

import {
	useModelDetails,
	useSelectedAgentId,
	useEnabledRuleIds,
	useTotalTokens,
	useMCPStatus,
} from "@sylphx/code-client";
import { formatTokenCount } from "@sylphx/code-core";
import { getAgentById } from "../embedded-context.js";
import { Box, Text } from "ink";
import React from "react";

interface StatusBarProps {
	provider: string | null;
	model: string | null;
	modelStatus?: "available" | "unavailable" | "unknown";
	usedTokens?: number;
}

/**
 * StatusBar Component
 *
 * ARCHITECTURE: Client-agnostic design
 * - No hardcoded provider knowledge
 * - Uses tRPC hooks for all server communication
 * - Provider IDs are opaque strings to client
 *
 * SECURITY: Uses tRPC server endpoints for all data
 * - No API keys exposed on client side
 * - All business logic on server
 * - Safe for Web GUI and remote mode
 */
interface StatusBarPropsInternal extends StatusBarProps {
	sessionId: string | null;
}

export default function StatusBar({
	sessionId,
	provider,
	model,
	modelStatus,
	usedTokens = 0,
}: StatusBarPropsInternal) {
	// Subscribe to current agent from store (event-driven, no polling!)
	const selectedAgentId = useSelectedAgentId();
	const currentAgent = getAgentById(selectedAgentId);
	const agentName = currentAgent?.metadata.name || "";

	// Subscribe to enabled rules count
	const enabledRuleIds = useEnabledRuleIds();
	const enabledRulesCount = enabledRuleIds.length;

	// Subscribe to MCP status
	const mcpStatus = useMCPStatus();

	// SSOT: Calculate total tokens using SAME logic as /context
	// - Uses buildModelMessages + calculateModelMessagesTokens
	// - Recalculates on agent/rules change (not cached in DB)
	// "點解右下角仍然要殿開邏輯？唔係同 /context 一致咩？ssot吖嘛？"
	const totalTokensSSOT = useTotalTokens(
		sessionId,
		provider,
		model,
		selectedAgentId,
		enabledRuleIds,
	);

	// DEBUG: Log calculation
	console.log("[StatusBar] Render:", {
		sessionId,
		provider,
		model,
		selectedAgentId,
		enabledRuleIds,
		totalTokensSSOT,
		"typeof totalTokensSSOT": typeof totalTokensSSOT,
	});

	// Fetch model details from server
	const { details, loading } = useModelDetails(provider, model);
	console.log("[StatusBar] Model details:", { details, loading });
	const contextLength = details.contextLength;
	const capabilities = details.capabilities;

	// Calculate usage percentage using SSOT value
	const usagePercent =
		contextLength && totalTokensSSOT > 0
			? Math.round((totalTokensSSOT / contextLength) * 100)
			: 0;

	// Handle unconfigured states
	if (!provider) {
		return (
			<Box flexGrow={1} justifyContent="space-between" marginBottom={1}>
				<Box>
					<Text dimColor>
						{agentName && `${agentName} · `}
						{enabledRulesCount} {enabledRulesCount === 1 ? "rule" : "rules"}
					</Text>
				</Box>
				<Box>
					<Text color="yellow">⚠ No AI provider selected - use /provider to select one</Text>
				</Box>
			</Box>
		);
	}

	if (!model) {
		return (
			<Box flexGrow={1} justifyContent="space-between" marginBottom={1}>
				<Box>
					<Text dimColor>
						{agentName && `${agentName} · `}
						{enabledRulesCount} {enabledRulesCount === 1 ? "rule" : "rules"} · {provider}
					</Text>
				</Box>
				<Box>
					<Text color="yellow">
						⚠ No model selected - type "/model" to select a model
					</Text>
				</Box>
			</Box>
		);
	}

	// Format capabilities with emoji
	let capabilityLabel = "";
	if (!loading && capabilities && capabilities.size > 0) {
		const caps: string[] = [];
		if (capabilities.has("image-input")) caps.push("👁️");
		if (capabilities.has("file-input")) caps.push("📎");
		if (capabilities.has("image-output")) caps.push("🎨");
		if (capabilities.has("tools")) caps.push("🔧");
		if (capabilities.has("reasoning")) caps.push("🧠");

		if (caps.length > 0) {
			capabilityLabel = ` ${caps.join("")}`;
		}
	}

	// Format MCP status
	let mcpStatusText = "";
	if (mcpStatus.total > 0) {
		if (mcpStatus.connected > 0) {
			mcpStatusText = `MCP: ${mcpStatus.connected}/${mcpStatus.total} (${mcpStatus.toolCount} tools)`;
		} else if (mcpStatus.failed > 0) {
			mcpStatusText = `MCP: 0/${mcpStatus.total} (failed)`;
		} else {
			mcpStatusText = `MCP: 0/${mcpStatus.total} (connecting...)`;
		}
	}

	return (
		<Box flexGrow={1} justifyContent="space-between" marginBottom={1}>
			{/* Left side: Agent, Rules, MCP, Provider and Model */}
			<Box>
				<Text dimColor>
					{agentName && `${agentName} · `}
					{enabledRulesCount} {enabledRulesCount === 1 ? "rule" : "rules"}
					{mcpStatusText && ` · ${mcpStatusText}`} · {provider} ·{" "}
				</Text>
				<Text
					color={modelStatus === "unavailable" ? "red" : undefined}
					dimColor={modelStatus !== "unavailable"}
				>
					{model}
					{modelStatus === "unavailable" && " (unavailable)"}
				</Text>
				{capabilityLabel && <Text dimColor>{capabilityLabel}</Text>}
			</Box>

			{/* Right side: Context usage (SSOT - same as /context) */}
			<Box>
				{!loading && contextLength && totalTokensSSOT > 0 ? (
					<Text dimColor>
						{formatTokenCount(totalTokensSSOT)} / {formatTokenCount(contextLength)} (
						{usagePercent}%)
					</Text>
				) : null}
				{!loading && contextLength && totalTokensSSOT === 0 ? (
					<Text dimColor>{formatTokenCount(contextLength)}</Text>
				) : null}
			</Box>
		</Box>
	);
}
