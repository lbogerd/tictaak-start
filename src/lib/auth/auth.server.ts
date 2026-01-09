import {
	deleteCookie,
	getCookie,
	setCookie,
} from "@tanstack/react-start/server"
import { and, eq, gt, isNull, lt } from "drizzle-orm"
import { createHash, randomBytes } from "node:crypto"
import { env } from "~/env"
import { db } from "~/lib/db/db"
import { sessions, users } from "~/lib/db/schema"
import { authLogger } from "~/lib/logger/logger"
import { hashPassword, verifyPassword, verifyPasswordDummy } from "./password"

const SESSION_COOKIE_NAME = "tictaak_session"
const SESSION_TTL_DAYS = 30

export type AuthUser = {
	id: string
	username: string
}

function hashSessionToken(token: string) {
	return createHash("sha256").update(token).digest("hex")
}

function sessionMaxAgeSeconds() {
	return SESSION_TTL_DAYS * 24 * 60 * 60
}

function shouldUseSecureCookies() {
	return env.NODE_ENV === "production"
}

export async function createUser(username: string, password: string) {
	const { hash, salt } = await hashPassword(password)
	const [user] = await db
		.insert(users)
		.values({
			username,
			passwordHash: hash,
			passwordSalt: salt,
		})
		.returning()
	authLogger.info({ userId: user.id, username }, "User created")
	return user
}

export async function verifyUserCredentials(
	username: string,
	password: string,
): Promise<AuthUser | null> {
	const user = await db.query.users.findFirst({
		where: eq(users.username, username),
	})

	// Always run password verification to prevent timing-based user enumeration.
	// If user doesn't exist, we verify against dummy values to maintain
	// constant-time behavior.
	if (!user) {
		await verifyPasswordDummy(password)
		authLogger.warn({ username }, "Login attempt for non-existent user")
		return null
	}

	const ok = await verifyPassword(
		password,
		user.passwordSalt,
		user.passwordHash,
	)
	if (!ok) {
		authLogger.warn(
			{ userId: user.id, username },
			"Failed login attempt (invalid password)",
		)
		return null
	}
	authLogger.info({ userId: user.id, username }, "User credentials verified")
	return { id: user.id, username: user.username }
}

export async function createSession(userId: string) {
	const token = randomBytes(32).toString("hex")
	const tokenHash = hashSessionToken(token)
	const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds() * 1000)

	await db.insert(sessions).values({
		userId,
		tokenHash,
		expiresAt,
	})

	setCookie(SESSION_COOKIE_NAME, token, {
		httpOnly: true,
		secure: shouldUseSecureCookies(),
		sameSite: "strict",
		path: "/",
		maxAge: sessionMaxAgeSeconds(),
	})

	authLogger.info({ userId, expiresAt }, "Session created")
	return { token, expiresAt }
}

export async function clearSession() {
	const token = getCookie(SESSION_COOKIE_NAME)
	if (token) {
		const tokenHash = hashSessionToken(token)
		await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
		authLogger.info("Session cleared")
	}
	deleteCookie(SESSION_COOKIE_NAME, { path: "/" })
}

export async function getSessionUser(): Promise<AuthUser | null> {
	const token = getCookie(SESSION_COOKIE_NAME)
	if (!token) {
		return null
	}
	const tokenHash = hashSessionToken(token)
	const now = new Date()
	const [session] = await db
		.select({
			userId: sessions.userId,
			username: users.username,
			expiresAt: sessions.expiresAt,
		})
		.from(sessions)
		.innerJoin(users, eq(users.id, sessions.userId))
		.where(
			and(
				eq(sessions.tokenHash, tokenHash),
				isNull(sessions.revokedAt),
				gt(sessions.expiresAt, now),
			),
		)
		.limit(1)

	if (!session) {
		authLogger.debug("Invalid or expired session")
		await clearSession()
		return null
	}

	return { id: session.userId, username: session.username }
}

export async function requireUser() {
	const user = await getSessionUser()
	if (!user) {
		throw new Error("Unauthorized")
	}
	return user
}

/**
 * Clean up expired sessions from the database.
 * Should be called periodically (e.g., on server startup or via cron).
 */
export async function cleanupExpiredSessions(): Promise<number> {
	const now = new Date()
	const result = await db
		.delete(sessions)
		.where(lt(sessions.expiresAt, now))
		.returning()
	if (result.length > 0) {
		authLogger.info({ count: result.length }, "Cleaned up expired sessions")
	}
	return result.length
}
