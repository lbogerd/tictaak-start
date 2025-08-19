import { relations } from "drizzle-orm"
import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

export const categories = pgTable("Category", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	name: text("name").notNull().unique(),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt").defaultNow().notNull(),
	archivedAt: timestamp("archivedAt"),
})

export const tasks = pgTable("Task", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	title: text("title").notNull(),
	categoryId: text("categoryId").notNull(),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	lastPrintedAt: timestamp("lastPrintedAt"),
	nextPrintDate: timestamp("nextPrintDate"),
	recursOnDays: integer("recursOnDays").array(),
	archivedAt: timestamp("archivedAt"),
})

export const categoriesRelations = relations(categories, ({ many }) => ({
	tasks: many(tasks),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
	category: one(categories, {
		fields: [tasks.categoryId],
		references: [categories.id],
	}),
}))

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
