import { Pool } from "pg"
import { env } from "../src/env"

const TASK_TABLE_NAME = "Task"
const TASK_INSTANCE_TABLE_NAME = "TaskInstance"
const TASK_SCHEDULE_TABLE_NAME = "TaskSchedule"

async function tableExists(pool: Pool, tableName: string) {
	const { rows } = await pool.query<{ exists: boolean }>(
		`SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = 'public' AND table_name = $1
		) AS exists`,
		[tableName],
	)

	return rows[0]?.exists ?? false
}

async function migrateTaskModel() {
	const pool = new Pool({ connectionString: env.DATABASE_URL })

	try {
		const hasTaskTable = await tableExists(pool, TASK_TABLE_NAME)
		if (!hasTaskTable) {
			throw new Error(
				`Table ${TASK_TABLE_NAME} was not found in public schema.`,
			)
		}

		await pool.query("BEGIN")

		await pool.query(
			`CREATE TABLE IF NOT EXISTS "TaskInstance" (
				"id" text PRIMARY KEY NOT NULL,
				"taskId" text NOT NULL,
				"scheduledFor" timestamp NOT NULL,
				"createdAt" timestamp DEFAULT now() NOT NULL,
				"handledAt" timestamp,
				"printedAt" timestamp,
				"skippedAt" timestamp,
				CONSTRAINT "TaskInstance_taskId_scheduledFor_unique" UNIQUE("taskId", "scheduledFor"),
				CONSTRAINT "TaskInstance_taskId_Task_id_fk"
					FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE cascade ON UPDATE no action
			)`,
		)

		await pool.query(
			`INSERT INTO "TaskInstance" ("id", "taskId", "scheduledFor", "createdAt", "handledAt", "printedAt")
			 SELECT
				"id" || ':initial',
				"id",
				"nextPrintDate",
				COALESCE("createdAt", now()),
				"lastPrintedAt",
				"lastPrintedAt"
			 FROM "Task"
			 WHERE "nextPrintDate" IS NOT NULL
			 ON CONFLICT ("taskId", "scheduledFor") DO NOTHING`,
		)

		await pool.query(
			`CREATE TABLE IF NOT EXISTS "TaskSchedule" (
				"taskId" text PRIMARY KEY NOT NULL,
				"startsAt" timestamp NOT NULL,
				"recursOnDays" integer[],
				"createdAt" timestamp DEFAULT now() NOT NULL,
				CONSTRAINT "TaskSchedule_taskId_Task_id_fk"
					FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE cascade ON UPDATE no action
			)`,
		)

		await pool.query(
			`INSERT INTO "TaskSchedule" ("taskId", "startsAt", "recursOnDays", "createdAt")
			 SELECT
				"id",
				"nextPrintDate",
				"recursOnDays",
				COALESCE("createdAt", now())
			 FROM "Task"
			 WHERE "nextPrintDate" IS NOT NULL
				AND "recursOnDays" IS NOT NULL
				AND cardinality("recursOnDays") > 0
			 ON CONFLICT ("taskId") DO NOTHING`,
		)

		await pool.query(
			`ALTER TABLE "Task"
			 DROP COLUMN IF EXISTS "lastPrintedAt",
			 DROP COLUMN IF EXISTS "nextPrintDate",
			 DROP COLUMN IF EXISTS "recursOnDays"`,
		)

		await pool.query("COMMIT")

		const hasTaskInstanceTable = await tableExists(
			pool,
			TASK_INSTANCE_TABLE_NAME,
		)
		if (!hasTaskInstanceTable) {
			throw new Error(`Table ${TASK_INSTANCE_TABLE_NAME} was not created.`)
		}

		const hasTaskScheduleTable = await tableExists(
			pool,
			TASK_SCHEDULE_TABLE_NAME,
		)
		if (!hasTaskScheduleTable) {
			throw new Error(`Table ${TASK_SCHEDULE_TABLE_NAME} was not created.`)
		}

		console.info("Task instance and schedule migration complete.")
	} catch (error) {
		await pool.query("ROLLBACK")
		throw error
	} finally {
		await pool.end()
	}
}

await migrateTaskModel()
