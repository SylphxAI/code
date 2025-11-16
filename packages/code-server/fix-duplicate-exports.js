#!/usr/bin/env node
/**
 * Post-build script to fix duplicate exports in bunup-generated chunks
 * ISSUE: bunup creates duplicate export statements when functions are imported across chunks
 * WORKAROUND: Remove redundant export blocks after build
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distDir = "./dist/shared";

try {
	const files = readdirSync(distDir);

	for (const file of files) {
		if (!file.endsWith(".js")) continue;

		const filePath = join(distDir, file);
		let content = readFileSync(filePath, "utf-8");

		// Remove duplicate export block for registerAskObserver and enqueueAsk
		// Pattern: export { ... };\n\nexport { registerAskObserver, enqueueAsk };
		const duplicateExportPattern = /\n\nexport \{ registerAskObserver, enqueueAsk \};/g;

		if (duplicateExportPattern.test(content)) {
			console.log(`Fixing duplicate exports in ${file}`);
			content = content.replace(duplicateExportPattern, "");
			writeFileSync(filePath, content, "utf-8");
		}
	}

	console.log("✓ Duplicate exports fixed");
} catch (error) {
	console.error("Failed to fix duplicate exports:", error);
	process.exit(1);
}
