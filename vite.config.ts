import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { defineConfig, type Plugin } from "vite"
import viteTsConfigPaths from "vite-tsconfig-paths"

// Read package.json lazily to avoid ESM json import assertion complexities in some toolchains
const pkg = JSON.parse(
	fs.readFileSync(new URL("./package.json", import.meta.url), "utf8"),
) as { version: string }

function safeGit(cmd: string, fallback = "") {
	try {
		return execSync(cmd, { stdio: ["ignore", "pipe", "ignore"] })
			.toString()
			.trim()
	} catch {
		return fallback
	}
}

function computeVersionInfo(mode: string) {
	const sha = safeGit("git rev-parse --short HEAD")
	const tag = safeGit("git describe --tags --abbrev=0") || null
	const dirty = !!safeGit('test -n "$(git status --porcelain)" && echo dirty')
	const commitTime = safeGit("git show -s --format=%cI HEAD")
	const buildTime = new Date().toISOString()
	return {
		package: pkg.version as string,
		sha,
		tag,
		dirty,
		commitTime,
		buildTime,
		mode,
	}
}

function versionPlugin(): Plugin {
	let lastWritten: string | null = null
	return {
		name: "app-version",
		apply: () => true,
		config(_, { mode }) {
			const info = computeVersionInfo(mode)
			return {
				define: {
					__APP_VERSION__: JSON.stringify(info.package),
					__APP_GIT_SHA__: JSON.stringify(info.sha),
					__APP_GIT_TAG__: JSON.stringify(info.tag),
					__APP_BUILD_TIME__: JSON.stringify(info.buildTime),
					__APP_COMMIT_TIME__: JSON.stringify(info.commitTime),
					__APP_DIRTY__: JSON.stringify(info.dirty),
					__APP_MODE__: JSON.stringify(info.mode),
				},
			}
		},
		buildStart() {
			this.meta.watchMode && write()
			write()
		},
		configureServer() {
			write()
		},
		closeBundle() {
			write()
		},
	}

	function write() {
		const mode = process.env.NODE_ENV || "development"
		const info = computeVersionInfo(mode)
		const json = JSON.stringify(info, null, 2)
		if (json === lastWritten) return
		const __dirname = path.dirname(fileURLToPath(import.meta.url))
		const outFile = path.resolve(__dirname, "public", "version.json")
		fs.writeFileSync(outFile, `${json}\n`, "utf8")
		lastWritten = json
	}
}

const config = defineConfig({
	plugins: [
		// path aliases
		viteTsConfigPaths({
			projects: ["./tsconfig.json"],
		}),
		tailwindcss(),
		tanstackStart(),
		versionPlugin(),
	],
})

export default config
