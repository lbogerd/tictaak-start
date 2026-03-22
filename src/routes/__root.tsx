import {
	createRootRoute,
	HeadContent,
	Link,
	Outlet,
	redirect,
	Scripts,
	useRouter,
} from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools"
import { Archive, Home } from "lucide-react"
import { useState } from "react"
import { Button } from "~/components/ui/Button"
import { Toaster } from "~/components/ui/Toast"
import Version from "~/components/Version"
import { getSessionServerFn, logoutServerFn } from "~/lib/auth/serverFns"
import appCss from "../styles.css?url"

export const Route = createRootRoute({
	beforeLoad: async ({ location }) => {
		// Gate all routes except /login behind a session check.
		if (location.pathname === "/login") {
			return
		}
		const user = await getSessionServerFn()
		if (!user) {
			const redirectTo = location.href
			throw redirect({ to: "/login", search: { redirect: redirectTo } })
		}
	},
	loader: async () => {
		// Expose the user to the root layout so header nav can update.
		const user = await getSessionServerFn()
		return { user }
	},
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

	component: RootComponent,
})

function RootComponent() {
	const { user } = Route.useLoaderData()

	return (
		// RootDocument renders the HTML shell and shared layout.
		<RootDocument user={user}>
			<Outlet />
			<Toaster />
			<TanStackRouterDevtools />
		</RootDocument>
	)
}

function RootDocument({
	children,
	user,
}: {
	children: React.ReactNode
	user: { id: string; username: string } | null
}) {
	return (
		// The root document is the only place we can render <html>/<body>.
		<html lang="en" className="bg-yellow-50">
			<head>
				<HeadContent />
			</head>
			<body className="min-h-dvh bg-gradient-to-b from-yellow-50 via-orange-50 to-red-50 font-sans text-neutral-950 antialiased">
				<header className="sticky top-0 z-50 w-full border-orange-200/50 border-b bg-yellow-50/80 backdrop-blur-md">
					<div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-4 px-4">
						<Link to="/" className="flex items-center gap-2">
							<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-lg shadow-rose-500/20">
								<span className="font-bold text-xl">T</span>
							</div>
							<div>
								<h1 className="font-bold text-xl tracking-tight">TicTaak</h1>
								<p className="hidden text-neutral-500 text-xs sm:block">
									Physical tickets for your digital tasks
								</p>
							</div>
						</Link>

						{user ? (
							<div className="flex items-center gap-3">
								<nav className="flex items-center gap-2">
									<Link
										to="/"
										className="flex items-center gap-2 rounded-lg px-3 py-2 text-neutral-700 text-sm transition-colors hover:bg-orange-100 hover:text-neutral-900 [&.active]:bg-orange-100 [&.active]:font-semibold [&.active]:text-neutral-900"
										activeProps={{ className: "active" }}
									>
										<Home className="h-4 w-4" />
										<span className="hidden sm:inline">Tasks</span>
									</Link>
									<Link
										to="/archived"
										className="flex items-center gap-2 rounded-lg px-3 py-2 text-neutral-700 text-sm transition-colors hover:bg-orange-100 hover:text-neutral-900 [&.active]:bg-orange-100 [&.active]:font-semibold [&.active]:text-neutral-900"
										activeProps={{ className: "active" }}
									>
										<Archive className="h-4 w-4" />
										<span className="hidden sm:inline">Archived</span>
									</Link>
								</nav>
								<div aria-hidden="true" className="h-6 w-px bg-orange-200/80" />
								<div className="flex items-center gap-2 text-neutral-600 text-xs sm:text-sm">
									<span className="hidden font-medium text-neutral-700 sm:inline">
										{user.username}
									</span>
									<LogoutButton />
								</div>
							</div>
						) : null}
					</div>
				</header>

				<main className="relative">{children}</main>

				<Scripts />

				<Version />
			</body>
		</html>
	)
}

function LogoutButton() {
	const router = useRouter()
	const [pending, setPending] = useState(false)

	return (
		<Button
			variant="outline"
			size="sm"
			disabled={pending}
			onClick={async () => {
				// Logging out clears the session and refreshes router data.
				setPending(true)
				try {
					await logoutServerFn()
					await router.invalidate()
					await router.navigate({ to: "/login" })
				} finally {
					setPending(false)
				}
			}}
		>
			Log out
		</Button>
	)
}
