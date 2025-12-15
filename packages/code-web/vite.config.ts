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
	server: {
		port: 3000,
		open: true,
	},
	build: {
		outDir: "dist",
		sourcemap: true,
		rollupOptions: {
			// Externalize server-only modules that are pulled in transitively
			external: [
				"@aws-sdk/client-s3",
				"@aws-sdk/s3-request-presigner",
				"drizzle-orm",
				"better-sqlite3",
				"ink",
				"@sylphx/lens-core",
			],
		},
	},
});
