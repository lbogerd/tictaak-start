import { createFileRoute } from "@tanstack/react-router"
import { db } from "~/lib/db"
import logo from "../logo.svg"

export const Route = createFileRoute("/")({
	component: App,
	loader: async () => {
		const categories = await db.categories.findMany()
		return { categories }
	},
})

function App() {
	const { categories } = Route.useLoaderData()

	return (
		<div className="text-center">
			<header className="flex min-h-screen flex-col items-center justify-center text-[calc(10px+2vmin)] text-white">
				<img
					src={logo}
					className="pointer-events-none h-[40vmin] animate-[spin_20s_linear_infinite]"
					alt="logo"
				/>
				<p>
					Edit <code>src/routes/index.tsx</code> and save to reload.
				</p>
				<a
					className="text-[#61dafb] hover:underline"
					href="https://reactjs.org"
					target="_blank"
					rel="noopener noreferrer"
				>
					Learn React
				</a>
				<a
					className="text-[#61dafb] hover:underline"
					href="https://tanstack.com"
					target="_blank"
					rel="noopener noreferrer"
				>
					Learn TanStack
				</a>
			</header>

			<pre className="text-left">{JSON.stringify(categories, null, 2)}</pre>
		</div>
	)
}
