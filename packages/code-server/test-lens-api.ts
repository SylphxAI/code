/**
 * Quick test script for Lens API
 */

import { CodeServer } from "./src/server.js";
import { initializeLensAPI } from "./src/lens/index.js";

async function test() {
	const server = new CodeServer();
	await server.initialize();

	const appContext = server.getAppContext();
	const lensAPI = initializeLensAPI(appContext);

	console.log("\n=== Testing Lens API ===\n");

	// Test 1: getCount (works)
	console.log("1. Testing getCount:");
	const count = await lensAPI.Session.getCount();
	console.log("   Count:", count);

	// Test 2: list.query
	console.log("\n2. Testing list.query:");
	const list = await lensAPI.Session.list.query({ limit: 2 });
	console.log("   Result:", list);
	console.log("   Type:", typeof list);
	console.log("   Is Array:", Array.isArray(list));
	if (Array.isArray(list)) {
		console.log("   Length:", list.length);
		if (list.length > 0) {
			console.log("   First item:", list[0]);
		}
	}

	// Test 3: Check what Session.list actually is
	console.log("\n3. Inspecting lensAPI.Session.list:");
	console.log("   Type:", typeof lensAPI.Session.list);
	console.log("   Keys:", Object.keys(lensAPI.Session.list));
	console.log("   query type:", typeof lensAPI.Session.list.query);

	await server.close();
}

test().catch(console.error);
