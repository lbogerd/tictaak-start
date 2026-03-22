import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Archive } from "lucide-react"
import { z } from "zod"
import { TaskCard } from "~/components/tasks/TaskCard"
import { Pagination } from "~/components/ui/Pagination"
import { usePageClamp } from "~/hooks/usePageClamp"
import { authMiddleware } from "~/lib/auth/serverFns"
import type { TaskOccurrence } from "~/lib/services/task.service"
import { getPaginated } from "~/lib/services/task.service"

export const getArchivedTicketsServerFn = createServerFn({
	method: "GET",
})
	.middleware([authMiddleware])
	.inputValidator((data: unknown) =>
		z
			.object({
				page: z.number().int().min(1).default(1),
				pageSize: z.number().int().min(1).max(100).default(10),
			})
			.parse(data ?? {}),
	)
	.handler(async ({ data }) => {
		const requestedPage = data.page
		const pageSize = data.pageSize
		const skip = (requestedPage - 1) * pageSize
		const { items, total } = await getPaginated({
			archivedOnly: true,
			skip,
			take: pageSize,
		})
		const totalPages = Math.max(1, Math.ceil(total / pageSize))
		const safePage = Math.min(Math.max(requestedPage, 1), totalPages)

		if (safePage !== requestedPage) {
			const safeSkip = (safePage - 1) * pageSize
			const retry = await getPaginated({
				archivedOnly: true,
				skip: safeSkip,
				take: pageSize,
			})
			return { definitions: retry.items, total: retry.total, page: safePage }
		}

		return { definitions: items, total, page: safePage }
	})

export const Route = createFileRoute("/archived")({
	validateSearch: z.object({
		page: z.coerce.number().min(1).default(1),
	}),
	component: ArchivedPage,
	loader: async ({ location }) => {
		const pageSize = 10
		const searchParams = new URLSearchParams(location.search ?? "")
		const requestedPage = Number(searchParams.get("page") ?? "1") || 1
		const { definitions, total, page } = await getArchivedTicketsServerFn({
			data: { page: requestedPage, pageSize },
		})
		return {
			definitions,
			totalDefinitions: total,
			page,
			pageSize,
			requestedPage,
		}
	},
})

function ArchivedPage() {
	const { definitions, totalDefinitions, page, pageSize, requestedPage } =
		Route.useLoaderData()
	const router = useRouter()

	const totalPages = Math.max(1, Math.ceil(totalDefinitions / pageSize))
	const currentPage = usePageClamp(
		requestedPage ?? page ?? 1,
		totalPages,
		async (nextPage) => {
			await router.navigate({ to: "/archived", search: { page: nextPage } })
		},
	)

	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
			<div className="space-y-6">
				<div className="flex items-center justify-between border-orange-200/50 border-b pb-4">
					<h3 className="font-semibold text-xl">Archived Task Definitions</h3>
					<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
						{totalDefinitions}{" "}
						{totalDefinitions === 1 ? "definition" : "definitions"}
					</span>
				</div>

				<p className="text-neutral-500 text-sm">
					Historical handled occurrences stay on the home screen. This view is
					for archived task definitions only.
				</p>

				{totalDefinitions > 0 ? (
					<ul className="grid gap-4 sm:grid-cols-1">
						{definitions.map((definition: TaskOccurrence) => (
							<li key={definition.instanceId ?? definition.taskId}>
								<TaskCard occurrence={definition} />
							</li>
						))}
					</ul>
				) : (
					<div className="flex flex-col items-center justify-center rounded-3xl border-2 border-orange-200 border-dashed bg-white/50 py-20 text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500">
							<Archive className="h-8 w-8" />
						</div>
						<h4 className="mb-2 font-semibold text-lg">
							No archived definitions
						</h4>
						<p className="max-w-xs text-neutral-500">
							Archived task definitions will appear here when you retire them.
						</p>
					</div>
				)}

				{totalDefinitions > 0 ? (
					<Pagination
						currentPage={currentPage}
						totalPages={totalPages}
						onChange={async (nextPage) => {
							await router.navigate({
								to: "/archived",
								search: { page: nextPage },
							})
						}}
					/>
				) : null}
			</div>
		</div>
	)
}
