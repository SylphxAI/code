/**
 * Provider Card Component
 * Display provider information
 */

import { AI_PROVIDERS, type ProviderId } from "@sylphx/code-core";
import { useThemeColors } from "@sylphx/code-client";
import { Box, Text } from "ink";

interface ProviderCardProps {
	providerId: ProviderId;
	apiKey?: string;
	defaultModel?: string;
	isDefault?: boolean;
}

export default function ProviderCard({
	providerId,
	apiKey,
	defaultModel,
	isDefault = false,
}: ProviderCardProps) {
	const provider = AI_PROVIDERS[providerId];
	const themeColors = useThemeColors();

	const colors: Record<ProviderId, string> = {
		anthropic: "#00D9FF",
		openai: "#00FF88",
		google: "#FF6B6B",
		openrouter: "#A855F7",
		"claude-code": "#FF9500",
		zai: "#FFD700",
	};

	const color = colors[providerId];

	return (
		<Box flexDirection="column" paddingY={1}>
			{/* Header */}
			<Box marginBottom={1}>
				<Text color={color}>▌ {provider.name.toUpperCase()}</Text>
				{isDefault && (
					<>
						<Text color={themeColors.textDim}> · </Text>
						<Text color={themeColors.warning}>DEFAULT</Text>
					</>
				)}
			</Box>

			{/* Details */}
			<Box paddingLeft={2}>
				{/* Claude Code doesn't need API key, it uses CLI auth */}
				{providerId === "claude-code" ? (
					<>
						<Text color={themeColors.success}>✓</Text>
						<Text color={themeColors.textDim}> CLI Auth</Text>
					</>
				) : apiKey ? (
					<Text color={themeColors.success}>✓</Text>
				) : (
					<Text color={themeColors.error}>✗</Text>
				)}
				<Text color={themeColors.textDim}> │ </Text>
				{defaultModel && (
					<>
						<Text color={themeColors.text}>{defaultModel}</Text>
						<Text color={themeColors.textDim}> │ </Text>
					</>
				)}
				<Text color={color}>
					{provider.models.length > 0 ? `${provider.models.length} models` : "Dynamic models"}
				</Text>
			</Box>
		</Box>
	);
}
