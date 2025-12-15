/**
 * Layout Component
 *
 * Main app layout with sidebar and content area.
 */

import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export function Layout() {
	return (
		<div className="flex h-screen bg-[var(--color-bg)]">
			{/* Sidebar */}
			<Sidebar />

			{/* Main content */}
			<main className="flex-1 flex flex-col overflow-hidden">
				<Outlet />
			</main>
		</div>
	);
}
