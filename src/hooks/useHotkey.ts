import { useCallback } from "react"

export function useHotkey(key: string, callback: () => void) {
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === key) {
				callback()
			}
		},
		[key, callback],
	)

	return handleKeyDown
}
