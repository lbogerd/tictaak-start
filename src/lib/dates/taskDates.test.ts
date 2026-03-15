import { describe, expect, it } from "vitest"
import type { Task } from "~/lib/db/schema"
import { getTaskPrintStatus, todayStart } from "./taskDates"

function createTask(overrides: Partial<Task> = {}): Task {
	const base: Record<string, unknown> = {
		id: "task-id",
		title: "Test Task",
		categoryId: "cat-1",
		startDate: undefined,
		lastHandledAt: undefined,
		createdAt: undefined,
		archivedAt: undefined,
		recurrenceType: "none",
		recurrenceDays: undefined,
	}
	return { ...(base as unknown as Task), ...(overrides as Task) }
}

const REF_NOON = new Date(2025, 0, 15, 12, 0, 0)
const TODAY = todayStart(REF_NOON)

describe("getTaskPrintStatus", () => {
	it("returns all false when startDate is missing", () => {
		const task = createTask({ startDate: undefined })
		const s = getTaskPrintStatus(task, REF_NOON)
		expect(s.isDue).toBe(false)
		expect(s.isUpcoming).toBe(false)
		expect(s.isPrintedForCurrentCycle).toBe(false)
	})

	it("is due for one-off task when never handled", () => {
		const s = getTaskPrintStatus(
			createTask({ startDate: TODAY, recurrenceType: "none", lastHandledAt: undefined }),
			REF_NOON,
		)
		expect(s.isDue).toBe(true)
	})

	it("is due for daily recurrence when not handled today", () => {
		const s = getTaskPrintStatus(
			createTask({
				startDate: new Date(2025, 0, 1),
				recurrenceType: "daily",
				lastHandledAt: new Date(2025, 0, 14, 23, 0, 0),
			}),
			REF_NOON,
		)
		expect(s.isDue).toBe(true)
	})

	it("is due for weekly recurrence on matching day", () => {
		const s = getTaskPrintStatus(
			createTask({
				startDate: new Date(2025, 0, 1),
				recurrenceType: "weekly",
				recurrenceDays: [3],
				lastHandledAt: new Date(2025, 0, 8),
			}),
			REF_NOON,
		)
		expect(s.isDue).toBe(true)
	})

	it("is upcoming when startDate is in the future", () => {
		const s = getTaskPrintStatus(
			createTask({ startDate: new Date(2025, 0, 16) }),
			REF_NOON,
		)
		expect(s.isUpcoming).toBe(true)
	})
})
