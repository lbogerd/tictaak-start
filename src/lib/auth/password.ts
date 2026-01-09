import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"

const scryptAsync = promisify(scrypt)

export type PasswordHash = {
	hash: string
	salt: string
}

export async function hashPassword(password: string): Promise<PasswordHash> {
	const salt = randomBytes(16).toString("hex")
	const derived = (await scryptAsync(password, salt, 64)) as Buffer
	return { hash: derived.toString("hex"), salt }
}

export async function verifyPassword(
	password: string,
	salt: string,
	expectedHash: string,
) {
	const derived = (await scryptAsync(password, salt, 64)) as Buffer
	const expected = Buffer.from(expectedHash, "hex")
	return (
		expected.length === derived.length &&
		timingSafeEqual(expected, derived)
	)
}
