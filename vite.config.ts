import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

const config = defineConfig({
	server: {
		port: 3000,
	},
	preview: {
		// Dokku injects PORT for the web process, so preview must not hardcode 3000.
		host: true,
		port: Number(process.env.PORT ?? 3000),
		allowedHosts: "tictaak-start.tainer.run",
	},
	plugins: [
		// path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart({ customViteReactPlugin: true }),
		viteReact(),
	],
})

export default config
