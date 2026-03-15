import { isAfter, isBefore, startOfDay } from "date-fns"
import type { Task } from "~/lib/db/schema"

export function toStartOfDay(date: Date | string | number | null | undefined) {
	if (!date) return undefined
	const d = date instanceof Date ? date : new Date(date)
	return startOfDay(d)
}

export function todayStart(ref?: Date) {
	return startOfDay(ref ?? new Date())
}

export function getTaskPrintStatus(task: Task, refDate?: Date) {
	const today = todayStart(refDate)
	const startDate = toStartOfDay(task.startDate)
	const lastHandledAt = task.lastHandledAt ? new Date(task.lastHandledAt) : undefined
	const recurrenceDays = task.recurrenceDays ?? []
	const recursToday = recurrenceDays.includes(today.getDay())
	const handledToday = Boolean(lastHandledAt && !isBefore(lastHandledAt, today))

	const recurrenceActiveToday =
		task.recurrenceType === "daily" ||
		(task.recurrenceType === "weekly" && recursToday)

	const isDue = Boolean(
		startDate &&
			!isAfter(startDate, today) &&
			((task.recurrenceType === "none" && !lastHandledAt) ||
				(recurrenceActiveToday && !handledToday)),
	)

	const isUpcoming = Boolean(startDate && isAfter(startDate, today))

	const isPrintedForCurrentCycle = Boolean(
		(task.recurrenceType === "none" && lastHandledAt) ||
			(recurrenceActiveToday && handledToday),
	)

	return {
		today,
		nextPrintDate: startDate,
		lastPrintedAt: lastHandledAt,
		isDue,
		isUpcoming,
		isPrintedForCurrentCycle,
	}
}

export function recursOnLabels(days: Array<number | null | undefined> = []) {
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
	return days
		.filter((d): d is number => typeof d === "number" && !Number.isNaN(d))
		.map((d) => dayNames[(d + 7) % 7])
}
