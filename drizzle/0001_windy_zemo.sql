CREATE TABLE "Session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"revokedAt" timestamp,
	CONSTRAINT "Session_tokenHash_unique" UNIQUE("tokenHash")
);
--> statement-breakpoint
CREATE TABLE "TaskInstance" (
	"id" text PRIMARY KEY NOT NULL,
	"taskId" text NOT NULL,
	"scheduledFor" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"handledAt" timestamp,
	"printedAt" timestamp,
	"skippedAt" timestamp,
	CONSTRAINT "TaskInstance_taskId_scheduledFor_unique" UNIQUE("taskId","scheduledFor")
);
--> statement-breakpoint
INSERT INTO "TaskInstance" ("id", "taskId", "scheduledFor", "createdAt", "handledAt", "printedAt")
SELECT
	"id" || ':initial',
	"id",
	"nextPrintDate",
	COALESCE("createdAt", now()),
	"lastPrintedAt",
	"lastPrintedAt"
FROM "Task"
WHERE "nextPrintDate" IS NOT NULL
ON CONFLICT ("taskId", "scheduledFor") DO NOTHING;
--> statement-breakpoint
CREATE TABLE "User" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"passwordHash" text NOT NULL,
	"passwordSalt" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastLoginAt" timestamp,
	CONSTRAINT "User_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "TaskInstance" ADD CONSTRAINT "TaskInstance_taskId_Task_id_fk" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE cascade ON UPDATE no action;