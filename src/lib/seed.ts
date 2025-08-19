import { categories, tasks } from "../../test/test-data"
import { db } from "./db"
import { categories as categoriesTable, tasks as tasksTable } from "./schema"

console.log("Seeding database...")

for (const category of categories) {
	await db.insert(categoriesTable).values(category)
	console.log(`Created category: ${category.name}`)
}

for (const task of tasks) {
	await db.insert(tasksTable).values(task)
	console.log(`Created task: ${task.title}`)
}

console.log("Database seeded successfully!")