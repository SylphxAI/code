import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [react(), tailwindcss()],
	resolve: {
		alias: {
			"@": "/src",
		},
	},
	// Update build target to support top-level await
	build: {
		target: "esnext",
		outDir: "dist",
		sourcemap: true,
		rollupOptions: {
			// Externalize server-only modules that are pulled in transitively
			external: [
				// AWS SDK (server-only)
				"@aws-sdk/client-s3",
				"@aws-sdk/s3-request-presigner",
				// Database
				"drizzle-orm",
				"better-sqlite3",
				// Terminal UI
				"ink",
				"yoga-layout",
				// Lens server-side
				"@sylphx/lens-core",
				"@sylphx/lens-server",
				// Node.js built-ins
				"node:crypto",
				"node:fs",
				"node:path",
				"node:url",
				"node:os",
			],
		},
	},
	// Optimize deps to exclude server-only packages
	optimizeDeps: {
		exclude: [
			"@aws-sdk/client-s3",
			"@aws-sdk/s3-request-presigner",
			"drizzle-orm",
			"better-sqlite3",
			"ink",
			"yoga-layout",
			"@sylphx/lens-core",
			"@sylphx/lens-server",
		],
		// Enable top-level await for esbuild
		esbuildOptions: {
			target: "esnext",
		},
	},
	server: {
		port: 3000,
		open: true,
	},
});
