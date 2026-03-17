import { createMiddleware, createServerFn } from "@tanstack/react-start"
import { getWebRequest } from "@tanstack/react-start/server"
import { z } from "zod"
import {
	clearSession,
	createSession,
	getSessionUser,
	verifyUserCredentials,
} from "./auth.server"
import { ensureCsrfToken, validateCsrfToken } from "./csrf"
import {
	checkLoginRateLimit,
	recordFailedLogin,
	resetLoginRateLimit,
} from "./rateLimit"

// Password validation schema with complexity requirements
const passwordSchema = z
	.string()
	.min(12, "Password must be at least 12 characters")
	.max(128, "Password must be at most 128 characters")

// Login schema (relaxed password validation for login - full validation on registration)
const loginSchema = z.object({
	username: z.string().min(1, "Username is required"),
	password: z.string().min(1, "Password is required"),
	csrfToken: z.string().min(1, "CSRF token is required"),
})

/**
 * Get client IP from request headers.
 * Checks common proxy headers and falls back to direct connection.
 */
function getClientIp(): string | undefined {
	try {
		const request = getWebRequest()
		// Check common proxy headers
		const forwarded = request.headers.get("x-forwarded-for")
		if (forwarded) {
			// x-forwarded-for can contain multiple IPs, take the first (client)
			return forwarded.split(",")[0]?.trim()
		}
		const realIp = request.headers.get("x-real-ip")
		if (realIp) {
			return realIp
		}
		return undefined
	} catch {
		return undefined
	}
}

// CSRF middleware for state-changing operations
export const csrfMiddleware = createMiddleware({ type: "function" })
	.validator(z.object({ csrfToken: z.string().min(1) }))
	.server(async ({ next, data }) => {
		const csrfToken = data.csrfToken
		if (!validateCsrfToken(csrfToken)) {
			throw new Error("Invalid CSRF token")
		}
		return next()
	})

// Authentication middleware - checks if user is logged in
export const authMiddleware = createMiddleware({ type: "function" }).server(
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

export const getSessionServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
}).handler(async () => {
	return await getSessionUser()
})

// Server function to get the CSRF token (call on page load)
export const getCsrfTokenServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
}).handler(async () => {
	return { csrfToken: ensureCsrfToken() }
})

export const loginServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.validator((data: unknown) => loginSchema.parse(data))
	.handler(async ({ data }) => {
		// Validate CSRF token
		if (!validateCsrfToken(data.csrfToken)) {
			throw new Error("Invalid CSRF token")
		}

		const ip = getClientIp()

		// Check rate limit before attempting login
		const rateLimit = checkLoginRateLimit(ip, data.username)
		if (!rateLimit.allowed) {
			const retryAfterSeconds = rateLimit.retryAfterMs
				? Math.ceil(rateLimit.retryAfterMs / 1000)
				: 1

			throw new Error(
				`Too many login attempts. Please try again in ${retryAfterSeconds} seconds.`,
			)
		}

		const user = await verifyUserCredentials(data.username, data.password)
		if (!user) {
			// Record failed attempt for rate limiting
			recordFailedLogin(ip, data.username)
			throw new Error("Invalid username or password.")
		}

		// Reset rate limit on successful login
		resetLoginRateLimit(ip, data.username)

		await createSession(user.id)
		return { ok: true }
	})

export const logoutServerFn = createServerFn({
	method: "POST",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) =>
		z.object({ csrfToken: z.string().min(1) }).parse(data),
	)
	.handler(async ({ data }) => {
		// Validate CSRF token
		if (!validateCsrfToken(data.csrfToken)) {
			throw new Error("Invalid CSRF token")
		}
		await clearSession()
		return { ok: true }
	})

// Export password schema for use in registration forms
export { passwordSchema }
