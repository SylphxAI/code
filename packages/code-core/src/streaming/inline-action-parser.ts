/**
 * Inline Action Parser
 *
 * Streaming XML-like parser for inline actions.
 * Emits actions as soon as content is available - no buffering.
 *
 * Handles:
 * - <message>content</message> → message-start, message-delta*, message-end
 * - <title>content</title> → title-start, title-delta*, title-end
 * - <suggestions><s>a</s><s>b</s></suggestions> → suggestions-start, suggestion-start/delta/end*, suggestions-end
 * - Plain text outside tags → text-delta
 */

import {
	INLINE_TAGS,
	type InlineAction,
	type InlineTagName,
	type ParserMode,
	type ParserState,
	type TagStackEntry,
} from "./inline-action-types.js";

export class InlineActionParser {
	private state: ParserState = {
		mode: "text",
		buffer: "",
		tagStack: [],
		suggestionIndex: 0,
	};

	/**
	 * Feed a chunk of text and get actions
	 * Call this for each streaming chunk from AI
	 */
	feed(chunk: string): InlineAction[] {
		const actions: InlineAction[] = [];

		for (const char of chunk) {
			const result = this.processChar(char);
			if (result) {
				actions.push(...result);
			}
		}

		return actions;
	}

	/**
	 * Flush any remaining content
	 * Call this when stream ends
	 */
	flush(): InlineAction[] {
		const actions: InlineAction[] = [];

		// Emit any buffered content as text
		if (this.state.buffer) {
			actions.push({ type: "text-delta", content: this.state.buffer });
			this.state.buffer = "";
		}

		// Close any open tags
		while (this.state.tagStack.length > 0) {
			const tag = this.state.tagStack.pop()!;
			actions.push(...this.emitTagEnd(tag));
		}

		return actions;
	}

	/**
	 * Reset parser state
	 */
	reset(): void {
		this.state = {
			mode: "text",
			buffer: "",
			tagStack: [],
			suggestionIndex: 0,
		};
	}

	/**
	 * Process a single character
	 */
	private processChar(char: string): InlineAction[] | null {
		switch (this.state.mode) {
			case "text":
				return this.processText(char);
			case "tag-open":
				return this.processTagOpen(char);
			case "tag-name":
				return this.processTagName(char);
			case "in-tag":
				return this.processInTag(char);
			case "tag-close":
				return this.processTagClose(char);
			case "close-name":
				return this.processCloseName(char);
			default:
				return null;
		}
	}

	/**
	 * TEXT mode: collecting plain text or detecting tag open
	 */
	private processText(char: string): InlineAction[] | null {
		if (char === "<") {
			this.state.mode = "tag-open";
			this.state.buffer = "<";

			// Don't emit buffer here - wait to see if it's a valid tag
			return null;
		}

		// Regular text character
		const currentTag = this.getCurrentTag();

		if (currentTag) {
			// We're inside a tag, emit delta for that tag
			return this.emitDelta(currentTag, char);
		}

		// Outside any tag - emit as text-delta
		return [{ type: "text-delta", content: char }];
	}

	/**
	 * TAG_OPEN mode: saw '<', check if closing tag or opening tag
	 */
	private processTagOpen(char: string): InlineAction[] | null {
		this.state.buffer += char;

		if (char === "/") {
			this.state.mode = "tag-close";
			return null;
		}

		if (char.match(/[a-z]/i)) {
			this.state.mode = "tag-name";
			return null;
		}

		// Not a valid tag start, treat accumulated buffer as content
		return this.flushBufferAsContent();
	}

	/**
	 * TAG_NAME mode: reading opening tag name
	 */
	private processTagName(char: string): InlineAction[] | null {
		this.state.buffer += char;

		if (char === ">") {
			const tagName = this.state.buffer.slice(1, -1).toLowerCase();

			if (this.isKnownTag(tagName)) {
				// Valid tag - push to stack and emit start
				this.state.buffer = "";
				const entry = this.pushTag(tagName);
				this.state.mode = "text"; // Go back to text mode (inside tag)
				return this.emitTagStart(entry);
			}

			// Unknown tag - emit buffer as content (don't clear yet, flushBufferAsContent handles it)
			return this.flushBufferAsContent();
		}

		if (!char.match(/[a-z]/i)) {
			// Invalid tag name character
			return this.flushBufferAsContent();
		}

		return null;
	}

