import { describe, expect, it } from "vitest"
import { create } from "./ticket.service"

describe("ticketService", () => {
	describe("create", () => {
		it("should create a new ticket", async () => {
			const data: Parameters<typeof create>[0] = {
				categoryId: "cat-1",
				nextPrintDate: new Date(),
				title: "test",
			}
			const result = await create(data)

			// temporary test
			expect(result).toBeTruthy()
		})
	})
})
