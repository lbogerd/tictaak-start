import { env } from "../src/env"
import { Pool } from "pg"

type ColumnInfo = {
	column_name: string
	is_nullable: "YES" | "NO"
	column_default: string | null
}

const TASK_TABLE_NAME = "Task"

function hasColumn(columns: ColumnInfo[], columnName: string) {
	return columns.some((column) => column.column_name === columnName)
}

async function getTaskColumns(pool: Pool) {
	const { rows } = await pool.query<ColumnInfo>(
		`SELECT column_name, is_nullable, column_default
		 FROM information_schema.columns
		 WHERE table_schema = 'public' AND table_name = $1`,
		[TASK_TABLE_NAME],
	)
	return rows
}

async function migrateTaskModel() {
	const pool = new Pool({ connectionString: env.DATABASE_URL })

	try {
		const beforeColumns = await getTaskColumns(pool)
		if (beforeColumns.length === 0) {
			throw new Error(`Table ${TASK_TABLE_NAME} was not found in public schema.`)
		}

		const hasLegacyColumns =
			hasColumn(beforeColumns, "nextPrintDate") ||
			hasColumn(beforeColumns, "lastPrintedAt") ||
			hasColumn(beforeColumns, "recursOnDays")

		const hasNewColumns =
			hasColumn(beforeColumns, "startDate") &&
			hasColumn(beforeColumns, "lastHandledAt") &&
			hasColumn(beforeColumns, "recurrenceType") &&
			hasColumn(beforeColumns, "recurrenceDays")

		if (!hasLegacyColumns && hasNewColumns) {
			console.info("Task model already migrated. No changes needed.")
			return
		}

		await pool.query("BEGIN")

		await pool.query(
			`ALTER TABLE "Task"
			 ADD COLUMN IF NOT EXISTS "startDate" timestamp,
			 ADD COLUMN IF NOT EXISTS "lastHandledAt" timestamp,
			 ADD COLUMN IF NOT EXISTS "recurrenceType" text,
			 ADD COLUMN IF NOT EXISTS "recurrenceDays" integer[]`,
		)

		await pool.query(
			`UPDATE "Task"
			 SET "startDate" = COALESCE("startDate", "nextPrintDate", "createdAt", now())
			 WHERE "startDate" IS NULL`,
		)

		await pool.query(
			`UPDATE "Task"
			 SET "lastHandledAt" = COALESCE("lastHandledAt", "lastPrintedAt")
			 WHERE "lastHandledAt" IS NULL`,
		)

		await pool.query(
			`UPDATE "Task"
			 SET "recurrenceType" = CASE
				WHEN "recurrenceType" IS NOT NULL THEN "recurrenceType"
				WHEN "recursOnDays" IS NULL OR cardinality("recursOnDays") = 0 THEN 'none'
				WHEN "recursOnDays" @> ARRAY[0,1,2,3,4,5,6]::integer[] THEN 'daily'
				ELSE 'weekly'
			 END
			 WHERE "recurrenceType" IS NULL`,
		)

		await pool.query(
			`UPDATE "Task"
			 SET "recurrenceDays" = CASE
				WHEN "recurrenceType" = 'weekly' THEN COALESCE("recurrenceDays", "recursOnDays")
				ELSE "recurrenceDays"
			 END
			 WHERE "recurrenceDays" IS NULL`,
		)

		await pool.query(
			`ALTER TABLE "Task"
			 ALTER COLUMN "startDate" SET DEFAULT now(),
			 ALTER COLUMN "startDate" SET NOT NULL,
			 ALTER COLUMN "recurrenceType" SET DEFAULT 'none',
			 ALTER COLUMN "recurrenceType" SET NOT NULL`,
		)

		await pool.query("COMMIT")

		console.info(
			"Task model migration complete. Legacy columns were preserved for safety.",
		)
		console.info(
			"If desired, remove legacy columns later after verifying production behavior.",
		)
	} catch (error) {
		await pool.query("ROLLBACK")
		throw error
	} finally {
		await pool.end()
	}
}

await migrateTaskModel()
