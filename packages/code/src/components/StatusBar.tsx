/**
 * Status Bar Component
 * Display important session info at the bottom
 *
 * ARCHITECTURE: Frontend-Driven Lens Pattern
 * - Direct useQuery for all Lens data (session, bash)
 * - No intermediate hooks, no signals
 * - Components declare what data they need
 * - Lens handles: state, subscription, optimistic updates, cleanup
 */

import { useQuery, useLensClient, useEnabledRuleIds, useSelectedAgentId, useThemeColors } from "@sylphx/code-client";
import { formatTokenCount } from "@sylphx/code-core";
import { Box, Spacer, Text } from "ink";
import { useMemo } from "react";
import { getAgentById } from "../embedded-context.js";
import { useMCPStatus } from "../hooks/client/useMCPStatus.js";
import { useModelDetails } from "../hooks/client/useModelDetails.js";

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

function StatusBarInternal({
	sessionId,
	provider,
	model,
	modelStatus,
	usedTokens = 0,
}: StatusBarPropsInternal) {
	const client = useLensClient();

	// Subscribe to current agent from store (event-driven, no polling!)
	const selectedAgentId = useSelectedAgentId();
	const currentAgent = getAgentById(selectedAgentId);
	const agentName = currentAgent?.metadata.name || "";

	// Subscribe to enabled rules count
	const enabledRuleIds = useEnabledRuleIds();
	const enabledRulesCount = enabledRuleIds.length;

	// Frontend-Driven Pattern: Direct useQuery for session data
	// ✅ Lens auto-handles: state, subscription, optimistic updates, cleanup
	// ✅ Field selection: only fetch totalTokens (bandwidth optimization)
	// ✅ Conditional query: null = skip (supported in @sylphx/lens-react@1.2.0+)
	const { data: session } = useQuery(
		sessionId
			? client.getSession({ id: sessionId }).select({
					totalTokens: true, // Only need tokens for status bar
			  })
			: null,
	);
	const totalTokens = session?.totalTokens || 0;

	// Frontend-Driven Pattern: Direct useQuery for bash processes
	// ✅ Lens handles subscription to bash events automatically
	const { data: bashProcesses } = useQuery(client.listBash());
	const backgroundBashCount = useMemo(
		() => bashProcesses?.filter((p: any) => !p.isActive && p.status === "running").length || 0,
		[bashProcesses]
	);

	// MCP status (event-driven via eventBus, not Lens)
	const mcpStatus = useMCPStatus();

	// Fetch model details from server (tRPC, not Lens)
	const { details, loading } = useModelDetails(provider, model);
	const contextLength = details.contextLength;
	const capabilities = details.capabilities;

	// IMPORTANT: ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
	// This ensures consistent hook order across all renders (React Rules of Hooks)

	// Memoize usage percentage to avoid recalculating on every render
	const usagePercent = useMemo(
		() => (contextLength && totalTokens > 0 ? Math.round((totalTokens / contextLength) * 100) : 0),
		[contextLength, totalTokens],
	);

	// Memoize capability label to avoid recalculating on every render
	const capabilityLabel = useMemo(() => {
		if (loading || !capabilities || capabilities.size === 0) return "";

		const caps: string[] = [];
		if (capabilities.has("image-input")) caps.push("👁️");
		if (capabilities.has("file-input")) caps.push("📎");
		if (capabilities.has("image-output")) caps.push("🎨");
		if (capabilities.has("tools")) caps.push("🔧");
		if (capabilities.has("reasoning")) caps.push("🧠");

		return caps.length > 0 ? ` ${caps.join("")}` : "";
	}, [loading, capabilities]);

	// Memoize left content to avoid rebuilding on every render
	const leftContent = useMemo(
		() => [agentName, provider, model ? model + capabilityLabel : ""].filter(Boolean).join(" · "),
		[agentName, provider, model, capabilityLabel],
	);

	// Memoize right content to avoid rebuilding on every render
	const rightContent = useMemo(() => {
		const rightParts = [
			`${enabledRulesCount} ${enabledRulesCount === 1 ? "rule" : "rules"}`,
			mcpStatus.total > 0 &&
				`MCP ${mcpStatus.connected}/${mcpStatus.total}${mcpStatus.connected > 0 ? ` (${mcpStatus.toolCount})` : ""}`,
			backgroundBashCount > 0 && `${backgroundBashCount} BG bash (Ctrl+P)`,
		].filter(Boolean);

		if (!loading && contextLength && totalTokens > 0) {
			rightParts.push(
				`${formatTokenCount(totalTokens)} / ${formatTokenCount(contextLength)} (${usagePercent}%)`,
			);
		} else if (!loading && contextLength && totalTokens === 0) {
			rightParts.push(formatTokenCount(contextLength));
		}

		return rightParts.join(" · ");
	}, [enabledRulesCount, mcpStatus, backgroundBashCount, loading, contextLength, totalTokens, usagePercent]);

	// Get theme colors
	const colors = useThemeColors();

	// ALL EARLY RETURNS MUST COME AFTER ALL HOOKS
	// Early return for missing provider
	if (!provider) {
		return (
			<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
				<Box flexShrink={0}>
					<Text color={colors.textDim}>{leftContent}</Text>
				</Box>
				<Spacer />
				<Box flexShrink={0}>
					<Text color={colors.textDim}>{rightContent}</Text>
				</Box>
				<Box flexShrink={0} marginLeft={1}>
					<Text color={colors.warning}>⚠ No AI provider selected - use /provider to select one</Text>
				</Box>
			</Box>
		);
	}

	// Early return for missing model
	if (!model) {
		return (
			<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
				<Box flexShrink={0}>
					<Text color={colors.textDim}>{leftContent}</Text>
				</Box>
				<Spacer />
				<Box flexShrink={0}>
					<Text color={colors.textDim}>{rightContent}</Text>
				</Box>
				<Box flexShrink={0} marginLeft={1}>
					<Text color={colors.warning}>⚠ No model selected - type "/model" to select a model</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box width="100%" flexDirection="row" flexWrap="nowrap" marginBottom={1}>
			{/* Left side - agent, provider, model */}
			<Box flexShrink={0}>
				<Text color={colors.textDim}>{leftContent}</Text>
			</Box>

			<Spacer />

			{/* Right side - rules, MCP, context */}
			<Box flexShrink={0}>
				<Text color={colors.textDim}>{rightContent}</Text>
			</Box>
		</Box>
	);
}

/**
 * ARCHITECTURE NOTE: Frontend-Driven Lens Pattern
 * - Direct useQuery for session and bash data
 * - Lens automatically handles reactivity and re-renders
 * - No signals, no manual subscription management
 * - Component re-renders when Lens data updates
 */
export default StatusBarInternal;
