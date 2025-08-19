CREATE TABLE "Category" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"archivedAt" timestamp,
	CONSTRAINT "Category_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "Task" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"categoryId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"lastPrintedAt" timestamp,
	"nextPrintDate" timestamp,
	"recursOnDays" integer[],
	"archivedAt" timestamp
);
