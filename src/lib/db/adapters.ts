import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"
import * as schema from "./schema.ts"

/**
 * Create a Postgres-backed Drizzle DB instance (production / dev usage).
 */
export function createPgDb(connectionString: string) {
	const pool = new Pool({ connectionString })
	return drizzle(pool, { schema })
}

export type PgDb = ReturnType<typeof createPgDb>
