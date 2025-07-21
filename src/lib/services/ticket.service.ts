import { startOfDay } from "date-fns"
import { db } from "~/lib/db"
import type { TaskUncheckedCreateInput } from "../../../prisma/client/models"

/**
 * Create a new ticket.
 * @param input - The input data for the ticket.
 * @returns The created ticket.
 */
export function create(
	input: Omit<
		TaskUncheckedCreateInput,
		"archivedAt" | "createdAt" | "id" | "lastPrintedAt"
	>,
) {
	return db.task.create({ data: input })
}

/**
 * Get a ticket by ID
 * @param id - The ID of the ticket
 * @param includeArchived - Whether to include archived tickets
 * @returns The ticket.
 */
export function getById(id: string, includeArchived = false) {
	return db.task.findUnique({
		where: {
			id,
			archivedAt: includeArchived ? undefined : null,
		},
	})
}

/**
 * Get all tickets
 * @param includeArchived - Whether to include archived tickets
 * @returns All tickets.
 */
export function getAll(includeArchived = false) {
	return db.task.findMany({
		where: {
			archivedAt: includeArchived ? undefined : null,
		},
	})
}

/**
 * Get all tickets by category
 * @param categoryId - The ID of the category
 * @param includeArchived - Whether to include archived tickets
 * @returns All tickets by category.
 */
export function getByCategoryId(categoryId: string, includeArchived = false) {
	return db.task.findMany({
		where: {
			categoryId,
			archivedAt: includeArchived ? undefined : null,
		},
	})
}

/**
 * Get all upcoming tickets. Will always exclude archived tickets.
 * @param date - The date to get upcoming tickets for. Defaults to today.
 * @returns All upcoming tickets.
 */
export function getUpcoming(date?: Date) {
	return db.task.findMany({
		where: {
			nextPrintDate: {
				gt: startOfDay(date ?? new Date()),
			},
			lastPrintedAt: {
				lt: startOfDay(date ?? new Date()),
			},
			archivedAt: null,
		},
	})
}

/**
 * Get all due tickets. Will always exclude archived tickets.
 * @param date - The date to get due tickets for. Defaults to today.
 * @returns All due tickets.
 */
export function getDue(date?: Date) {
	const dueDate = startOfDay(date ?? new Date())

	return db.task.findMany({
		where: {
			nextPrintDate: {
				gte: dueDate,
			},
			lastPrintedAt: {
				lt: dueDate,
			},
			archivedAt: null,
		},
	})
}
