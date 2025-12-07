/**
 * Input Mode Management Types
 *
 * Centralized type definitions for input mode management system.
 * This enables explicit state machine for keyboard input handling.
 */

import type { Key } from "ink";
import type { WaitForInputOptions } from "../../commands/types.js";

/**
 * Input modes for the application
 * Each mode represents a distinct keyboard input handling context
 */
export enum InputMode {
	/** Default mode: typing in input field */
	NORMAL = "normal",

	/** Question/option selection mode (waitForInput with type: selection) */
	SELECTION = "selection",

	/** Slash command autocomplete dropdown */
	COMMAND_AUTOCOMPLETE = "command_autocomplete",

	/** @-mention file picker navigation */
	FILE_NAVIGATION = "file_navigation",

	/** Command argument option selection */
	PENDING_COMMAND = "pending_command",
}

/**
 * Context passed to all input handlers
 * Contains current mode and relevant state for mode detection
 */
export interface InputModeContext {
	/** Current active input mode */
	mode: InputMode;

	/** Function to manually change mode (for explicit transitions) */
	setMode: (mode: InputMode) => void;

	// State used for mode detection and handling
	pendingInput?: WaitForInputOptions | null;
	input?: string;
	pendingCommand?: any;

	// Additional context can be added here as needed
	[key: string]: any;
}

/**
 * Input handler interface
 * Each mode implements this to handle keyboard input
 */
export interface InputHandler {
	/** The mode this handler is responsible for */
	mode: InputMode;

	/**
	 * Check if this handler should be active given the current context
	 * @param context - Current input mode context
	 * @returns true if this handler should handle input
	 */
	isActive: (context: InputModeContext) => boolean;

	/**
	 * Handle keyboard input
	 * @param char - Character pressed (if any)
	 * @param key - Key object from Ink's useInput
	 * @param context - Current input mode context
	 * @returns true if event was consumed, false to let it propagate
	 */
	handleInput: (char: string, key: Key, context: InputModeContext) => boolean | Promise<boolean>;

	/**
	 * Optional priority for conflict resolution
	 * Higher priority handlers are checked first
	 * Default: 0
	 */
	priority?: number;
}

/**
 * Mode transition event
 * Useful for debugging and logging
 */
export interface ModeTransition {
	from: InputMode;
	to: InputMode;
	timestamp: number;
	reason?: string;
}

/**
 * Input mode manager configuration
 */
export interface InputModeManagerConfig {
	/** Enable debug logging */
	debug?: boolean;

	/** Track mode transition history */
	trackHistory?: boolean;

	/** Custom mode detection logic (overrides default) */
	detectMode?: (context: Omit<InputModeContext, "mode" | "setMode">) => InputMode;
}

/**
 * Filtered file information
 * Used by autocomplete and file navigation
 */
export interface FilteredFile {
	hasAt: boolean;
	files: Array<{ path: string; relativePath: string; size: number }>;
	query: string;
	atIndex: number;
}

/**
 * Filtered command information
 * Used by command autocomplete
 */
export interface FilteredCommand {
	id: string;
	label: string;
	description: string;
}
