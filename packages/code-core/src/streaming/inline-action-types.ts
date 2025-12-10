/**
 * Inline Action Types
 *
 * All actions are streaming - emit deltas as they come.
 * No buffering, pure real-time updates.
 */

// =============================================================================
// Tag Configuration
// =============================================================================

export const INLINE_TAGS = ["message", "title", "suggestions", "s"] as const;
export type InlineTagName = (typeof INLINE_TAGS)[number];

// =============================================================================
// Action Events (all streaming)
// =============================================================================

/** Message content delta */
export interface MessageDeltaAction {
	type: "message-delta";
	content: string;
}

/** Message stream started */
export interface MessageStartAction {
	type: "message-start";
}

/** Message stream ended */
export interface MessageEndAction {
	type: "message-end";
}

/** Title delta - UI updates title bar in real-time */
export interface TitleDeltaAction {
	type: "title-delta";
	content: string;
}

/** Title stream started */
export interface TitleStartAction {
	type: "title-start";
}

/** Title stream ended */
export interface TitleEndAction {
	type: "title-end";
}

/** Suggestion delta - each <s> streams independently */
export interface SuggestionDeltaAction {
	type: "suggestion-delta";
	index: number; // Which suggestion (0, 1, 2...)
	content: string;
}

/** Suggestion started */
export interface SuggestionStartAction {
	type: "suggestion-start";
	index: number;
}

/** Suggestion ended */
export interface SuggestionEndAction {
	type: "suggestion-end";
	index: number;
}

/** Suggestions container started */
export interface SuggestionsStartAction {
	type: "suggestions-start";
}

/** Suggestions container ended */
export interface SuggestionsEndAction {
	type: "suggestions-end";
}

/** Plain text outside any tag (fallback) */
export interface TextDeltaAction {
	type: "text-delta";
	content: string;
}

// =============================================================================
// Union Type
// =============================================================================

export type InlineAction =
	| MessageStartAction
	| MessageDeltaAction
	| MessageEndAction
	| TitleStartAction
	| TitleDeltaAction
	| TitleEndAction
	| SuggestionsStartAction
	| SuggestionStartAction
	| SuggestionDeltaAction
	| SuggestionEndAction
	| SuggestionsEndAction
	| TextDeltaAction;

// =============================================================================
// Parser State
// =============================================================================

export type ParserMode =
	| "text" // Outside any tag
	| "tag-open" // Saw '<'
	| "tag-name" // Reading tag name
	| "in-tag" // Inside tag content
	| "tag-close" // Saw '</'
	| "close-name"; // Reading closing tag name

export interface TagStackEntry {
	name: InlineTagName;
	index?: number; // For <s> tags, track which suggestion
}

export interface ParserState {
	mode: ParserMode;
	buffer: string;
	tagStack: TagStackEntry[];
	suggestionIndex: number; // Counter for suggestion indexing
}
