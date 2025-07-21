import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { CreateTask } from "~/components/tasks/Create"
import { db } from "~/lib/db"

export const getCategoriesServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const categories = await db.category.findMany()
	return categories
})

export const Route = createFileRoute("/")({
	component: App,
	loader: async () => {
		const categories = await getCategoriesServerFn()
		return { categories }
	},
})

function App() {
	const { categories } = Route.useLoaderData()

	return (
		<div className="mx-auto max-w-4xl p-4">
			<CreateTask
				categories={categories}
				onCreateTask={(input) => {
					console.log("Creating task now:", input)
				}}
				onPlanTask={(input) => {
					console.log("Planning task for later:", input)
				}}
			/>

			{/* <pre className="text-left">{JSON.stringify(categories, null, 2)}</pre>

			<Button variant="default" size="lg" gradient>
				Click Me
			</Button>

			<Button variant="secondary" size="lg" gradient>
				Click Me
			</Button> */}
		</div>
	)
}
