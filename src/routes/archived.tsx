import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Archive } from "lucide-react"
import { z } from "zod"
import { TaskCard } from "~/components/tasks/TaskCard"
import { Pagination } from "~/components/ui/Pagination"
import { usePageClamp } from "~/hooks/usePageClamp"
import { authMiddleware } from "~/lib/auth/serverFns"
import type { Category, Task } from "~/lib/db/schema"
import { getPaginated } from "~/lib/services/task.service"

export const getArchivedTicketsServerFn = createServerFn({
	method: "GET",
	type: "dynamic",
})
	.middleware([authMiddleware])
	.validator((data: unknown) =>
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
			return { tasks: retry.items, total: retry.total, page: safePage }
		}

		return { tasks: items, total, page: safePage }
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
		const { tasks, total, page } = await getArchivedTicketsServerFn({
			data: { page: requestedPage, pageSize },
		})
		return { tasks, totalTasks: total, page, pageSize, requestedPage }
	},
})

function ArchivedPage() {
	const { tasks, totalTasks, page, pageSize, requestedPage } =
		Route.useLoaderData()
	const router = useRouter()

	const totalPages = Math.max(1, Math.ceil(totalTasks / pageSize))
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
					<h3 className="font-semibold text-xl">Archived</h3>
					<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
						{totalTasks} {totalTasks === 1 ? "task" : "tasks"}
					</span>
				</div>

				{totalTasks > 0 ? (
					<ul className="grid gap-4 sm:grid-cols-1">
						{tasks.map((task: Task & { category: Category }) => (
							<li key={task.id}>
								<TaskCard task={task} />
							</li>
						))}
					</ul>
				) : (
					<div className="flex flex-col items-center justify-center rounded-3xl border-2 border-orange-200 border-dashed bg-white/50 py-20 text-center">
						<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-500">
							<Archive className="h-8 w-8" />
						</div>
						<h4 className="mb-2 font-semibold text-lg">No archived tasks</h4>
						<p className="max-w-xs text-neutral-500">
							Your archived tasks will appear here.
						</p>
					</div>
				)}

				{totalTasks > 0 ? (
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
