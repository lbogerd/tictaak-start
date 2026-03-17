import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { eq, isNull } from "drizzle-orm"
import { Printer, Ticket } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import { CreateTask } from "~/components/tasks/CreateTask"
import { TaskCard } from "~/components/tasks/TaskCard"
import { Button } from "~/components/ui/Button"
import { Pagination } from "~/components/ui/Pagination"
import { usePageClamp } from "~/hooks/usePageClamp"
import { authMiddleware } from "~/lib/auth/serverFns.server"
import { toStartOfDay } from "~/lib/dates/taskDates"
import { db } from "~/lib/db/db"
import { categories } from "~/lib/db/schema"
import { printTaskTicket } from "~/lib/services/print.service"
import {
	archive,
	create,
	getById,
	getDue,
	getRecentlyHandled,
	getUpcoming,
	markPrinted,
	skipDue,
	type TaskOccurrence,
} from "~/lib/services/task.service"

// Server functions act like API endpoints and run on the server only.
export const getCategoriesServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.handler(async () => {
		return await db.query.categories.findMany({
			where: isNull(categories.archivedAt),
		})
	})

export const getPlannedOccurrencesServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) =>
		z
			.object({
				page: z.number().int().min(1).default(1),
				pageSize: z.number().int().min(1).max(100).default(10),
			})
			.parse(data ?? {}),
	)
	.handler(async ({ data }) => {
		const plannedOccurrences = await getUpcoming()
		const requestedPage = data.page
		const pageSize = data.pageSize
		const total = plannedOccurrences.length
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const safePage = Math.min(Math.max(requestedPage, 1), totalPages)
		const safeSkip = (safePage - 1) * pageSize

		return {
			occurrences: plannedOccurrences.slice(safeSkip, safeSkip + pageSize),
			total,
			page: safePage,
		}
	})

export const getDueOccurrencesServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.handler(async () => {
		return await getDue()
	})

export const getRecentHandledOccurrencesServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) =>
		z
			.object({
				limit: z.number().int().min(1).max(20).default(6),
			})
			.parse(data ?? {}),
	)
	.handler(async ({ data }) => {
		return await getRecentlyHandled({ take: data.limit })
	})

export const getTaskSuggestionsServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.handler(async () => {
		// Build lightweight suggestions based on historical tasks.
		const tasks = await db.query.tasks.findMany({
			columns: {
				title: true,
				createdAt: true,
				categoryId: true,
			},
			with: {
				instances: {
					columns: {
						handledAt: true,
						printedAt: true,
					},
				},
			},
		})

		const byTitle = new Map<
			string,
			{ title: string; count: number; lastUsed: Date; lastCategoryId: string }
		>()

		for (const task of tasks) {
			const lastInstanceActivity = task.instances.reduce<Date | undefined>(
				(currentLastUsed, instance) => {
					const candidate =
						instance.printedAt ?? instance.handledAt ?? undefined
					if (!candidate) {
						return currentLastUsed
					}

					return !currentLastUsed || candidate > currentLastUsed
						? candidate
						: currentLastUsed
				},
				undefined,
			)
			const lastUsed =
				lastInstanceActivity && lastInstanceActivity > task.createdAt
					? lastInstanceActivity
					: task.createdAt
			const existing = byTitle.get(task.title)

			if (existing) {
				existing.count += 1
				if (lastUsed > existing.lastUsed) {
					existing.lastUsed = lastUsed
					existing.lastCategoryId = task.categoryId
				}
			} else {
				byTitle.set(task.title, {
					title: task.title,
					count: 1,
					lastUsed,
					lastCategoryId: task.categoryId,
				})
			}
		}

		const dayMs = 24 * 60 * 60 * 1000
		// Higher score = used more recently + more frequently.
		const suggestions = Array.from(byTitle.values())
			.sort((a, b) => {
				const scoreA = a.lastUsed.getTime() + a.count * dayMs
				const scoreB = b.lastUsed.getTime() + b.count * dayMs
				return scoreB - scoreA
			})
			.map((entry) => ({
				title: entry.title,
				count: entry.count,
				lastUsed: entry.lastUsed.toISOString(),
				categoryId: entry.lastCategoryId,
			}))

		return suggestions
	})

export const createTaskServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) =>
		z
			.object({
				title: z.string(),
				categoryId: z.string(),
				nextPrintDate: z.date().optional(),
				recursOnDays: z.array(z.number()).optional(),
			})
			.parse(data),
	)
	.handler(async ({ data }) => {
		return await create(data)
	})

export const createCategoryServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) => z.object({ name: z.string() }).parse(data))
	.handler(async ({ data }) => {
		const result = await db.insert(categories).values(data).returning()
		return result[0]
	})

export const archiveTaskServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) => z.object({ id: z.string() }).parse(data))
	.handler(async ({ data }) => {
		return await archive(data.id)
	})

