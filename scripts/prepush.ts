#!/usr/bin/env node
/**
 * Bump integer version, prepend outgoing commit messages to CHANGELOG.md,
 * commit the result, and (quietly) push it so the original push succeeds.
 *
 * Run by: .husky/pre-push  <remote> <url>
 */
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const run = (cmd: string) =>
	execSync(cmd, { stdio: ["pipe", "pipe", "inherit"] })
		.toString()
		.trim()
const pkgPath = path.join(process.cwd(), "package.json")

// --- 1. bump plain integer version -----------------------------------------
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"))
const nextVersion = (parseInt(pkg.version, 10) || 0) + 1
pkg.version = String(nextVersion)
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

// --- 2. collect “outgoing” commit messages ---------------------------------
let upstream: string
try {
	upstream = run("git rev-parse --abbrev-ref --symbolic-full-name @{u}")
} catch {
	// No upstream yet: treat everything as outgoing
	upstream = ""
}
const commits = upstream
	? run(`git log --format=%s ${upstream}..HEAD`).split("\n").filter(Boolean)
	: run("git log --format=%s").split("\n").filter(Boolean)

// --- 3. prepend to CHANGELOG.md --------------------------------------------
const heading = `## v${nextVersion} – ${new Date().toISOString()}\n`
const body = `${commits.map((m) => `- ${m}`).join("\n")}\n`
const changelogPath = path.join(process.cwd(), "CHANGELOG.md")

const existing = fs.existsSync(changelogPath)
	? fs.readFileSync(changelogPath, "utf8")
	: "# Changelog\n\n"

fs.writeFileSync(changelogPath, `${existing}${heading}${body}`)

// --- 4. commit and push -----------------------------------------------------
run("git add package.json CHANGELOG.md")
run(`git commit -m "chore(release): v${nextVersion}" --no-verify`)
const remote = process.argv[2] || "origin"
const branch = run("git branch --show-current")
run(`git push ${remote} ${branch} --no-verify`)

console.log(`\n✅  Released v${nextVersion}, CHANGELOG updated & pushed.\n`)
