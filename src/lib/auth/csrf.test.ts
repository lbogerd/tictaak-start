import { describe, expect, it, vi } from "vitest"

// Mock the Tanstack cookie functions
const mockCookies = new Map<string, string>()

vi.mock("@tanstack/react-start/server", () => ({
	getCookie: (name: string) => mockCookies.get(name),
	setCookie: (name: string, value: string) => {
		mockCookies.set(name, value)
	},
}))

// Import after mocking
const { getOrCreateCsrfToken, validateCsrfToken, ensureCsrfToken } = await import(
	"./csrf"
)

describe("getOrCreateCsrfToken", () => {
	it("creates a new token if none exists", () => {
		mockCookies.clear()

		const token = getOrCreateCsrfToken()

		expect(token).toBeDefined()
		expect(token.length).toBe(64) // 32 bytes in hex
		expect(token).toMatch(/^[0-9a-f]+$/)
		expect(mockCookies.get("tictaak_csrf")).toBe(token)
	})

	it("returns existing token if valid", () => {
		mockCookies.clear()
		const existingToken = "a".repeat(64)
		mockCookies.set("tictaak_csrf", existingToken)

		const token = getOrCreateCsrfToken()

		expect(token).toBe(existingToken)
	})

	it("creates a new token if existing token is invalid length", () => {
		mockCookies.clear()
		const invalidToken = "short"
		mockCookies.set("tictaak_csrf", invalidToken)

		const token = getOrCreateCsrfToken()

		expect(token).not.toBe(invalidToken)
		expect(token.length).toBe(64)
	})
})

describe("validateCsrfToken", () => {
	it("returns true for matching tokens", () => {
		mockCookies.clear()
		const token = "a".repeat(64)
		mockCookies.set("tictaak_csrf", token)

		const result = validateCsrfToken(token)

		expect(result).toBe(true)
	})

	it("returns false for mismatched tokens", () => {
		mockCookies.clear()
		const cookieToken = "a".repeat(64)
		const providedToken = "b".repeat(64)
		mockCookies.set("tictaak_csrf", cookieToken)

		const result = validateCsrfToken(providedToken)

		expect(result).toBe(false)
	})

	it("returns false when no cookie token exists", () => {
		mockCookies.clear()
		const providedToken = "a".repeat(64)

		const result = validateCsrfToken(providedToken)

		expect(result).toBe(false)
	})

	it("returns false when provided token is undefined", () => {
		mockCookies.clear()
		mockCookies.set("tictaak_csrf", "a".repeat(64))

		const result = validateCsrfToken(undefined)

		expect(result).toBe(false)
	})

	it("returns false for tokens with invalid length", () => {
		mockCookies.clear()
		mockCookies.set("tictaak_csrf", "a".repeat(64))

		expect(validateCsrfToken("short")).toBe(false)
		expect(validateCsrfToken("a".repeat(32))).toBe(false)
		expect(validateCsrfToken("a".repeat(128))).toBe(false)
	})

	it("returns false for non-hex tokens", () => {
		mockCookies.clear()
		mockCookies.set("tictaak_csrf", "a".repeat(64))

		const invalidToken = "z".repeat(64)
		const result = validateCsrfToken(invalidToken)

		expect(result).toBe(false)
	})

	it("validates hex format correctly", () => {
		mockCookies.clear()
		const token = "abcdef0123456789".repeat(4)
		mockCookies.set("tictaak_csrf", token)

		expect(validateCsrfToken(token)).toBe(true)
		// Uppercase hex is valid and treated as equivalent
		expect(validateCsrfToken(token.toUpperCase())).toBe(true)
	})
})

describe("ensureCsrfToken", () => {
	it("returns a valid CSRF token", () => {
		mockCookies.clear()

		const token = ensureCsrfToken()

		expect(token).toBeDefined()
		expect(token.length).toBe(64)
		expect(mockCookies.get("tictaak_csrf")).toBe(token)
	})

	it("returns the same token if called multiple times", () => {
		mockCookies.clear()

		const token1 = ensureCsrfToken()
		const token2 = ensureCsrfToken()

		expect(token1).toBe(token2)
	})
})
