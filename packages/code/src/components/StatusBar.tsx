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

	// Real-time tokens from $currentSession signal
	// Updated live during streaming via session-tokens-updated events
	const totalTokens = useTotalTokens();

	// Fetch model details from server
	const { details, loading } = useModelDetails(provider, model);
	const contextLength = details.contextLength;
	const capabilities = details.capabilities;

	// Calculate usage percentage
	const usagePercent =
		contextLength && totalTokens > 0 ? Math.round((totalTokens / contextLength) * 100) : 0;

	// Handle unconfigured states
	if (!provider) {
		const leftContent = agentName || "";
		const rightContent = `${enabledRulesCount} ${enabledRulesCount === 1 ? "rule" : "rules"}`;

		return (
			<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
				<Box flexShrink={0}>
					<Text dimColor>{leftContent}</Text>
				</Box>
				<Spacer />
				<Box flexShrink={0}>
					<Text dimColor>{rightContent}</Text>
				</Box>
				<Box flexShrink={0} marginLeft={1}>
					<Text color="yellow">⚠ No AI provider selected - use /provider to select one</Text>
				</Box>
			</Box>
		);
	}

	if (!model) {
		const leftContent = [agentName, provider].filter(Boolean).join(" · ");
		const rightContent = `${enabledRulesCount} ${enabledRulesCount === 1 ? "rule" : "rules"}`;

		return (
			<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
				<Box flexShrink={0}>
					<Text dimColor>{leftContent}</Text>
				</Box>
				<Spacer />
				<Box flexShrink={0}>
					<Text dimColor>{rightContent}</Text>
				</Box>
				<Box flexShrink={0} marginLeft={1}>
					<Text color="yellow">⚠ No model selected - type "/model" to select a model</Text>
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

	// Build left content (agent, provider, model)
	const leftContent = [agentName, provider, model + capabilityLabel].filter(Boolean).join(" · ");

	// Build right content (rules, MCP, context)
	const rightParts = [
		`${enabledRulesCount} ${enabledRulesCount === 1 ? "rule" : "rules"}`,
		mcpStatus.total > 0 &&
			`MCP ${mcpStatus.connected}/${mcpStatus.total}${mcpStatus.connected > 0 ? ` (${mcpStatus.toolCount})` : ""}`,
	].filter(Boolean);

	if (!loading && contextLength && totalTokens > 0) {
		rightParts.push(`${formatTokenCount(totalTokens)} / ${formatTokenCount(contextLength)} (${usagePercent}%)`);
	} else if (!loading && contextLength && totalTokens === 0) {
		rightParts.push(formatTokenCount(contextLength));
	}

	const rightContent = rightParts.join(" · ");

	return (
		<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
			{/* Left side - agent, provider, model */}
			<Box flexShrink={0}>
				<Text dimColor>{leftContent}</Text>
			</Box>

			<Spacer />

			{/* Right side - rules, MCP, context */}
			<Box flexShrink={0}>
				<Text dimColor>{rightContent}</Text>
			</Box>
		</Box>
	);
}
