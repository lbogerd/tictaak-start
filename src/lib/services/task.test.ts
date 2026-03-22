import { addDays, startOfDay } from "date-fns"
import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vitest"
import {
	createPgliteDb,
	migratePgliteDb,
	seedTestData,
	type TestDb,
} from "../db/adapters.pglite"
import { setDb } from "../db/db"
import * as schema from "../db/schema"
import {
	create,
	getAll,
	getByCategoryId,
	getById,
	getDue,
	getPaginated,
	getRecentlyHandled,
	getUpcoming,
	markPrinted,
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

	async function insertScheduledTask({
		id,
		title,
		scheduledFor,
		recursOnDays,
		archivedAt,
		handledAt,
		printedAt,
		skippedAt,
	}: {
		id: string
		title: string
		scheduledFor: Date
		recursOnDays?: number[]
		archivedAt?: Date
		handledAt?: Date
		printedAt?: Date
		skippedAt?: Date
	}) {
		await db.insert(schema.tasks).values({
			id,
			title,
			categoryId: "cat-1",
			archivedAt,
		})

		await db.insert(schema.taskInstances).values({
			taskId: id,
			scheduledFor,
			handledAt,
			printedAt,
			skippedAt,
		})

		if (recursOnDays && recursOnDays.length > 0) {
			await db.insert(schema.taskSchedules).values({
				taskId: id,
				startsAt: scheduledFor,
				recursOnDays,
			})
		}
	}

	describe("getById", () => {
		it("should get a task by id", async () => {
			const result = await getById("task-1")
			expect(result).toBeDefined()
			expect(result?.taskId).toBe("task-1")
		})

		it("should return undefined if task is archived", async () => {
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
			await db.insert(schema.tasks).values({
				id: "archived-task-2",
				title: "Archived Task 2",
				categoryId: "cat-1",
				archivedAt: new Date(),
			})

			const result = await getById("archived-task-2", true)
			expect(result).toBeDefined()
		})

		it("should surface the next open occurrence directly", async () => {
			const tomorrow = addDays(startOfDay(new Date()), 1)

			await insertScheduledTask({
				id: "instance-backed-task",
				title: "Instance Backed Task",
				scheduledFor: tomorrow,
			})

			const result = await getById("instance-backed-task")
			expect(result?.scheduledFor?.getTime()).toBe(tomorrow.getTime())
		})
	})

	describe("getAll", () => {
		it("should get all tasks without archived tasks", async () => {
			const result = await getAll()
			expect(result.length).toBe(1)
			expect(result.every((occurrence) => !occurrence.archivedAt)).toBe(true)
		})

		it("should get all tasks with archived tasks", async () => {
			await db.insert(schema.tasks).values({
				id: "archived-task-getall",
				title: "Archived Task",
				categoryId: "cat-1",
				archivedAt: new Date(),
			})

			const result = await getAll(true)
			expect(result.length).toBe(2)
		})

		it("should skip and take tasks", async () => {
			await db.insert(schema.tasks).values([
				{ id: "task-2", title: "Task 2", categoryId: "cat-1" },
				{ id: "task-3", title: "Task 3", categoryId: "cat-1" },
			])

			const result = await getAll(false, 1, 2)
			expect(result.length).toBe(2)
			expect(result.every((occurrence) => !occurrence.archivedAt)).toBe(true)
		})

		it("should return tasks ordered by newest created first", async () => {
			await db.insert(schema.tasks).values([
				{
					id: "older-task",
					title: "Older Task",
					categoryId: "cat-1",
					createdAt: new Date("2024-01-01T00:00:00.000Z"),
				},
				{
					id: "newer-task",
					title: "Newer Task",
					categoryId: "cat-1",
					createdAt: new Date("2024-01-02T00:00:00.000Z"),
				},
			])

			const result = await getAll()
			const olderIndex = result.findIndex(
				(occurrence) => occurrence.taskId === "older-task",
			)
			const newerIndex = result.findIndex(
				(occurrence) => occurrence.taskId === "newer-task",
			)

			expect(newerIndex).toBeGreaterThanOrEqual(0)
			expect(olderIndex).toBeGreaterThanOrEqual(0)
			expect(newerIndex).toBeLessThan(olderIndex)
		})
	})

	describe("getPaginated", () => {
		it("should return paginated tasks ordered by newest created first", async () => {
			await db.insert(schema.tasks).values([
				{
					id: "page-older-task",
					title: "Page Older Task",
					categoryId: "cat-1",
					createdAt: new Date("2024-01-03T00:00:00.000Z"),
				},
				{
					id: "page-newer-task",
					title: "Page Newer Task",
					categoryId: "cat-1",
					createdAt: new Date("2024-01-04T00:00:00.000Z"),
				},
			])

			const { items } = await getPaginated({
				includeArchived: false,
				skip: 0,
				take: 20,
			})
			const olderIndex = items.findIndex(
				(occurrence) => occurrence.taskId === "page-older-task",
			)
			const newerIndex = items.findIndex(
				(occurrence) => occurrence.taskId === "page-newer-task",
			)

			expect(newerIndex).toBeGreaterThanOrEqual(0)
			expect(olderIndex).toBeGreaterThanOrEqual(0)
			expect(newerIndex).toBeLessThan(olderIndex)
		})
	})

	describe("getByCategoryId", () => {
		it("should get tasks by category id without archived tasks", async () => {
			const result = await getByCategoryId("cat-1")
			expect(result.length).toBe(1)
			expect(result.every((occurrence) => !occurrence.archivedAt)).toBe(true)
		})

		it("should get tasks by category id with archived tasks", async () => {
			await db.insert(schema.tasks).values({
				id: "archived-task-category",
				title: "Archived Task",
				categoryId: "cat-1",
				archivedAt: new Date(),
			})

			const result = await getByCategoryId("cat-1", true)
			expect(result.length).toBe(2)
		})
	})

	describe("getUpcoming", () => {
		it("should get upcoming tasks from open instances", async () => {
			const tomorrow = addDays(startOfDay(new Date()), 1)

			await insertScheduledTask({
				id: "future-task",
				title: "Future Task",
				scheduledFor: tomorrow,
			})

			const result = await getUpcoming()
			expect(
				result.some((occurrence) => occurrence.taskId === "future-task"),
			).toBe(true)
		})

		it("should exclude handled instances from upcoming tasks", async () => {
			const tomorrow = addDays(startOfDay(new Date()), 1)

			await insertScheduledTask({
				id: "handled-upcoming-task",
				title: "Handled Upcoming Task",
				scheduledFor: tomorrow,
				handledAt: new Date(),
				printedAt: new Date(),
			})

			const result = await getUpcoming()
			expect(
				result.some(
					(occurrence) => occurrence.taskId === "handled-upcoming-task",
				),
			).toBe(false)
		})
	})

	describe("getDue", () => {
		it("should show due tasks backed by open instances", async () => {
			const yesterday = addDays(startOfDay(new Date()), -1)
			const now = new Date()

			await insertScheduledTask({
				id: "due-task",
				title: "Due Task",
				scheduledFor: yesterday,
			})

			await insertScheduledTask({
				id: "printed-task",
				title: "Printed Task",
				scheduledFor: yesterday,
				handledAt: now,
				printedAt: now,
			})

			await insertScheduledTask({
				id: "archived-due-task",
				title: "Archived Due Task",
				scheduledFor: yesterday,
				archivedAt: now,
			})

			const result = await getDue()
			expect(
				result.some((occurrence) => occurrence.taskId === "due-task"),
			).toBe(true)
			expect(
				result.some((occurrence) => occurrence.taskId === "printed-task"),
			).toBe(false)
			expect(
				result.some((occurrence) => occurrence.taskId === "archived-due-task"),
			).toBe(false)
		})
	})

	describe("getRecentlyHandled", () => {
		it("should return handled occurrences ordered by most recent first", async () => {
			const yesterday = addDays(startOfDay(new Date()), -1)
			const earlierHandledAt = new Date("2025-01-01T08:00:00.000Z")
			const laterHandledAt = new Date("2025-01-01T10:00:00.000Z")

			await insertScheduledTask({
				id: "handled-earlier",
				title: "Handled Earlier",
				scheduledFor: yesterday,
				handledAt: earlierHandledAt,
				printedAt: earlierHandledAt,
			})

			await insertScheduledTask({
				id: "handled-later",
				title: "Handled Later",
				scheduledFor: yesterday,
				handledAt: laterHandledAt,
				skippedAt: laterHandledAt,
				recursOnDays: [1, 3, 5],
			})

			const result = await getRecentlyHandled({ take: 2 })

			expect(result).toHaveLength(2)
			expect(result[0]?.taskId).toBe("handled-later")
			expect(result[0]?.skippedAt?.getTime()).toBe(laterHandledAt.getTime())
			expect(result[0]?.recurrenceSummary).toBe("Mon, Wed, Fri")
			expect(result[1]?.taskId).toBe("handled-earlier")
		})
	})

	describe("create", () => {
		it("should create a task", async () => {
			const result = await create({
				title: "New Task",
				categoryId: "cat-1",
			})

			expect(result[0]?.title).toBe("New Task")
			expect(result[0]?.categoryId).toBe("cat-1")
		})

		it("should create an open task instance when nextPrintDate is provided", async () => {
			const tomorrow = addDays(startOfDay(new Date()), 1)

			const result = await create({
				title: "Scheduled Task",
				categoryId: "cat-1",
				nextPrintDate: tomorrow,
			})

			const instances = await db.query.taskInstances.findMany({
				where: eq(schema.taskInstances.taskId, result[0].id),
			})

			expect(instances).toHaveLength(1)
			expect(instances[0]?.scheduledFor.getTime()).toBe(tomorrow.getTime())
		})
	})

	describe("markPrinted", () => {
		it("should mark the current instance as printed and schedule the next recurring instance", async () => {
			const yesterday = addDays(startOfDay(new Date()), -1)
			const printedAt = new Date()

			await insertScheduledTask({
				id: "recurring-print-task",
				title: "Recurring Print Task",
				scheduledFor: yesterday,
				recursOnDays: [0, 1, 2, 3, 4, 5, 6],
			})

			await markPrinted("recurring-print-task", printedAt)

			const instances = await db.query.taskInstances.findMany({
				where: eq(schema.taskInstances.taskId, "recurring-print-task"),
				orderBy: [schema.taskInstances.scheduledFor],
			})

			expect(instances).toHaveLength(2)
			expect(instances[0]?.printedAt?.getTime()).toBe(printedAt.getTime())
			expect(instances[0]?.handledAt?.getTime()).toBe(printedAt.getTime())
			expect(instances[1]?.handledAt).toBeNull()
			expect(instances[1]?.scheduledFor.getTime()).toBe(
				addDays(startOfDay(printedAt), 1).getTime(),
			)
		})
	})

	describe("skipDue", () => {
		it("should skip a one-off due task by handling its instance", async () => {
			const yesterday = addDays(startOfDay(new Date()), -1)

			await insertScheduledTask({
				id: "skip-due-task",
				title: "Skip Due Task",
				scheduledFor: yesterday,
			})

			const dueBefore = await getDue()
			expect(
				dueBefore.some((occurrence) => occurrence.taskId === "skip-due-task"),
			).toBe(true)

			await skipDue("skip-due-task")

			const dueAfter = await getDue()
			expect(
				dueAfter.some((occurrence) => occurrence.taskId === "skip-due-task"),
			).toBe(false)

			const instances = await db.query.taskInstances.findMany({
				where: eq(schema.taskInstances.taskId, "skip-due-task"),
			})

			expect(instances).toHaveLength(1)
			expect(instances[0]?.handledAt).toBeDefined()
			expect(instances[0]?.skippedAt).toBeDefined()
			expect(instances[0]?.printedAt).toBeNull()
		})

		it("should preserve recurring configuration and create the next open instance", async () => {
			const yesterday = addDays(startOfDay(new Date()), -1)
			const recurringDays = [0, 1, 2, 3, 4, 5, 6]

			await insertScheduledTask({
				id: "recurring-skip-task",
				title: "Recurring Skip Task",
				scheduledFor: yesterday,
				recursOnDays: recurringDays,
			})

			await skipDue("recurring-skip-task")

			const task = await getById("recurring-skip-task")
			expect(task?.schedule?.recursOnDays).toEqual(recurringDays)
			expect(task?.scheduledFor?.getTime()).toBe(
				addDays(startOfDay(new Date()), 1).getTime(),
			)

			const instances = await db.query.taskInstances.findMany({
				where: eq(schema.taskInstances.taskId, "recurring-skip-task"),
				orderBy: [schema.taskInstances.scheduledFor],
			})

			expect(instances).toHaveLength(2)
			expect(instances[0]?.skippedAt).toBeDefined()
			expect(instances[1]?.handledAt).toBeNull()
		})
	})
})
