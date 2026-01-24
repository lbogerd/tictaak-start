import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { eq, isNull } from "drizzle-orm"
import { Printer, Ticket } from "lucide-react"
import { z } from "zod"
import { CreateTask } from "~/components/tasks/CreateTask"
import { TaskCard } from "~/components/tasks/TaskCard"
import { Button } from "~/components/ui/Button"
import { authMiddleware } from "~/lib/auth/serverFns"
import { toStartOfDay } from "~/lib/dates/taskDates"
import { db } from "~/lib/db/db"
import { categories } from "~/lib/db/schema"
import { printTaskTicket } from "~/lib/services/print.service"
import {
	archive,
	create,
	getAll,
	getById,
	getDue,
	markPrinted,
	skipDue,
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

export const getAllTicketsServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.handler(async () => {
		const tickets = await getAll()
		return tickets
	})

export const getDueTicketsServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.handler(async () => {
		return await getDue()
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
				lastPrintedAt: true,
				categoryId: true,
			},
		})

		const byTitle = new Map<
			string,
			{ title: string; count: number; lastUsed: Date; lastCategoryId: string }
		>()

		for (const task of tasks) {
			const lastUsed =
				task.lastPrintedAt && task.lastPrintedAt > task.createdAt
					? task.lastPrintedAt
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
		const task = await getById(data.id, true)
		if (!task) {
			throw new Error("Task not found.")
		}
		if (task.archivedAt) {
			throw new Error("Task is archived.")
		}

		await printTaskTicket(task)
		const updated = await markPrinted(task.id)
		return updated[0]
	})

export const printDueTasksServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.handler(async () => {
		const dueTasks = await getDue()
		const updatedTasks = []

		for (const task of dueTasks) {
			await printTaskTicket(task)
			const updated = await markPrinted(task.id)
			updatedTasks.push(updated[0])
		}

		return updatedTasks
	})

/**
 * Skip a due task without printing it.
 * Marks the task as handled for the current cycle while preserving
 * future scheduling (nextPrintDate and recursOnDays remain unchanged).
 */
export const skipDueTaskServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) => z.object({ id: z.string() }).parse(data))
	.handler(async ({ data }) => {
		const task = await getById(data.id, false)
		if (!task) {
			throw new Error("Task not found.")
		}
		if (task.archivedAt) {
			throw new Error("Task is archived.")
		}

		const updated = await skipDue(task.id)
		return updated[0]
	})

export const Route = createFileRoute("/")({
	component: App,
	loader: async () => {
		// Load all data needed for the landing screen in one request.
		const categories = await getCategoriesServerFn()
		const tasks = await getAllTicketsServerFn()
		const dueTasks = await getDueTicketsServerFn()
		const suggestions = await getTaskSuggestionsServerFn()

		return { categories, tasks, dueTasks, suggestions }
	},
})

type Task = Awaited<ReturnType<typeof getAllTicketsServerFn>>[number]

type TaskListSectionProps = {
	title: string
	tasks: Task[]
	headerAction?: React.ReactNode
	emptyState?: React.ReactNode
	onPrint: (task: Task) => Promise<void>
	onArchive: (task: Task) => Promise<void>
	onEdit: (task: Task) => void
	onSkip?: (task: Task) => Promise<void>
}

function TaskListSection({
	title,
	tasks,
	headerAction,
	emptyState,
	onPrint,
	onArchive,
	onEdit,
	onSkip,
}: TaskListSectionProps) {
	return (
		<div>
			<div className="flex items-center justify-between border-orange-200/50 border-b pb-4">
				<h3 className="font-semibold text-xl">{title}</h3>
				{headerAction}
			</div>

			{tasks.length > 0 ? (
				<ul className="grid gap-4 pt-4 sm:grid-cols-1">
					{tasks.map((task) => (
						<li key={task.id}>
							<TaskCard
								task={task}
								onPrint={async (task) => {
									await onPrint(task)
								}}
								onArchive={async (task) => {
									await onArchive(task)
								}}
								onEdit={onEdit}
								onSkip={
									onSkip
										? async (task) => {
												await onSkip(task)
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
	const { categories, tasks, dueTasks, suggestions } = Route.useLoaderData()
	const router = useRouter()

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
					onCreateTask={async (input) => {
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
							await printTaskServerFn({ data: { id: task.id } })
						}
						router.invalidate()
					}}
					onPlanTask={async (input) => {
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

			{dueTasks.length > 0 && (
				<div className="mb-12 space-y-6">
					<TaskListSection
						title="Due Today"
						tasks={dueTasks}
						headerAction={
							<Button
								type="button"
								disabled={dueTasks.length === 0}
								onClick={async () => {
									await printDueTasksServerFn()
									router.invalidate()
								}}
								gradient
								size="sm"
								className="h-9 px-4"
							>
								<Printer className="mr-2 h-4 w-4" />
								Print all due
							</Button>
						}
						onPrint={async (task) => {
							await printTaskServerFn({ data: { id: task.id } })
							router.invalidate()
						}}
						onArchive={async (task) => {
							await archiveTaskServerFn({ data: { id: task.id } })
							router.invalidate()
						}}
						onSkip={async (task) => {
							await skipDueTaskServerFn({ data: { id: task.id } })
							router.invalidate()
						}}
						onEdit={() => console.log("Editing task")}
					/>
				</div>
			)}

			<TaskListSection
				title="Your Tasks"
				tasks={tasks}
				headerAction={
					<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
						{tasks.length} {tasks.length === 1 ? "task" : "tasks"}
					</span>
				}
				emptyState={
					<div className="flex flex-col items-center justify-center rounded-3xl border-2 border-orange-200 border-dashed bg-white/50 py-20 text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500">
							<Ticket className="h-8 w-8" />
						</div>
						<h4 className="mb-2 font-semibold text-lg">No tasks yet</h4>
						<p className="max-w-xs text-neutral-500">
							Create your first task above to start printing your way to
							productivity.
						</p>
					</div>
				}
				onPrint={async (task) => {
					await printTaskServerFn({ data: { id: task.id } })
					router.invalidate()
				}}
				onArchive={async (task) => {
					await archiveTaskServerFn({ data: { id: task.id } })
					router.invalidate()
				}}
				onEdit={() => console.log("Editing task")}
			/>
		</div>
	)
}
