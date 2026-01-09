import { createFileRoute, redirect, useRouter } from "@tanstack/react-router"
import { useId, useState, useTransition } from "react"
import { z } from "zod"
import { Button } from "~/components/ui/Button"
import { Input } from "~/components/ui/Input"
import { getSessionServerFn, loginServerFn } from "~/lib/auth/serverFns"

export const Route = createFileRoute("/login")({
	validateSearch: z.object({
		redirect: z.string().optional(),
	}),
	beforeLoad: async ({ search }) => {
		const user = await getSessionServerFn()
		if (user) {
			throw redirect({ to: search.redirect || "/" })
		}
	},
	component: LoginPage,
})

function LoginPage() {
	const router = useRouter()
	const { redirect: redirectTo } = Route.useSearch()
	const [error, setError] = useState<string | null>(null)
	const [pending, startTransition] = useTransition()
	const usernameId = useId()
	const passwordId = useId()

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		setError(null)

		const formData = new FormData(event.currentTarget)
		const username = String(formData.get("username") || "").trim()
		const password = String(formData.get("password") || "")

		startTransition(async () => {
			try {
				await loginServerFn({ data: { username, password } })
				await router.invalidate()
				await router.navigate({ to: redirectTo || "/" })
			} catch (err) {
				const message = err instanceof Error ? err.message : "Login failed."
				setError(message)
			}
		})
	}

	return (
		<div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-4xl items-center justify-center px-4 py-12">
			<div className="w-full max-w-md rounded-3xl border border-orange-200/60 bg-white/80 p-8 shadow-orange-100/40 shadow-xl">
				<div className="mb-6 text-center">
					<h2 className="font-bold text-3xl tracking-tight">Welcome back</h2>
					<p className="mt-2 text-neutral-600 text-sm">
						Sign in to access your tickets.
					</p>
				</div>

				<form className="space-y-4" onSubmit={handleSubmit}>
					<div className="block text-sm">
						<label
							htmlFor={usernameId}
							className="mb-2 block font-semibold text-neutral-700"
						>
							Username
						</label>
						<Input
							id={usernameId}
							name="username"
							autoComplete="username"
							required
							placeholder="your-name"
						/>
					</div>

					<div className="block text-sm">
						<label
							htmlFor={passwordId}
							className="mb-2 block font-semibold text-neutral-700"
						>
							Password
						</label>
						<Input
							id={passwordId}
							type="password"
							name="password"
							autoComplete="current-password"
							required
						/>
					</div>

					{error ? (
						<div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 text-sm">
							{error}
						</div>
					) : null}

					<Button type="submit" className="w-full" gradient disabled={pending}>
						{pending ? "Signing in..." : "Sign in"}
					</Button>
				</form>
			</div>
		</div>
	)
}
