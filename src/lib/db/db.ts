import { env } from "../../env.ts"
import { dbLogger } from "../logger/logger.ts"
import { createPgDb, createPgliteDb, migratePgliteDb } from "./adapters.ts"

export const DB_PROVIDER = env.DB_PROVIDER ?? "pg"

// Create initial instance based on provider
export let db =
	DB_PROVIDER === "pglite" ? createPgliteDb() : createPgDb(env.DATABASE_URL)

if (DB_PROVIDER === "pglite") {
	await migratePgliteDb(db as ReturnType<typeof createPgliteDb>)
	dbLogger.info({ provider: "pglite" }, "Using in-memory PGlite database")
}

export function setDb(newDb: typeof db) {
	db = newDb as typeof db
}
