import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "./schema.ts"

export function createPgliteDb() {
	const client = new PGlite()
	return drizzle({ client, schema })
}

export type TestDb = ReturnType<typeof createPgliteDb>

export async function migratePgliteDb(
	db: TestDb,
	migrationsFolder = "./drizzle",
) {
	await migrate(db, { migrationsFolder })
}

export async function seedTestData(db: TestDb) {
	// Categories
	await db
		.insert(schema.categories)
		.values([{ id: "cat-1", name: "Test Category" }])

	// Tasks
	await db
		.insert(schema.tasks)
		.values([{ id: "task-1", title: "Test Task", categoryId: "cat-1" }])
}
