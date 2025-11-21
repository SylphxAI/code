/**
 * Selection UI Component
 * Handles rendering of selection mode for questions with options
 */

import { calculateScrollViewport } from "@sylphx/code-core";
import { useThemeColors } from "@sylphx/code-client";
import { Box, Text } from "ink";
import type { WaitForInputOptions } from "../commands/types.js";

interface SelectionUIProps {
	pendingInput: WaitForInputOptions;
	multiSelectionPage: number;
	multiSelectionAnswers: Record<string, string | string[]>;
	multiSelectChoices: Set<string>;
	selectionFilter: string;
	isFilterMode: boolean;
	freeTextInput: string;
	isFreeTextMode: boolean;
	selectedCommandIndex: number;
	askQueueLength: number;
}

export function SelectionUI({
	pendingInput,
	multiSelectionPage,
	multiSelectionAnswers,
	multiSelectChoices,
	selectionFilter,
	isFilterMode,
	freeTextInput,
	isFreeTextMode,
	selectedCommandIndex,
	askQueueLength,
}: SelectionUIProps) {
	const colors = useThemeColors();

	if (pendingInput.type !== "selection") {
		return null;
	}

	const questions = pendingInput.questions;
	const isSingleQuestion = questions.length === 1;
	const _currentQuestion = questions[multiSelectionPage];

	// Calculate progress
	const answeredCount = Object.keys(multiSelectionAnswers).length;
	const totalQuestions = questions.length;
	const allAnswered = questions.every((q) => multiSelectionAnswers[q.id]);

	return (
		<Box flexDirection="column">
			{pendingInput.prompt && (
				<Box marginBottom={1}>
					<Text color={colors.textDim}>{pendingInput.prompt}</Text>
				</Box>
			)}

			{/* Queue status */}
			{askQueueLength > 0 && (
				<Box marginBottom={1}>
					<Text color={colors.warning}>[+{askQueueLength} pending]</Text>
				</Box>
			)}

			{/* Progress header (only for multi-question) */}
			{!isSingleQuestion && (
				<Box marginBottom={1}>
					<Text color={colors.primary}>Progress: </Text>
					<Text color={colors.success} bold>
						{answeredCount}/{totalQuestions}
					</Text>
					<Text color={colors.textDim}> completed</Text>
				</Box>
			)}

			{/* Vertical list - all questions */}
			{questions.map((q, qIdx) => {
				const isCurrentQuestion = qIdx === multiSelectionPage;
				const answer = multiSelectionAnswers[q.id];
				const answerOption = answer
					? q.options.find((opt) => (opt.value || opt.label) === answer)
					: null;

				return (
					<Box key={q.id} marginBottom={1} flexDirection="column">
						{/* Question header */}
						<Box>
							{!isSingleQuestion && <Text color={colors.primary}>Q{qIdx + 1}. </Text>}
							<Text bold={isCurrentQuestion} color={isCurrentQuestion ? colors.primary : colors.textDim}>
								{q.question}
							</Text>
							{isCurrentQuestion && !isSingleQuestion && <Text color={colors.success}> ← </Text>}
						</Box>

						{/* Answer or expanded options */}
						{isCurrentQuestion ? (
							// Current question: show options
							<Box marginLeft={4} flexDirection="column" marginTop={1}>
								{/* Free Text Input */}
								{isFreeTextMode ? (
									<Box marginBottom={1}>
										<Text color={colors.textDim}>✏️ </Text>
										<Text color={colors.success}>{freeTextInput}</Text>
										<Text color={colors.success}>▊</Text>
										<Text color={colors.textDim}> (Enter to submit, Esc to cancel)</Text>
									</Box>
								) : (
									/* Filter */
									<Box marginBottom={1}>
										<Text color={colors.textDim}>🔍 </Text>
										{isFilterMode ? (
											<>
												<Text color={colors.success}>{selectionFilter}</Text>
												<Text color={colors.success}>▊</Text>
												<Text color={colors.textDim}> (Esc to exit, type to continue)</Text>
											</>
										) : selectionFilter ? (
											<>
												<Text color={colors.primary}>{selectionFilter}</Text>
												<Text color={colors.textDim}> (/ to edit, Esc to clear)</Text>
											</>
										) : (
											<Text color={colors.textDim}>(press / to filter)</Text>
										)}
									</Box>
								)}

								{/* Options */}
								{!isFreeTextMode &&
									(() => {
										// Safety check: ensure options exist
										if (!q.options || !Array.isArray(q.options)) {
											return (
												<Box>
													<Text color={colors.error}>⚠ Error: No options available for this question</Text>
													<Text color={colors.textDim}>Question data: {JSON.stringify(q)}</Text>
												</Box>
											);
										}

										const filteredOptions = q.options.filter(
											(option) =>
												option.label.toLowerCase().includes(selectionFilter.toLowerCase()) ||
												option.value?.toLowerCase().includes(selectionFilter.toLowerCase()),
										);

										if (filteredOptions.length === 0) {
											return <Text color={colors.warning}>⚠ No matches found</Text>;
										}

										// Calculate scroll window to keep selected item visible
										const viewport = calculateScrollViewport(filteredOptions, selectedCommandIndex);

										return (
											<>
												{viewport.hasItemsAbove && (
													<Box marginBottom={1}>
														<Text color={colors.textDim}>... {viewport.itemsAboveCount} more above</Text>
													</Box>
												)}
												{viewport.visibleItems.map((option, idx) => {
													const absoluteIdx = viewport.scrollOffset + idx;
													const optionValue = option.value || option.label;
													const isChecked = q.multiSelect && multiSelectChoices.has(optionValue);
													const cursor = absoluteIdx === selectedCommandIndex ? "▶ " : "  ";
													const checkbox = q.multiSelect ? (isChecked ? "[✓] " : "[ ] ") : "";

													return (
														<Box key={option.value || option.label} paddingY={0}>
															<Text
																color={absoluteIdx === selectedCommandIndex ? colors.success : colors.textDim}
																bold={absoluteIdx === selectedCommandIndex}
															>
																{cursor}
																{checkbox}
																{option.label}
															</Text>
														</Box>
													);
												})}
												{viewport.hasItemsBelow && (
													<Box marginTop={1}>
														<Text color={colors.textDim}>... {viewport.itemsBelowCount} more below</Text>
													</Box>
												)}
											</>
										);
									})()}
							</Box>
						) : (
							// Other questions: show answer or not answered
							<Box marginLeft={4}>
								{answer ? (
									<>
										<Text color={colors.success}>✓ </Text>
										<Text color={colors.success}>
											{Array.isArray(answer) ? answer.join(", ") : answerOption?.label || answer}
										</Text>
									</>
								) : (
									<Text color={colors.textDim}>(not answered yet)</Text>
								)}
							</Box>
						)}
					</Box>
				);
			})}

			{/* Controls footer */}
			<Box marginTop={1} flexDirection="column">
				<Box>
					{!isSingleQuestion && !isFilterMode && (
						<>
							<Text color={colors.textDim}>Tab: </Text>
							<Text color={colors.primary}>Next</Text>
							<Text color={colors.textDim}> · Shift+Tab: </Text>
							<Text color={colors.primary}>Previous</Text>
							<Text color={colors.textDim}> · </Text>
						</>
					)}
					<Text color={colors.textDim}>↑↓: </Text>
					<Text color={colors.primary}>Navigate</Text>
					{!isFilterMode && questions[multiSelectionPage]?.multiSelect ? (
						<>
							<Text color={colors.textDim}> · Space: </Text>
							<Text color={colors.success}>Toggle</Text>
							<Text color={colors.textDim}> · Enter: </Text>
							<Text color={multiSelectChoices.size > 0 ? colors.success : colors.textDim}>
								Confirm
								{multiSelectChoices.size === 0 && " (select at least one)"}
							</Text>
							<Text color={colors.textDim}> · /: </Text>
							<Text color={colors.primary}>Filter</Text>
						</>
					) : isFilterMode ? (
						<>
							<Text color={colors.textDim}> · Enter: </Text>
							<Text color={colors.success}>Select</Text>
						</>
					) : (
						<>
							<Text color={colors.textDim}> · Enter: </Text>
							<Text color={colors.success}>Select</Text>
							<Text color={colors.textDim}> · /: </Text>
							<Text color={colors.primary}>Filter</Text>
						</>
					)}
					{!isSingleQuestion && !isFilterMode && (
						<>
							<Text color={colors.textDim}> · </Text>
							<Text color={colors.textDim}>Ctrl+Enter: </Text>
							<Text color={allAnswered ? colors.success : colors.textDim}>
								Submit{!allAnswered && " (answer all first)"}
							</Text>
						</>
					)}
					<Text color={colors.textDim}> · Esc: </Text>
					<Text color={colors.error}>
						{isFilterMode ? "Exit filter" : selectionFilter ? "Clear filter" : "Cancel"}
					</Text>
				</Box>
			</Box>
		</Box>
	);
}
