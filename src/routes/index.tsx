import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { fallback, zodValidator } from "@tanstack/zod-adapter"
import z from "zod"
import { CreateTask } from "~/components/tasks/CreateTask"
import { db } from "~/lib/db"
import { createSearchParamFilter } from "~/lib/router/searchMiddleware"
import type { Category, Task } from "~/lib/schema"
import { getAll } from "~/lib/services/task.service"

interface IndexSearchParams {
	showArchived: boolean
}

// TODO: move to own categories service
export const getCategoriesServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const categories = await db.query.categories.findMany()
	return categories
})

const indexSearchParamsSchema = z.object({
	showArchived: fallback(z.boolean(), false).default(false),
})

export const Route = createFileRoute("/")({
	component: App,
	// validate and use search params to toggle showing archived tasks
	validateSearch: zodValidator(indexSearchParamsSchema),
	// Cast to satisfy current router type inference
	loaderDeps: ({ search }) => ({
		showArchived: (search as IndexSearchParams).showArchived,
	}),
	loader: async ({ deps: { showArchived } }) => {
		const categories = await getCategoriesServerFn()
		const tasks = await getAll(showArchived)

		return { categories, tasks }
	},

	search: {
		middlewares: [
			// Omit showArchived when false so URL stays clean
			createSearchParamFilter<{ showArchived?: boolean }>([
				{ key: "showArchived", shouldOmit: (v) => v === false },
			]),
		],
	},
})

type IndexLoaderData = { categories: Category[]; tasks: Task[] }

function App() {
	const { categories, tasks } = Route.useLoaderData() as IndexLoaderData

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
