import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { CreateTask } from "~/components/tasks/Create"
import { db } from "~/lib/db"
import { getAll } from "~/lib/services/task.service"

export const getCategoriesServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const categories = await db.query.categories.findMany()
	return categories
})

export const Route = createFileRoute("/")({
	component: App,
	loader: async () => {
		const categories = await getCategoriesServerFn()
		const tasks = await getAll()

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

			<ul>
				{tasks.map((task) => (
					<li key={task.id}>{task.title}</li>
				))}
			</ul>
		</div>
	)
}
