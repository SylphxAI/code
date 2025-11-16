/**
 * Ask Tool Selection Component
 * Uses InlineSelection for ask tool questions
 * ARCHITECTURE: Client-side UI only, renders questions from ask tool
 * SYNC: Shared selection state managed by server, UI reflects current state
 */

import { InlineSelection } from "../../../components/selection/index.js";
import type { SelectionOption } from "../../../hooks/useSelection.js";
import type { WaitForInputOptions } from "../../../commands/types.js";

interface AskToolSelectionProps {
	pendingInput: WaitForInputOptions;
	onSelect: (value: string | string[]) => void;
	onCancel: () => void;
}

/**
 * Ask Tool Selection - Modern selection UI for ask tool
 *
 * Features:
 * - Single/multi-select support
 * - Filter support
 * - Keyboard navigation (built into InlineSelection)
 *
 * Multi-client sync:
 * - Server manages selection state via ask queue
 * - When any client answers, server resolves ask promise
 * - All clients receive tool result via event stream
 *
 * ASSUMPTION: Currently only supports single question at a time
 * TODO: Add free text input support
 * TODO: Add multi-step question flow
 */
export function AskToolSelection({
	pendingInput,
	onSelect,
	onCancel,
}: AskToolSelectionProps) {
	if (pendingInput.type !== "selection") {
		return null;
	}

	// ASSUMPTION: Take first question (multi-step handled by server)
	const currentQuestion = pendingInput.questions[0];

	if (!currentQuestion) {
		return null;
	}

	// Convert question options to SelectionOption format
	const selectionOptions: SelectionOption[] = currentQuestion.options.map((opt) => ({
		label: opt.label,
		value: opt.value || opt.label,
		description: opt.description,
		// TODO: Handle freeText options
	}));

	// Get pre-selected values for multi-select
	const preSelected = currentQuestion.multiSelect ? currentQuestion.preSelected || [] : [];

	return (
		<InlineSelection
			options={selectionOptions}
			subtitle={currentQuestion.question}
			multiSelect={currentQuestion.multiSelect || false}
			filter={true}
			preSelected={preSelected}
			emptyMessage="No options available"
			onSelect={onSelect}
			onCancel={onCancel}
		/>
	);
}
