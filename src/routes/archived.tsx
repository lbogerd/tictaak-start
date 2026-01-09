import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { Archive } from "lucide-react"
import { TaskCard } from "~/components/tasks/TaskCard"
import { requireUser } from "~/lib/auth/auth.server"
import { getAll } from "~/lib/services/task.service"

export const getArchivedTicketsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	await requireUser()
	const tickets = await getAll(true)
	return tickets.filter((t) => t.archivedAt !== null)
})

export const Route = createFileRoute("/archived")({
	component: ArchivedPage,
	loader: async () => {
		const tasks = await getArchivedTicketsServerFn()
		return { tasks }
	},
})

function ArchivedPage() {
	const { tasks } = Route.useLoaderData()

	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
			<section className="mb-12 text-center">
				<h2 className="mb-4 font-bold text-3xl tracking-tight sm:text-4xl">
					Archived Tasks
				</h2>
				<p className="mx-auto max-w-2xl text-lg text-neutral-600">
					View all your completed and archived tasks.
				</p>
			</section>

			<div className="space-y-6">
				<div className="flex items-center justify-between border-orange-200/50 border-b pb-4">
					<h3 className="font-semibold text-xl">Archived</h3>
					<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
						{tasks.length} {tasks.length === 1 ? "task" : "tasks"}
					</span>
				</div>

				{tasks.length > 0 ? (
					<ul className="grid gap-4 sm:grid-cols-1">
						{tasks.map((task) => (
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
			</div>
		</div>
	)
}
