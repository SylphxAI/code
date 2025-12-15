/**
 * Chat Header Component
 *
 * Header bar for the chat screen with title and actions.
 */

interface ChatHeaderProps {
	title: string;
}

export function ChatHeader({ title }: ChatHeaderProps) {
	return (
		<header className="h-14 px-4 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
			<h1 className="text-lg font-medium text-[var(--color-text)] truncate">{title}</h1>
			<div className="flex items-center gap-2">
				{/* Future: Add action buttons here (settings, share, etc.) */}
			</div>
		</header>
	);
}
