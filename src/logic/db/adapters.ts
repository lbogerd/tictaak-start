import { PGlite } from "@electric-sql/pglite"
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres"
import { drizzle as drizzlePGlite } from "drizzle-orm/pglite"
import { migrate } from "drizzle-orm/pglite/migrator"
import { Pool } from "pg"
import * as schema from "./schema"

/**
 * Create a Postgres-backed Drizzle DB instance (production / dev usage).
 */
export function createPgDb(connectionString: string) {
	const pool = new Pool({ connectionString })
	return drizzlePg(pool, { schema })
}

export type PgDb = ReturnType<typeof createPgDb>

/**
 * Create an in-memory PGlite-backed Drizzle DB instance (testing usage).
 */
export function createPgliteDb() {
	const client = new PGlite()
	return drizzlePGlite({ client, schema })
}

/**
 * Run migrations for a PGlite database (used in tests). Uses drizzle-kit generated SQL.
 */
export async function migratePgliteDb(
	db: ReturnType<typeof createPgliteDb>,
	migrationsFolder = "./drizzle",
) {
	await migrate(db, { migrationsFolder })
}

/**
 * Seed a minimal dataset for tests.
 */
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

export type TestDb = ReturnType<typeof createPgliteDb>
