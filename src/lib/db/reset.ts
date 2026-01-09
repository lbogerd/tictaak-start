import { dbLogger } from "../logger/logger.ts"
import { db } from "./db.ts"
import { categories, tasks } from "./schema.ts"

export async function resetDatabase() {
	await db.delete(categories)
	await db.delete(tasks)
}

dbLogger.warn("Removing all records from the database...")

await resetDatabase()

dbLogger.info("All records removed from the database.")
