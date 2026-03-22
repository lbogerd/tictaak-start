import { env } from "../../env.ts"
import { dbLogger } from "../logger/logger.ts"
import { createPgDb, type PgDb } from "./adapters.ts"

// Select the database provider at runtime so devs can swap between
// a real Postgres instance and the in-memory PGlite adapter.
export const DB_PROVIDER = env.DB_PROVIDER ?? "pg"

// PGlite is a dev-only dependency; use a dynamic import so it is never
// statically referenced in the production server bundle.
export let db: PgDb

if (DB_PROVIDER === "pglite") {
	const { createPgliteDb, migratePgliteDb } = await import(
		/* @vite-ignore */ "./adapters.pglite.ts"
	)
	const pgliteDb = createPgliteDb()
	await migratePgliteDb(pgliteDb)
	dbLogger.info({ provider: "pglite" }, "Using in-memory PGlite database")
	db = pgliteDb as unknown as PgDb
} else {
	db = createPgDb(env.DATABASE_URL)
}

// Test helpers can swap the db implementation without rewriting imports.
export function setDb(newDb: typeof db) {
	db = newDb as typeof db
}
