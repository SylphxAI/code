/**
 * Sidebar Component
 *
 * Navigation sidebar with session list.
 */

import { Link, useParams } from "react-router-dom";
import { useLensClient } from "../lib/lens-client";
import { clsx } from "clsx";

interface Session {
	id: string;
	title?: string;
}

export function Sidebar() {
	const client = useLensClient();
	const { sessionId } = useParams();

	// Fetch recent sessions (Live Query)
	const { data: sessions, loading } = client.listSessions.useQuery({
		input: { limit: 20 },
	});

	// Type the sessions data
	const typedSessions = (sessions as Session[] | undefined) || [];

	return (
		<aside className="w-64 bg-[var(--color-bg-secondary)] border-r border-[var(--color-border)] flex flex-col">
			{/* Header */}
			<div className="p-4 border-b border-[var(--color-border)]">
				<h1 className="text-lg font-semibold text-[var(--color-text)]">Sylphx Code</h1>
				<p className="text-xs text-[var(--color-text-dim)]">AI Development Assistant</p>
			</div>

			{/* New Chat Button */}
			<div className="p-3">
				<Link
					to="/chat"
					className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] transition-colors"
				>
					<span>+ New Chat</span>
				</Link>
			</div>

			{/* Session List */}
			<div className="flex-1 overflow-y-auto">
				<div className="px-3 py-2">
					<h2 className="text-xs font-medium text-[var(--color-text-dim)] uppercase tracking-wider mb-2">
						Recent Sessions
					</h2>
				</div>

				{loading ? (
					<div className="px-4 py-2 text-sm text-[var(--color-text-dim)]">Loading...</div>
				) : typedSessions.length === 0 ? (
					<div className="px-4 py-2 text-sm text-[var(--color-text-dim)]">No sessions yet</div>
				) : (
					<nav className="space-y-1 px-2">
						{typedSessions.map((session) => (
							<Link
								key={session.id}
								to={`/chat/${session.id}`}
								className={clsx(
									"block px-3 py-2 rounded-md text-sm transition-colors truncate",
									sessionId === session.id
										? "bg-[var(--color-bg-tertiary)] text-[var(--color-text)]"
										: "text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text)]"
								)}
								title={session.title || "Untitled"}
							>
								{session.title || "Untitled"}
							</Link>
						))}
					</nav>
				)}
			</div>

			{/* Footer */}
			<div className="p-4 border-t border-[var(--color-border)]">
				<p className="text-xs text-[var(--color-text-dim)]">
					Press <kbd className="px-1 py-0.5 bg-[var(--color-bg-tertiary)] rounded">Ctrl+K</kbd> for
					commands
				</p>
			</div>
		</aside>
	);
}