export const archiveCategoryServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) => z.object({ id: z.string() }).parse(data))
	.handler(async ({ data }) => {
		return await db
			.update(categories)
			.set({ archivedAt: new Date() })
			.where(eq(categories.id, data.id))
			.returning()
	})

export const printTaskServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) => z.object({ id: z.string() }).parse(data))
	.handler(async ({ data }) => {
		const occurrence = await getById(data.id, true)
		if (!occurrence) {
			throw new Error("Task not found.")
		}
		if (occurrence.archivedAt) {
			throw new Error("Task is archived.")
		}

		await printTaskTicket(occurrence.task)
		const updated = await markPrinted(occurrence.taskId)
		return updated[0]
	})

export const printDueTasksServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.handler(async () => {
		const dueOccurrences = await getDue()
		const updatedTasks = []

		for (const occurrence of dueOccurrences) {
			await printTaskTicket(occurrence.task)
			const updated = await markPrinted(occurrence.taskId)
			updatedTasks.push(updated[0])
		}

		return updatedTasks
	})

/**
 * Skip a due task without printing it.
 * Marks the current task instance as handled while preserving
 * any recurring schedule for future instances.
 */
export const skipDueTaskServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) => z.object({ id: z.string() }).parse(data))
	.handler(async ({ data }) => {
		const occurrence = await getById(data.id, false)
		if (!occurrence) {
			throw new Error("Task not found.")
		}
		if (occurrence.archivedAt) {
			throw new Error("Task is archived.")
		}

		const updated = await skipDue(occurrence.taskId)
		return updated[0]
	})

export const Route = createFileRoute("/")({
	validateSearch: z.object({
		page: z.coerce.number().min(1).default(1),
	}),
	component: App,
	loader: async ({ location }) => {
		const pageSize = 10
		const searchParams = new URLSearchParams(location.search ?? "")
		const requestedPage = Number(searchParams.get("page") ?? "1") || 1
		const categories = await getCategoriesServerFn()
		const { occurrences, total, page } = await getPlannedOccurrencesServerFn({
			data: { page: requestedPage, pageSize },
		})
		const dueOccurrences = await getDueOccurrencesServerFn()
		const recentOccurrences = await getRecentHandledOccurrencesServerFn({
			data: { limit: 6 },
		})
		const suggestions = await getTaskSuggestionsServerFn()

		return {
			categories,
			plannedOccurrences: occurrences,
			totalPlannedOccurrences: total,
			dueOccurrences,
			recentOccurrences,
			suggestions,
			page,
			pageSize,
			requestedPage,
		}
	},
})

function getErrorMessage(error: unknown, fallbackMessage: string) {
	if (error instanceof Error) {
		return error.message
	}
	return fallbackMessage
}

type TaskListSectionProps = {
	title: string
	occurrences: TaskOccurrence[]
	headerAction?: React.ReactNode
	emptyState?: React.ReactNode
	onPrint?: (occurrence: TaskOccurrence) => Promise<void>
	onArchive?: (occurrence: TaskOccurrence) => Promise<void>
	onSkip?: (occurrence: TaskOccurrence) => Promise<void>
}

function TaskListSection({
	title,
	occurrences,
	headerAction,
	emptyState,
	onPrint,
	onArchive,
	onSkip,
}: TaskListSectionProps) {
	return (
		<div>
			<div className="flex items-center justify-between border-orange-200/50 border-b pb-4">
				<h3 className="font-semibold text-xl">{title}</h3>
				{headerAction}
			</div>

			{occurrences.length > 0 ? (
				<ul className="grid gap-4 pt-4 sm:grid-cols-1">
					{occurrences.map((occurrence) => (
						<li key={occurrence.instanceId ?? occurrence.taskId}>
							<TaskCard
								occurrence={occurrence}
								onPrint={
									onPrint
										? async (nextOccurrence) => {
												await onPrint(nextOccurrence)
											}
										: undefined
								}
								onArchive={
									onArchive
										? async (nextOccurrence) => {
												await onArchive(nextOccurrence)
											}
										: undefined
								}
								onSkip={
									onSkip
										? async (nextOccurrence) => {
												await onSkip(nextOccurrence)
											}
										: undefined
								}
							/>
						</li>
					))}
				</ul>
			) : (
				emptyState
			)}
		</div>
	)
}

