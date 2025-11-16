/**
 * Queue Browsing Mode Handler
 *
 * Handles UP/DOWN arrow navigation through queued messages
 * Similar to message history browsing, but for pending queue
 */

import type { FilteredCommand, FilteredFile } from "@sylphx/code-client";
import type { FileAttachment, QueuedMessage } from "@sylphx/code-core";
import type { Key } from "ink";
import type React from "react";
import { InputMode, type InputModeContext } from "../types.js";
import { BaseInputHandler } from "./BaseHandler.js";

export interface QueueBrowsingModeHandlerDeps {
	queuedMessages: QueuedMessage[];
	queueBrowseIndex: number;
	tempQueueInput: string;
	tempQueueAttachments: FileAttachment[];
	input: string;
	isStreaming: boolean;
	inputComponent: React.ReactNode | null;
	filteredCommands: FilteredCommand[];
	filteredFileInfo: FilteredFile | null;
	pendingAttachments: FileAttachment[];
	currentSessionId: string | null;
	setInput: (value: string) => void;
	setCursor: (value: number) => void;
	setQueueBrowseIndex: React.Dispatch<React.SetStateAction<number>>;
	setTempQueueInput: (value: string) => void;
	setTempQueueAttachments: (attachments: FileAttachment[]) => void;
	setPendingAttachments: (attachments: FileAttachment[]) => void;
	updateQueuedMessage: (messageId: string, content: string, attachments: FileAttachment[]) => Promise<void>;
}

/**
 * Handler for queue browsing mode
 *
 * Active when:
 * - In NORMAL mode (no selection/pending/autocomplete)
 * - Not streaming
 * - No autocomplete showing (no filtered commands or files)
 * - No custom inputComponent active
 * - Has queued messages available
 *
 * Features:
 * - Up arrow: navigate to previous queued message
 * - Down arrow: navigate to next queued message
 * - Submit: update the queued message with edits
 * - Any other key: exit queue browsing mode
 */
export class QueueBrowsingModeHandler extends BaseInputHandler {
	mode = InputMode.NORMAL;
	priority = 6; // Higher than message history (5), lower than autocomplete (10)

	private deps: QueueBrowsingModeHandlerDeps;

	constructor(deps: QueueBrowsingModeHandlerDeps) {
		super();
		this.deps = deps;
	}

	/**
	 * Check if handler should be active
	 * Active only when in normal mode with no autocomplete or other UI, and has queued messages
	 */
	isActive(context: InputModeContext): boolean {
		// Must be in NORMAL mode
		if (context.mode !== this.mode) {
			return false;
		}

		const {
			queuedMessages,
			isStreaming,
			inputComponent,
			filteredCommands,
			filteredFileInfo,
		} = this.deps;

		// No queued messages = not active
		if (queuedMessages.length === 0) {
			return false;
		}

		// Don't handle when streaming
		if (isStreaming) {
			return false;
		}

		// Don't handle when custom inputComponent is active
		if (inputComponent) {
			return false;
		}

		// Don't handle when autocomplete is showing
		const hasAutocomplete =
			filteredCommands.length > 0 || (filteredFileInfo && filteredFileInfo.files.length > 0);

		if (hasAutocomplete) {
			return false;
		}

		return true;
	}

	/**
	 * Handle keyboard input for queue browsing
	 */
	async handleInput(_char: string, key: Key, _context: InputModeContext): Promise<boolean> {
		const {
			queuedMessages,
			queueBrowseIndex,
			tempQueueInput,
			tempQueueAttachments,
			input,
			pendingAttachments,
			setInput,
			setCursor,
			setQueueBrowseIndex,
			setTempQueueInput,
			setTempQueueAttachments,
			setPendingAttachments,
		} = this.deps;

		// Arrow up - navigate to previous queued message
		if (key.upArrow) {
			return this.handleArrowUp(() => {
				if (queuedMessages.length === 0) return;

				if (queueBrowseIndex === -1) {
					// First time going up - save current input and attachments
					console.log("[QueueBrowsing] First up - saving current:", {
						input: input.substring(0, 50),
						attachments: pendingAttachments.length,
					});
					setTempQueueInput(input);
					setTempQueueAttachments(pendingAttachments);
					const newIndex = queuedMessages.length - 1;
					const entry = queuedMessages[newIndex];
					console.log("[QueueBrowsing] Loading queue entry:", {
						index: newIndex,
						messageId: entry.id,
						content: entry.content.substring(0, 50),
						attachments: entry.attachments.length,
					});
					setQueueBrowseIndex(newIndex);
					setInput(entry.content);
					setPendingAttachments(entry.attachments);
					setCursor(0);
				} else if (queueBrowseIndex > 0) {
					// Navigate up in queue
					const newIndex = queueBrowseIndex - 1;
					const entry = queuedMessages[newIndex];
					console.log("[QueueBrowsing] Navigate up:", {
						newIndex,
						messageId: entry.id,
						content: entry.content.substring(0, 50),
						attachments: entry.attachments.length,
					});
					setQueueBrowseIndex(newIndex);
					setInput(entry.content);
					setPendingAttachments(entry.attachments);
					setCursor(0);
				}
			});
		}

		// Arrow down - navigate to next queued message
		if (key.downArrow) {
			return this.handleArrowDown(() => {
				if (queueBrowseIndex === -1) return;

				if (queueBrowseIndex === queuedMessages.length - 1) {
					// Reached end - restore original input and attachments
					console.log("[QueueBrowsing] Reached end - restoring original input");
					setQueueBrowseIndex(-1);
					setInput(tempQueueInput);
					setPendingAttachments(tempQueueAttachments);
					setTempQueueInput("");
					setTempQueueAttachments([]);
					setCursor(0);
				} else {
					// Navigate down in queue
					const newIndex = queueBrowseIndex + 1;
					const entry = queuedMessages[newIndex];
					console.log("[QueueBrowsing] Navigate down:", {
						newIndex,
						messageId: entry.id,
						content: entry.content.substring(0, 50),
						attachments: entry.attachments.length,
					});
					setQueueBrowseIndex(newIndex);
					setInput(entry.content);
					setPendingAttachments(entry.attachments);
					setCursor(0);
				}
			});
		}

		// Exit queue browsing mode on any other key
		// Don't consume the event - let other handlers process it
		if (queueBrowseIndex !== -1) {
			console.log("[QueueBrowsing] Exiting queue browse mode on other key");
			setQueueBrowseIndex(-1);
			setTempQueueInput("");
			setTempQueueAttachments([]);
		}

		return false; // Not consumed - let other handlers process
	}
}
