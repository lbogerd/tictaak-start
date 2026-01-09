import { createMiddleware, createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import {
	clearSession,
	createSession,
	getSessionUser,
	verifyUserCredentials,
} from "./auth.server"

// Authentication middleware - checks if user is logged in
const authMiddleware = createMiddleware({ type: "function" }).server(
	async ({ next }) => {
		const user = await getSessionUser()

		if (!user) {
			throw new Error("Unauthorized - Please login")
		}

		return next({
			context: {
				userId: user.id,
				user,
				isAuthenticated: true,
			},
		})
	},
)

// Factory function for creating authenticated server functions
export function createAuthServerFn(options?: { method?: "GET" | "POST" }) {
	return createServerFn(options).middleware([authMiddleware])
}

export const getSessionServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
}).handler(async () => {
	return await getSessionUser()
})

export const loginServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.validator((data: unknown) =>
		z.object({ username: z.string(), password: z.string() }).parse(data),
	)
	.handler(async ({ data }) => {
		const user = await verifyUserCredentials(data.username, data.password)
		if (!user) {
			throw new Error("Invalid username or password.")
		}

		await createSession(user.id)
		return { ok: true }
	})

export const logoutServerFn = createAuthServerFn({
	method: "POST",
}).handler(async () => {
	await clearSession()
	return { ok: true }
})
