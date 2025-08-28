import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { CreateTask } from "~/components/tasks/CreateTask"
import { TaskCard } from "~/components/tasks/TaskCard"
import { db } from "~/logic/db/db"
import { getAll } from "~/logic/services/task.service"

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

	return (
		<div className="mx-auto max-w-4xl p-4">
			<CreateTask
				categories={categories}
				// TODO: Implement these handlers.
				// Should be done AFTER the rest of the app is implemented.
				onCreateTask={(input) => {
					console.log("Creating task now:", input)
				}}
				onPlanTask={(input) => {
					console.log("Planning task for later:", input)
				}}
			/>

			<ul className="mt-8 flex flex-col gap-4">
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
		</div>
	)
}
