import { relations } from "drizzle-orm"
import { integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core"

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
	archivedAt: timestamp("archivedAt"),
})

export const taskSchedules = pgTable("TaskSchedule", {
	taskId: text("taskId")
		.primaryKey()
		.references(() => tasks.id, { onDelete: "cascade" }),
	startsAt: timestamp("startsAt").notNull(),
	recursOnDays: integer("recursOnDays").array(),
	createdAt: timestamp("createdAt").defaultNow().notNull(),
})

export const taskInstances = pgTable(
	"TaskInstance",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		taskId: text("taskId")
			.notNull()
			.references(() => tasks.id, { onDelete: "cascade" }),
		scheduledFor: timestamp("scheduledFor").notNull(),
		createdAt: timestamp("createdAt").defaultNow().notNull(),
		handledAt: timestamp("handledAt"),
		printedAt: timestamp("printedAt"),
		skippedAt: timestamp("skippedAt"),
	},
	(table) => [
		unique("TaskInstance_taskId_scheduledFor_unique").on(
			table.taskId,
			table.scheduledFor,
		),
	],
)

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

export const tasksRelations = relations(tasks, ({ many, one }) => ({
	category: one(categories, {
		fields: [tasks.categoryId],
		references: [categories.id],
	}),
	instances: many(taskInstances),
	schedule: one(taskSchedules, {
		fields: [tasks.id],
		references: [taskSchedules.taskId],
	}),
}))

export const taskSchedulesRelations = relations(taskSchedules, ({ one }) => ({
	task: one(tasks, {
		fields: [taskSchedules.taskId],
		references: [tasks.id],
	}),
}))

export const taskInstancesRelations = relations(taskInstances, ({ one }) => ({
	task: one(tasks, {
		fields: [taskInstances.taskId],
		references: [tasks.id],
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
export type TaskSchedule = typeof taskSchedules.$inferSelect
export type NewTaskSchedule = typeof taskSchedules.$inferInsert
export type TaskInstance = typeof taskInstances.$inferSelect
export type NewTaskInstance = typeof taskInstances.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
