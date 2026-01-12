import { env } from "../../env.ts"
import { dbLogger } from "../logger/logger.ts"
import { createPgDb, createPgliteDb, migratePgliteDb } from "./adapters.ts"

// Select the database provider at runtime so devs can swap between
// a real Postgres instance and the in-memory PGlite adapter.
export const DB_PROVIDER = env.DB_PROVIDER ?? "pg"

// Create the initial database instance based on the selected provider.
export let db =
	DB_PROVIDER === "pglite" ? createPgliteDb() : createPgDb(env.DATABASE_URL)

if (DB_PROVIDER === "pglite") {
	// PGlite runs in-memory by default, so we apply migrations on boot.
	await migratePgliteDb(db as ReturnType<typeof createPgliteDb>)
	dbLogger.info({ provider: "pglite" }, "Using in-memory PGlite database")
}

// Test helpers can swap the db implementation without rewriting imports.
export function setDb(newDb: typeof db) {
	db = newDb as typeof db
}
