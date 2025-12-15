/**
 * Chat Input Component
 *
 * Text input for sending messages with submit button.
 */

import { useRef, useEffect } from "react";

interface ChatInputProps {
	value: string;
	onChange: (value: string) => void;
	onSend: () => void;
	disabled?: boolean;
	placeholder?: string;
}

export function ChatInput({
	value,
	onChange,
	onSend,
	disabled = false,
	placeholder = "Type a message...",
}: ChatInputProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Auto-resize textarea
	useEffect(() => {
		const textarea = textareaRef.current;
		if (textarea) {
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
		}
	}, [value]);

	// Handle keyboard shortcuts
	const handleKeyDown = (e: React.KeyboardEvent) => {
		// Submit on Enter (without Shift)
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			if (!disabled && value.trim()) {
				onSend();
			}
		}
	};

	return (
		<div className="p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
			<div className="flex items-end gap-3 max-w-4xl mx-auto">
				<div className="flex-1 relative">
					<textarea
						ref={textareaRef}
						value={value}
						onChange={(e) => onChange(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						disabled={disabled}
						rows={1}
						className="w-full px-4 py-3 bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg text-[var(--color-text)] placeholder-[var(--color-text-dim)] resize-none focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
						style={{ minHeight: "48px", maxHeight: "200px" }}
					/>
				</div>
				<button
					onClick={onSend}
					disabled={disabled || !value.trim()}
					className="px-4 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					Send
				</button>
			</div>
			<div className="mt-2 text-xs text-[var(--color-text-dim)] text-center">
				Press <kbd className="px-1 py-0.5 bg-[var(--color-bg)] rounded">Enter</kbd> to send,{" "}
				<kbd className="px-1 py-0.5 bg-[var(--color-bg)] rounded">Shift+Enter</kbd> for new line
			</div>
		</div>
	);
}
