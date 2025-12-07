/**
 * Logs Command
 * View debug logs
 */

import type { Command } from "../types.js";

export const logsCommand: Command = {
	id: "logs",
	label: "/logs",
	description: "View debug logs",
	execute: async (_context) => {
		const { setCurrentScreen } = await import("../../ui-state.js");
		setCurrentScreen("logs");
		return "Opening debug logs...";
	},
};

export default logsCommand;
