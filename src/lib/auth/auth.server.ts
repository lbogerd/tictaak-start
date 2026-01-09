import { createHash, randomBytes } from "node:crypto"
import { and, eq, gt, isNull } from "drizzle-orm"
import {
	deleteCookie,
	getCookie,
	setCookie,
} from "@tanstack/react-start/server"
import { env } from "~/env"
import { db } from "~/lib/db/db"
import { sessions, users } from "~/lib/db/schema"
import { hashPassword, verifyPassword } from "./password"

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
	return user
}

export async function verifyUserCredentials(
	username: string,
	password: string,
): Promise<AuthUser | null> {
	const user = await db.query.users.findFirst({
		where: eq(users.username, username),
	})
	if (!user) {
		return null
	}
	const ok = await verifyPassword(
		password,
		user.passwordSalt,
		user.passwordHash,
	)
	if (!ok) {
		return null
	}
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

	return { token, expiresAt }
}

export async function clearSession() {
	const token = getCookie(SESSION_COOKIE_NAME)
	if (token) {
		const tokenHash = hashSessionToken(token)
		await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash))
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
