import pino from "pino"
import { env } from "~/env"

const isDev = env.NODE_ENV === "development"

/**
 * Main application logger using pino.
 * - Development: Pretty-printed, colorized console output
 * - Production: JSON output for log aggregation
 */
export const logger = pino({
	level: env.LOG_LEVEL ?? (isDev ? "debug" : "info"),
	transport: isDev
		? {
				target: "pino-pretty",
				options: {
					colorize: true,
				},
			}
		: undefined,
})

// Child loggers for different modules
export const dbLogger = logger.child({ module: "db" })
export const authLogger = logger.child({ module: "auth" })
export const taskLogger = logger.child({ module: "task" })
export const printLogger = logger.child({ module: "print" })
