/**
 * InputContentLayout
 * Shared layout component for all input area components
 * Provides consistent spacing, subtitle, and help text formatting
 */

import { Box, Text } from "ink";
import type { ReactNode } from "react";
import { getColors } from "../../../utils/theme/index.js";

interface InputContentLayoutProps {
	// Optional subtitle/description text below the header
	subtitle?: string;
	// Help text shown at the bottom (keyboard shortcuts, etc.)
	helpText: string;
	// Main content (options, form fields, etc.)
	children: ReactNode;
}

/**
 * Shared layout for input area components
 *
 * Structure:
 * - Subtitle (optional, dimColor)
 * - Content (children)
 * - Help text (dimColor)
 *
 * Usage:
 * ```tsx
 * <InputContentLayout
 *   subtitle="Choose an option"
 *   helpText="↑↓: Navigate | Enter: Select | Esc: Cancel"
 * >
 *   {options.map(...)}
 * </InputContentLayout>
 * ```
 */
export function InputContentLayout({ subtitle, helpText, children }: InputContentLayoutProps) {
	const colors = getColors();
	return (
		<Box flexDirection="column" paddingLeft={2}>
			{/* Subtitle */}
			{subtitle && (
				<Box marginBottom={1}>
					<Text color={colors.textDim}>{subtitle}</Text>
				</Box>
			)}

			{/* Content */}
			{children}

			{/* Help */}
			<Box marginTop={1}>
				<Text color={colors.textDim}>{helpText}</Text>
			</Box>
		</Box>
	);
}
