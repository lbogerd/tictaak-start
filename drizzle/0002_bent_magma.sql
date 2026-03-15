CREATE TABLE "TaskSchedule" (
	"taskId" text PRIMARY KEY NOT NULL,
	"startsAt" timestamp NOT NULL,
	"recursOnDays" integer[],
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "TaskSchedule" ADD CONSTRAINT "TaskSchedule_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "TaskSchedule" ("taskId", "startsAt", "recursOnDays", "createdAt")
SELECT
	"id",
	"nextPrintDate",
	"recursOnDays",
	COALESCE("createdAt", now())
FROM "Task"
WHERE "nextPrintDate" IS NOT NULL
	AND "recursOnDays" IS NOT NULL
	AND cardinality("recursOnDays") > 0
ON CONFLICT ("taskId") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "Task" DROP COLUMN "lastPrintedAt";--> statement-breakpoint
ALTER TABLE "Task" DROP COLUMN "nextPrintDate";--> statement-breakpoint
ALTER TABLE "Task" DROP COLUMN "recursOnDays";
