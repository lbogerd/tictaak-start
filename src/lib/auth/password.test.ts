import { describe, expect, it } from "vitest"
import { hashPassword, verifyPassword, verifyPasswordDummy } from "./password"

describe("hashPassword", () => {
	it("generates a hash and salt for a password", async () => {
		const password = "testPassword123"
		const result = await hashPassword(password)

		expect(result.hash).toBeDefined()
		expect(result.salt).toBeDefined()
		expect(result.hash).toMatch(/^[0-9a-f]+$/)
		expect(result.salt).toMatch(/^[0-9a-f]+$/)
		expect(result.hash.length).toBe(128) // 64 bytes in hex
		expect(result.salt.length).toBe(32) // 16 bytes in hex
	})

	it("generates different salts for the same password", async () => {
		const password = "samePassword"
		const result1 = await hashPassword(password)
		const result2 = await hashPassword(password)

		expect(result1.salt).not.toBe(result2.salt)
		expect(result1.hash).not.toBe(result2.hash)
	})

	it("generates different hashes for different passwords", async () => {
		const result1 = await hashPassword("password1")
		const result2 = await hashPassword("password2")

		expect(result1.hash).not.toBe(result2.hash)
	})
})

describe("verifyPassword", () => {
	it("returns true for correct password", async () => {
		const password = "correctPassword"
		const { hash, salt } = await hashPassword(password)

		const result = await verifyPassword(password, salt, hash)

		expect(result).toBe(true)
	})

	it("returns false for incorrect password", async () => {
		const password = "correctPassword"
		const { hash, salt } = await hashPassword(password)

		const result = await verifyPassword("wrongPassword", salt, hash)

		expect(result).toBe(false)
	})

	it("returns false for wrong salt", async () => {
		const password = "testPassword"
		const { hash } = await hashPassword(password)
		const wrongSalt = "0".repeat(32)

		const result = await verifyPassword(password, wrongSalt, hash)

		expect(result).toBe(false)
	})

	it("returns false for malformed hash", async () => {
		const password = "testPassword"
		const { salt } = await hashPassword(password)
		const malformedHash = "notavalidhash"

		const result = await verifyPassword(password, salt, malformedHash)

		expect(result).toBe(false)
	})

	it("handles case sensitivity correctly", async () => {
		const password = "CaseSensitive123"
		const { hash, salt } = await hashPassword(password)

		expect(await verifyPassword(password, salt, hash)).toBe(true)
		expect(await verifyPassword("casesensitive123", salt, hash)).toBe(false)
		expect(await verifyPassword("CASESENSITIVE123", salt, hash)).toBe(false)
	})
})

describe("verifyPasswordDummy", () => {
	it("returns false for any password", async () => {
		const result1 = await verifyPasswordDummy("password1")
		const result2 = await verifyPasswordDummy("password2")
		const result3 = await verifyPasswordDummy("")

		expect(result1).toBe(false)
		expect(result2).toBe(false)
		expect(result3).toBe(false)
	})

	it("takes approximately the same time as real verification", async () => {
		// This test ensures timing attack protection
		const password = "testPassword"
		const { hash, salt } = await hashPassword(password)

		const start1 = Date.now()
		await verifyPassword(password, salt, hash)
		const time1 = Date.now() - start1

		const start2 = Date.now()
		await verifyPasswordDummy(password)
		const time2 = Date.now() - start2

		// Dummy verification should take roughly the same time (within 50%)
		// This ensures we don't leak information through timing
		expect(time2).toBeGreaterThan(time1 * 0.5)
		expect(time2).toBeLessThan(time1 * 2)
	})
})
