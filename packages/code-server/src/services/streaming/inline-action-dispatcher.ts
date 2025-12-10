/**
 * Inline Action Dispatcher
 *
 * Connects InlineActionParser to event emitters and side effects.
 * Routes parsed actions to appropriate handlers.
 */

import {
	createInlineActionParser,
	type InlineAction,
	type InlineActionParser,
	type SessionRepository,
} from "@sylphx/code-core";
import type { Observer } from "@trpc/server/observable";
import type { AppContext } from "../../context.js";
import {
	emitSuggestionDelta,
	emitSuggestionEnd,
	emitSuggestionsEnd,
	emitSuggestionsStart,
	emitSuggestionStart,
	emitTextDelta,
	emitTitleDelta,
	emitTitleEnd,
	emitTitleStart,
} from "./event-emitter.js";
import type { StreamEvent } from "./types.js";

export interface InlineActionDispatcherOptions {
	observer: Observer<StreamEvent, unknown>;
	sessionId: string;
	sessionRepository: SessionRepository;
	appContext: AppContext;
}

export interface InlineActionDispatcher {
	/** Process raw text chunk, parse and dispatch actions */
	processChunk(text: string): void;
	/** Flush remaining content and finalize */
	flush(): void;
	/** Get accumulated title (for persistence) */
	getAccumulatedTitle(): string | null;
	/** Get accumulated suggestions (for persistence) */
	getAccumulatedSuggestions(): string[];
}

/**
 * Create an inline action dispatcher
 */
export function createInlineActionDispatcher(
	opts: InlineActionDispatcherOptions,
): InlineActionDispatcher {
	const parser: InlineActionParser = createInlineActionParser();

	// Accumulated state for persistence
	let accumulatedTitle = "";
	let titleStarted = false;
	const accumulatedSuggestions: Map<number, string> = new Map();

	const dispatchAction = (action: InlineAction): void => {
		switch (action.type) {
			// Message content (maps to existing text events)
			case "message-start":
				// No-op: text-start already emitted by stream handler
				break;
			case "message-delta":
				emitTextDelta(opts.observer, action.content);
				break;
			case "message-end":
				// No-op: text-end already emitted by stream handler
				break;

			// Title streaming
			case "title-start":
				titleStarted = true;
				accumulatedTitle = "";
				emitTitleStart(opts.observer);
				break;
			case "title-delta":
				accumulatedTitle += action.content;
				emitTitleDelta(opts.observer, action.content);
				break;
			case "title-end":
				emitTitleEnd(opts.observer);
				// Persist title to session
				persistTitle(opts, accumulatedTitle);
				break;

			// Suggestions streaming
			case "suggestions-start":
				accumulatedSuggestions.clear();
				emitSuggestionsStart(opts.observer);
				break;
			case "suggestion-start":
				accumulatedSuggestions.set(action.index, "");
				emitSuggestionStart(opts.observer, action.index);
				break;
			case "suggestion-delta":
				{
					const current = accumulatedSuggestions.get(action.index) ?? "";
					accumulatedSuggestions.set(action.index, current + action.content);
					emitSuggestionDelta(opts.observer, action.index, action.content);
				}
				break;
			case "suggestion-end":
				emitSuggestionEnd(opts.observer, action.index);
				break;
			case "suggestions-end":
				emitSuggestionsEnd(opts.observer);
				// Could persist suggestions here if needed
				break;

			// Plain text outside tags - treat as message content
			case "text-delta":
				emitTextDelta(opts.observer, action.content);
				break;
		}
	};

	const processChunk = (text: string): void => {
		const actions = parser.feed(text);
		for (const action of actions) {
			dispatchAction(action);
		}
	};

	const flush = (): void => {
		const actions = parser.flush();
		for (const action of actions) {
			dispatchAction(action);
		}
	};

	const getAccumulatedTitle = (): string | null => {
		return titleStarted && accumulatedTitle ? accumulatedTitle : null;
	};

	const getAccumulatedSuggestions = (): string[] => {
		return Array.from(accumulatedSuggestions.entries())
			.sort(([a], [b]) => a - b)
			.map(([_, text]) => text)
			.filter((text) => text.trim().length > 0);
	};

	return {
		processChunk,
		flush,
		getAccumulatedTitle,
		getAccumulatedSuggestions,
	};
}

/**
 * Persist title to session (async, fire-and-forget)
 */
async function persistTitle(
	opts: InlineActionDispatcherOptions,
	title: string,
): Promise<void> {
	if (!title.trim()) return;

	try {
		await opts.sessionRepository.updateSession(opts.sessionId, {
			title: title.trim(),
		});

		// Publish to event stream for live queries
		await opts.appContext.eventStream.publish(`session-stream:${opts.sessionId}`, {
			type: "session-title-updated",
			sessionId: opts.sessionId,
			title: title.trim(),
		});
	} catch (error) {
		console.error("[InlineActionDispatcher] Failed to persist title:", error);
	}
}
