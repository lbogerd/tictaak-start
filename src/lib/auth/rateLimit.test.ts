import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
	checkLoginRateLimit,
	recordFailedLogin,
	resetLoginRateLimit,
} from "./rateLimit"

describe("checkLoginRateLimit", () => {
	// Use unique identifiers for each test to avoid state pollution
	let testCounter = 0

	function getUniqueIds() {
		testCounter++
		return {
			ip: `192.168.1.${testCounter}`,
			username: `testuser${testCounter}`,
		}
	}

	it("allows first attempt", () => {
		const { ip, username } = getUniqueIds()
		const result = checkLoginRateLimit(ip, username)

		expect(result.allowed).toBe(true)
	})

	it("allows attempts under the limit", () => {
		const { ip, username } = getUniqueIds()

		// Record 4 failed attempts (limit is 5)
		for (let i = 0; i < 4; i++) {
			recordFailedLogin(ip, username)
		}

		const result = checkLoginRateLimit(ip, username)

		expect(result.allowed).toBe(true)
	})

	it("blocks after exceeding max attempts", () => {
		const { ip, username } = getUniqueIds()

		// Record 5 failed attempts (hitting the limit)
		for (let i = 0; i < 5; i++) {
			recordFailedLogin(ip, username)
		}

		const result = checkLoginRateLimit(ip, username)

		expect(result.allowed).toBe(false)
		if (!result.allowed) {
			expect(result.retryAfterMs).toBeGreaterThan(0)
		}
	})

	it("implements exponential backoff", async () => {
		const { ip, username } = getUniqueIds()

		// Get to lockout state (5 attempts)
		for (let i = 0; i < 5; i++) {
			recordFailedLogin(ip, username)
		}

		// Check produces a 1000ms lockout (BASE_LOCKOUT_MS * 2^0)
		const result1 = checkLoginRateLimit(ip, username)
		expect(result1.allowed).toBe(false)
		expect(result1.retryAfterMs).toBeGreaterThanOrEqual(900) // ~1000ms

		// Wait for the lockout to expire
		await new Promise((resolve) => setTimeout(resolve, 1100))

		// Now the lockout has expired, record more attempts
		recordFailedLogin(ip, username) // 6th attempt
		const result2 = checkLoginRateLimit(ip, username)
		expect(result2.allowed).toBe(false)
		// 6 attempts: BASE_LOCKOUT_MS * 2^(6-5) = 1000 * 2 = 2000ms
		expect(result2.retryAfterMs).toBeGreaterThanOrEqual(1800)
		expect(result2.retryAfterMs).toBeLessThanOrEqual(2100)
	})

	it("blocks by username independently of IP", () => {
		const username = `blockeduser${testCounter++}`

		// Block username from different IPs
		for (let i = 1; i <= 5; i++) {
			recordFailedLogin(`10.0.0.${i}`, username)
		}

		// Should be blocked from a new IP
		const result = checkLoginRateLimit("10.0.0.100", username)

		expect(result.allowed).toBe(false)
	})

	it("blocks by IP independently of username", () => {
		const ip = `172.16.0.${testCounter++}`

		// Block IP with different usernames
		for (let i = 1; i <= 5; i++) {
			recordFailedLogin(ip, `user${i}${testCounter}`)
		}

		// Should be blocked for a new username
		const result = checkLoginRateLimit(ip, `newuser${testCounter}`)

		expect(result.allowed).toBe(false)
	})

	it("handles missing IP gracefully", () => {
		const username = `noipuser${testCounter++}`

		// Should still track by username
		for (let i = 0; i < 5; i++) {
			recordFailedLogin(undefined, username)
		}

		const result = checkLoginRateLimit(undefined, username)

		expect(result.allowed).toBe(false)
	})

	it("is case insensitive for usernames", () => {
		const ip = `192.168.100.${testCounter++}`
		const baseUsername = `CaseTestUser${testCounter}`

		// Record attempts with different cases
		recordFailedLogin(ip, `${baseUsername}`)
		recordFailedLogin(ip, baseUsername.toLowerCase())
		recordFailedLogin(ip, baseUsername.toUpperCase())
		recordFailedLogin(ip, `${baseUsername}Mixed`)
		recordFailedLogin(ip, `${baseUsername}LAST`)

		// Should be blocked regardless of case
		const result1 = checkLoginRateLimit(ip, baseUsername.toLowerCase())
		const result2 = checkLoginRateLimit(ip, baseUsername)
		const result3 = checkLoginRateLimit(ip, baseUsername.toUpperCase())

		expect(result1.allowed).toBe(false)
		expect(result2.allowed).toBe(false)
		expect(result3.allowed).toBe(false)
	})

	it("returns retry time that counts down", async () => {
		const { ip, username } = getUniqueIds()

		// Block the user
		for (let i = 0; i < 5; i++) {
			recordFailedLogin(ip, username)
		}

		const result1 = checkLoginRateLimit(ip, username)
		expect(result1.allowed).toBe(false)
		const firstRetry = result1.retryAfterMs

		// Wait a bit
		await new Promise((resolve) => setTimeout(resolve, 100))

		const result2 = checkLoginRateLimit(ip, username)
		expect(result2.allowed).toBe(false)
		const secondRetry = result2.retryAfterMs

		// Retry time should decrease
		// biome-ignore lint/style/noNonNullAssertion: acceptable here for test
		expect(secondRetry).toBeLessThan(firstRetry!)
	})
})

