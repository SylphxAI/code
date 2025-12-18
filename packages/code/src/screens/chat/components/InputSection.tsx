/**
 * InputSection Component
 * Handles all input modes: selection, pending command, and normal input
 */

import { useLensClient } from "@sylphx/code-client";
import { setCurrentScreen } from "../../../ui-state.js";
import type { FileAttachment } from "@sylphx/code-core";
import { formatTokenCount } from "@sylphx/code-core";
import { Box, Text } from "ink";
import { indicators } from "../../../utils/colors.js";
import { useEffect, useRef } from "react";
import { useThemeColors } from "../../../theme.js";
import type { Command, WaitForInputOptions } from "../../../commands/types.js";
import { CommandAutocomplete } from "../../../components/CommandAutocomplete.js";
import { FileAutocomplete } from "../../../components/FileAutocomplete.js";
import { PendingCommandSelection } from "../../../components/PendingCommandSelection.js";
import TextInputWithHint from "../../../components/TextInputWithHint.js";
import type { FilteredCommand, FilteredFileInfo } from "../autocomplete/types.js";
import { AskToolSelection } from "./AskToolSelection.js";

interface InputSectionProps {
	// Input state
	input: string;
	setInput: (value: string) => void;
	cursor: number;
	setCursor: (pos: number) => void;
	onSubmit: (value: string) => void | Promise<void>;

	// Autocomplete callbacks
	onCommandAutocompleteTab?: () => void;
	onCommandAutocompleteEnter?: () => void;
	onCommandAutocompleteUpArrow?: () => void;
	onCommandAutocompleteDownArrow?: () => void;
	onFileAutocompleteTab?: () => void;
	onFileAutocompleteEnter?: () => void;
	onFileAutocompleteUpArrow?: () => void;
	onFileAutocompleteDownArrow?: () => void;
	onPasteImage?: () => void | Promise<void>;

	// Selection mode
	pendingInput: WaitForInputOptions | null;
	setPendingInput: (options: WaitForInputOptions | null) => void;
	inputResolver: React.MutableRefObject<
		((value: string | Record<string, string | string[]>) => void) | null
	>;
	askToolContextRef: React.MutableRefObject<{
		sessionId: string;
		toolCallId: string;
	} | null>;
	multiSelectionPage: number;
	multiSelectionAnswers: Record<string, string | string[]>;
	multiSelectChoices: Set<string>;
	selectionFilter: string;
	setSelectionFilter: (value: string) => void;
	isFilterMode: boolean;
	freeTextInput: string;
	isFreeTextMode: boolean;
	selectedCommandIndex: number;
	setSelectedCommandIndex: (idx: number) => void;
	askQueueLength: number;

	// Pending command mode
	pendingCommand: { command: Command; currentInput: string } | null;
	setPendingCommand: (cmd: { command: Command; currentInput: string } | null) => void;
	currentlyLoading: string | null;
	loadError: string | null;
	cachedOptions: Map<string, Array<{ id: string; name: string; label: string; value?: string }>>;
	currentSessionId: string | null;
	addMessage: (params: {
		sessionId: string | null;
		role: "user" | "assistant";
		content: string;
		attachments?: any[];
		usage?: any;
		finishReason?: string;
		metadata?: any;
		todoSnapshot?: any[];
		status?: "active" | "completed" | "error" | "abort";
		provider?: any;
		model?: string;
	}) => Promise<string>;
	createCommandContext: (args: string[]) => any;
	getAIConfig: () => { defaultProvider?: string; defaultModel?: string } | null;

	// Attachments
	pendingAttachments: FileAttachment[];
	attachmentTokens: Map<string, number>;

	// Autocomplete
	filteredFileInfo: FilteredFileInfo;
	filteredCommands: FilteredCommand[];
	selectedFileIndex: number;
	filesLoading: boolean;
	hintText: string;
	validTags: Set<string>;

	// ESC hint
	showEscHint: boolean;

	// AI suggestions (from inline actions)
	suggestions: Array<{ index: number; text: string; isStreaming: boolean }>;

