import preact from "@preact/preset-vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [preact()],
	resolve: {
		alias: {
			"@": "/src",
			// Alias React to Preact for dependencies that use React (like code-client)
			"react": "preact/compat",
			"react-dom": "preact/compat",
			"react/jsx-runtime": "preact/jsx-runtime",
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
