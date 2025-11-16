#!/usr/bin/env node
/**
 * Fix duplicate exports in bunup-generated chunks
 *
 * Issue: bunup creates two export statements in some chunks:
 * 1. First export: All functions in chunk (internal + public)
 * 2. Second export: Re-exports from index.ts (public only)
 *
 * This causes duplicate exports for shared functions which breaks Vite/Rollup when building code-web.
 *
 * Solution: Remove duplicate function names from first export statement.
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const distSharedPath = join(process.cwd(), "dist/shared");
const chunks = readdirSync(distSharedPath).filter((f) => f.startsWith("chunk-") && f.endsWith(".js"));

let totalFixed = 0;

for (const chunkFile of chunks) {
	const chunkPath = join(distSharedPath, chunkFile);

	try {
		const content = readFileSync(chunkPath, "utf-8");
		const lines = content.split("\n");

		// Find the two export statements
		const firstExportStart = lines.findIndex((line) => line.trim().startsWith("export {"));
		const secondExportLine = lines.findIndex(
			(line, idx) => idx > firstExportStart && line.trim().startsWith("export {"),
		);

		// Skip if no duplicate exports in this chunk
		if (firstExportStart === -1 || secondExportLine === -1) {
			continue;
		}

		// Extract function names from second export (public API)
		const secondExportMatch = lines[secondExportLine].match(/export \{ ([^}]+) \}/);
		if (!secondExportMatch) {
			// Can't parse, skip
			continue;
		}

		const publicFunctions = new Set(
			secondExportMatch[1].split(",").map((fn) => fn.trim()),
		);

		// Find end of first export block
		let firstExportEnd = firstExportStart;
		while (firstExportEnd < lines.length && !lines[firstExportEnd].includes("};")) {
			firstExportEnd++;
		}

		// Extract all exports from first block
		const firstExportLines = lines.slice(firstExportStart, firstExportEnd + 1);
		const firstExportText = firstExportLines.join("\n");

		// Parse exports from first block
		const exportMatch = firstExportText.match(/export \{([^}]+)\}/s);
		if (!exportMatch) {
			// Can't parse, skip
			continue;
		}

		const allFunctions = exportMatch[1]
			.split(",")
			.map((fn) => fn.trim())
			.filter(Boolean);

		// Keep only functions that are NOT in the public API
		const internalOnlyFunctions = allFunctions.filter((fn) => !publicFunctions.has(fn));

		// Rebuild first export with only internal functions
		if (internalOnlyFunctions.length === 0) {
			// Remove first export entirely if it only has duplicates
			lines.splice(firstExportStart, firstExportEnd - firstExportStart + 1);
		} else {
			const newFirstExport = `export {\n  ${internalOnlyFunctions.join(",\n  ")}\n};`;
			lines.splice(firstExportStart, firstExportEnd - firstExportStart + 1, newFirstExport);
		}

		// Write back
		writeFileSync(chunkPath, lines.join("\n"), "utf-8");
		totalFixed++;
		console.log(`✓ Fixed duplicate exports in ${chunkFile}`);
		console.log(`  - Removed ${publicFunctions.size} duplicate exports`);
		console.log(`  - Kept ${internalOnlyFunctions.length} internal-only exports`);
	} catch (error) {
		// Skip files that can't be read
		if (error.code === "ENOENT") {
			continue;
		}
		// Log other errors but continue processing
		console.error(`! Error processing ${chunkFile}:`, error.message);
	}
}

if (totalFixed === 0) {
	console.log("✓ No duplicate exports found");
} else {
	console.log(`\n✓ Fixed ${totalFixed} chunk(s) with duplicate exports`);
}
