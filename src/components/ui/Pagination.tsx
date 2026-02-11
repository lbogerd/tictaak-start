import { Button } from "~/components/ui/Button"
import { cn } from "~/lib/client/cn"

type PaginationProps = {
	currentPage: number
	totalPages: number
	onChange: (page: number) => void | Promise<void>
	className?: string
}

function getPageNumbers(
	currentPage: number,
	totalPages: number,
): (number | { type: "ellipsis"; position: "start" | "end" })[] {
	const delta = 1
	const pages: (number | { type: "ellipsis"; position: "start" | "end" })[] = []

	// Always show first page
	pages.push(1)

	if (totalPages <= 7) {
		// Show all pages if total is small
		for (let i = 2; i <= totalPages; i++) {
			pages.push(i)
		}
	} else {
		// Calculate range around current page
		const start = Math.max(2, currentPage - delta)
		const end = Math.min(totalPages - 1, currentPage + delta)

		// Add ellipsis after first page if needed
		if (start > 2) {
			pages.push({ type: "ellipsis", position: "start" })
		}

		// Add range around current page
		for (let i = start; i <= end; i++) {
			pages.push(i)
		}

		// Add ellipsis before last page if needed
		if (end < totalPages - 1) {
			pages.push({ type: "ellipsis", position: "end" })
		}

		// Always show last page if there's more than 1 page
		if (totalPages > 1) {
			pages.push(totalPages)
		}
	}

	return pages
}

export function Pagination({
	currentPage,
	totalPages,
	onChange,
	className,
}: PaginationProps) {
	const safeTotal = Math.max(1, totalPages)
	const hasPrev = currentPage > 1
	const hasNext = currentPage < safeTotal
	const pageNumbers = getPageNumbers(currentPage, safeTotal)

	return (
		<nav
			className={cn("mt-6 flex items-center justify-center gap-2", className)}
			aria-label="Pagination"
		>
			<Button
				variant="outline"
				size="sm"
				disabled={!hasPrev}
				onClick={() => onChange(currentPage - 1)}
				aria-label="Go to previous page"
			>
				Previous
			</Button>

			<div className="flex items-center gap-1">
				{pageNumbers.map((page, _index) => {
					if (typeof page === "object" && page.type === "ellipsis") {
						return (
							<span
								key={`ellipsis-${page.position}`}
								className="flex h-8 w-8 items-center justify-center text-neutral-500"
								aria-hidden="true"
							>
								…
							</span>
						)
					}

					const isActive = page === currentPage

					const pageNumber = page as number

					return (
						<button
							key={pageNumber}
							type="button"
							onClick={() => onChange(pageNumber)}
							disabled={isActive}
							aria-label={`Go to page ${pageNumber}`}
							aria-current={isActive ? "page" : undefined}
							className={cn(
								"flex h-8 w-8 items-center justify-center rounded-md font-semibold text-sm transition-all",
								isActive
									? "bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-primary-light shadow-sm"
									: "text-neutral-700 hover:bg-orange-100 hover:text-orange-900",
							)}
						>
							{pageNumber}
						</button>
					)
				})}
			</div>

			<Button
				size="sm"
				disabled={!hasNext}
				gradient
				onClick={() => onChange(currentPage + 1)}
				aria-label="Go to next page"
			>
				Next
			</Button>
		</nav>
	)
}
