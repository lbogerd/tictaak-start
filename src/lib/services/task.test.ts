import { beforeEach, describe, expect, it, vi } from "vitest"
import * as schema from "../schema"
import { seedTestDb, setupTestDb } from "../test-db"
import {
	create,
	getAll,
	getByCategoryId,
	getById,
	getUpcoming,
} from "./task.service"

// Mock the db module to use our test database
vi.mock("../db", () => ({
	db: null, // Will be replaced in beforeEach
}))

describe("taskService", () => {
	let db: Awaited<ReturnType<typeof setupTestDb>>

	beforeEach(async () => {
		db = await setupTestDb()
		await seedTestDb(db)

		// Replace the mocked db with our test database
		const dbModule = await import("../db")
		vi.mocked(dbModule).db = db as unknown as typeof dbModule.db
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
