/**
 * Status Bar Component
 * Display important session info at the bottom
 *
 * ARCHITECTURE: lens-react hooks pattern
 * - Queries: client.queryName({ input, skip }) → { data, loading, error, refetch }
 * - getSession is a live query that includes status with totalTokens during streaming
 */

import { useEffect, useMemo, useState } from "react";
import { useLensClient } from "@sylphx/code-client";
import { formatTokenCount } from "@sylphx/code-core";
import { useEnabledRuleIds, useSelectedAgentId } from "../session-state.js";
import { Box, Spacer, Text } from "ink";
import { getAgentById } from "../embedded-context.js";
import { useThemeColors } from "../theme.js";
import { useMCPStatus } from "../hooks/client/useMCPStatus.js";
import { useModelDetails } from "../hooks/client/useModelDetails.js";

interface StatusBarProps {
	sessionId: string | null;
	provider: string | null;
	model: string | null;
	modelStatus?: "available" | "unavailable" | "unknown";
	usedTokens?: number;
	/** Session data from parent - avoid duplicate subscription */
	session?: {
		totalTokens?: number;
		status?: { tokenUsage?: number };
	} | null;
}

/**
 * StatusBar Component
 *
 * ARCHITECTURE: Client-agnostic design
 * - No hardcoded provider knowledge
 * - Receives session data from parent (single subscription pattern)
 * - Provider IDs are opaque strings to client
 */
function StatusBarInternal({
	sessionId,
	provider,
	model,
	modelStatus,
	usedTokens = 0,
	session,
}: StatusBarProps) {
	const client = useLensClient();

	// Local state for derived values
	const [backgroundBashCount, setBackgroundBashCount] = useState(0);

	// Subscribe to current agent from store (event-driven, no polling!)
	const selectedAgentId = useSelectedAgentId();
	const currentAgent = selectedAgentId ? getAgentById(selectedAgentId) : null;
	const agentName = currentAgent?.metadata.name || "";

	// Subscribe to enabled rules count
	const enabledRuleIds = useEnabledRuleIds();
	const enabledRulesCount = enabledRuleIds.length;

	// Bash query (separate from session - no duplicate subscription issue)
	const bashQuery = client.listBash.useQuery({});

	// Session data comes from parent via props (single subscription pattern)
	// This avoids duplicate getSession subscriptions

	// Sync bash data to local state
	useEffect(() => {
		if (bashQuery.data) {
			const bashProcesses = bashQuery.data as Array<{ isActive?: boolean; status?: string }> | null;
			const count = bashProcesses?.filter((p) => !p.isActive && p.status === "running").length || 0;
			setBackgroundBashCount(count);
		}
	}, [bashQuery.data]);

	// Get tokens from live query - includes real-time updates during streaming
	// status.tokenUsage is updated via session-status-manager during streaming
	const totalTokens = Math.max(
		session?.totalTokens || 0,
		session?.status?.tokenUsage || 0,
	);

	// DEBUG: Log token data changes
	useEffect(() => {
		console.log("[StatusBar] Token data changed:", {
			"session.totalTokens": session?.totalTokens,
			"session.baseContextTokens": session?.baseContextTokens,
			"session.status?.tokenUsage": session?.status?.tokenUsage,
			"computed totalTokens": totalTokens,
		});
	}, [session?.totalTokens, session?.baseContextTokens, session?.status?.tokenUsage, totalTokens]);

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
		if (loading || !capabilities || Object.keys(capabilities).length === 0) return "";

		const caps: string[] = [];
		if (capabilities["image-input"]) caps.push("👁️");
		if (capabilities["file-input"]) caps.push("📎");
		if (capabilities["image-output"]) caps.push("🎨");
		if (capabilities["tools"]) caps.push("🔧");
		if (capabilities["reasoning"]) caps.push("🧠");

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
				`MCP ${mcpStatus.connected}/${mcpStatus.total}`,
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
 * ARCHITECTURE NOTE: lens-react hooks pattern
 * - Uses query hooks for reactive data fetching
 * - Automatic cache management and refetching
 */
export default StatusBarInternal;
