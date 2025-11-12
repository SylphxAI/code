/**
 * Input Mode Hook
 *
 * Manages input mode state and auto-detects mode transitions
 * based on application state.
 */

import { useState, useEffect, useRef } from "react";
import type { WaitForInputOptions } from "../../commands/types.js";
import { InputMode, type InputModeContext, type ModeTransition } from "./types.js";

export interface UseInputModeProps {
	/** Current pending input state (from waitForInput) */
	pendingInput: WaitForInputOptions | null;

	/** Current text input value */
	input: string;

	/** Current pending command state */
	pendingCommand: any;

	/** Enable debug logging */
	debug?: boolean;

	/** Track mode transition history */
	trackHistory?: boolean;

	/** Additional context to pass to handlers */
	additionalContext?: Record<string, any>;
}

export interface UseInputModeReturn extends InputModeContext {
	/** Mode transition history (if trackHistory enabled) */
	history?: ModeTransition[];

	/** Get current mode as string for debugging */
	getModeString: () => string;
}

/**
 * Hook to manage input mode state with automatic mode detection
 *
 * Auto-detects mode transitions based on:
 * - pendingInput state (SELECTION mode)
 * - pendingCommand state (PENDING_COMMAND mode)
 * - input text content (COMMAND_AUTOCOMPLETE, FILE_NAVIGATION)
 *
 * @example
 * ```tsx
 * const inputMode = useInputMode({
 *   pendingInput,
 *   input,
 *   pendingCommand,
 *   debug: true,
 * });
 *
 * console.log('Current mode:', inputMode.mode);
 * ```
 */
export function useInputMode(props: UseInputModeProps): UseInputModeReturn {
	const {
		pendingInput,
		input,
		pendingCommand,
		debug = false,
		trackHistory = false,
		additionalContext = {},
	} = props;

	const [mode, setMode] = useState<InputMode>(InputMode.NORMAL);
	const [history, setHistory] = useState<ModeTransition[]>([]);
	const previousModeRef = useRef<InputMode>(InputMode.NORMAL);

	/**
	 * Auto-detect mode based on current state
	 * Priority order:
	 * 1. SELECTION (highest priority - explicit user interaction)
	 * 2. PENDING_COMMAND
	 * 3. COMMAND_AUTOCOMPLETE (input starts with /)
	 * 4. FILE_NAVIGATION (input contains @)
	 * 5. NORMAL (default)
	 */
	useEffect(() => {
		let detectedMode: InputMode;

		// Priority 1: Selection mode (waitForInput)
		if (pendingInput?.type === "selection") {
			detectedMode = InputMode.SELECTION;
		}
		// Priority 2: Pending command mode
		else if (pendingCommand) {
			detectedMode = InputMode.PENDING_COMMAND;
		}
		// Priority 3: Command autocomplete (slash commands)
		else if (input.startsWith("/")) {
			detectedMode = InputMode.COMMAND_AUTOCOMPLETE;
		}
		// Priority 4: File navigation (@-mentions)
		else if (input.includes("@")) {
			detectedMode = InputMode.FILE_NAVIGATION;
		}
		// Default: Normal input mode
		else {
			detectedMode = InputMode.NORMAL;
		}

		// Only update if mode changed
		if (detectedMode !== mode) {
			const previousMode = previousModeRef.current;
			previousModeRef.current = detectedMode;

			if (debug) {
				console.log(
					`[InputMode] Transition: ${previousMode} → ${detectedMode}`,
					{ pendingInput, input, pendingCommand },
				);
			}

			// Track history if enabled
			if (trackHistory) {
				const transition: ModeTransition = {
					from: previousMode,
					to: detectedMode,
					timestamp: Date.now(),
					reason: getModeTransitionReason(detectedMode, {
						pendingInput,
						input,
						pendingCommand,
					}),
				};
				setHistory((prev) => [...prev, transition]);
			}

			setMode(detectedMode);
		}
	}, [pendingInput, input, pendingCommand, mode, debug, trackHistory]);

	const getModeString = () => mode;

	return {
		mode,
		setMode,
		pendingInput,
		input,
		pendingCommand,
		...additionalContext,
		...(trackHistory && { history }),
		getModeString,
	};
}

/**
 * Get human-readable reason for mode transition
 */
function getModeTransitionReason(
	mode: InputMode,
	state: {
		pendingInput: WaitForInputOptions | null;
		input: string;
		pendingCommand: any;
	},
): string {
	switch (mode) {
		case InputMode.SELECTION:
			return "waitForInput with type: selection";
		case InputMode.PENDING_COMMAND:
			return "pendingCommand active";
		case InputMode.COMMAND_AUTOCOMPLETE:
			return "input starts with /";
		case InputMode.FILE_NAVIGATION:
			return "input contains @";
		case InputMode.NORMAL:
			return "no special state detected";
		default:
			return "unknown";
	}
}
