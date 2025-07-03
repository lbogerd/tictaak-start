import { createRouter as createTanstackRouter } from "@tanstack/react-router"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"

import "./styles.css"

// Create a new router instance
export const createRouter = () => {
	const router = createTanstackRouter({
		routeTree,
		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
		// Prevent the dev mode from complaining
		defaultNotFoundComponent: ({ data }) => (
			<div className="mt-10 text-center">
				<h1 className="font-bold text-2xl">404</h1>
				<p>Page not found</p>

				{!!data && (
					<>
						<h2 className="font-bold text-xl">Data</h2>
						<code className="font-mono text-sm">
							{JSON.stringify(data, null, 2)}
						</code>
					</>
				)}
			</div>
		),
	})

	return router
}

// Register the router instance for type safety
declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof createRouter>
	}
}
