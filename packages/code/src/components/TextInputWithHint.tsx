/**
 * Text Input With Hint
 * TextInput with inline ghost text hint and cursor control
 *
 * PERFORMANCE: Memoized to prevent unnecessary re-renders
 */

import { Box, Text } from "ink";
import React, { useCallback, useState } from "react";
import { useThemeColors } from "@sylphx/code-client";
import ControlledTextInput from "./ControlledTextInput.js";

interface TextInputWithHintProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void | Promise<void>;
	placeholder?: string;
	showCursor?: boolean;
	hint?: string; // Ghost text to show after cursor
	cursor?: number; // Optional controlled cursor position
	onCursorChange?: (cursor: number) => void;
	focus?: boolean; // Whether to handle input (for autocomplete)
	validTags?: Set<string>; // Set of valid @file references
	disableUpDownArrows?: boolean; // Disable up/down arrow navigation (for autocomplete)
	onTab?: () => void; // Callback when Tab is pressed (for autocomplete)
	onEnter?: () => void; // Callback when Enter is pressed (for autocomplete)
	onUpArrow?: () => void; // Callback when Up Arrow is pressed (for autocomplete)
	onDownArrow?: () => void; // Callback when Down Arrow is pressed (for autocomplete)
	onEscape?: () => void; // Callback when ESC is pressed (for abort/cancel)
	onPasteImage?: () => void | Promise<void>; // Callback when Ctrl+V is pressed (for image paste)
	onCtrlB?: () => void; // Callback when Ctrl+B is pressed (for demote bash)
	onCtrlP?: () => void; // Callback when Ctrl+P is pressed (for bash list)
	maxLines?: number; // Maximum lines to display (default: 10, use 1 for single-line)
}

function TextInputWithHint({
	value,
	onChange,
	onSubmit,
	placeholder,
	showCursor = true,
	hint,
	cursor: controlledCursor,
	onCursorChange: controlledOnCursorChange,
	focus = true,
	validTags,
	disableUpDownArrows = false,
	onTab,
	onEnter,
	onUpArrow,
	onDownArrow,
	onEscape,
	onPasteImage,
	onCtrlB,
	onCtrlP,
	maxLines = 10,
}: TextInputWithHintProps) {
	// Internal cursor state (used when not controlled from parent)
	const [internalCursor, setInternalCursor] = useState(0);

	// Use controlled cursor if provided, otherwise use internal state
	const cursor = controlledCursor !== undefined ? controlledCursor : internalCursor;
	const onCursorChange = controlledOnCursorChange || setInternalCursor;

	// For uncontrolled mode, sync cursor when value changes
	// But preserve cursor position if it's still valid
	React.useEffect(() => {
		if (controlledCursor === undefined) {
			// If cursor is beyond new value length, move it to end
			if (internalCursor > value.length) {
				setInternalCursor(value.length);
			}
		}
	}, [value.length, controlledCursor, internalCursor]);

	// Memoize onChange to prevent creating new function on every render
	const handleChange = useCallback(
		(newValue: string) => {
			onChange(newValue);
		},
		[onChange],
	);

	// Memoize onSubmit to prevent creating new function on every render
	const handleSubmit = useCallback(
		(submittedValue: string) => {
			onSubmit(submittedValue);
		},
		[onSubmit],
	);

	const colors = useThemeColors();

	return (
		<Box>
			<ControlledTextInput
				value={value}
				onChange={handleChange}
				cursor={cursor}
				onCursorChange={onCursorChange}
				onSubmit={handleSubmit}
				placeholder={placeholder}
				showCursor={showCursor}
				focus={focus}
				validTags={validTags}
				disableUpDownArrows={disableUpDownArrows}
				onTab={onTab}
				onEnter={onEnter}
				onUpArrow={onUpArrow}
				onDownArrow={onDownArrow}
				onEscape={onEscape}
				onPasteImage={onPasteImage}
				onCtrlB={onCtrlB}
				onCtrlP={onCtrlP}
				maxLines={maxLines}
			/>
			{hint && value.length > 0 ? <Text color={colors.textDim}>{hint}</Text> : null}
		</Box>
	);
}

// Memoize component to prevent unnecessary re-renders
export default React.memo(TextInputWithHint);
