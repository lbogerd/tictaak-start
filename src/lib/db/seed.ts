import "dotenv/config"
import { addDays, getDay } from "date-fns"
import type {
	NewCategory,
	NewTask,
	NewTaskInstance,
	NewTaskSchedule,
} from "~/lib/db/schema.ts"
import { db } from "./db.ts"
import {
	categories as categoriesTable,
	taskInstances as taskInstancesTable,
	taskSchedules as taskSchedulesTable,
	tasks as tasksTable,
} from "./schema.ts"

export const categories = [
	{
		id: "cat-1",
		name: "Category 1",
	},
] satisfies NewCategory[]

export const tasks = [
	{
		id: "cat-1-task-1",
		title: "Task 1",
		categoryId: "cat-1",
	},
	{
		id: "cat-1-task-2",
		title: "Task 2 (archived)",
		categoryId: "cat-1",
		archivedAt: new Date(),
	},
	{
		id: "cat-1-task-3",
		title: "Task 3 (scheduled for tomorrow)",
		categoryId: "cat-1",
	},
	{
		id: "cat-1-task-4",
		title: "Task 4 (scheduled for yesterday)",
		categoryId: "cat-1",
	},
	{
		id: "cat-1-task-5",
		title: "Task 5 (recurring today)",
		categoryId: "cat-1",
	},
	{
		id: "cat-1-task-6",
		title: "Task 6 (recurring tomorrow)",
		categoryId: "cat-1",
	},
	{
		id: "cat-1-task-7",
		title: "Task 7 (recurring next week)",
		categoryId: "cat-1",
	},
] satisfies NewTask[]

export const taskInstances = [
	{
		taskId: "cat-1-task-3",
		scheduledFor: addDays(new Date(), 1),
	},
	{
		taskId: "cat-1-task-4",
		scheduledFor: addDays(new Date(), -1),
	},
	{
		taskId: "cat-1-task-5",
		scheduledFor: new Date(),
	},
	{
		taskId: "cat-1-task-6",
		scheduledFor: addDays(new Date(), 1),
	},
	{
		taskId: "cat-1-task-7",
		scheduledFor: addDays(new Date(), 7),
	},
] satisfies NewTaskInstance[]

export const taskSchedules = [
	{
		taskId: "cat-1-task-5",
		startsAt: new Date(),
		recursOnDays: [getDay(new Date())],
	},
	{
		taskId: "cat-1-task-6",
		startsAt: addDays(new Date(), 1),
		recursOnDays: [getDay(addDays(new Date(), 1))],
	},
	{
		taskId: "cat-1-task-7",
		startsAt: addDays(new Date(), 7),
		recursOnDays: [getDay(addDays(new Date(), 7))],
	},
] satisfies NewTaskSchedule[]

export async function seedDevData() {
	for (const category of categories) {
		await db.insert(categoriesTable).values(category)
	}

	for (const task of tasks) {
		await db.insert(tasksTable).values(task)
	}

	for (const taskInstance of taskInstances) {
		await db.insert(taskInstancesTable).values(taskInstance)
	}

	for (const taskSchedule of taskSchedules) {
		await db.insert(taskSchedulesTable).values(taskSchedule)
	}
}

await seedDevData()
