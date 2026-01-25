import { eq } from "drizzle-orm"
import { verifyPassword } from "../src/lib/auth/password.ts"
import { db } from "../src/lib/db/db.ts"
import { users } from "../src/lib/db/schema.ts"
import { authLogger } from "../src/lib/logger/logger.ts"

const scriptIndex = process.argv.findIndex((arg) =>
	arg.includes("test-login.ts"),
)
const args = process.argv.slice(scriptIndex + 1)
const [username, password] = args

if (!username || !password) {
	authLogger.error(
		"Usage: pnpm exec tsx scripts/test-login.ts <username> <password>",
	)
	authLogger.error({ args }, "Received args")
	process.exit(1)
}

const user = await db.query.users.findFirst({
	where: eq(users.username, username),
})

if (!user) {
	authLogger.error({ username }, "User not found")
	process.exit(1)
}

authLogger.info(
	{
		username: user.username,
		passwordSaltLength: user.passwordSalt.length,
		passwordHashLength: user.passwordHash.length,
		providedPasswordLength: password.length,
	},
	"User found, testing password",
)

const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash)

if (ok) {
	authLogger.info("✓ Password verification SUCCESSFUL")
} else {
	authLogger.error("✗ Password verification FAILED")
}

process.exit(ok ? 0 : 1)
