import { isAfter, isBefore, isEqual, startOfDay } from "date-fns"
import type { Task } from "~/logic/db/schema"

/**
 * Normalize a date-like value to a start-of-day Date in local time.
 */
export function toStartOfDay(date: Date | string | number | null | undefined) {
	if (!date) return undefined
	const d = date instanceof Date ? date : new Date(date)
	return startOfDay(d)
}

/**
 * Returns start of day for the provided reference (defaults to now).
 */
export function todayStart(ref?: Date) {
	return startOfDay(ref ?? new Date())
}

/**
 * Compute task print-cycle status flags in a single place so UI stays
 * in sync with server business rules.
 *
 * Semantics:
 * - Due: nextPrintDate <= today AND (no lastPrintedAt OR lastPrintedAt < nextPrintDate)
 * - Upcoming: nextPrintDate > today
 * - PrintedForCurrentCycle: lastPrintedAt >= nextPrintDate
 */
export function getTaskPrintStatus(task: Task, refDate?: Date) {
	const today = todayStart(refDate)
	const nextPrint = toStartOfDay(task.nextPrintDate)
	const lastPrinted = task.lastPrintedAt
		? new Date(task.lastPrintedAt)
		: undefined

	const isDue = Boolean(
		nextPrint &&
			(isBefore(nextPrint, today) || isEqual(nextPrint, today)) &&
			(!lastPrinted || isBefore(lastPrinted, nextPrint)),
	)

	const isUpcoming = Boolean(nextPrint && isAfter(nextPrint, today) && !isDue)

	const isPrintedForCurrentCycle = Boolean(
		nextPrint && lastPrinted && !isBefore(lastPrinted, nextPrint),
	)

	return {
		today,
		nextPrintDate: nextPrint,
		lastPrintedAt: lastPrinted,
		isDue,
		isUpcoming,
		isPrintedForCurrentCycle,
	}
}

/**
 * Format recurrency day indices (0=Sun..6=Sat) into short weekday labels.
 */
export function recursOnLabels(days: Array<number | null | undefined> = []) {
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
	return days
		.filter((d): d is number => typeof d === "number" && !Number.isNaN(d))
		.map((d) => dayNames[(d + 7) % 7])
}
