import { describe, expect, it } from "vitest"
import type { Task } from "~/logic/db/schema"
import { getTaskPrintStatus, todayStart } from "./taskDates"

// Helper to create a task object with only the fields we care about for these tests.
function createTask(overrides: Partial<Task> = {}): Task {
	const base: Record<string, unknown> = {
		id: "task-id",
		title: "Test Task",
		categoryId: "cat-1",
		nextPrintDate: undefined,
		lastPrintedAt: undefined,
		archivedAt: undefined,
		createdAt: undefined,
		recursOnDays: undefined,
	}
	return { ...(base as unknown as Task), ...(overrides as Task) }
}

// Fixed reference date: Jan 15, 2025, 12:00 local time.
const REF_NOON = new Date(2025, 0, 15, 12, 0, 0)
const TODAY = todayStart(REF_NOON) // start of Jan 15, 2025 local

describe("getTaskPrintStatus", () => {
	it("returns all false when nextPrintDate is missing", () => {
		const task = createTask({
			nextPrintDate: undefined,
			lastPrintedAt: undefined,
		})
		const s = getTaskPrintStatus(task, REF_NOON)
		expect(s.isDue).toBe(false)
		expect(s.isUpcoming).toBe(false)
		expect(s.isPrintedForCurrentCycle).toBe(false)
		expect(s.nextPrintDate).toBeUndefined()
	})

	it("is due when nextPrintDate is today and never printed", () => {
		const task = createTask({ nextPrintDate: TODAY, lastPrintedAt: undefined })
		const s = getTaskPrintStatus(task, REF_NOON)
		expect(s.isDue).toBe(true)
		expect(s.isUpcoming).toBe(false)
		expect(s.isPrintedForCurrentCycle).toBe(false)
	})

	it("is due when nextPrintDate is in the past and lastPrintedAt was before nextPrintDate", () => {
		const pastDay = new Date(2025, 0, 10)
		const lastPrinted = new Date(2025, 0, 9, 10)
		const task = createTask({
			nextPrintDate: pastDay,
			lastPrintedAt: lastPrinted,
		})
		const s = getTaskPrintStatus(task, REF_NOON)
		expect(s.isDue).toBe(true)
		expect(s.isUpcoming).toBe(false)
		expect(s.isPrintedForCurrentCycle).toBe(false)
	})

	it("is upcoming when nextPrintDate is after today", () => {
		const tomorrow = new Date(2025, 0, 16)
		const task = createTask({
			nextPrintDate: tomorrow,
			lastPrintedAt: undefined,
		})
		const s = getTaskPrintStatus(task, REF_NOON)
		expect(s.isUpcoming).toBe(true)
		expect(s.isDue).toBe(false)
		expect(s.isPrintedForCurrentCycle).toBe(false)
	})

	it("is printed for current cycle when lastPrintedAt is same as nextPrintDate (midnight)", () => {
		const next = new Date(2025, 0, 15)
		const lastPrinted = new Date(2025, 0, 15)
		const task = createTask({
			nextPrintDate: next,
			lastPrintedAt: lastPrinted,
		})
		const s = getTaskPrintStatus(task, REF_NOON)
		expect(s.isPrintedForCurrentCycle).toBe(true)
		expect(s.isDue).toBe(false)
		expect(s.isUpcoming).toBe(false)
	})

	it("is printed for current cycle when lastPrintedAt is after nextPrintDate (same day later)", () => {
		const next = new Date(2025, 0, 15)
		const lastPrinted = new Date(2025, 0, 15, 8, 0, 0)
		const task = createTask({
			nextPrintDate: next,
			lastPrintedAt: lastPrinted,
		})
		const s = getTaskPrintStatus(task, REF_NOON)
		expect(s.isPrintedForCurrentCycle).toBe(true)
		expect(s.isDue).toBe(false)
		expect(s.isUpcoming).toBe(false)
	})

	it("normalizes returned nextPrintDate to start of day", () => {
		const next = new Date(2025, 0, 15, 17, 30)
		const task = createTask({ nextPrintDate: next, lastPrintedAt: undefined })
		const s = getTaskPrintStatus(task, REF_NOON)
		expect(s.nextPrintDate).toBeDefined()
		if (!s.nextPrintDate)
			throw new Error("Expected nextPrintDate to be defined")
		expect(s.nextPrintDate.getHours()).toBe(0)
		expect(s.nextPrintDate.getMinutes()).toBe(0)
	})
})
