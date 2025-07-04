#!/usr/bin/env node
import chalk from "chalk"
import readline from "node:readline"
/**
 * pre-push hook:
 *   • bumps plain-integer version in package.json
 *   • appends commit messages to CHANGELOG.md
 *   • makes a new release commit
 *   • then hands control back to Git (exit 0)
 *
 * Works with any branch — no Semantic Versioning needed.
 */
import fs from "fs-extra"
import { simpleGit } from "simple-git"

const git = simpleGit({ binary: "git" })

// ────────────────────────────────────────────────────────────────
// 1 · Git passes <remote> <url> as argv; ref list on STDIN
// ────────────────────────────────────────────────────────────────
const [_remote] = process.argv.slice(2)

const refLine = await new Promise((resolve) => {
	const rl = readline.createInterface({ input: process.stdin })
	rl.once("line", (line) => {
		rl.close()
		resolve(line)
	})
})

if (!refLine) process.exit(0) // Nothing to push

const [localRef, localSha, , remoteSha] = refLine.trim().split(/\s+/)
const branch = localRef.replace("refs/heads/", "")
const zeroCommit = /^0+$/.test(remoteSha)
const range = zeroCommit
	? localSha // first push of branch
	: `${remoteSha}..${localSha}`

// ────────────────────────────────────────────────────────────────
// 2 · Collect commit subjects that will go out
// ────────────────────────────────────────────────────────────────
const messages = (
	await git.log({
		from: range.split("..")[0],
		to: range.split("..")[1] || range,
	})
).all.map((c) => c.message)

if (!messages.length) {
	console.log(chalk.yellow("No new commits ⇒ skipping version bump."))
	process.exit(0)
}

// ────────────────────────────────────────────────────────────────
// 3 · Bump package.json (plain integer +1)
// ────────────────────────────────────────────────────────────────
const pkgPath = "package.json"
const pkg = await fs.readJson(pkgPath)
const nextVer = String(Number(pkg.version || 0) + 1)
pkg.version = nextVer
await fs.writeJson(pkgPath, pkg, { spaces: 2 })

// ────────────────────────────────────────────────────────────────
// 4 · Update CHANGELOG.md
// ────────────────────────────────────────────────────────────────
const heading = `\n## ${nextVer} (${new Date().toISOString().split("T")[0]})\n\n`
const bullets = `${messages.map((m) => `- ${m}`).join("\n")}\n`
await fs.appendFile("CHANGELOG.md", heading + bullets)

// ────────────────────────────────────────────────────────────────
// 5 · Commit (HEAD now points to the new release commit)
// ────────────────────────────────────────────────────────────────
await git.add([pkgPath, "CHANGELOG.md"])
await git.commit(`chore: release ${nextVer}`)

console.log(
	chalk.green(`Prepared release ${nextVer}; continuing original push …`),
)
process.exit(0) // ✔ success – let Git push once, with the new commit in HEAD
