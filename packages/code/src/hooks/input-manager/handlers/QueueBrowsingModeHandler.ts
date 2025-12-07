/**
 * Queue Browsing Mode Handler
 *
 * Handles UP arrow to pop and edit queued messages
 * User perspective: Queued messages are "already sent", so UP retrieves them for editing
 */

import type { FileAttachment, QueuedMessage } from "@sylphx/code-core";
import type { Key } from "ink";
import type React from "react";
import { InputMode, type FilteredCommand, type FilteredFile, type InputModeContext } from "../types.js";
import { BaseInputHandler } from "./BaseHandler.js";

export interface QueueBrowsingModeHandlerDeps {
	queuedMessages: QueuedMessage[];
	input: string;
	isStreaming: boolean;
	inputComponent: React.ReactNode | null;
	filteredCommands: FilteredCommand[];
	filteredFileInfo: FilteredFile | null;
	currentSessionId: string | null;
	setInput: (value: string) => void;
	setCursor: (value: number) => void;
	setPendingAttachments: (attachments: FileAttachment[]) => void;
	removeQueuedMessage: (messageId: string) => Promise<void>;
}

/**
 * Handler for queue message retrieval
 *
 * Active when:
 * - In NORMAL mode (no selection/pending/autocomplete)
 * - Not streaming
 * - No autocomplete showing
 * - No custom inputComponent active
 * - Has queued messages available
 * - Input is empty (only pop from queue when not editing)
 *
 * Features:
 * - UP arrow: Pop last queued message into input and remove from queue
 * - This allows user to "retrieve" queued messages for editing before they're sent
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
	 * Active when there are queued messages (even while streaming!)
	 */
	isActive(context: InputModeContext): boolean {
		// Must be in NORMAL mode
		if (context.mode !== this.mode) {
			return false;
		}

		const { queuedMessages, inputComponent, filteredCommands, filteredFileInfo } = this.deps;

		// No queued messages = not active
		if (queuedMessages.length === 0) {
			return false;
		}

		// Don't handle when custom inputComponent is active
		if (inputComponent) {
			return false;
		}

		// Don't handle when autocomplete is showing
		const hasAutocomplete =
			filteredCommands.length > 0 || (filteredFileInfo && filteredFileInfo.files && filteredFileInfo.files.length > 0);

		if (hasAutocomplete) {
			return false;
		}

		return true;
	}

	/**
	 * Handle keyboard input for queue retrieval
	 */
	async handleInput(_char: string, key: Key, _context: InputModeContext): Promise<boolean> {
		const {
			queuedMessages,
			currentSessionId,
			input,
			setInput,
			setCursor,
			setPendingAttachments,
			removeQueuedMessage,
		} = this.deps;

		// Arrow up - pop last queued message into input
		if (key.upArrow) {
			// Only pop from queue when input is empty (don't interfere with editing)
			if (input.trim().length > 0) {
				return false; // Let message history handler take over
			}

			return this.handleArrowUp(async () => {
				if (queuedMessages.length === 0 || !currentSessionId) {
					return;
				}

				// Get the last (most recent) queued message
				const lastMessage = queuedMessages[queuedMessages.length - 1];

				// Load message into input
				setInput(lastMessage.content);
				setPendingAttachments(lastMessage.attachments);
				setCursor(lastMessage.content.length);

				// Remove from queue
				await removeQueuedMessage(lastMessage.id);
			});
		}

		// Don't consume other keys
		return false;
	}
}
