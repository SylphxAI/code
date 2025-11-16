/**
 * Model Selection Component
 * Uses InlineSelection composition pattern for consistent UI
 */

import { Box, Text } from "ink";
import Spinner from "../../../components/Spinner.js";
import { InlineSelection } from "../../../components/selection/index.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";

interface ModelSelectionProps {
	models: Array<{ id: string; name: string }> | null;
	currentProvider: string;
	onSelect: (modelId: string) => void | Promise<void>;
	onCancel: () => void;
	loading?: boolean;
	error?: string;
}

export function ModelSelection({
	models,
	currentProvider,
	onSelect,
	onCancel,
	loading = false,
	error,
}: ModelSelectionProps) {
	// Loading state
	if (loading) {
		return (
			<Box>
				<Spinner color="yellow" />
				<Text dimColor> Loading models from {currentProvider}...</Text>
			</Box>
		);
	}

	// Error state
	if (error) {
		return (
			<Box flexDirection="column">
				<Text color="red">Failed to load models: {error}</Text>
				<Text dimColor>Press Esc to cancel</Text>
			</Box>
		);
	}

	// No models
	if (!models || models.length === 0) {
		return (
			<Box flexDirection="column">
				<Text color="yellow">No models available for {currentProvider}</Text>
				<Text dimColor>Press Esc to cancel</Text>
			</Box>
		);
	}

	const modelOptions: SelectionOption[] = models.map((model) => ({
		label: model.name,
		value: model.id,
	}));

	return (
		<InlineSelection
			options={modelOptions}
			subtitle={`Select a model for ${currentProvider}`}
			filter={true}
			onSelect={(value) => {
				Promise.resolve(onSelect(value as string)).then(() => {
					// Selection complete
				});
			}}
			onCancel={onCancel}
		/>
	);
}
