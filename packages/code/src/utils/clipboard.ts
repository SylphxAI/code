/**
 * Clipboard utilities for reading images from system clipboard
 * Currently supports macOS only
 */

import { exec } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Check if clipboard contains an image (macOS only)
 */
export async function hasClipboardImage(): Promise<boolean> {
	if (process.platform !== "darwin") {
		return false;
	}

	try {
		// Check clipboard types
		const { stdout } = await execAsync(
			`osascript -e 'clipboard info' 2>/dev/null || echo "no clipboard"`,
		);

		// Check if clipboard contains image data
		return stdout.includes("picture") || stdout.includes("«class PNGf»");
	} catch {
		return false;
	}
}

/**
 * Read image from clipboard and save to temporary file (macOS only)
 * Returns path to saved image file
 */
export async function readClipboardImage(): Promise<string | null> {
	if (process.platform !== "darwin") {
		throw new Error("Clipboard image reading is only supported on macOS");
	}

	try {
		// Create temp directory
		const tempDir = await mkdtemp(join(tmpdir(), "sylphx-clipboard-"));
		const tempFile = join(tempDir, "image.png");

		// Use osascript to read clipboard image and save as PNG
		const script = `
			set theImage to the clipboard as «class PNGf»
			set theFile to POSIX file "${tempFile}"
			set fileRef to open for access theFile with write permission
			write theImage to fileRef
			close access fileRef
		`;

		await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'")}'`);

		return tempFile;
	} catch (error) {
		console.error("[clipboard] Failed to read image:", error);
		return null;
	}
}

/**
 * Read image from file and convert to base64
 */
export async function imageToBase64(filePath: string): Promise<string> {
	const fs = await import("node:fs/promises");
	const buffer = await fs.readFile(filePath);
	return buffer.toString("base64");
}
