import preact from "@preact/preset-vite";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	plugins: [preact()],
	resolve: {
		alias: {
			"@": "/src",
			// Alias React to Preact for dependencies that use React (like code-client)
			// Use absolute paths so resolution works from any import location
			"react/jsx-runtime": resolve(__dirname, "node_modules/preact/jsx-runtime"),
			"react/jsx-dev-runtime": resolve(__dirname, "node_modules/preact/jsx-runtime"),
			"react-dom/test-utils": resolve(__dirname, "node_modules/preact/test-utils"),
			"react-dom": resolve(__dirname, "node_modules/preact/compat"),
			"react": resolve(__dirname, "node_modules/preact/compat"),
		},
	},
	server: {
		port: 3000,
		open: true,
	},
	build: {
		outDir: "dist",
		sourcemap: true,
		rollupOptions: {
			// Externalize server-only modules that are pulled in transitively
			// These are dynamically imported on server-side only and won't run in browser
			external: [
				"@aws-sdk/client-s3",
				"@aws-sdk/s3-request-presigner",
				"drizzle-orm",
				"better-sqlite3",
				"ink",
				// lens-core has Node.js-specific code (createRequire) - should be handled by lens-client
				"@sylphx/lens-core",
			],
			// Suppress warnings about imports from workspace dependencies
			onwarn(warning, warn) {
				// Ignore unresolved imports from workspace dependencies (they're transpiled)
				if (warning.code === 'UNRESOLVED_IMPORT') {
					// Ignore preact/jsx-runtime (aliased to preact/jsx-runtime via resolve.alias)
					// Ignore @sylphx/code-api (server-side only)
					if (
						warning.message?.includes('preact/jsx-runtime') ||
						warning.message?.includes('@sylphx/code-api')
					) {
						return;
					}
				}
				warn(warning);
			},
		},
	},
});
