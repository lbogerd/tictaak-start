import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

const config = defineConfig({
	plugins: [
		// this is the plugin that enables path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart(),
	],
	test: {
		// env: {
		// 	DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/testdb",
		// },
		globals: true,
		// run sequentially because local Prisma Postgres is single‑connection
		sequence: { concurrent: false },
	},
})

export default config
