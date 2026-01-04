import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Ticket } from "lucide-react"
import { z } from "zod"
import { CreateTask } from "~/components/tasks/CreateTask"
import { TaskCard } from "~/components/tasks/TaskCard"
import { toStartOfDay } from "~/logic/dates/taskDates"
import { db } from "~/logic/db/db"
import { categories } from "~/logic/db/schema"
import { create, getAll } from "~/logic/services/task.service"

export const getCategoriesServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const categories = await db.query.categories.findMany()
	return categories
})

export const getAllTicketsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const tickets = await getAll()
	return tickets
})

export const createTaskServerFn = createServerFn({
	method: "POST",
})
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
})
	.validator((data: unknown) => z.object({ name: z.string() }).parse(data))
	.handler(async ({ data }) => {
		const result = await db.insert(categories).values(data).returning()
		return result[0]
	})

export const Route = createFileRoute("/")({
	component: App,
	loader: async () => {
		const categories = await getCategoriesServerFn()
		const tasks = await getAllTicketsServerFn()

		return { categories, tasks }
	},
})

function App() {
	const { categories, tasks } = Route.useLoaderData()
	const router = useRouter()

	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
			<section className="mb-12 text-center">
				<h2 className="mb-4 font-bold text-3xl tracking-tight sm:text-4xl">
					Ready to get things done?
				</h2>
				<p className="mx-auto max-w-2xl text-lg text-neutral-600">
					Create tasks, schedule them, and print them as physical tickets to
					keep your focus where it matters.
				</p>
			</section>

			<div className="mb-12">
				<CreateTask
					categories={categories}
					onCreateCategory={async (name) => {
						const newCategory = await createCategoryServerFn({ data: { name } })
						router.invalidate()
						return newCategory.id
					}}
					onCreateTask={async (input) => {
						await createTaskServerFn({
							data: {
								title: input.text,
								categoryId: input.categoryId,
								nextPrintDate: toStartOfDay(new Date()),
							},
						})
						router.invalidate()
					}}
					onPlanTask={async (input) => {
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

			<div className="space-y-6">
				<div className="flex items-center justify-between border-orange-200/50 border-b pb-4">
					<h3 className="font-semibold text-xl">Your Tasks</h3>
					<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
						{tasks.length} {tasks.length === 1 ? "task" : "tasks"}
					</span>
				</div>

				{tasks.length > 0 ? (
					<ul className="grid gap-4 sm:grid-cols-1">
						{tasks.map((task) => (
							<li key={task.id}>
								<TaskCard
									task={task}
									onPrint={() => console.log("Printing task:", task)}
									onArchive={() => console.log("Archiving task:", task)}
									onEdit={() => console.log("Editing task:", task)}
								/>
							</li>
						))}
					</ul>
				) : (
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
				)}
			</div>
		</div>
	)
}
