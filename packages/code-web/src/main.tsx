/**
 * Main entry point for code-web (Preact)
 * Browser-based UI for Sylphx Code
 */

import { render } from "preact";
import { App } from "./App";
import "./styles/global.css";

// Initialize app
const root = document.getElementById("app");
if (root) {
	render(<App />, root);
} else {
	console.error("Root element not found");
}
