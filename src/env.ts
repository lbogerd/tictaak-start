import { createEnv } from "@t3-oss/env-core"
import "dotenv/config" // needed to make the seed script work
import { z } from "zod"

export const env = createEnv({
	server: {
		NODE_ENV: z
			.enum(["development", "production", "test"])
			.optional()
			.default("development"),
		DATABASE_URL: z.url(),
		DB_PROVIDER: z.enum(["pg", "pglite"]).optional().default("pg"),
		PRINTER_URL: z.url().optional(),
		BETTER_AUTH_SECRET: z.string().min(32),
		BETTER_AUTH_URL: z.url().optional(),
	},

	/**
	 * The prefix that client-side variables must have. This is enforced both at
	 * a type-level and at runtime.
	 */
	clientPrefix: "VITE_",

	client: {
		VITE_APP_TITLE: z.string().min(1).optional(),
	},

	/**
	 * What object holds the environment variables at runtime. For server-side
	 * code we must use `process.env` so values from a `.env` file or the
	 * process environment are available. `import.meta.env` is a Vite/browser
	 * construct and won't contain plain server-only variables like
	 * `DATABASE_URL`.
	 */
	runtimeEnv: process.env,

	/**
	 * By default, this library will feed the environment variables directly to
	 * the Zod validator.
	 *
	 * This means that if you have an empty string for a value that is supposed
	 * to be a number (e.g. `PORT=` in a ".env" file), Zod will incorrectly flag
	 * it as a type mismatch violation. Additionally, if you have an empty string
	 * for a value that is supposed to be a string with a default value (e.g.
	 * `DOMAIN=` in an ".env" file), the default value will never be applied.
	 *
	 * In order to solve these issues, we recommend that all new projects
	 * explicitly specify this option as true.
	 */
	emptyStringAsUndefined: true,
})
