import { createRouter as createTanstackRouter } from "@tanstack/react-router"

// Import the generated route tree
import { routeTree } from "./routeTree.gen"

// Create a new router instance
export function createRouter() {
	const router = createTanstackRouter({
		routeTree,
		context: {},

		scrollRestoration: true,
		defaultPreloadStaleTime: 0,
	})

	return router
}
