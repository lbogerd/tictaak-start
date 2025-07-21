import {
	createRootRoute,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import Version from "~/components/Version"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{
				title: "TicTaak",
			},
			{
				name: "description",
				content: "Print your todos as physical tickets",
			},
			{
				name: "theme-color",
				// yellow-50
				content: "oklch(98.7% 0.026 102.212)",
			},
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
		],
	}),

	component: () => (
		<RootDocument>
			<Outlet />

			<TanStackRouterDevtools />
		</RootDocument>
	),
})

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" className="bg-yellow-50">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-dvh bg-gradient-to-b from-yellow-50 via-orange-50 to-red-50">
				{children}

				<Scripts />

				<Version />
			</body>
		</html>
	)
}
