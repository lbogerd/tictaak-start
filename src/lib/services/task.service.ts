import {
	and,
	asc,
	count,
	desc,
	eq,
	gt,
	inArray,
	isNull,
	lte,
	not,
} from "drizzle-orm"
import { addDays } from "date-fns"
import { toStartOfDay, todayStart } from "~/lib/dates/taskDates"
import { db } from "~/lib/db/db"
import { type NewTask, taskInstances, tasks } from "~/lib/db/schema"

function normalizeRecurringDays(days: Array<number | null | undefined> | null | undefined) {
	return Array.from(
		new Set(
			(days ?? []).filter(
				(day): day is number =>
					typeof day === "number" && Number.isInteger(day) && day >= 0 && day <= 6,
			),
		),
	).sort((left, right) => left - right)
}

function findNextRecurringDate({
	startDate,
	recursOnDays,
	afterDate,
}: {
	startDate: Date | null
	recursOnDays: Array<number | null | undefined> | null | undefined
	afterDate: Date
}) {
	const anchorDate = toStartOfDay(startDate)
	const recurringDays = normalizeRecurringDays(recursOnDays)

	if (!anchorDate || recurringDays.length === 0) {
		return undefined
	}

	const searchStart = addDays(todayStart(afterDate), 1)
	const firstCandidate = searchStart > anchorDate ? searchStart : anchorDate

	for (let offset = 0; offset < 14; offset += 1) {
		const candidate = addDays(firstCandidate, offset)
		if (recurringDays.includes(candidate.getDay())) {
			return candidate
		}
	}

	return undefined
}

async function getNextOpenInstances(taskIds: string[]) {
	if (taskIds.length === 0) {
		return new Map<string, Date>()
	}

	const openInstances = await db.query.taskInstances.findMany({
		where: and(
			inArray(taskInstances.taskId, taskIds),
			isNull(taskInstances.handledAt),
		),
		orderBy: [asc(taskInstances.taskId), asc(taskInstances.scheduledFor)],
	})

	const nextByTaskId = new Map<string, Date>()
	for (const instance of openInstances) {
		if (!nextByTaskId.has(instance.taskId)) {
			nextByTaskId.set(instance.taskId, instance.scheduledFor)
		}
	}

	return nextByTaskId
}

async function attachNextInstance<T extends { id: string; nextPrintDate: Date | null }>(
	taskList: T[],
) {
	const nextByTaskId = await getNextOpenInstances(taskList.map((task) => task.id))

	return taskList.map((task) => ({
		...task,
		nextPrintDate: nextByTaskId.get(task.id) ?? null,
	}))
}

async function markInstanceHandled({
	taskId,
	handledAt,
	printedAt,
	skippedAt,
}: {
	taskId: string
	handledAt: Date
	printedAt?: Date
	skippedAt?: Date
}) {
	const openInstance = await db.query.taskInstances.findFirst({
		where: and(eq(taskInstances.taskId, taskId), isNull(taskInstances.handledAt)),
		orderBy: [asc(taskInstances.scheduledFor), asc(taskInstances.id)],
	})

	if (openInstance) {
		await db
			.update(taskInstances)
			.set({ handledAt, printedAt, skippedAt })
			.where(eq(taskInstances.id, openInstance.id))
			.returning()
		return
	}

	await db.insert(taskInstances).values({
		taskId,
		scheduledFor: todayStart(handledAt),
		handledAt,
		printedAt,
		skippedAt,
	})
}

async function ensureNextInstance(taskId: string, handledAt: Date) {
	const existingOpenInstance = await db.query.taskInstances.findFirst({
		where: and(eq(taskInstances.taskId, taskId), isNull(taskInstances.handledAt)),
	})

	if (existingOpenInstance) {
		return
	}

	const task = await db.query.tasks.findFirst({
		where: eq(tasks.id, taskId),
		columns: {
			id: true,
			nextPrintDate: true,
			recursOnDays: true,
			archivedAt: true,
		},
	})

	if (!task || task.archivedAt) {
		return
	}

	const nextScheduledFor = findNextRecurringDate({
		startDate: task.nextPrintDate,
		recursOnDays: task.recursOnDays,
		afterDate: handledAt,
	})

	if (!nextScheduledFor) {
		return
	}

	await db.insert(taskInstances).values({
		taskId,
		scheduledFor: nextScheduledFor,
	})
}

async function syncRecurringInstances(referenceDate = new Date()) {
	const recurringTasks = await db.query.tasks.findMany({
		where: and(isNull(tasks.archivedAt), not(isNull(tasks.nextPrintDate))),
		columns: {
			id: true,
			nextPrintDate: true,
			recursOnDays: true,
			lastPrintedAt: true,
		},
	})

	const recurringWithoutOpenInstance = recurringTasks.filter((task) => {
		return Boolean(task.nextPrintDate && normalizeRecurringDays(task.recursOnDays).length > 0)
	})

	const nextByTaskId = await getNextOpenInstances(
		recurringWithoutOpenInstance.map((task) => task.id),
	)
	const referenceFloor = addDays(todayStart(referenceDate), -1)

	for (const task of recurringWithoutOpenInstance) {
		if (nextByTaskId.has(task.id)) {
			continue
		}

		const afterDate =
			task.lastPrintedAt && task.lastPrintedAt > referenceFloor
				? task.lastPrintedAt
				: referenceFloor

		const nextScheduledFor = findNextRecurringDate({
			startDate: task.nextPrintDate,
			recursOnDays: task.recursOnDays,
			afterDate,
		})

		if (!nextScheduledFor) {
			continue
		}

		await db.insert(taskInstances).values({
			taskId: task.id,
			scheduledFor: nextScheduledFor,
		})
	}
}

