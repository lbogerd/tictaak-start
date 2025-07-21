import { PrismaClient } from "@prisma-app/client"

/**
 * Simple instance of PrismaClient to be used throughout the application.
 */
export const db = new PrismaClient()
