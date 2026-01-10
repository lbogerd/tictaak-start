/**
 * In-memory rate limiter with exponential backoff for login attempts.
 * Tracks both IP-based and username-based limits.
 */

import { authLogger } from "~/lib/logger/logger"

type RateLimitEntry = {
	attempts: number
	firstAttempt: number
	lockedUntil: number | null
}

const ipLimits = new Map<string, RateLimitEntry>()
const usernameLimits = new Map<string, RateLimitEntry>()

// Configuration
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const BASE_LOCKOUT_MS = 1000 // 1 second base lockout
const MAX_LOCKOUT_MS = 15 * 60 * 1000 // 15 minutes max lockout

function getExponentialLockout(attempts: number) {
	// Exponential backoff: 1s, 2s, 4s, 8s, 16s... up to 15 minutes
	const lockout = BASE_LOCKOUT_MS * 2 ** (attempts - MAX_ATTEMPTS)
	return Math.min(lockout, MAX_LOCKOUT_MS)
}

function cleanupEntry(entry: RateLimitEntry, now: number) {
	// Reset if window has passed and not locked
	if (now - entry.firstAttempt > WINDOW_MS && !entry.lockedUntil) {
		return null
	}
	// Reset lockout if it has expired, but keep the entry for exponential backoff
	if (entry.lockedUntil && now > entry.lockedUntil) {
		entry.lockedUntil = null
	}
	return entry
}

function checkLimit(store: Map<string, RateLimitEntry>, key: string) {
	const now = Date.now()
	let entry = store.get(key)

	if (entry) {
		const cleaned = cleanupEntry(entry, now)
		if (!cleaned) {
			store.delete(key)
			entry = undefined
		} else {
			entry = cleaned
			store.set(key, entry)
		}
	}

	if (!entry) {
		return { allowed: true }
	}

	// Check if currently locked out
	if (entry.lockedUntil && now < entry.lockedUntil) {
		return { allowed: false, retryAfterMs: entry.lockedUntil - now }
	}

	return { allowed: true }
}

function recordAttempt(store: Map<string, RateLimitEntry>, key: string) {
	const now = Date.now()
	let entry = store.get(key)

	if (entry) {
		const cleaned = cleanupEntry(entry, now)
		entry = cleaned ?? undefined
	}

	if (!entry) {
		entry = { attempts: 1, firstAttempt: now, lockedUntil: null }
	} else {
		entry.attempts++
	}

	// Set lockout if attempts reach or exceed the limit
	if (entry.attempts >= MAX_ATTEMPTS) {
		const lockoutMs = getExponentialLockout(entry.attempts)
		entry.lockedUntil = now + lockoutMs
	}

	store.set(key, entry)
}

function resetLimit(store: Map<string, RateLimitEntry>, key: string) {
	store.delete(key)
}

export type RateLimitResult =
	| { allowed: true }
	| { allowed: false; retryAfterMs: number }

/**
 * Check if a login attempt is allowed for the given IP and username.
 * Both must pass for the attempt to be allowed.
 */
export function checkLoginRateLimit(ip: string | undefined, username: string) {
	// Check both limits - we need to evaluate both even if one fails
	// to ensure lockouts are properly set on both
	const ipResult = ip ? checkLimit(ipLimits, ip) : { allowed: true }
	const usernameResult = checkLimit(usernameLimits, username.toLowerCase())

	// Return the result with the longest retry time if either is blocked
	if (!ipResult.allowed && ipResult.retryAfterMs !== undefined) {
		authLogger.warn(
			{ ip, retryAfterMs: ipResult.retryAfterMs },
			"Rate limit exceeded for IP",
		)
		if (
			!usernameResult.allowed &&
			usernameResult.retryAfterMs !== undefined &&
			usernameResult.retryAfterMs > ipResult.retryAfterMs
		) {
			authLogger.warn(
				{ username, retryAfterMs: usernameResult.retryAfterMs },
				"Rate limit exceeded for username",
			)
			return { allowed: false, retryAfterMs: usernameResult.retryAfterMs }
		}
		return { allowed: false, retryAfterMs: ipResult.retryAfterMs }
	}

	if (!usernameResult.allowed && usernameResult.retryAfterMs !== undefined) {
		authLogger.warn(
			{ username, retryAfterMs: usernameResult.retryAfterMs },
			"Rate limit exceeded for username",
		)
		return { allowed: false, retryAfterMs: usernameResult.retryAfterMs }
	}

	return { allowed: true }
}

/**
 * Record a failed login attempt for the given IP and username.
 */
export function recordFailedLogin(ip: string | undefined, username: string) {
	if (ip) {
		recordAttempt(ipLimits, ip)
	}
	recordAttempt(usernameLimits, username.toLowerCase())

	const ipEntry = ip ? ipLimits.get(ip) : null
	const usernameEntry = usernameLimits.get(username.toLowerCase())
	authLogger.debug(
		{
			ip,
			username,
			ipAttempts: ipEntry?.attempts,
			usernameAttempts: usernameEntry?.attempts,
		},
		"Failed login attempt recorded",
	)
}

/**
 * Reset rate limits for a successful login.
 */
export function resetLoginRateLimit(ip: string | undefined, username: string) {
	if (ip) {
		resetLimit(ipLimits, ip)
	}
	resetLimit(usernameLimits, username.toLowerCase())
	authLogger.debug({ ip, username }, "Rate limit reset after successful login")
}

// Periodic cleanup of stale entries (run every 5 minutes)
setInterval(
	() => {
		const now = Date.now()
		let ipCleaned = 0
		let usernameCleaned = 0

		for (const [key, entry] of ipLimits) {
			if (!cleanupEntry(entry, now)) {
				ipLimits.delete(key)
				ipCleaned++
			}
		}
		for (const [key, entry] of usernameLimits) {
			if (!cleanupEntry(entry, now)) {
				usernameLimits.delete(key)
				usernameCleaned++
			}
		}

		if (ipCleaned > 0 || usernameCleaned > 0) {
			authLogger.debug(
				{
					ipEntriesCleared: ipCleaned,
					usernameEntriesCleared: usernameCleaned,
				},
				"Rate limit entries cleaned up",
			)
		}
	},
	5 * 60 * 1000,
)
