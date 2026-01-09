import { eq } from "drizzle-orm"
import { hashPassword } from "../src/lib/auth/password.ts"
import { db } from "../src/lib/db/db.ts"
import { users } from "../src/lib/db/schema.ts"
import { authLogger } from "../src/lib/logger/logger.ts"

const [username, password] = process.argv.slice(2)

if (!username || !password) {
	authLogger.error("Usage: pnpm auth:create-user <username> <password>")
	process.exit(1)
}

const existing = await db.query.users.findFirst({
	where: eq(users.username, username),
})

if (existing) {
	authLogger.error({ username }, "User already exists")
	process.exit(1)
}

const { hash, salt } = await hashPassword(password)
await db.insert(users).values({
	username,
	passwordHash: hash,
	passwordSalt: salt,
})

authLogger.info({ username }, "Created user")
