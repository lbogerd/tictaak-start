import { addDays } from "date-fns"
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
import {
	formatRecurrenceSummary,
	todayStart,
	toStartOfDay,
} from "~/lib/dates/taskDates"
import { db } from "~/lib/db/db"
import {
	type Category,
	type Task,
	type TaskInstance,
	type TaskSchedule,
	taskInstances,
	taskSchedules,
	tasks,
} from "~/lib/db/schema"

export type TaskWithCategory = Task & { category: Category }

export type TaskOccurrence = {
	taskId: string
	instanceId: string | null
	title: string
	categoryId: string
	categoryName: string
	scheduledFor: Date | null
	handledAt: Date | null
	printedAt: Date | null
	skippedAt: Date | null
	recurrenceSummary: string | null
	recursOnDays: number[]
	scheduleStartsAt: Date | null
	archivedAt: Date | null
	task: TaskWithCategory
	instance: TaskInstance | null
	schedule: TaskSchedule | null
}

export type CreateTaskInput = {
	title: string
	categoryId: string
	nextPrintDate?: Date
	recursOnDays?: number[]
}

function normalizeRecurringDays(
	days: Array<number | null | undefined> | null | undefined,
) {
	return Array.from(
		new Set(
			(days ?? []).filter(
				(day): day is number =>
					typeof day === "number" &&
					Number.isInteger(day) &&
					day >= 0 &&
					day <= 6,
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
		return new Map<string, TaskInstance>()
	}

	const openInstances = await db.query.taskInstances.findMany({
		where: and(
			inArray(taskInstances.taskId, taskIds),
			isNull(taskInstances.handledAt),
		),
		orderBy: [asc(taskInstances.taskId), asc(taskInstances.scheduledFor)],
	})

	const nextByTaskId = new Map<string, TaskInstance>()
	for (const instance of openInstances) {
		if (!nextByTaskId.has(instance.taskId)) {
			nextByTaskId.set(instance.taskId, instance)
		}
	}

	return nextByTaskId
}

function toTaskOccurrence(
	task: TaskWithCategory,
	instance: TaskInstance | null,
	schedule: TaskSchedule | null,
): TaskOccurrence {
	const recurringDays = normalizeRecurringDays(schedule?.recursOnDays)

	return {
		taskId: task.id,
		instanceId: instance?.id ?? null,
		title: task.title,
		categoryId: task.categoryId,
		categoryName: task.category.name,
		scheduledFor: instance?.scheduledFor ?? null,
		handledAt: instance?.handledAt ?? null,
		printedAt: instance?.printedAt ?? null,
		skippedAt: instance?.skippedAt ?? null,
		recurrenceSummary: formatRecurrenceSummary(recurringDays),
		recursOnDays: recurringDays,
		scheduleStartsAt: schedule?.startsAt ?? null,
		archivedAt: task.archivedAt ?? null,
		task,
		instance,
		schedule,
	}
}

async function attachNextInstance(taskList: TaskWithCategory[]) {
	if (taskList.length === 0) {
		return []
	}

	const nextByTaskId = await getNextOpenInstances(
		taskList.map((task) => task.id),
	)
	const scheduleRows = await db.query.taskSchedules.findMany({
		where: inArray(
			taskSchedules.taskId,
			taskList.map((task) => task.id),
		),
	})
	const scheduleByTaskId = new Map(
		scheduleRows.map((schedule) => [schedule.taskId, schedule] as const),
	)

	return taskList.map((task) =>
		toTaskOccurrence(
			task,
			nextByTaskId.get(task.id) ?? null,
			scheduleByTaskId.get(task.id) ?? null,
		),
	)
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
		where: and(
			eq(taskInstances.taskId, taskId),
			isNull(taskInstances.handledAt),
		),
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
		where: and(
			eq(taskInstances.taskId, taskId),
			isNull(taskInstances.handledAt),
		),
	})

	if (existingOpenInstance) {
		return
	}

	const schedule = await db.query.taskSchedules.findFirst({
		where: eq(taskSchedules.taskId, taskId),
		with: {
			task: {
				columns: {
					archivedAt: true,
				},
			},
		},
	})

	if (!schedule || schedule.task.archivedAt) {
		return
	}

	const nextScheduledFor = findNextRecurringDate({
		startDate: schedule.startsAt,
		recursOnDays: schedule.recursOnDays,
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
	const schedules = await db.query.taskSchedules.findMany({
		with: {
			task: {
				columns: {
					id: true,
					archivedAt: true,
				},
			},
		},
	})

	const recurringWithoutOpenInstance = schedules.filter((schedule) => {
		return Boolean(
			!schedule.task.archivedAt &&
				normalizeRecurringDays(schedule.recursOnDays).length > 0,
		)
	})

	const nextByTaskId = await getNextOpenInstances(
		recurringWithoutOpenInstance.map((schedule) => schedule.taskId),
	)
	const existingInstances = await db.query.taskInstances.findMany({
		where: inArray(
			taskInstances.taskId,
			recurringWithoutOpenInstance.map((schedule) => schedule.taskId),
		),
		columns: {
			taskId: true,
			handledAt: true,
		},
	})
	const latestHandledAtByTaskId = new Map<string, Date>()
	for (const instance of existingInstances) {
		if (!instance.handledAt) {
			continue
		}

		const currentLatest = latestHandledAtByTaskId.get(instance.taskId)
		if (!currentLatest || instance.handledAt > currentLatest) {
			latestHandledAtByTaskId.set(instance.taskId, instance.handledAt)
		}
	}
	const referenceFloor = addDays(todayStart(referenceDate), -1)

	for (const schedule of recurringWithoutOpenInstance) {
		if (nextByTaskId.has(schedule.taskId)) {
			continue
		}

		const latestHandledAt = latestHandledAtByTaskId.get(schedule.taskId)

		const afterDate =
			latestHandledAt && latestHandledAt > referenceFloor
				? latestHandledAt
				: referenceFloor

		const nextScheduledFor = findNextRecurringDate({
			startDate: schedule.startsAt,
			recursOnDays: schedule.recursOnDays,
			afterDate,
		})

		if (!nextScheduledFor) {
			continue
		}

		await db.insert(taskInstances).values({
			taskId: schedule.taskId,
			scheduledFor: nextScheduledFor,
		})
	}
}

/**
 * Create a new ticket.
 * @param input - The input data for the ticket.
 * @returns The created ticket.
 */
export async function create(input: CreateTaskInput) {
	const createdTasks = await db
		.insert(tasks)
		.values({
			title: input.title,
			categoryId: input.categoryId,
		})
		.returning()
	const createdTask = createdTasks[0]
	const nextPrintDate = toStartOfDay(input.nextPrintDate)
	const recursOnDays = normalizeRecurringDays(input.recursOnDays)

	if (createdTask && nextPrintDate) {
		await db.insert(taskInstances).values({
			taskId: createdTask.id,
			scheduledFor: nextPrintDate,
		})
	}

	if (createdTask && recursOnDays.length > 0) {
		await db.insert(taskSchedules).values({
			taskId: createdTask.id,
			startsAt: nextPrintDate ?? todayStart(),
			recursOnDays,
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
					schedule: true,
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
		.map((instance) =>
			toTaskOccurrence(instance.task, instance, instance.task.schedule ?? null),
		)
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
					schedule: true,
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
		.map((instance) =>
			toTaskOccurrence(instance.task, instance, instance.task.schedule ?? null),
		)
}

export async function getRecentlyHandled({
	take = 6,
	date,
}: {
	take?: number
	date?: Date
} = {}) {
	await syncRecurringInstances(date)

	const handledInstances = await db.query.taskInstances.findMany({
		where: not(isNull(taskInstances.handledAt)),
		orderBy: [desc(taskInstances.handledAt), desc(taskInstances.id)],
		limit: take,
		with: {
			task: {
				with: {
					category: true,
					schedule: true,
				},
			},
		},
	})

	return handledInstances
		.filter((instance) => Boolean(instance.task) && !instance.task.archivedAt)
		.map((instance) =>
			toTaskOccurrence(instance.task, instance, instance.task.schedule ?? null),
		)
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

	await ensureNextInstance(id, printedAt)

	return await db.select().from(tasks).where(eq(tasks.id, id))
}

/**
 * Skip a due task by marking the current instance handled without printing.
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
