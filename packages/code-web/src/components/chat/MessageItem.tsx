/**
 * Message Item Component
 *
 * Renders a single message with role-specific styling.
 */

import { clsx } from "clsx";

interface Part {
	type: string;
	content?: string;
	name?: string;
	input?: unknown;
	result?: unknown;
	status?: string;
}

interface Step {
	id: string;
	parts?: Part[];
}

interface Message {
	id: string;
	role: string;
	steps?: Step[];
	timestamp?: number;
}

interface MessageItemProps {
	message: Message;
}

export function MessageItem({ message }: MessageItemProps) {
	const isUser = message.role === "user";
	const isAssistant = message.role === "assistant";

	// Extract text content from steps
	const textContent = message.steps
		?.flatMap((step) => step.parts || [])
		.filter((part) => part.type === "text")
		.map((part) => part.content)
		.join("\n");

	// Extract tool calls
	const toolParts = message.steps
		?.flatMap((step) => step.parts || [])
		.filter((part) => part.type === "tool");

	return (
		<div
			className={clsx(
				"flex gap-3",
				isUser && "flex-row-reverse"
			)}
		>
			{/* Avatar */}
			<div
				className={clsx(
					"w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-medium",
					isUser && "bg-[var(--color-primary)] text-white",
					isAssistant && "bg-[var(--color-bg-tertiary)] text-[var(--color-text)]"
				)}
			>
				{isUser ? "U" : "A"}
			</div>

			{/* Content */}
			<div
				className={clsx(
					"flex-1 max-w-[80%]",
					isUser && "flex flex-col items-end"
				)}
			>
				{/* Role label */}
				<div className="text-xs text-[var(--color-text-dim)] mb-1">
					{isUser ? "You" : "Assistant"}
				</div>

				{/* Message bubble */}
				<div
					className={clsx(
						"rounded-lg px-4 py-3",
						isUser && "bg-[var(--color-primary)] text-white",
						isAssistant && "bg-[var(--color-bg-secondary)] text-[var(--color-text)]"
					)}
				>
					{/* Text content */}
					{textContent && (
						<div className="whitespace-pre-wrap break-words">{textContent}</div>
					)}

					{/* Tool calls (simplified display) */}
					{toolParts && toolParts.length > 0 && (
						<div className="mt-2 space-y-2">
							{toolParts.map((tool, i) => (
								<div
									key={i}
									className="text-xs bg-[var(--color-bg)] rounded px-2 py-1"
								>
									<span className="text-[var(--color-text-secondary)]">
										{tool.name || "Tool"}
									</span>
									{tool.status && (
										<span
											className={clsx(
												"ml-2",
												tool.status === "completed" && "text-[var(--color-success)]",
												tool.status === "running" && "text-[var(--color-warning)]",
												tool.status === "failed" && "text-[var(--color-error)]"
											)}
										>
											{tool.status}
										</span>
									)}
								</div>
							))}
						</div>
					)}

					{/* Empty state */}
					{!textContent && (!toolParts || toolParts.length === 0) && (
						<span className="text-[var(--color-text-dim)]">Empty message</span>
					)}
				</div>

				{/* Timestamp */}
				{message.timestamp && (
					<div className="text-xs text-[var(--color-text-dim)] mt-1">
						{new Date(message.timestamp).toLocaleTimeString()}
					</div>
				)}
			</div>
		</div>
	);
}
