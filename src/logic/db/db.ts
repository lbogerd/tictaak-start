import { env } from "../../env.ts"
import { createPgDb } from "./adapters"

// export mutable db reference so tests can swap to pglite
export let db = createPgDb(env.DATABASE_URL)

export function setDb(newDb: typeof db) {
	db = newDb as typeof db
}
