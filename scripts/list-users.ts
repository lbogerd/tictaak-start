import { db } from "../src/lib/db/db.ts"
import { users } from "../src/lib/db/schema.ts"
import { authLogger } from "../src/lib/logger/logger.ts"

const allUsers = await db.select().from(users)

authLogger.info({ count: allUsers.length }, "All users in database:")
for (const user of allUsers) {
	authLogger.info(
		{
			id: user.id,
			username: user.username,
			usernameLength: user.username.length,
			usernameBytes: Buffer.from(user.username).toString("hex"),
		},
		"User entry",
	)
}
