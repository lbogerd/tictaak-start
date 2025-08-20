import { addDays } from "date-fns"
import { beforeEach, describe, expect, it } from "vitest"
import {
	createPgliteDb,
	migratePgliteDb,
	seedTestData,
	type TestDb,
} from "../db/adapters"
import { setDb } from "../db/db"
import * as schema from "../db/schema"
import {
	create,
	getAll,
	getByCategoryId,
	getById,
	getDue,
	getUpcoming,
} from "./task.service"

describe("taskService", () => {
	let db: TestDb

	beforeEach(async () => {
		db = createPgliteDb()

		await migratePgliteDb(db)
		await seedTestData(db)

		setDb(db as unknown as typeof import("../db/db").db)
	})

	describe("getById", () => {
		it("should get a task by id", async () => {
			const result = await getById("task-1")
			expect(result).toBeDefined()
		})

		it("should return null if task is archived", async () => {
			// First insert an archived task
			await db.insert(schema.tasks).values({
				id: "archived-task",
				title: "Archived Task",
				categoryId: "cat-1",
				archivedAt: new Date(),
			})

			const result = await getById("archived-task")
			expect(result).toBeUndefined()
		})

		it("should return archived task if includeArchived is true", async () => {
			// First insert an archived task
			await db.insert(schema.tasks).values({
				id: "archived-task-2",
				title: "Archived Task 2",
				categoryId: "cat-1",
				archivedAt: new Date(),
			})

			const result = await getById("archived-task-2", true)
			expect(result).toBeDefined()
		})
	})

	describe("getAll", () => {
		it("should get all tasks without archived tasks", async () => {
			const result = await getAll()
			expect(result.length).toBe(1) // Only the seeded task
			expect(result.every((t) => !t.archivedAt)).toBe(true)
		})

		it("should get all tasks with archived tasks", async () => {
			// Add an archived task
			await db.insert(schema.tasks).values({
				id: "archived-task-getall",
				title: "Archived Task",
				categoryId: "cat-1",
				archivedAt: new Date(),
			})

			const result = await getAll(true)
			expect(result.length).toBe(2) // Seeded task + archived task
		})

		it("should skip and take tasks", async () => {
			// Add more tasks for pagination testing
			await db.insert(schema.tasks).values([
				{
					id: "task-2",
					title: "Task 2",
					categoryId: "cat-1",
				},
				{
					id: "task-3",
					title: "Task 3",
					categoryId: "cat-1",
				},
			])

			const result = await getAll(false, 1, 2)
			expect(result.length).toBe(2)
			expect(result.every((t) => !t.archivedAt)).toBe(true)
		})

		it("should return empty array if no tasks exist", async () => {
			const result = await getAll(false, 1000, 10)
			expect(result.length).toBe(0)
		})
	})

	describe("getByCategoryId", () => {
		it("should get tasks by category id without archived tasks", async () => {
			const categoryId = "cat-1"
			const result = await getByCategoryId(categoryId)
			expect(result.length).toBe(1) // Only the seeded task
			expect(result.every((t) => !t.archivedAt)).toBe(true)
		})

		it("should get tasks by category id with archived tasks", async () => {
			// Add an archived task
			await db.insert(schema.tasks).values({
				id: "archived-task-category",
				title: "Archived Task",
				categoryId: "cat-1",
				archivedAt: new Date(),
			})

			const categoryId = "cat-1"
			const result = await getByCategoryId(categoryId, true)
			expect(result.length).toBe(2) // Seeded task + archived task
		})
	})

	describe("getUpcoming", () => {
		it("should get upcoming tasks excluding archived tasks", async () => {
			// Add a task with future date and lastPrintedAt set to null or past
			const futureDate = new Date()
			futureDate.setDate(futureDate.getDate() + 1)
			const pastDate = new Date()
			pastDate.setDate(pastDate.getDate() - 1)

			await db.insert(schema.tasks).values({
				id: "future-task",
				title: "Future Task",
				categoryId: "cat-1",
				nextPrintDate: futureDate,
				lastPrintedAt: pastDate, // Set to past date so it meets the condition
			})

			const result = await getUpcoming()
			expect(result.length).toBe(1) // Only the future task
			expect(result.every((t) => !t.archivedAt)).toBe(true)
		})

		it("should return empty array if no upcoming tasks exist", async () => {
			const pastDate = new Date("2000-01-01")
			const result = await getUpcoming(pastDate)
			expect(result.length).toBe(0)
		})

		it("should show tasks in the past that are yet to be printed", async () => {
			const yesterday = addDays(new Date(), -1)

			const twoDaysAgo = addDays(new Date(), -2)

			// due: nextPrintDate is yesterday and lastPrintedAt is two days ago (< nextPrintDate)
			await db.insert(schema.tasks).values({
				id: "due-task",
				title: "Due Task",
				categoryId: "cat-1",
				nextPrintDate: yesterday,
				lastPrintedAt: twoDaysAgo,
			})

			// not due: it was printed after the nextPrintDate
			await db.insert(schema.tasks).values({
				id: "printed-task",
				title: "Printed Task",
				categoryId: "cat-1",
				nextPrintDate: yesterday,
				lastPrintedAt: new Date(), // today > yesterday
			})

			// not due: task is archived
			await db.insert(schema.tasks).values({
				id: "archived-due",
				title: "Archived Due",
				categoryId: "cat-1",
				nextPrintDate: yesterday,
				lastPrintedAt: twoDaysAgo,
				archivedAt: new Date(),
			})

			const result = await getDue()

			expect(result.some((t) => t.id === "due-task")).toBe(true)
			expect(result.some((t) => t.id === "printed-task")).toBe(false)
			expect(result.some((t) => t.id === "archived-due")).toBe(false)
			expect(result.every((t) => !t.archivedAt)).toBe(true)
		})
	})

	describe("create", () => {
		it("should create a task", async () => {
			const newTask = {
				title: "New Task",
				categoryId: "cat-1",
			}
			const result = await create(newTask)

			expect(result).toBeDefined()
			expect(result[0].title).toBe(newTask.title)
			expect(result[0].categoryId).toBe(newTask.categoryId)
		})
	})
})
