import { defineConfig } from "drizzle-kit"
import { env } from "./src/env.ts"

export default defineConfig({
	schema: "./src/lib/db/schema.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
})
