/**
 * Spinner Component
 * Animated loading indicator
 */

import { Text } from "ink";
import { useEffect, useState } from "react";
import { useThemeColors } from "../theme.js";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface SpinnerProps {
	label?: string;
	color?: string;
}

export default function Spinner({ label, color }: SpinnerProps) {
	const [frame, setFrame] = useState(0);
	const colors = useThemeColors();
	const spinnerColor = color || colors.success;

	useEffect(() => {
		const timer = setInterval(() => {
			setFrame((prev) => (prev + 1) % frames.length);
		}, 80);

		return () => clearInterval(timer);
	}, []);

	return (
		<>
			<Text color={spinnerColor}>{frames[frame]}</Text>
			{label && <Text color={colors.textDim}> {label}</Text>}
		</>
	);
}
