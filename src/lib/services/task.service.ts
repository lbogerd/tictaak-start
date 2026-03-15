import { and, count, desc, eq, isNull, lte, not, or, sql } from "drizzle-orm"
import { todayStart } from "~/lib/dates/taskDates"
import { db } from "~/lib/db/db"
import { type NewTask, tasks } from "~/lib/db/schema"

export async function create(
	input: Omit<
		NewTask,
		"archivedAt" | "createdAt" | "id" | "lastHandledAt" | "recurrenceType"
	> & {
		recurrenceType?: "none" | "daily" | "weekly"
	},
) {
	return await db
		.insert(tasks)
		.values({ ...input, recurrenceType: input.recurrenceType ?? "none" })
		.returning()
}

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

export async function getAll(
	includeArchived = false,
	skip?: number,
	take?: number,
) {
	return await db.query.tasks.findMany({
		where: includeArchived ? undefined : isNull(tasks.archivedAt),
		orderBy: [desc(tasks.createdAt), desc(tasks.id)],
		offset: skip,
		limit: take,
		with: {
			category: true,
		},
	})
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
	return { items, total }
}

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

export async function getUpcoming(date?: Date) {
	const startDate = todayStart(date)
	return await db.query.tasks.findMany({
		where: and(
			sql`${tasks.startDate} > ${startDate}`,
			isNull(tasks.archivedAt),
		),
		with: {
			category: true,
		},
	})
}

export async function getDue(date?: Date) {
	const dueDate = todayStart(date)
	const dueDay = dueDate.getDay()

	const notHandledToday = or(
		isNull(tasks.lastHandledAt),
		sql`${tasks.lastHandledAt} < ${dueDate}`,
	)

	return await db.query.tasks.findMany({
		where: and(
			lte(tasks.startDate, dueDate),
			or(
				and(eq(tasks.recurrenceType, "none"), isNull(tasks.lastHandledAt)),
				and(eq(tasks.recurrenceType, "daily"), notHandledToday),
				and(
					eq(tasks.recurrenceType, "weekly"),
					sql`${tasks.recurrenceDays} @> ARRAY[${dueDay}]::integer[]`,
					notHandledToday,
				),
			),
			isNull(tasks.archivedAt),
		),
		with: {
			category: true,
		},
	})
}

export async function archive(id: string) {
	return await db
		.update(tasks)
		.set({ archivedAt: new Date() })
		.where(eq(tasks.id, id))
		.returning()
}

export async function markPrinted(id: string, handledAt = new Date()) {
	return await db
		.update(tasks)
		.set({ lastHandledAt: handledAt })
		.where(eq(tasks.id, id))
		.returning()
}

export async function skipDue(id: string, skippedAt = new Date()) {
	return await db
		.update(tasks)
		.set({ lastHandledAt: skippedAt })
		.where(eq(tasks.id, id))
		.returning()
}
