import { addDays } from "date-fns"
import { beforeEach, describe, expect, it } from "vitest"
import {
	createPgliteDb,
	migratePgliteDb,
	seedTestData,
	type TestDb,
} from "../db/adapters"
import { setDb } from "../db/db"
import * as schema from "../db/schema"
import { create, getDue, getUpcoming, skipDue } from "./task.service"

describe("taskService", () => {
	let db: TestDb

	beforeEach(async () => {
		db = createPgliteDb()
		await migratePgliteDb(db)
		await seedTestData(db)
		setDb(db as unknown as typeof import("../db/db").db)
	})

	it("creates a task with default non-recurring schedule", async () => {
		const [created] = await create({
			title: "New Task",
			categoryId: "cat-1",
			startDate: new Date(),
		})
		expect(created.recurrenceType).toBe("none")
	})

	it("returns upcoming tasks by startDate", async () => {
		await db.insert(schema.tasks).values({
			id: "future-task",
			title: "Future",
			categoryId: "cat-1",
			startDate: addDays(new Date(), 1),
		})

		const upcoming = await getUpcoming()
		expect(upcoming.some((t) => t.id === "future-task")).toBe(true)
	})

	it("returns daily recurring tasks as due when not handled today", async () => {
		await db.insert(schema.tasks).values({
			id: "daily-due",
			title: "Daily",
			categoryId: "cat-1",
			startDate: addDays(new Date(), -7),
			recurrenceType: "daily",
			lastHandledAt: addDays(new Date(), -1),
		})

		const due = await getDue()
		expect(due.some((t) => t.id === "daily-due")).toBe(true)
	})

	it("skipDue marks current cycle handled without changing recurrence config", async () => {
		const recurringDays = [1, 3, 5]
		await db.insert(schema.tasks).values({
			id: "weekly-skip",
			title: "Weekly",
			categoryId: "cat-1",
			startDate: addDays(new Date(), -7),
			recurrenceType: "weekly",
			recurrenceDays: recurringDays,
		})

		const before = await db.query.tasks.findFirst({
			where: (t, { eq }) => eq(t.id, "weekly-skip"),
		})
		await skipDue("weekly-skip")
		const after = await db.query.tasks.findFirst({
			where: (t, { eq }) => eq(t.id, "weekly-skip"),
		})

		expect(before?.recurrenceDays).toEqual(recurringDays)
		expect(after?.recurrenceDays).toEqual(recurringDays)
		expect(after?.lastHandledAt).toBeTruthy()
	})
})
