// prisma.config.ts
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import { PrismaPGlite } from "pglite-prisma-adapter"
import type { PrismaConfig } from "prisma"

type Env = {
	DATABASE_URL: string
}

export default {
	earlyAccess: true,
	schema: path.join("prisma", "schema.prisma"),
	studio: {
		async adapter() {
			const client = new PGlite({ dataDir: "prisma/pglite" })
			return new PrismaPGlite(client)
		},
	},
	migrate: {
		async adapter() {
			const client = new PGlite({ dataDir: "prisma/pglite" })
			return new PrismaPGlite(client)
		},
	},
} satisfies PrismaConfig<Env>