	/**
	 * IN_TAG mode: inside tag content (same as text but with context)
	 */
	private processInTag(char: string): InlineAction[] | null {
		// Delegate to text processing
		return this.processText(char);
	}

	/**
	 * TAG_CLOSE mode: saw '</', reading closing tag name
	 */
	private processTagClose(char: string): InlineAction[] | null {
		this.state.buffer += char;

		if (char.match(/[a-z]/i)) {
			this.state.mode = "close-name";
			return null;
		}

		// Not a valid close tag
		return this.flushBufferAsContent();
	}

	/**
	 * CLOSE_NAME mode: reading closing tag name
	 */
	private processCloseName(char: string): InlineAction[] | null {
		this.state.buffer += char;

		if (char === ">") {
			const tagName = this.state.buffer.slice(2, -1).toLowerCase();
			this.state.buffer = "";

			const currentTag = this.getCurrentTag();

			if (currentTag && currentTag.name === tagName) {
				// Matching close tag - pop and emit end
				this.state.tagStack.pop();
				this.state.mode = "text";
				return this.emitTagEnd(currentTag);
			}

			// Mismatched or no matching tag - treat as content
			// Re-add the closing tag text to be emitted
			const closeText = `</${tagName}>`;
			if (currentTag) {
				return this.emitDelta(currentTag, closeText);
			}
			return [{ type: "text-delta", content: closeText }];
		}

		if (!char.match(/[a-z]/i)) {
			// Invalid close tag name character
			return this.flushBufferAsContent();
		}

		return null;
	}

	// ===========================================================================
	// Helpers
	// ===========================================================================

	private getCurrentTag(): TagStackEntry | null {
		return this.state.tagStack.length > 0
			? this.state.tagStack[this.state.tagStack.length - 1]
			: null;
	}

	private isKnownTag(name: string): name is InlineTagName {
		return INLINE_TAGS.includes(name as InlineTagName);
	}

	private pushTag(name: InlineTagName): TagStackEntry {
		const entry: TagStackEntry = { name };

		if (name === "s") {
			entry.index = this.state.suggestionIndex++;
		}

		this.state.tagStack.push(entry);
		return entry;
	}

	private flushBufferAsContent(): InlineAction[] {
		const content = this.state.buffer;
		this.state.buffer = "";
		this.state.mode = "text";

		if (!content) return [];

		const currentTag = this.getCurrentTag();
		if (currentTag) {
			return this.emitDelta(currentTag, content);
		}

		return [{ type: "text-delta", content }];
	}

	private emitTagStart(tag: TagStackEntry): InlineAction[] {
		switch (tag.name) {
			case "message":
				return [{ type: "message-start" }];
			case "title":
				return [{ type: "title-start" }];
			case "suggestions":
				return [{ type: "suggestions-start" }];
			case "s":
				return [{ type: "suggestion-start", index: tag.index ?? 0 }];
			default:
				return [];
		}
	}

	private emitTagEnd(tag: TagStackEntry): InlineAction[] {
		switch (tag.name) {
			case "message":
				return [{ type: "message-end" }];
			case "title":
				return [{ type: "title-end" }];
			case "suggestions":
				// Reset suggestion index when suggestions block ends
				this.state.suggestionIndex = 0;
				return [{ type: "suggestions-end" }];
			case "s":
				return [{ type: "suggestion-end", index: tag.index ?? 0 }];
			default:
				return [];
		}
	}

	private emitDelta(tag: TagStackEntry, content: string): InlineAction[] {
		switch (tag.name) {
			case "message":
				return [{ type: "message-delta", content }];
			case "title":
				return [{ type: "title-delta", content }];
			case "s":
				return [{ type: "suggestion-delta", index: tag.index ?? 0, content }];
			case "suggestions":
				// Content directly in <suggestions> (not in <s>) - ignore or treat as text
				return [];
			default:
				return [{ type: "text-delta", content }];
		}
	}
}

/**
 * Create a new parser instance
 */
export function createInlineActionParser(): InlineActionParser {
	return new InlineActionParser();
}
