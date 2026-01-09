import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import {
	clearSession,
	createSession,
	getSessionUser,
	verifyUserCredentials,
} from "./auth.server"

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

export const logoutServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
}).handler(async () => {
	await clearSession()
	return { ok: true }
})
