import { and, eq, gt, isNull, lt, lte } from "drizzle-orm"
import { todayStart } from "~/logic/dates/taskDates"
import { db } from "~/logic/db/db"
import { type NewTask, tasks } from "~/logic/db/schema"

/**
 * Create a new ticket.
 * @param input - The input data for the ticket.
 * @returns The created ticket.
 */
export async function create(
	input: Omit<NewTask, "archivedAt" | "createdAt" | "id" | "lastPrintedAt">,
) {
	return await db.insert(tasks).values(input).returning()
}

/**
 * Get a ticket by ID
 * @param id - The ID of the ticket
 * @param includeArchived - Whether to include archived tickets
 * @returns The ticket.
 */
export async function getById(id: string, includeArchived = false) {
	return await db.query.tasks.findFirst({
		where: and(
			eq(tasks.id, id),
			includeArchived ? undefined : isNull(tasks.archivedAt),
		),
		with: {
			category: true,
		},
	})
}

/**
 * Get all tickets
 * @param includeArchived - Whether to include archived tickets
 * @param skip - Number of records to skip (for pagination)
 * @param take - Number of records to take (for pagination)
 * @returns All tickets.
 */
export async function getAll(
	includeArchived = false,
	skip?: number,
	take?: number,
) {
	return await db.query.tasks.findMany({
		where: includeArchived ? undefined : isNull(tasks.archivedAt),
		offset: skip,
		limit: take,
		with: {
			category: true,
		},
	})
}

/**
 * Get all tickets by category
 * @param categoryId - The ID of the category
 * @param includeArchived - Whether to include archived tickets
 * @returns All tickets by category.
 */
export async function getByCategoryId(
	categoryId: string,
	includeArchived = false,
) {
	return await db.query.tasks.findMany({
		where: and(
			eq(tasks.categoryId, categoryId),
			includeArchived ? undefined : isNull(tasks.archivedAt),
		),
		with: {
			category: true,
		},
	})
}

/**
 * Get all upcoming tickets. Will always exclude archived tickets.
 * @param date - The date to get upcoming tickets for. Defaults to today.
 * @returns All upcoming tickets.
 */
export async function getUpcoming(date?: Date) {
	const startDate = todayStart(date)
	return await db.query.tasks.findMany({
		where: and(
			gt(tasks.nextPrintDate, startDate),
			lt(tasks.lastPrintedAt, startDate),
			isNull(tasks.archivedAt),
		),
		with: {
			category: true,
		},
	})
}

/**
 * Get all due tickets. Will always exclude archived tickets. Includes tickets that were due earlier but not printed yet.
 * @param date - The date to get due tickets for. Defaults to today.
 * @returns All due tickets.
 */
export async function getDue(date?: Date) {
	const dueDate = todayStart(date)

	return await db.query.tasks.findMany({
		where: and(
			lte(tasks.nextPrintDate, dueDate),
			lt(tasks.lastPrintedAt, tasks.nextPrintDate),
			isNull(tasks.archivedAt),
		),
		with: {
			category: true,
		},
	})
}

/**
 * Archive a task by ID
 * @param id - The ID of the task to archive
 * @returns The archived task.
 */
export async function archive(id: string) {
	return await db
		.update(tasks)
		.set({ archivedAt: new Date() })
		.where(eq(tasks.id, id))
		.returning()
}

/**
 * Mark a task as printed.
 * @param id - The ID of the task to update
 * @param printedAt - When the task was printed
 * @returns The updated task.
 */
export async function markPrinted(id: string, printedAt = new Date()) {
	return await db
		.update(tasks)
		.set({ lastPrintedAt: printedAt })
		.where(eq(tasks.id, id))
		.returning()
}