/**
 * Create a new ticket.
 * @param input - The input data for the ticket.
 * @returns The created ticket.
 */
export async function create(
	input: Omit<NewTask, "archivedAt" | "createdAt" | "id" | "lastPrintedAt">,
) {
	const createdTasks = await db.insert(tasks).values(input).returning()
	const createdTask = createdTasks[0]

	if (createdTask?.nextPrintDate) {
		await db.insert(taskInstances).values({
			taskId: createdTask.id,
			scheduledFor: createdTask.nextPrintDate,
		})
	}

	return createdTasks
}

/**
 * Get a ticket by ID
 * @param id - The ID of the ticket
 * @param includeArchived - Whether to include archived tickets
 * @returns The ticket.
 */
export async function getById(id: string, includeArchived = false) {
	await syncRecurringInstances()

	const task = await db.query.tasks.findFirst({
		where: and(
			eq(tasks.id, id),
			includeArchived ? undefined : isNull(tasks.archivedAt),
		),
		with: {
			category: true,
		},
	})

	if (!task) {
		return undefined
	}

	const [withNextInstance] = await attachNextInstance([task])
	return withNextInstance
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
	await syncRecurringInstances()

	const taskList = await db.query.tasks.findMany({
		where: includeArchived ? undefined : isNull(tasks.archivedAt),
		orderBy: [desc(tasks.createdAt), desc(tasks.id)],
		offset: skip,
		limit: take,
		with: {
			category: true,
		},
	})

	return await attachNextInstance(taskList)
}

export async function getPaginated({
	includeArchived = false,
	archivedOnly = false,
	skip = 0,
	take = 10,
}: {
	includeArchived?: boolean
	archivedOnly?: boolean
	skip?: number
	take?: number
}) {
	await syncRecurringInstances()

	const where = archivedOnly
		? not(isNull(tasks.archivedAt))
		: includeArchived
			? undefined
			: isNull(tasks.archivedAt)

	const [items, totalResult] = await Promise.all([
		db.query.tasks.findMany({
			where,
			orderBy: [desc(tasks.createdAt), desc(tasks.id)],
			offset: skip,
			limit: take,
			with: { category: true },
		}),
		db.select({ count: count() }).from(tasks).where(where),
	])

	const total = Number(totalResult[0]?.count ?? 0)
	return { items: await attachNextInstance(items), total }
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
	await syncRecurringInstances()

	const taskList = await db.query.tasks.findMany({
		where: and(
			eq(tasks.categoryId, categoryId),
			includeArchived ? undefined : isNull(tasks.archivedAt),
		),
		with: {
			category: true,
		},
	})

	return await attachNextInstance(taskList)
}

/**
 * Get all upcoming tickets. Will always exclude archived tickets.
 * @param date - The date to get upcoming tickets for. Defaults to today.
 * @returns All upcoming tickets.
 */
export async function getUpcoming(date?: Date) {
	await syncRecurringInstances(date)

	const startDate = todayStart(date)
	const upcomingInstances = await db.query.taskInstances.findMany({
		where: and(
			gt(taskInstances.scheduledFor, startDate),
			isNull(taskInstances.handledAt),
		),
		orderBy: [asc(taskInstances.scheduledFor), asc(taskInstances.id)],
		with: {
			task: {
				with: {
					category: true,
				},
			},
		},
	})

	const seenTaskIds = new Set<string>()
	return upcomingInstances
		.filter((instance) => {
			const task = instance.task
			if (!task || task.archivedAt || seenTaskIds.has(task.id)) {
				return false
			}

			seenTaskIds.add(task.id)
			return true
		})
		.map((instance) => ({
			...instance.task,
			nextPrintDate: instance.scheduledFor,
		}))
}

/**
 * Get all due tickets. Will always exclude archived tickets. Includes tickets that were due earlier but not printed yet.
 * @param date - The date to get due tickets for. Defaults to today.
 * @returns All due tickets.
 */
export async function getDue(date?: Date) {
	await syncRecurringInstances(date)

	const dueDate = todayStart(date)
	const dueInstances = await db.query.taskInstances.findMany({
		where: and(
			lte(taskInstances.scheduledFor, dueDate),
			isNull(taskInstances.handledAt),
		),
		orderBy: [asc(taskInstances.scheduledFor), asc(taskInstances.id)],
		with: {
			task: {
				with: {
					category: true,
				},
			},
		},
	})

	const seenTaskIds = new Set<string>()
	return dueInstances
		.filter((instance) => {
			const task = instance.task
			if (!task || task.archivedAt || seenTaskIds.has(task.id)) {
				return false
			}

			seenTaskIds.add(task.id)
			return true
		})
		.map((instance) => ({
			...instance.task,
			nextPrintDate: instance.scheduledFor,
		}))
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
	await markInstanceHandled({
		taskId: id,
		handledAt: printedAt,
		printedAt,
	})

	await db
		.update(tasks)
		.set({ lastPrintedAt: printedAt })
		.where(eq(tasks.id, id))

	await ensureNextInstance(id, printedAt)

	return await db.select().from(tasks).where(eq(tasks.id, id))
}

/**
 * Skip a due task by marking it as printed without actually printing.
 * This removes the task from the due list while preserving nextPrintDate
 * and recursOnDays so future instances are unaffected.
 * @param id - The ID of the task to skip
 * @param skippedAt - When the task was skipped (defaults to now)
 * @returns The updated task.
 */
export async function skipDue(id: string, skippedAt = new Date()) {
	await markInstanceHandled({
		taskId: id,
		handledAt: skippedAt,
		skippedAt,
	})

	await ensureNextInstance(id, skippedAt)

	return await db.select().from(tasks).where(eq(tasks.id, id))
}
