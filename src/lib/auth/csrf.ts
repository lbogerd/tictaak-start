/**
 * CSRF protection using double-submit cookie pattern.
 *
 * How it works:
 * 1. Server generates a random token and sets it as a cookie
 * 2. Client reads the cookie and sends it back in a header/body
 * 3. Server compares the cookie value with the header/body value
 *
 * This works because an attacker cannot read cookies from another domain
 * (same-origin policy), so they cannot forge the header/body value.
 */

import { getCookie, setCookie } from "@tanstack/react-start/server"
import { randomBytes, timingSafeEqual } from "node:crypto"
import { env } from "~/env"

const CSRF_COOKIE_NAME = "tictaak_csrf"
const CSRF_TOKEN_LENGTH = 32

function shouldUseSecureCookies() {
	return env.NODE_ENV === "production"
}

/**
 * Get or create a CSRF token. Sets the cookie if not present.
 */
export function getOrCreateCsrfToken(): string {
	const existing = getCookie(CSRF_COOKIE_NAME)
	if (existing && existing.length === CSRF_TOKEN_LENGTH * 2) {
		return existing
	}

	const token = randomBytes(CSRF_TOKEN_LENGTH).toString("hex")
	setCookie(CSRF_COOKIE_NAME, token, {
		httpOnly: false, // Must be readable by JavaScript
		secure: shouldUseSecureCookies(),
		sameSite: "strict",
		path: "/",
		maxAge: 60 * 60 * 24, // 24 hours
	})

	return token
}

/**
 * Validate that the provided token matches the cookie token.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function validateCsrfToken(providedToken: string | undefined): boolean {
	const cookieToken = getCookie(CSRF_COOKIE_NAME)

	if (!cookieToken || !providedToken) {
		return false
	}

	// Ensure both tokens have the expected length
	if (
		cookieToken.length !== CSRF_TOKEN_LENGTH * 2 ||
		providedToken.length !== CSRF_TOKEN_LENGTH * 2
	) {
		return false
	}

	try {
		const cookieBuffer = Buffer.from(cookieToken, "hex")
		const providedBuffer = Buffer.from(providedToken, "hex")
		return timingSafeEqual(cookieBuffer, providedBuffer)
	} catch {
		return false
	}
}

/**
 * Server function to get the current CSRF token.
 * Call this on page load to ensure the cookie is set.
 */
export function ensureCsrfToken(): string {
	return getOrCreateCsrfToken()
}
