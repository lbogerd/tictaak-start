import { db } from "./db.ts"
import { categories, tasks } from "./schema.ts"

export async function resetDatabase() {
	await db.delete(categories)
	await db.delete(tasks)
}

console.log("⚠️ Removing all records from the database...")

await resetDatabase()

console.log("✅ All records removed from the database.")
