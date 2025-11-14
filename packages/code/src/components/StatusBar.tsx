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
import { Box, Text, Spacer } from "ink";
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
			<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
				<Text dimColor wrap="truncate">
					{agentName && `${agentName} · `}
					{enabledRulesCount} {enabledRulesCount === 1 ? "rule" : "rules"}
				</Text>
				<Spacer />
				<Text color="yellow" wrap="truncate">⚠ No AI provider selected - use /provider to select one</Text>
			</Box>
		);
	}

	if (!model) {
		return (
			<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
				<Text dimColor wrap="truncate">
					{agentName && `${agentName} · `}
					{enabledRulesCount} {enabledRulesCount === 1 ? "rule" : "rules"} · {provider}
				</Text>
				<Spacer />
				<Text color="yellow" wrap="truncate">
					⚠ No model selected - type "/model" to select a model
				</Text>
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

	return (
		<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
			{/* Left side - all metadata in one text block */}
			<Text dimColor wrap="truncate">
				{agentName && `${agentName} · `}
				{enabledRulesCount} {enabledRulesCount === 1 ? "rule" : "rules"}
				{mcpStatus.total > 0 && ` · MCP ${mcpStatus.connected}/${mcpStatus.total}`}
				{mcpStatus.connected > 0 && ` (${mcpStatus.toolCount})`}
				{" · "}
				{provider} · {model}
				{capabilityLabel}
			</Text>

			<Spacer />

			{/* Right side - context usage */}
			{!loading && contextLength && totalTokensSSOT > 0 && (
				<Text dimColor wrap="truncate">
					{formatTokenCount(totalTokensSSOT)} / {formatTokenCount(contextLength)} (
					{usagePercent}%)
				</Text>
			)}
			{!loading && contextLength && totalTokensSSOT === 0 && (
				<Text dimColor wrap="truncate">{formatTokenCount(contextLength)}</Text>
			)}
		</Box>
	);
}
