/**
 * Inline Action Dispatcher
 *
 * Connects InlineActionParser to event emitters and side effects.
 * Routes parsed actions to appropriate handlers.
 *
 * Uses StreamPublisher for streaming events.
 * Uses SessionStore for title persistence (SSOT pattern).
 *
 * @owner of SessionStore.setTitle()
 */

import {
	createInlineActionParser,
	type InlineAction,
	type InlineActionParser,
	type SessionRepository,
} from "@sylphx/code-core";
import type { AppContext } from "../../context.js";
import { getExistingSessionStore } from "../session-store.js";
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
import type { StreamPublisher } from "./types.js";

export interface InlineActionDispatcherOptions {
	publisher: StreamPublisher;
	sessionId: string;
	sessionRepository: SessionRepository;
	appContext: AppContext;
	/** Callback when parsed text content is ready (for persistence) */
	onParsedText?: (text: string) => void;
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
				emitTextDelta(opts.publisher, action.content);
				// Callback for persistence (text without XML tags)
				opts.onParsedText?.(action.content);
				break;
			case "message-end":
				// No-op: text-end already emitted by stream handler
				break;

			// Title streaming - publishes directly to eventStream via publisher
			case "title-start":
				titleStarted = true;
				accumulatedTitle = "";
				emitTitleStart(opts.publisher);
				break;
			case "title-delta":
				accumulatedTitle += action.content;
				emitTitleDelta(opts.publisher, action.content);
				break;
			case "title-end":
				emitTitleEnd(opts.publisher);
				// Persist title to session (fire-and-forget)
				persistTitle(opts, accumulatedTitle);
				break;

			// Suggestions streaming - publishes directly to eventStream via publisher
			case "suggestions-start":
				accumulatedSuggestions.clear();
				emitSuggestionsStart(opts.publisher);
				break;
			case "suggestion-start":
				accumulatedSuggestions.set(action.index, "");
				emitSuggestionStart(opts.publisher, action.index);
				break;
			case "suggestion-delta":
				{
					const current = accumulatedSuggestions.get(action.index) ?? "";
					accumulatedSuggestions.set(action.index, current + action.content);
					emitSuggestionDelta(opts.publisher, action.index, action.content);
				}
				break;
			case "suggestion-end":
				emitSuggestionEnd(opts.publisher, action.index);
				break;
			case "suggestions-end":
				emitSuggestionsEnd(opts.publisher);
				break;

			// Plain text outside tags - treat as message content
			case "text-delta":
				emitTextDelta(opts.publisher, action.content);
				// Callback for persistence (text outside tags)
				opts.onParsedText?.(action.content);
				break;
		}
	};

	const processChunk = (text: string): void => {
		const actions = parser.feed(text);
		// DEBUG: Log raw chunks and parsed actions
		if (process.env.DEBUG_INLINE_ACTIONS) {
			console.log(`[InlineAction] Chunk: ${JSON.stringify(text)} -> Actions: ${JSON.stringify(actions)}`);
		}
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
 * Uses SessionStore for event emission (SSOT pattern)
 */
async function persistTitle(
	opts: InlineActionDispatcherOptions,
	title: string,
): Promise<void> {
	if (!title.trim()) return;

	try {
		// Persist to database
		await opts.sessionRepository.updateSession(opts.sessionId, {
			title: title.trim(),
		});

		// Update SessionStore (SSOT) - store handles event emission
		const store = getExistingSessionStore(opts.sessionId);
		if (store) {
			store.setTitle(title.trim());
		}
	} catch (error) {
		console.error("[InlineActionDispatcher] Failed to persist title:", error);
	}
}

