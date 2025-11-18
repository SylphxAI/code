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
			// Suppress warnings about preact/jsx-runtime imports from dependencies
			onwarn(warning, warn) {
				// Ignore unresolved imports from workspace dependencies (they're transpiled)
				if (warning.code === 'UNRESOLVED_IMPORT' && warning.message.includes('preact/jsx-runtime')) {
					return;
				}
				warn(warning);
			},
		},
	},
});
