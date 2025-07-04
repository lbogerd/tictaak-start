#!/usr/bin/env node
import chalk from "chalk"
/**
 * Bump numeric version, append commit messages to CHANGELOG,
 * commit the result, push, then abort the original push.
 */
import fs from "fs-extra"
import readline from "readline"
import { simpleGit } from "simple-git"

const git = simpleGit({ binary: "git" })

/* ---------- 1.  Parse args & stdin  ---------- */

const [remoteName /* $1 */, _remoteUrl /* $2 */] = process.argv.slice(2)

// Git streams one line per ref on STDIN: <localRef> <localSha> <remoteRef> <remoteSha>
const rl = readline.createInterface({
	input: process.stdin,
	crlfDelay: Infinity,
})
const refLine = await new Promise((res) => rl.once("line", res))
rl.close()

if (!refLine) process.exit(0) // nothing to push

const [localRef, localSha, , remoteSha] = refLine.trim().split(/\s+/)
const branch = localRef.replace("refs/heads/", "")

/* ---------- 2.  Collect commit messages  ---------- */

const range =
	remoteSha && !/^0+$/.test(remoteSha) ? `${remoteSha}..${localSha}` : localSha

const messages = (
	await git.log({
		from: range.split("..")[0],
		to: range.split("..")[1] || range,
	})
).all.map((c) => c.message)

if (!messages.length) {
	console.log(chalk.yellow("No new commits – skipping bump."))
	process.exit(0)
}

/* ---------- 3.  Bump package.json version (# +1) ---------- */

const pkgPath = "package.json"
const pkg = await fs.readJson(pkgPath)
const next = String(Number(pkg.version || 0) + 1)
pkg.version = next
await fs.writeJson(pkgPath, pkg, { spaces: 2 })

/* ---------- 4.  Update CHANGELOG.md ---------- */

const heading = `\n## ${next} (${new Date().toISOString().split("T")[0]})\n\n`
const bullets = `${messages.map((m) => `- ${m}`).join("\n")}\n`
await fs.appendFile("CHANGELOG.md", heading + bullets)

/* ---------- 5.  Commit & push ---------- */

await git.add([pkgPath, "CHANGELOG.md"])
await git.commit(`chore: release ${next}`)
await git.push(remoteName, `HEAD:${branch}`, { "--no-verify": null })

console.log(chalk.green(`Pushed release ${next} to ${remoteName}/${branch}`))

/* ---------- 6.  Stop the original push ---------- */

process.exit(1) // non-zero → Git aborts the parent push