function App() {
	const {
		categories,
		plannedOccurrences,
		totalPlannedOccurrences,
		dueOccurrences,
		recentOccurrences,
		suggestions,
		page,
		pageSize,
		requestedPage,
	} = Route.useLoaderData()
	const router = useRouter()

	const totalPages = Math.max(1, Math.ceil(totalPlannedOccurrences / pageSize))
	const currentPage = usePageClamp(
		requestedPage ?? page ?? 1,
		totalPages,
		async (nextPage) => {
			await router.navigate({ to: "/", search: { page: nextPage } })
		},
	)

	const printTaskWithToast = async (
		occurrence: Pick<TaskOccurrence, "taskId" | "title">,
	) => {
		try {
			await printTaskServerFn({ data: { id: occurrence.taskId } })
			toast.success(`Printed "${occurrence.title}"`)
		} catch (error) {
			toast.error(getErrorMessage(error, "Print failed. Please retry."))
			throw error
		}
	}

	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
			<div className="mb-12">
				{/* CreateTask owns the form UI; callbacks wire in server actions. */}
				<CreateTask
					categories={categories}
					suggestions={suggestions}
					onCreateCategory={async (name) => {
						const newCategory = await createCategoryServerFn({ data: { name } })
						router.invalidate()
						return newCategory.id
					}}
					onArchiveCategory={async (id) => {
						await archiveCategoryServerFn({ data: { id } })
						router.invalidate()
					}}
					onPrintNow={async (input) => {
						const createdTask = await createTaskServerFn({
							data: {
								title: input.text,
								categoryId: input.categoryId,
								nextPrintDate: toStartOfDay(new Date()),
							},
						})
						// Print immediately if task is due today
						if (createdTask && createdTask.length > 0) {
							const task = createdTask[0]
							await printTaskWithToast({
								taskId: task.id,
								title: task.title,
							})
						}
						router.invalidate()
					}}
					onPlanOccurrence={async (input) => {
						// Convert user-friendly schedule choices into numeric weekdays.
						const recursOnDays =
							input.schedulingType === "recurring"
								? input.recurringType === "every-day"
									? [0, 1, 2, 3, 4, 5, 6]
									: input.selectedWeekdays?.map((day) => {
											const mapping: Record<string, number> = {
												sun: 0,
												mon: 1,
												tue: 2,
												wed: 3,
												thu: 4,
												fri: 5,
												sat: 6,
											}
											return mapping[day]
										})
								: undefined

						await createTaskServerFn({
							data: {
								title: input.text,
								categoryId: input.categoryId,
								nextPrintDate: toStartOfDay(input.scheduledDate),
								recursOnDays,
							},
						})
						router.invalidate()
					}}
				/>
			</div>

			<div className="mb-12 space-y-6">
				<TaskListSection
					title="Due Today"
					occurrences={dueOccurrences}
					headerAction={
						dueOccurrences.length > 0 ? (
							<Button
								type="button"
								onClick={async () => {
									try {
										const printedTasks = await printDueTasksServerFn()
										const count = printedTasks.length
										toast.success(
											count === 1
												? "Printed 1 due occurrence"
												: `Printed ${count} due occurrences`,
										)
										router.invalidate()
									} catch (error) {
										toast.error(
											getErrorMessage(
												error,
												"Failed to print due occurrences.",
											),
										)
									}
								}}
								gradient
								size="sm"
								className="h-9 px-4"
							>
								<Printer className="mr-2 h-4 w-4" />
								Print all due
							</Button>
						) : (
							<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
								0 occurrences
							</span>
						)
					}
					emptyState={
						<div className="pt-4 text-neutral-500 text-sm">
							Nothing is due right now.
						</div>
					}
					onPrint={async (occurrence) => {
						await printTaskWithToast(occurrence)
						router.invalidate()
					}}
					onSkip={async (occurrence) => {
						await skipDueTaskServerFn({ data: { id: occurrence.taskId } })
						router.invalidate()
					}}
				/>
			</div>

			<TaskListSection
				title="Planned"
				occurrences={plannedOccurrences}
				headerAction={
					<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
						{totalPlannedOccurrences}{" "}
						{totalPlannedOccurrences === 1 ? "occurrence" : "occurrences"}
					</span>
				}
				emptyState={
					<div className="flex flex-col items-center justify-center rounded-3xl border-2 border-orange-200 border-dashed bg-white/50 py-20 text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500">
							<Ticket className="h-8 w-8" />
						</div>
						<h4 className="mb-2 font-semibold text-lg">
							No planned occurrences
						</h4>
						<p className="max-w-xs text-neutral-500">
							Plan a future date or repeat days above to build your next run.
						</p>
					</div>
				}
				onPrint={async (occurrence) => {
					await printTaskWithToast(occurrence)
					router.invalidate()
				}}
				onArchive={async (occurrence) => {
					await archiveTaskServerFn({ data: { id: occurrence.taskId } })
					router.invalidate()
				}}
			/>

			{recentOccurrences.length > 0 ? (
				<div className="mt-12">
					<TaskListSection
						title="Recently Handled"
						occurrences={recentOccurrences}
						headerAction={
							<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
								{recentOccurrences.length}{" "}
								{recentOccurrences.length === 1 ? "occurrence" : "occurrences"}
							</span>
						}
					/>
				</div>
			) : null}

			{totalPlannedOccurrences > 0 ? (
				<Pagination
					currentPage={currentPage}
					totalPages={totalPages}
					onChange={async (nextPage) => {
						await router.navigate({ to: "/", search: { page: nextPage } })
					}}
				/>
			) : null}
		</div>
	)
}
