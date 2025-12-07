#!/usr/bin/env bun

/**
 * Test Harness for Non-Interactive Testing
 *
 * ARCHITECTURE: React Ink component using LensProvider
 * Uses useLensClient() hook (NOT getLensClient())
 *
 * Usage:
 *   bun ./packages/code/src/test-harness.ts "test message"
 *   bun ./packages/code/src/test-harness.ts --input test-input.txt
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createCodeClient, direct, initClient, useLensClient } from "@sylphx/code-client";
import { CodeServer } from "@sylphx/code-server";
import { createLogger } from "@sylphx/code-core";
import { render } from "ink";
import React, { useEffect, useState } from "react";

const log = createLogger("test-harness");

interface TestResult {
	success: boolean;
	sessionId: string | null;
	events: string[];
	errors: string[];
	duration: number;
	output: string;
}

interface TestHarnessProps {
	message: string;
	timeout: number;
	outputFile: string;
}

/**
 * TestHarnessApp - React component for test harness
 */
function TestHarnessApp({ message, timeout, outputFile }: TestHarnessProps) {
	const client = useLensClient();
	const [result, setResult] = useState<TestResult | null>(null);

	useEffect(() => {
		let mounted = true;
		const startTime = Date.now();
		const events: string[] = [];
		const errors: string[] = [];
		let sessionId: string | null = null;
		let output = "";

		const timeoutId = setTimeout(() => {
			if (mounted) {
				const result: TestResult = {
					success: false,
					sessionId,
					events,
					errors: [...errors, `Test timed out after ${timeout}ms`],
					duration: Date.now() - startTime,
					output,
				};
				setResult(result);
				writeTestResult(result, outputFile);
				process.exit(1);
			}
		}, timeout);

		async function runTest() {
			try {
				log("Starting test with message:", message);

				// Subscribe to streaming response (legacy subscription pattern)
				// NOTE: sendMessage may need to be updated when lens API changes
				const subscription = (client.sendMessage as any)({
					sessionId: null,
					provider: "openrouter",
					model: "x-ai/grok-code-fast-1",
					content: [{ type: "text", content: message }],
				}).subscribe({
					next: (event: any) => {
						if (!mounted) return;

						events.push(event.type);
						log("Event:", event.type);

						switch (event.type) {
							case "session-created":
								sessionId = event.sessionId;
								log("Session created:", sessionId);
								break;

							case "text-delta":
								output += event.text;
								break;

							case "error":
								errors.push(event.error);
								log("Error:", event.error);
								break;

							case "complete": {
								clearTimeout(timeoutId);
								const duration = Date.now() - startTime;
								log("Test completed in", duration, "ms");

								const testResult: TestResult = {
									success: errors.length === 0,
									sessionId,
									events,
									errors,
									duration,
									output,
								};
								setResult(testResult);
								writeTestResult(testResult, outputFile);

								// Print summary
								console.log("");
								console.log("========== TEST RESULT ==========");
								console.log("Success:", testResult.success);
								console.log("Session ID:", testResult.sessionId);
								console.log("Duration:", testResult.duration, "ms");
								console.log("Events:", testResult.events.length);
								console.log("Errors:", testResult.errors.length);
								console.log("Output length:", testResult.output.length, "chars");
								console.log("=================================");

								if (testResult.errors.length > 0) {
									console.log("\nErrors:");
									testResult.errors.forEach((err, i) => {
										console.log(`  ${i + 1}. ${err}`);
									});
								}

								process.exit(testResult.success ? 0 : 1);
								break;
							}
						}
					},
					error: (error: any) => {
						if (!mounted) return;

						clearTimeout(timeoutId);
						errors.push(error.message || String(error));
						log("Subscription error:", error);

						const testResult: TestResult = {
							success: false,
							sessionId,
							events,
							errors,
							duration: Date.now() - startTime,
							output,
						};
						setResult(testResult);
						writeTestResult(testResult, outputFile);
						process.exit(1);
					},
				});
			} catch (error: any) {
				clearTimeout(timeoutId);
				console.error("Test failed:", error.message);
				process.exit(1);
			}
		}

		runTest();

		return () => {
			mounted = false;
			clearTimeout(timeoutId);
		};
	}, [client, message, timeout, outputFile]);

	// Invisible component - output goes to console
	return null;
}

/**
 * Write test result to file
 */
function writeTestResult(result: TestResult, outputFile: string) {
	const report = {
		timestamp: new Date().toISOString(),
		...result,
	};

	fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
	console.log(`✓ Test result written to: ${outputFile}`);
}

/**
 * Main
 */
async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error('Usage: bun test-harness.ts "message" [--output result.json]');
		process.exit(1);
	}

	// Parse arguments
	let message = args[0];
	let outputFile: string | undefined = undefined;

	for (let i = 1; i < args.length; i++) {
		if (args[i] === "--output" && i + 1 < args.length) {
			outputFile = args[i + 1]!;
			i++;
		} else if (args[i] === "--input" && i + 1 < args.length) {
			message = fs.readFileSync(args[i + 1]!, "utf-8").trim();
			i++;
		}
	}

	// Set default output file
	if (!outputFile) {
		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const logsDir = path.join(os.homedir(), ".sylphx-code", "logs");
		if (!fs.existsSync(logsDir)) {
			fs.mkdirSync(logsDir, { recursive: true });
		}
		outputFile = path.join(logsDir, `test-result-${timestamp}.json`);
	}

	const timeout = parseInt(process.env.TEST_TIMEOUT || "30000", 10);

	console.log("Running test...");
	console.log("Message:", message);
	console.log("Timeout:", timeout, "ms");
	console.log("");

	// Initialize embedded server
	const server = new CodeServer();
	await server.initialize();
	const lensServer = server.getLensServer();

	// Create Lens client with direct transport (in-process)
	const lensClient = createCodeClient(direct({ app: lensServer }));
	initClient(lensClient); // Register for global access

	// Render test harness (no LensProvider needed with module singleton)
	// Both message and outputFile are guaranteed to be set by this point
	const finalMessage: string = message!;
	const finalOutputFile: string = outputFile!;
	render(
		React.createElement(TestHarnessApp, { message: finalMessage, timeout, outputFile: finalOutputFile }),
	);
}

// Only run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
