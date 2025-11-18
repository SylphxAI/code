/**
 * ChatInput Component
 * Auto-growing textarea with send functionality
 */

import { useRef, useState } from "preact/hooks";
import styles from "../../styles/components/chat/chatinput.module.css";

interface ChatInputProps {
	onSend: (message: string) => void;
	isStreaming: boolean;
}

export function ChatInput({ onSend, isStreaming }: ChatInputProps) {
	const [value, setValue] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const handleInput = (e: Event) => {
		const target = e.target as HTMLTextAreaElement;
		setValue(target.value);

		// Auto-grow textarea
		target.style.height = "auto";
		const newHeight = Math.min(target.scrollHeight, 200); // Max 10 lines (~20px per line)
		target.style.height = `${newHeight}px`;
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const handleSend = () => {
		const trimmed = value.trim();
		if (trimmed && !isStreaming) {
			onSend(trimmed);
			setValue("");
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
		}
	};

	return (
		<div class={styles.container}>
			<div class={styles.attachmentChips}>
				{/* Placeholder for attachment chips */}
			</div>
			<div class={styles.inputRow}>
				<textarea
					ref={textareaRef}
					class={styles.textarea}
					value={value}
					onInput={handleInput}
					onKeyDown={handleKeyDown}
					placeholder="Type your message, / for commands, @ for files..."
					disabled={isStreaming}
					rows={1}
				/>
				<button
					class={styles.sendButton}
					onClick={handleSend}
					disabled={!value.trim() || isStreaming}
					title="Send message (Enter)"
				>
					<span class={styles.sendIcon}>➤</span>
				</button>
			</div>
		</div>
	);
}
