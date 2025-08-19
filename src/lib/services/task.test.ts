import { PGlite } from "@electric-sql/pglite"
import { PrismaPGlite } from "pglite-prisma-adapter"
import { PrismaClient } from "prisma/client/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { TaskService } from "./task.service"

describe("taskService", () => {
	let pgClient: PGlite
	let adapter: PrismaPGlite
	let client: PrismaClient
	let service: TaskService

	beforeAll(() => {
		pgClient = new PGlite("prisma/pglite")
		adapter = new PrismaPGlite(pgClient)
		client = new PrismaClient({
			adapter,
		})
		service = new TaskService(client)
	})

	beforeEach(async () => {
		await client.task.deleteMany()
	})

	afterAll(async () => {
		await client.$disconnect()
		await pgClient.close()
	})

	it("should create a task", async () => {
		const input = {
			title: "Test Task",
			description: "This is a test task",
			categoryId: "category-1",
			nextPrintDate: new Date(),
		}

	const task = await service.create(input)

	expect(task).toHaveProperty("id")
	expect(task.title).toBe(input.title)
	})
})
