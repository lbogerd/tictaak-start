import { startOfDay } from "date-fns"
import type { PrismaClient } from "../../../prisma/client/client"
import type { TaskUncheckedCreateInput } from "../../../prisma/client/models"

export class TaskService {
	constructor(private readonly db: PrismaClient) {}

	create(
		input: Omit<
			TaskUncheckedCreateInput,
			"archivedAt" | "createdAt" | "id" | "lastPrintedAt"
		>,
	) {
		return this.db.task.create({ data: input })
	}

	getById(id: string, includeArchived = false) {
		return this.db.task.findUnique({
			where: {
				id,
				archivedAt: includeArchived ? undefined : null,
			},
		})
	}

	getAll(includeArchived = false) {
		return this.db.task.findMany({
			where: {
				archivedAt: includeArchived ? undefined : null,
			},
		})
	}

	getByCategoryId(categoryId: string, includeArchived = false) {
		return this.db.task.findMany({
			where: {
				categoryId,
				archivedAt: includeArchived ? undefined : null,
			},
		})
	}

	getUpcoming(date?: Date) {
		return this.db.task.findMany({
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

	getDue(date?: Date) {
		const dueDate = startOfDay(date ?? new Date())

		return this.db.task.findMany({
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
}

// Create a default instance using the global db
import { db } from "~/lib/db"
export const taskService = new TaskService(db)
