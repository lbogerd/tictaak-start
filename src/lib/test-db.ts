import { PGlite } from "@electric-sql/pglite"
import { drizzle } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import * as schema from "./schema.ts"

export function createTestDb() {
	const client = new PGlite() // In-memory Postgres
	return drizzle({ client, schema })
}

export async function setupTestDb() {
	const db = createTestDb()

	// Run migrations using drizzle-kit generated migrations
	await migrate(db, { migrationsFolder: "./drizzle" })

	return db
}

export async function seedTestDb(db: ReturnType<typeof createTestDb>) {
	// Insert test categories
	await db.insert(schema.categories).values([
		{
			id: "cat-1",
			name: "Test Category",
		},
	])

	// Insert test tasks
	await db.insert(schema.tasks).values([
		{
			id: "task-1",
			title: "Test Task",
			categoryId: "cat-1",
		},
	])
}