	// Custom input component (replaces input area)
	inputComponent: React.ReactNode | null;
	inputComponentTitle: string | null;

	// Abort streaming
	isStreaming: boolean;
	abortControllerRef: React.MutableRefObject<AbortController | null>;
}

export function InputSection({
	input,
	setInput,
	cursor,
	setCursor,
	onSubmit: onSubmitProp,
	onCommandAutocompleteTab,
	onCommandAutocompleteEnter,
	onCommandAutocompleteUpArrow,
	onCommandAutocompleteDownArrow,
	onFileAutocompleteTab,
	onFileAutocompleteEnter,
	onFileAutocompleteUpArrow,
	onFileAutocompleteDownArrow,
	pendingInput,
	setPendingInput,
	inputResolver,
	askToolContextRef,
	multiSelectionPage,
	multiSelectionAnswers,
	multiSelectChoices,
	selectionFilter,
	isFilterMode,
	freeTextInput,
	isFreeTextMode,
	selectedCommandIndex,
	setSelectedCommandIndex,
	askQueueLength,
	pendingCommand,
	setPendingCommand,
	currentlyLoading,
	loadError,
	cachedOptions,
	currentSessionId,
	addMessage,
	createCommandContext,
	getAIConfig,
	pendingAttachments,
	attachmentTokens,
	filteredFileInfo,
	filteredCommands,
	selectedFileIndex,
	filesLoading,
	hintText,
	validTags,
	showEscHint,
	suggestions,
	inputComponent,
	inputComponentTitle,
	isStreaming,
	abortControllerRef,
	onPasteImage,
}: InputSectionProps) {
	// Lens client for API calls
	const client = useLensClient();

	// Mutation hooks
	const { mutate: answerAskMutate } = client.answerAsk({});
	const { mutate: demoteBashMutate } = client.demoteBash({});

	// Query hook for active bash
	const activeBashQuery = client.getActiveBash({});

	// Use ref to always have the latest isStreaming value in onEscape callback
	// This avoids stale closure issues with React.memo
	const isStreamingRef = useRef(isStreaming);
	useEffect(() => {
		isStreamingRef.current = isStreaming;
	}, [isStreaming]);

	// Wrap onSubmit with logging
	const onSubmit = (value: string) => {
		onSubmitProp(value);
	};

	// Determine header title based on context
	const getHeaderTitle = (): string => {
		// Custom component with title
		if (inputComponent && inputComponentTitle) {
			return inputComponentTitle;
		}
		// Selection mode - use current question as title
		if (pendingInput?.type === "selection" && pendingInput.questions[multiSelectionPage]) {
			return pendingInput.questions[multiSelectionPage].question;
		}
		// Text input mode with prompt - use prompt as title
		if (pendingInput?.type === "text" && pendingInput.prompt) {
			return pendingInput.prompt;
		}
		// Default
		return "YOU";
	};

	const headerTitle = getHeaderTitle();

	// Get terminal width for separator line
	const termWidth = process.stdout.columns || 80;
	const separatorLine = "─".repeat(termWidth);
	const colors = useThemeColors();

	return (
		<Box flexDirection="column" flexShrink={0}>
			{/* Top separator */}
			<Box>
				<Text color={colors.borderSubtle}>{separatorLine}</Text>
			</Box>

			{/* Dynamic Header - only show when not default "YOU" */}
			{headerTitle !== "YOU" && (
				<Box>
					<Text color={colors.user}>{indicators.user} {headerTitle}</Text>
				</Box>
			)}

			{/* Custom Input Component */}
			{inputComponent ? (
				inputComponent
			) : (
				<>
					{/* PendingInput Mode - when command calls waitForInput or ask tool is used */}
					{pendingInput && pendingInput.type === "selection" ? (
						<AskToolSelection
							pendingInput={pendingInput}
							onSelect={async (value) => {
								// Server-side ask tool: submit answer via mutation
								if (askToolContextRef.current) {
									const { sessionId, toolCallId } = askToolContextRef.current;

									try {
										// AnswerAskInput expects: { sessionId, questionId, answers: Record<string, string | string[]> }
										// Convert value to Record format
										let answers: Record<string, string | string[]>;
										if (typeof value === "string") {
											answers = { answer: value };
										} else if (Array.isArray(value)) {
											answers = { answer: value };
										} else {
											answers = value;
										}

										// Use mutation hook
										await answerAskMutate({
											input: {
												sessionId,
												questionId: toolCallId,
												answers,
											},
										});
										// Server will emit ask-question-answered event which clears pendingInput
									} catch (error) {
										console.error("[AskToolSelection] Failed to submit answer:", error);
										// Fallback: clear UI manually
										setPendingInput(null);
									}
								}
								// Legacy client-side ask tool: resolve promise
								else if (inputResolver.current) {
									// Convert value to expected format
									let resolvedValue: string | Record<string, string | string[]>;
									if (typeof value === "string") {
										resolvedValue = value;
									} else if (Array.isArray(value)) {
										resolvedValue = { answer: value };
									} else {
										resolvedValue = value;
									}
									inputResolver.current(resolvedValue);
									inputResolver.current = null;
									setPendingInput(null);
								}
							}}
							onCancel={() => {
								// Clear ask tool context and pendingInput
								if (askToolContextRef.current) {
									askToolContextRef.current = null;
								}
								if (inputResolver.current) {
									inputResolver.current("");
									inputResolver.current = null;
								}
								setPendingInput(null);
							}}
						/>
					) : /* Selection Mode - when a command is pending and needs args */
					pendingCommand ? (
						<PendingCommandSelection
							pendingCommand={pendingCommand}
							currentlyLoading={currentlyLoading}
							loadError={loadError}
							cachedOptions={cachedOptions}
							selectedCommandIndex={selectedCommandIndex}
							onSelect={async (option) => {
								const response = await pendingCommand.command.execute(
									createCommandContext([option.value || option.label]),
								);
								if (currentSessionId && response) {
									const aiConfig = getAIConfig();
									await addMessage({
										sessionId: currentSessionId,
										role: "assistant",
										content: response,
										provider: aiConfig?.defaultProvider,
										model: aiConfig?.defaultModel,
									});
								}
								setPendingCommand(null);
								setSelectedCommandIndex(0);
							}}
						/>
					) : (
						<>
							{/* Show pending attachments */}
							{pendingAttachments.length > 0 ? (
								<Box flexDirection="column" marginBottom={1}>
									<Box marginBottom={1}>
										<Text color={colors.textDim}>Attachments ({pendingAttachments.length}):</Text>
									</Box>
									{pendingAttachments.map((att) => (
										<Box key={`pending-att-${att.fileId}`} marginLeft={2}>
											<Text color={colors.primary}>{att.relativePath}</Text>
											<Text color={colors.textDim}> (</Text>
											{att.size ? (
												<>
													<Text color={colors.textDim}>{(att.size / 1024).toFixed(1)}KB</Text>
													{attachmentTokens.has(att.fileId) && <Text color={colors.textDim}>, </Text>}
												</>
											) : null}
											{attachmentTokens.has(att.fileId) ? (
												<Text color={colors.textDim}>
													{formatTokenCount(attachmentTokens.get(att.fileId)!)} Tokens
												</Text>
											) : null}
											<Text color={colors.textDim}>)</Text>
										</Box>
									))}
								</Box>
							) : null}

							{/* Show prompt for text input mode */}
							{pendingInput?.type === "text" && pendingInput.prompt && (
								<Box marginBottom={1}>
									<Text color={colors.textDim}>{pendingInput.prompt}</Text>
								</Box>
							)}

							{/* Text Input with inline hint */}
							<Box marginLeft={2}>
								<TextInputWithHint
									key="main-input"
									value={input}
									onChange={setInput}
									cursor={cursor}
									onCursorChange={setCursor}
									onSubmit={onSubmit}
									placeholder={
										pendingInput?.type === "text"
											? pendingInput.placeholder || "Type your response..."
											: "Type your message, / for commands, @ for files..."
									}
									showCursor
									hint={
										// When input is empty, show first completed suggestion as hint
										input.length === 0 && suggestions.length > 0
											? suggestions.find((s) => !s.isStreaming)?.text
											: hintText
									}
									validTags={validTags}
									disableUpDownArrows={
										// Disable up/down arrows when autocomplete is active
										filteredFileInfo.hasAt || (input.startsWith("/") && filteredCommands.length > 0)
									}
									onTab={
										// When file autocomplete is active, handle Tab
										filteredFileInfo.hasAt
											? onFileAutocompleteTab
											: // When command autocomplete is active, handle Tab via callback
												input.startsWith("/") && filteredCommands.length > 0
												? onCommandAutocompleteTab
												: // When input empty and suggestion available, apply suggestion on Tab
													input.length === 0 && suggestions.length > 0
													? () => {
															const firstSuggestion = suggestions.find((s) => !s.isStreaming);
															if (firstSuggestion) {
																setInput(firstSuggestion.text);
																setCursor(firstSuggestion.text.length);
															}
														}
													: undefined
									}
									onEnter={
										// When file autocomplete is active, handle Enter
										filteredFileInfo.hasAt
											? onFileAutocompleteEnter
											: // When command autocomplete is active, handle Enter via callback
												input.startsWith("/") && filteredCommands.length > 0
												? onCommandAutocompleteEnter
												: undefined
									}
									onUpArrow={
										// When file autocomplete is active, handle Up Arrow
										filteredFileInfo.hasAt
											? onFileAutocompleteUpArrow
											: // When command autocomplete is active, handle Up Arrow via callback
												input.startsWith("/") && filteredCommands.length > 0
												? onCommandAutocompleteUpArrow
												: undefined
									}
									onDownArrow={
										// When file autocomplete is active, handle Down Arrow
										filteredFileInfo.hasAt
											? onFileAutocompleteDownArrow
											: // When command autocomplete is active, handle Down Arrow via callback
												input.startsWith("/") && filteredCommands.length > 0
												? onCommandAutocompleteDownArrow
												: undefined
									}
									onEscape={() => {
										// ESC to abort streaming - use ref to get latest isStreaming value
										// This avoids stale closure from React.memo
										const currentlyStreaming = isStreamingRef.current;
										if (currentlyStreaming && abortControllerRef.current) {
											abortControllerRef.current.abort();
										}
									}}
									onPasteImage={onPasteImage}
									onCtrlB={() => {
										// Use query data and mutation to demote active bash
										const active = activeBashQuery.data as { id: string } | null;
										if (active) {
											demoteBashMutate({ args: { bashId: active.id } }).catch((error: any) => {
												console.error("[InputSection] Failed to demote active bash:", error);
											});
										}
									}}
									onCtrlP={() => {
										setCurrentScreen("bash-list");
									}}
								/>
							</Box>

							{/* ESC hint - shows after first ESC press */}
							{showEscHint && (
								<Box marginTop={1}>
									<Text color={colors.warning}>Press ESC again to clear input</Text>
								</Box>
							)}

							{/* File Autocomplete - Shows below input when typing @ */}
							{filteredFileInfo.hasAt ? (
								<FileAutocomplete
									files={filteredFileInfo.files}
									selectedFileIndex={selectedFileIndex}
									filesLoading={filesLoading}
								/>
							) : null}

							{/* Command Autocomplete - Shows below input when typing / */}
							{input.startsWith("/") && !filteredFileInfo.hasAt && filteredCommands.length > 0 ? (
								<CommandAutocomplete
									commands={filteredCommands}
									selectedCommandIndex={selectedCommandIndex}
									currentlyLoading={currentlyLoading}
									loadError={loadError}
								/>
							) : null}
						</>
					)}
				</>
			)}

			{/* Bottom separator */}
			<Box>
				<Text color={colors.borderSubtle}>{separatorLine}</Text>
			</Box>
		</Box>
	);
}
