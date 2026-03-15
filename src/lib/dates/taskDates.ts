import { isAfter, isBefore, isEqual, startOfDay } from "date-fns"

type OccurrenceStatusInput = {
	scheduledFor?: Date | string | number | null
	handledAt?: Date | string | number | null
	printedAt?: Date | string | number | null
	skippedAt?: Date | string | number | null
}

/**
 * Normalize a date-like value to a start-of-day Date in local time.
 */
export function toStartOfDay(date: Date | string | number | null | undefined) {
	if (!date) return undefined
	const value = date instanceof Date ? date : new Date(date)
	return startOfDay(value)
}

/**
 * Returns start of day for the provided reference (defaults to now).
 */
export function todayStart(ref?: Date) {
	return startOfDay(ref ?? new Date())
}

/**
 * Compute occurrence status flags in a single place so UI stays in sync with
 * server business rules.
 */
export function getOccurrenceStatus(
	input: OccurrenceStatusInput,
	refDate?: Date,
) {
	const today = todayStart(refDate)
	const scheduledFor = toStartOfDay(input.scheduledFor)
	const handledAt = input.handledAt ? new Date(input.handledAt) : undefined
	const printedAt = input.printedAt ? new Date(input.printedAt) : undefined
	const skippedAt = input.skippedAt ? new Date(input.skippedAt) : undefined
	const isHandled = Boolean(handledAt || skippedAt)
	const isPrinted = Boolean(printedAt)
	const isSkipped = Boolean(skippedAt)

	const isDue = Boolean(
		scheduledFor &&
			(isBefore(scheduledFor, today) || isEqual(scheduledFor, today)) &&
			!isHandled,
	)

	const isPlanned = Boolean(
		scheduledFor && isAfter(scheduledFor, today) && !isHandled,
	)

	const stateLabel = isPrinted
		? "Printed"
		: isSkipped
			? "Skipped"
			: isDue
				? "Due"
				: isPlanned
					? "Planned"
					: scheduledFor
						? "Scheduled"
						: "Unscheduled"

	return {
		today,
		scheduledFor,
		handledAt,
		printedAt,
		skippedAt,
		isDue,
		isPlanned,
		isHandled,
		isPrinted,
		isSkipped,
		stateLabel,
	}
}

export function getTaskOccurrenceStatus(
	occurrence: OccurrenceStatusInput,
	refDate?: Date,
) {
	return getOccurrenceStatus(occurrence, refDate)
}

/**
 * Format recurrence day indices (0=Sun..6=Sat) into short weekday labels.
 */
export function recursOnLabels(days: Array<number | null | undefined> = []) {
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
	return days
		.filter(
			(day): day is number => typeof day === "number" && !Number.isNaN(day),
		)
		.map((day) => dayNames[(day + 7) % 7])
}

export function formatRecurrenceSummary(
	days: Array<number | null | undefined> = [],
) {
	const normalizedDays = Array.from(
		new Set(
			days.filter((day): day is number => {
				return typeof day === "number" && Number.isInteger(day)
			}),
		),
	).sort((left, right) => left - right)

	if (normalizedDays.length === 0) {
		return null
	}

	if (normalizedDays.length === 7) {
		return "Every day"
	}

	if (normalizedDays.join(",") === "1,2,3,4,5") {
		return "Weekdays"
	}

	if (normalizedDays.join(",") === "0,6") {
		return "Weekends"
	}

	return recursOnLabels(normalizedDays).join(", ")
}
