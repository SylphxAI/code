/**
 * Selection Mode Handler
 *
 * Handles keyboard input when in selection mode (waitForInput with type: selection).
 * This is a SIMPLIFIED version for Phase 1 infrastructure.
 *
 * TODO Phase 2: Migrate full logic from useSelectionMode hook
 */

import type { Key } from "ink";
import type React from "react";
import type { WaitForInputOptions } from "../../../commands/types.js";
import { InputMode, type InputModeContext } from "../types.js";
import { BaseInputHandler } from "./BaseHandler.js";

export interface SelectionModeHandlerDeps {
	// Core state
	inputResolver: React.MutableRefObject<
		((value: string | Record<string, string | string[]>) => void) | null
	>;
	multiSelectionPage: number;
	multiSelectionAnswers: Record<string, string | string[]>;
	multiSelectChoices: Set<string>;
	selectionFilter: string;
	isFilterMode: boolean;
	freeTextInput: string;
	isFreeTextMode: boolean;
	selectedCommandIndex: number;
	commandSessionRef: React.MutableRefObject<string | null>;
	currentSessionId: string | null;

	// Setters
	setSelectedCommandIndex: React.Dispatch<React.SetStateAction<number>>;
	setMultiSelectionPage: React.Dispatch<React.SetStateAction<number>>;
	setMultiSelectionAnswers: React.Dispatch<React.SetStateAction<Record<string, string | string[]>>>;
	setMultiSelectChoices: React.Dispatch<React.SetStateAction<Set<string>>>;
	setSelectionFilter: React.Dispatch<React.SetStateAction<string>>;
	setIsFilterMode: (value: boolean) => void;
	setFreeTextInput: React.Dispatch<React.SetStateAction<string>>;
	setIsFreeTextMode: (value: boolean) => void;
	setPendingInput: (value: WaitForInputOptions | null) => void;

	// Actions
	addLog: (message: string) => void;
	addMessage: (params: any) => Promise<string>;
	getAIConfig: () => { defaultProvider?: string; defaultModel?: string } | null;
}

/**
 * Handler for selection mode input
 *
 * Phase 1: Demonstrates the handler pattern with core arrow key navigation
 * Phase 2: Will include full logic (filter mode, free text, multi-select, etc.)
 *
 * @example
 * ```tsx
 * const handler = new SelectionModeHandler({
 *   setSelectedCommandIndex,
 *   // ... other deps
 * });
 * ```
 */
export class SelectionModeHandler extends BaseInputHandler {
	mode = InputMode.SELECTION;
	priority = 10; // High priority - explicit user interaction mode

	constructor(private deps: SelectionModeHandlerDeps) {
		super();
	}

	handleInput(char: string, key: Key, context: InputModeContext): boolean {
		const { pendingInput } = context;

		// Guard: Only handle when in selection mode with valid pendingInput
		if (!pendingInput || pendingInput.type !== "selection" || !this.deps.inputResolver.current) {
			return false;
		}

		const {
			selectedCommandIndex,
			setSelectedCommandIndex,
			selectionFilter,
			isFilterMode,
			isFreeTextMode,
		} = this.deps;

		const questions = pendingInput.questions;
		const currentQuestion = questions[this.deps.multiSelectionPage];

		// Guard: Ensure current question exists
		if (!currentQuestion) {
			return false;
		}

		// Calculate filtered options for navigation
		const filteredOptions = currentQuestion.options.filter(
			(option) =>
				option.label.toLowerCase().includes(selectionFilter.toLowerCase()) ||
				(option.value && option.value.toLowerCase().includes(selectionFilter.toLowerCase())),
		);
		const maxIndex = filteredOptions.length - 1;

		// Arrow navigation (works in all sub-modes)
		if (key.downArrow) {
			return this.handleArrowDown(() => {
				setSelectedCommandIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
			});
		}

		if (key.upArrow) {
			return this.handleArrowUp(() => {
				setSelectedCommandIndex((prev) => (prev > 0 ? prev - 1 : 0));
			});
		}

		// TODO Phase 2: Add remaining handlers
		// - Escape key handling (exit modes, clear filter, cancel)
		// - Free text mode (character input, backspace, enter)
		// - Filter mode (/, character input, backspace)
		// - Tab navigation (multi-question)
		// - Space (multi-select toggle)
		// - Enter (select option, confirm multi-select, submit)
		// - Ctrl+Enter (submit all answers)

		// For now, let existing useSelectionMode handle other keys
		return false;
	}

	/**
	 * Additional validation beyond base isActive
	 * Ensures we have all required state for selection mode
	 */
	isActive(context: InputModeContext): boolean {
		if (!super.isActive(context)) {
			return false;
		}

		// Additional checks
		const { pendingInput } = context;
		return !!(
			pendingInput &&
			pendingInput.type === "selection" &&
			this.deps.inputResolver.current
		);
	}
}
