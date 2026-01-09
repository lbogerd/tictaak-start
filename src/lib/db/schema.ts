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

export const users = pgTable("User", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	username: text("username").notNull().unique(),
	passwordHash: text("passwordHash").notNull(),
	passwordSalt: text("passwordSalt").notNull(),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	updatedAt: timestamp("updatedAt").defaultNow().notNull(),
	lastLoginAt: timestamp("lastLoginAt"),
})

export const sessions = pgTable("Session", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	tokenHash: text("tokenHash").notNull().unique(),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
	expiresAt: timestamp("expiresAt").notNull(),
	revokedAt: timestamp("revokedAt"),
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

export const usersRelations = relations(users, ({ many }) => ({
	sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}))

export type Category = typeof categories.$inferSelect
export type NewCategory = typeof categories.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
