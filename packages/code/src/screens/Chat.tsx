/**
 * Chat Screen (Refactored)
 * AI chat interface with session management
 *
 * ARCHITECTURE:
 * - State management: useChatState (single source of truth)
 * - Side effects: useChatEffects (event streams, subscriptions)
 * - Keyboard handling: useChatKeyboard (input modes, shortcuts)
 * - UI rendering: Separated components (ChatHeader, ChatMessages, etc.)
 */

import { Box, Text } from "ink";
import StatusBar from "../components/StatusBar.js";
import TodoList from "../components/TodoList.js";
import Spinner from "../components/Spinner.js";
import { ChatHeader } from "./chat/components/ChatHeader.js";
import { ChatMessages } from "./chat/components/ChatMessages.js";
import { InputSection } from "./chat/components/InputSection.js";
import { StatusIndicator } from "./chat/components/StatusIndicator.js";
import { useChatState } from "./chat/hooks/useChatState.js";
import { useChatEffects } from "./chat/hooks/useChatEffects.js";
import { useChatKeyboard } from "./chat/hooks/useChatKeyboard.js";
import type { ChatProps } from "./chat/types.js";
import { useDebugLogs } from "@sylphx/code-client";

export default function Chat(props: ChatProps) {
	// Consolidated state management
	const state = useChatState(props);

	// Consolidated effects and handlers
	const effects = useChatEffects(state);

	// Consolidated keyboard handling
	const keyboard = useChatKeyboard(state, effects);

	// Debug logs for loading indicators
	const debugLogs = useDebugLogs();
	const latestLog = debugLogs[debugLogs.length - 1] || "";
	const isLoadingModels = latestLog.includes("Loading models from");

	// Legacy command/file autocomplete handlers (undefined when using new input manager)
	const handleCommandAutocompleteTab = undefined;
	const handleCommandAutocompleteEnter = undefined;
	const handleCommandAutocompleteUpArrow = undefined;
	const handleCommandAutocompleteDownArrow = undefined;

	return (
		<Box flexDirection="row" flexGrow={1}>
			{/* Main chat area */}
			<Box flexDirection="column" flexGrow={1} width="70%">
				{/* Header */}
				<Box flexShrink={0}>
					<ChatHeader
						currentSessionTitle={state.currentSession?.title}
						isTitleStreaming={state.streamingState.isTitleStreaming}
						streamingTitle={state.streamingState.streamingTitle}
					/>
				</Box>

				{/* Messages */}
				<ChatMessages
					hasSession={!!state.currentSession}
					messages={state.currentSession?.messages}
					attachmentTokens={state.attachmentTokens}
				/>

				{/* Status Indicator */}
				<Box flexShrink={0}>
					<StatusIndicator
						isStreaming={state.streamingState.isStreaming}
						streamParts={
							state.currentSession?.messages.find((m) => m.status === "active")?.content || []
						}
					/>
				</Box>

				{/* Todo List */}
				<Box flexShrink={0}>
					<TodoList />
				</Box>

				{/* Loading Indicator */}
				{isLoadingModels && (
					<Box flexShrink={0} paddingLeft={2}>
						<Spinner color="yellow" />
						<Text dimColor> {latestLog.replace(/^\[\d{1,2}:\d{2}:\d{2} [AP]M\] /, "")}</Text>
					</Box>
				)}

				{/* Input Area */}
				<Box flexShrink={0}>
					<InputSection
						input={state.inputState.input}
						cursor={state.inputState.normalizedCursor}
						pendingInput={state.selectionState.pendingInput}
						pendingCommand={state.commandState.pendingCommand}
						multiSelectionPage={state.selectionState.multiSelectionPage}
						multiSelectionAnswers={state.selectionState.multiSelectionAnswers}
						multiSelectChoices={state.selectionState.multiSelectChoices}
						selectionFilter={state.selectionState.selectionFilter}
						isFilterMode={state.selectionState.isFilterMode}
						freeTextInput={state.selectionState.freeTextInput}
						isFreeTextMode={state.selectionState.isFreeTextMode}
						selectedCommandIndex={state.selectedCommandIndex}
						askQueueLength={state.selectionState.askQueueLength}
						pendingAttachments={state.pendingAttachments}
						attachmentTokens={state.attachmentTokens}
						showEscHint={state.showEscHint}
						filteredFileInfo={effects.filteredFileInfo}
						filteredCommands={effects.filteredCommands}
						filesLoading={state.filesLoading}
						selectedFileIndex={state.selectedFileIndex}
						currentlyLoading={state.commandState.currentlyLoading}
						loadError={state.commandState.loadError}
						cachedOptions={state.commandState.cachedOptions}
						hintText={state.hintText}
						validTags={state.validTags}
						currentSessionId={state.currentSessionId}
						setInput={state.inputState.setInput}
						setCursor={state.inputState.setCursor}
						setSelectionFilter={state.selectionState.setSelectionFilter}
						setSelectedCommandIndex={state.setSelectedCommandIndex}
						onSubmit={effects.handleSubmit}
						onCommandAutocompleteTab={handleCommandAutocompleteTab}
						onCommandAutocompleteEnter={handleCommandAutocompleteEnter}
						onCommandAutocompleteUpArrow={handleCommandAutocompleteUpArrow}
						onCommandAutocompleteDownArrow={handleCommandAutocompleteDownArrow}
						onFileAutocompleteTab={keyboard.fileAutocompleteHandlers.handleTab}
						onFileAutocompleteEnter={keyboard.fileAutocompleteHandlers.handleEnter}
						onFileAutocompleteUpArrow={keyboard.fileAutocompleteHandlers.handleUpArrow}
						onFileAutocompleteDownArrow={keyboard.fileAutocompleteHandlers.handleDownArrow}
						addMessage={effects.sendUserMessageToAI as any}
						createCommandContext={effects.createCommandContextForArgs}
						getAIConfig={state.getAIConfig}
						setPendingCommand={state.commandState.setPendingCommand}
						inputComponent={state.commandState.inputComponent}
						inputComponentTitle={state.commandState.inputComponentTitle}
						isStreaming={state.streamingState.isStreaming}
						abortControllerRef={state.streamingState.abortControllerRef}
						onPasteImage={keyboard.handlePasteImage}
					/>
				</Box>

				{/* Status Bar */}
				<Box flexShrink={0} paddingTop={1} flexDirection="row">
					<StatusBar
						sessionId={state.currentSessionId || null}
						provider={state.currentSession?.provider || state.selectedProvider || null}
						model={state.currentSession?.model || state.selectedModel || null}
						modelStatus={state.currentSession?.modelStatus}
						usedTokens={state.usedTokens}
					/>
				</Box>
			</Box>
		</Box>
	);
}
