import { PrismaClient } from "./client/client.ts"

const db = new PrismaClient()

for (const category of ["Category 1", "Category 2", "Category 3"]) {
	await db.category.create({
		data: {
			id: `cat-${category.split(" ")[1].toLowerCase()}`,
			name: category,
		},
	})
}

const categories = await db.category.findMany()

for (const category of categories) {
	await db.task.create({
		data: {
			id: `${category.id}-task-1`,
			title: `Task for ${category.name}`,
			categoryId: category.id,
		},
	})
}
