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

import { useQueuedMessages } from "../hooks/client/useQueuedMessages.js";
import { Box } from "ink";
import StatusBar from "../components/StatusBar.js";
import TodoList from "../components/TodoList.js";
import { ChatHeader } from "./chat/components/ChatHeader.js";
import { ChatMessages } from "./chat/components/ChatMessages.js";
import { InputSection } from "./chat/components/InputSection.js";
import { QueuedMessagesDisplay } from "./chat/components/QueuedMessagesDisplay.js";
import { StatusIndicator } from "./chat/components/StatusIndicator.js";
import { useChatEffects } from "./chat/hooks/useChatEffects.js";
import { useChatKeyboard } from "./chat/hooks/useChatKeyboard.js";
import { useChatState } from "./chat/hooks/useChatState.js";
import type { ChatProps } from "./chat/types.js";
import type { QueuedMessage as LocalQueuedMessage } from "../queue-state.js";
import type { QueuedMessage as CoreQueuedMessage } from "@sylphx/code-core";
import type { Command as LocalCommand } from "../commands/types.js";

export default function Chat(props: ChatProps) {
	// Consolidated state management
	const state = useChatState(props);

	// Consolidated effects and handlers
	const effects = useChatEffects(state);

	// Consolidated keyboard handling
	const keyboard = useChatKeyboard(state, effects);

	// Queued messages for display (convert from local to core type)
	const { queuedMessages: localQueuedMessages } = useQueuedMessages();

	// Convert local QueuedMessage to core QueuedMessage format
	const queuedMessages: CoreQueuedMessage[] = localQueuedMessages.map((msg) => ({
		id: msg.id,
		content: msg.content,
		attachments: [], // Local queue doesn't track attachments yet
		enqueuedAt: msg.timestamp,
	}));

	// LEGACY: attachmentTokens is currently a number in state but MessageList expects Map
	// Creating empty Map to satisfy type - this parameter is unused in MessageList
	const attachmentTokensMap = new Map<string, number>();

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
					messages={state.messages}
					attachmentTokens={attachmentTokensMap}
					hideMessageTitles={state.hideMessageTitles}
					hideMessageUsage={state.hideMessageUsage}
				/>

				{/* Status Indicator */}
				<Box flexShrink={0} marginTop={1}>
					<StatusIndicator />
				</Box>

				{/* Todo List */}
				<Box flexShrink={0}>
					<TodoList />
				</Box>

			{/* Queued Messages */}
			<QueuedMessagesDisplay queuedMessages={queuedMessages} />


				{/* Input Area */}
				<Box flexShrink={0}>
					<InputSection
						input={state.inputState.input}
						cursor={state.inputState.normalizedCursor}
						pendingInput={state.selectionState.pendingInput}
						pendingCommand={state.commandState.pendingCommand as { command: LocalCommand; currentInput: string } | null}
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
						attachmentTokens={attachmentTokensMap}
						showEscHint={state.showEscHint}
						filteredFileInfo={effects.filteredFileInfo}
						filteredCommands={effects.filteredCommands}
						filesLoading={state.filesLoading}
						selectedFileIndex={state.selectedFileIndex}
						currentlyLoading={state.commandState.currentlyLoading}
						loadError={state.commandState.loadError}
						cachedOptions={state.commandState.cachedOptions}
						hintText={state.hintText}
						validTags={new Set(state.validTags)}
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
						getAIConfig={() => null}
						setPendingCommand={state.commandState.setPendingCommand as (cmd: { command: LocalCommand; currentInput: string } | null) => void}
						inputComponent={state.commandState.inputComponent}
						inputComponentTitle={state.commandState.inputComponentTitle}
						isStreaming={state.streamingState.isStreaming}
						abortControllerRef={state.streamingState.abortControllerRef}
						onPasteImage={keyboard.handlePasteImage}
						inputResolver={state.selectionState.inputResolver}
						askToolContextRef={state.selectionState.askToolContextRef}
						setPendingInput={state.selectionState.setPendingInput}
					/>
				</Box>

				{/* Status Bar */}
				<Box flexShrink={0} paddingTop={1} flexDirection="row">
					<StatusBar
						sessionId={state.currentSessionId || null}
						provider={state.currentSession?.provider || state.selectedProvider || null}
						model={state.currentSession?.model || state.selectedModel || null}
						modelStatus={undefined}
						usedTokens={state.usedTokens}
					/>
				</Box>
			</Box>
		</Box>
	);
}
