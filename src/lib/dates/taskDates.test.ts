import { describe, expect, it } from "vitest"
import {
	formatRecurrenceSummary,
	getOccurrenceStatus,
	todayStart,
} from "./taskDates"

const REF_NOON = new Date(2025, 0, 15, 12, 0, 0)
const TODAY = todayStart(REF_NOON)

describe("getOccurrenceStatus", () => {
	it("returns all false when there is no scheduled occurrence", () => {
		const status = getOccurrenceStatus({}, REF_NOON)

		expect(status.isDue).toBe(false)
		expect(status.isPlanned).toBe(false)
		expect(status.isPrinted).toBe(false)
		expect(status.scheduledFor).toBeUndefined()
	})

	it("is due when the occurrence is scheduled for today and not handled", () => {
		const status = getOccurrenceStatus({ scheduledFor: TODAY }, REF_NOON)

		expect(status.isDue).toBe(true)
		expect(status.isPlanned).toBe(false)
		expect(status.isPrinted).toBe(false)
		expect(status.stateLabel).toBe("Due")
	})

	it("is planned when the occurrence is after today", () => {
		const tomorrow = new Date(2025, 0, 16)
		const status = getOccurrenceStatus({ scheduledFor: tomorrow }, REF_NOON)

		expect(status.isPlanned).toBe(true)
		expect(status.isDue).toBe(false)
		expect(status.isPrinted).toBe(false)
		expect(status.stateLabel).toBe("Planned")
	})

	it("is printed when the occurrence has printedAt", () => {
		const printedAt = new Date(2025, 0, 15, 8, 0, 0)
		const status = getOccurrenceStatus(
			{
				scheduledFor: TODAY,
				handledAt: printedAt,
				printedAt,
			},
			REF_NOON,
		)

		expect(status.isPrinted).toBe(true)
		expect(status.isDue).toBe(false)
		expect(status.isPlanned).toBe(false)
		expect(status.stateLabel).toBe("Printed")
	})

	it("is skipped when the occurrence was skipped", () => {
		const skippedAt = new Date(2025, 0, 15, 9, 0, 0)
		const status = getOccurrenceStatus(
			{
				scheduledFor: TODAY,
				handledAt: skippedAt,
				skippedAt,
			},
			REF_NOON,
		)

		expect(status.isDue).toBe(false)
		expect(status.isPrinted).toBe(false)
		expect(status.isSkipped).toBe(true)
		expect(status.stateLabel).toBe("Skipped")
		expect(status.skippedAt?.getTime()).toBe(skippedAt.getTime())
	})

	it("normalizes returned scheduledFor to start of day", () => {
		const next = new Date(2025, 0, 15, 17, 30)
		const status = getOccurrenceStatus({ scheduledFor: next }, REF_NOON)

		if (!status.scheduledFor) {
			throw new Error("Expected scheduledFor to be defined")
		}

		expect(status.scheduledFor.getHours()).toBe(0)
		expect(status.scheduledFor.getMinutes()).toBe(0)
	})
})

describe("formatRecurrenceSummary", () => {
	it("summarizes daily recurrence", () => {
		expect(formatRecurrenceSummary([0, 1, 2, 3, 4, 5, 6])).toBe("Every day")
	})

	it("summarizes weekday recurrence", () => {
		expect(formatRecurrenceSummary([1, 2, 3, 4, 5])).toBe("Weekdays")
	})

	it("falls back to weekday labels for custom sets", () => {
		expect(formatRecurrenceSummary([1, 3, 5])).toBe("Mon, Wed, Fri")
	})
})
