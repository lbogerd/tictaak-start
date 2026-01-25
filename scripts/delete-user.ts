import { eq } from "drizzle-orm"
import { db } from "../src/lib/db/db.ts"
import { users } from "../src/lib/db/schema.ts"
import { authLogger } from "../src/lib/logger/logger.ts"

const scriptIndex = process.argv.findIndex((arg) =>
	arg.includes("delete-user.ts"),
)
const args = process.argv.slice(scriptIndex + 1)
const [username] = args

if (!username) {
	authLogger.error("Usage: pnpm exec tsx scripts/delete-user.ts <username>")
	process.exit(1)
}

await db.delete(users).where(eq(users.username, username))
authLogger.info({ username }, "Deleted user")
