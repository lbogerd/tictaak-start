import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export type PasswordHash = {
	hash: string
	salt: string
}

export async function hashPassword(password: string): Promise<PasswordHash> {
	const salt = randomBytes(16).toString("hex")
	const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
	return { hash: derived.toString("hex"), salt }
}

export async function verifyPassword(
	password: string,
	salt: string,
	expectedHash: string,
): Promise<boolean> {
	const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
	const expected = Buffer.from(expectedHash, "hex")
	return (
		expected.length === derived.length && timingSafeEqual(expected, derived)
	)
}

/**
 * Dummy password verification to maintain constant-time behavior
 * when user doesn't exist (prevents user enumeration timing attacks).
 */
export async function verifyPasswordDummy(password: string): Promise<boolean> {
	// Use a fixed dummy salt and hash - the actual values don't matter,
	// we just need to do the same work as a real verification
	const dummySalt = "0".repeat(32)
	const dummyHash = "0".repeat(128)
	return verifyPassword(password, dummySalt, dummyHash)
}