describe("recordFailedLogin", () => {
	let testCounter = 100

	function getUniqueIds() {
		testCounter++
		return {
			ip: `10.10.10.${testCounter}`,
			username: `recorduser${testCounter}`,
		}
	}

	it("records attempts for IP and username", () => {
		const { ip, username } = getUniqueIds()

		recordFailedLogin(ip, username)
		recordFailedLogin(ip, username)

		// Verify by checking the limit (should still be allowed after 2 attempts)
		const result = checkLoginRateLimit(ip, username)
		expect(result.allowed).toBe(true)
	})

	it("handles undefined IP", () => {
		const username = `nouserip${testCounter++}`

		// Should not throw
		expect(() => recordFailedLogin(undefined, username)).not.toThrow()
	})

	it("increments attempt counter", () => {
		const { ip, username } = getUniqueIds()

		// Record attempts up to the limit
		for (let i = 0; i < 4; i++) {
			recordFailedLogin(ip, username)
			const result = checkLoginRateLimit(ip, username)
			expect(result.allowed).toBe(true)
		}

		// One more should hit the limit
		recordFailedLogin(ip, username)
		const finalResult = checkLoginRateLimit(ip, username)
		expect(finalResult.allowed).toBe(false)
	})
})

describe("resetLoginRateLimit", () => {
	let testCounter = 200

	function getUniqueIds() {
		testCounter++
		return {
			ip: `172.20.0.${testCounter}`,
			username: `resetuser${testCounter}`,
		}
	}

	it("resets limits after failed attempts", () => {
		const { ip, username } = getUniqueIds()

		// Block the user
		for (let i = 0; i < 5; i++) {
			recordFailedLogin(ip, username)
		}

		expect(checkLoginRateLimit(ip, username).allowed).toBe(false)

		// Reset should unblock
		resetLoginRateLimit(ip, username)

		const result = checkLoginRateLimit(ip, username)
		expect(result.allowed).toBe(true)
	})

	it("resets IP and username independently", () => {
		const { ip, username } = getUniqueIds()

		// Block both
		for (let i = 0; i < 5; i++) {
			recordFailedLogin(ip, username)
		}

		// Reset should clear both
		resetLoginRateLimit(ip, username)

		// Should be allowed from different IP
		expect(checkLoginRateLimit(`1.2.3.${testCounter}`, username).allowed).toBe(
			true,
		)

		// Should be allowed with different username
		expect(checkLoginRateLimit(ip, `other${testCounter}`).allowed).toBe(true)
	})

	it("handles undefined IP", () => {
		const username = `resetnoip${testCounter++}`

		// Block username
		for (let i = 0; i < 5; i++) {
			recordFailedLogin(undefined, username)
		}

		// Reset should not throw
		expect(() => resetLoginRateLimit(undefined, username)).not.toThrow()

		// Should be unblocked
		const result = checkLoginRateLimit(undefined, username)
		expect(result.allowed).toBe(true)
	})

	it("handles reset on non-existent entries", () => {
		// Should not throw when resetting entries that don't exist
		expect(() =>
			resetLoginRateLimit(
				`10.255.255.${testCounter}`,
				`nonexistent${testCounter}`,
			),
		).not.toThrow()
	})
})

describe("rate limit window expiry", () => {
	let testCounter = 300

	beforeEach(() => {
		vi.useFakeTimers()
	})

	it("resets after window expires", () => {
		const ip = `192.168.50.${testCounter++}`
		const username = `expireuser${testCounter}`

		// Record some failed attempts
		for (let i = 0; i < 4; i++) {
			recordFailedLogin(ip, username)
		}

		// Advance time past the 15-minute window
		vi.advanceTimersByTime(16 * 60 * 1000)

		// Should be reset automatically
		const result = checkLoginRateLimit(ip, username)
		expect(result.allowed).toBe(true)
	})

	it("lockout expires after backoff period", () => {
		const ip = `192.168.51.${testCounter++}`
		const username = `lockoutuser${testCounter}`

		// Record 5 attempts to trigger lockout
		for (let i = 0; i < 5; i++) {
			recordFailedLogin(ip, username)
		}

		// Check that we're locked
		const result1 = checkLoginRateLimit(ip, username)
		expect(result1.allowed).toBe(false)
		expect(result1.retryAfterMs).toBeGreaterThan(900) // Should be ~1000ms

		// Advance time past the lockout period
		vi.advanceTimersByTime(1100)

		// Now should be unlocked
		const result2 = checkLoginRateLimit(ip, username)
		expect(result2.allowed).toBe(true)
	})

	afterEach(() => {
		vi.useRealTimers()
	})
})
