import { PGlite } from "@electric-sql/pglite"
import { PrismaPGlite } from "pglite-prisma-adapter"
import { PrismaClient } from "prisma/client/client"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { TicketService } from "./ticket.service"

describe("ticketService", () => {
	let pgClient: PGlite
	let adapter: PrismaPGlite
	let client: PrismaClient
	let service: TicketService

	beforeAll(() => {
		pgClient = new PGlite("prisma/pglite")
		adapter = new PrismaPGlite(pgClient)
		client = new PrismaClient({
			adapter,
		})
		service = new TicketService(client)
	})

	beforeEach(async () => {
		await client.task.deleteMany()
	})

	afterAll(async () => {
		await client.$disconnect()
		await pgClient.close()
	})

	it("should create a ticket", async () => {
		const input = {
			title: "Test Ticket",
			description: "This is a test ticket",
			categoryId: "category-1",
			nextPrintDate: new Date(),
		}

		const ticket = await service.create(input)

		expect(ticket).toHaveProperty("id")
		expect(ticket.title).toBe(input.title)
		expect(ticket.description).toBe(input.description)
	})
})
