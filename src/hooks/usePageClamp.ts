import { useEffect } from "react"

type ClampHandler = (nextPage: number) => void | Promise<void>

/**
 * Clamp a 1-based page number to the valid range and optionally react when it changes.
 * If the provided page is out of range, `onClamp` is invoked with the clamped value.
 */
export function usePageClamp(
	page: number,
	totalPages: number,
	onClamp?: ClampHandler,
) {
	const safeTotal = Math.max(1, totalPages || 1)
	const safePage = Math.min(Math.max(page || 1, 1), safeTotal)

	useEffect(() => {
		if (!onClamp) return
		if (safePage !== page) {
			void onClamp(safePage)
		}
	}, [onClamp, page, safePage])

	return safePage
}
