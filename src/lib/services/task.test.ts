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
	skipDue,
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

	describe("skipDue", () => {
		it("should skip a due task by updating lastPrintedAt without changing nextPrintDate or recursOnDays", async () => {
			const yesterday = addDays(new Date(), -1)
			const twoDaysAgo = addDays(new Date(), -2)

			// Create a due task with recurring days
			await db.insert(schema.tasks).values({
				id: "skip-due-task",
				title: "Skip Due Task",
				categoryId: "cat-1",
				nextPrintDate: yesterday,
				lastPrintedAt: twoDaysAgo,
				recursOnDays: [1, 3, 5], // Mon, Wed, Fri
			})

			const before = await getById("skip-due-task")
			expect(before).toBeDefined()
			if (!before) throw new Error("Task not found")

			const result = await skipDue("skip-due-task")
			expect(result).toBeDefined()
			expect(result[0].id).toBe("skip-due-task")

			const after = await getById("skip-due-task")
			expect(after).toBeDefined()
			if (!after) throw new Error("Task not found after skip")

			// lastPrintedAt should be updated to now (after skipping)
			expect(after.lastPrintedAt).not.toEqual(before.lastPrintedAt)
			expect(after.lastPrintedAt?.getTime()).toBeGreaterThan(
				before.lastPrintedAt?.getTime() ?? 0,
			)
			// nextPrintDate should remain unchanged
			expect(after.nextPrintDate?.getTime()).toEqual(
				before.nextPrintDate?.getTime(),
			)
			// recursOnDays should remain unchanged
			expect(after.recursOnDays).toEqual(before.recursOnDays)
		})

		it("should remove task from due list after skipping", async () => {
			const yesterday = addDays(new Date(), -1)
			const twoDaysAgo = addDays(new Date(), -2)

			// Create a due task
			await db.insert(schema.tasks).values({
				id: "skip-due-check",
				title: "Skip Due Check",
				categoryId: "cat-1",
				nextPrintDate: yesterday,
				lastPrintedAt: twoDaysAgo,
			})

			// Verify it's in the due list
			const dueBefore = await getDue()
			expect(dueBefore.some((t) => t.id === "skip-due-check")).toBe(true)

			// Skip the task
			await skipDue("skip-due-check")

			// Verify it's no longer in the due list
			const dueAfter = await getDue()
			expect(dueAfter.some((t) => t.id === "skip-due-check")).toBe(false)
		})

		it("should preserve recurring configuration for future instances", async () => {
			const yesterday = addDays(new Date(), -1)
			const twoDaysAgo = addDays(new Date(), -2)
			const recurringDays = [0, 2, 4, 6] // Sun, Tue, Thu, Sat

			await db.insert(schema.tasks).values({
				id: "recurring-skip",
				title: "Recurring Skip Task",
				categoryId: "cat-1",
				nextPrintDate: yesterday,
				lastPrintedAt: twoDaysAgo,
				recursOnDays: recurringDays,
			})

			await skipDue("recurring-skip")

			const after = await getById("recurring-skip")
			expect(after).toBeDefined()
			if (!after) throw new Error("Task not found after skip")

			// Recurring days should be untouched
			expect(after.recursOnDays).toEqual(recurringDays)
			// The task should still exist with its recurring configuration
			expect(after.archivedAt).toBeNull()
		})
	})
})
