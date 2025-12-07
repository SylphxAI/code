/**
 * SelectionFilterInput Component
 * Primitive component for filtering selection options
 */

import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { useThemeColors } from "../../theme.js";

interface SelectionFilterInputProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	onSubmit?: () => void;
	onEscape?: () => void;
}

export function SelectionFilterInput({
	value,
	onChange,
	placeholder = "Type to filter...",
	onSubmit,
	onEscape,
}: SelectionFilterInputProps) {
	const colors = useThemeColors();
	return (
		<Box marginBottom={1}>
			<Text color={colors.textDim}>Filter: </Text>
			<TextInput
				value={value}
				onChange={onChange}
				placeholder={placeholder}
				showCursor
				onSubmit={onSubmit}
			/>
		</Box>
	);
}
