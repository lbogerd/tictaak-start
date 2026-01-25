import { authLogger } from "../src/lib/logger/logger.ts"

// This is a quick hack to clear rate limits - we need to import from a running server
// For now, let's just log that rate limits should be cleared by restarting the server

authLogger.info(
	"To clear rate limits, restart your development server (pnpm dev)",
)
authLogger.info(
	"Rate limits are stored in memory and will be cleared on restart",
)
