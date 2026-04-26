import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { addDays, format, isBefore, isSameDay } from "date-fns"
import { CalendarDays, Clock4, RotateCcw, Tags } from "lucide-react"
import { Badge } from "~/components/ui/Badge"
import { authMiddleware } from "~/lib/auth/serverFns"
import { cn } from "~/lib/client/cn"
import { getTaskOccurrenceStatus, toStartOfDay } from "~/lib/dates/taskDates"
import {
	getSevenDayAgenda,
	type TaskOccurrence,
} from "~/lib/services/task.service"

export const getSevenDayAgendaServerFn = createServerFn({
	method: "GET",
})
	.middleware([authMiddleware])
	.handler(async () => {
		return await getSevenDayAgenda()
	})

export const Route = createFileRoute("/calendar")({
	component: CalendarPage,
	loader: async () => {
		const agendaOccurrences = await getSevenDayAgendaServerFn()

		return {
			agendaOccurrences,
		}
	},
})

type AgendaDay = {
	date: Date
	label: string
	occurrences: TaskOccurrence[]
}

function getOccurrenceKey(occurrence: TaskOccurrence) {
	return (
		occurrence.instanceId ??
		`${occurrence.taskId}:${occurrence.scheduledFor?.toISOString() ?? "unscheduled"}`
	)
}

function buildSevenDayAgenda(occurrences: TaskOccurrence[]) {
	const today = toStartOfDay(new Date()) ?? new Date()
	const days = Array.from({ length: 7 }, (_, index) => addDays(today, index))

	return days.map<AgendaDay>((date, index) => {
		const dayOccurrences = occurrences.filter((occurrence) => {
			const scheduledFor = toStartOfDay(occurrence.scheduledFor)

			if (!scheduledFor) {
				return false
			}

			if (index === 0 && isBefore(scheduledFor, today)) {
				return true
			}

			return isSameDay(scheduledFor, date)
		})

		return {
			date,
			label: index === 0 ? "Today" : format(date, "EEEE"),
			occurrences: dayOccurrences,
		}
	})
}

function CalendarPage() {
	const { agendaOccurrences } = Route.useLoaderData()
	const days = buildSevenDayAgenda(agendaOccurrences)
	const totalOccurrences = days.reduce(
		(total, day) => total + day.occurrences.length,
		0,
	)
	const startDate = days[0]?.date ?? new Date()
	const endDate = days[days.length - 1]?.date ?? startDate

	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
			<section className="rounded-[2rem] border border-orange-100 bg-white/70 p-5 shadow-orange-900/5 shadow-xl sm:p-7">
				<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 font-semibold text-orange-700 text-xs uppercase tracking-[0.16em]">
							<CalendarDays className="h-3.5 w-3.5" />
							Calendar
						</div>
						<h2 className="font-black text-3xl text-neutral-950">
							7-Day Agenda
						</h2>
						<p className="mt-1 text-neutral-500 text-sm">
							{format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
						</p>
					</div>
					<span className="w-fit rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
						{totalOccurrences}{" "}
						{totalOccurrences === 1 ? "occurrence" : "occurrences"}
					</span>
				</div>

				<div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-7">
					{days.map((day) => (
						<div
							key={day.date.toISOString()}
							className={cn(
								"rounded-2xl border bg-white px-3 py-3 shadow-sm",
								day.occurrences.length > 0
									? "border-orange-200"
									: "border-orange-100/70 opacity-75",
							)}
						>
							<p className="font-bold text-neutral-950 text-sm">
								{format(day.date, "EEE")}
							</p>
							<p className="text-neutral-500 text-xs">
								{format(day.date, "MMM d")}
							</p>
							<p className="mt-2 font-semibold text-orange-600 text-xs">
								{day.occurrences.length}
							</p>
						</div>
					))}
				</div>

				<div className="space-y-5">
					{days.map((day) => (
						<AgendaDaySection key={day.date.toISOString()} day={day} />
					))}
				</div>
			</section>
		</div>
	)
}

function AgendaDaySection({ day }: { day: AgendaDay }) {
	return (
		<div>
			<div className="mb-3 flex items-center justify-between border-orange-200/60 border-b pb-3">
				<div>
					<h3 className="font-bold text-neutral-950 text-xl">{day.label}</h3>
					<p className="text-neutral-500 text-xs">
						{format(day.date, "EEEE, MMM d")}
					</p>
				</div>
				<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-xs">
					{day.occurrences.length}
				</span>
			</div>

			{day.occurrences.length > 0 ? (
				<ul className="space-y-3">
					{day.occurrences.map((occurrence) => (
						<li key={getOccurrenceKey(occurrence)}>
							<AgendaOccurrenceCard occurrence={occurrence} />
						</li>
					))}
				</ul>
			) : (
				<p className="py-2 text-neutral-500 text-sm">No occurrences planned.</p>
			)}
		</div>
	)
}

function AgendaOccurrenceCard({ occurrence }: { occurrence: TaskOccurrence }) {
	const status = getTaskOccurrenceStatus(occurrence)
	const isProjectedRecurrence = Boolean(
		!occurrence.instanceId && occurrence.recurrenceSummary && !status.isHandled,
	)
	const scheduledFor = occurrence.scheduledFor
		? format(occurrence.scheduledFor, "EEE, MMM d")
		: "Unscheduled"

	return (
		<div className="relative overflow-hidden rounded-3xl border border-orange-100 bg-white p-4 shadow-lg shadow-orange-900/5">
			<div
				className={cn(
					"absolute inset-y-0 left-0 w-1.5",
					status.isDue
						? "bg-pink-500"
						: status.isPrinted
							? "bg-emerald-400"
							: status.isSkipped
								? "bg-amber-400"
								: "bg-orange-300",
				)}
			/>
			<div className="flex flex-col gap-4 pl-2 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<div className="mb-2 flex flex-wrap items-center gap-2">
						<Badge
							variant={status.isDue ? "default" : "outline"}
							className={cn(
								"border-orange-200 py-1",
								status.isDue
									? "bg-pink-500 text-white"
									: "bg-orange-50 text-orange-700",
							)}
						>
							{status.stateLabel}
						</Badge>
						{isProjectedRecurrence ? (
							<Badge
								variant="outline"
								className="border-orange-200 bg-white py-1 text-orange-700"
							>
								To be planned
							</Badge>
						) : null}
						<span className="inline-flex items-center gap-1 text-neutral-500 text-xs">
							<Tags className="h-3.5 w-3.5" />
							{occurrence.categoryName}
						</span>
					</div>
					<p className="font-black text-2xl text-neutral-950">
						{occurrence.title}
					</p>
				</div>

				<div className="grid gap-2 text-sm sm:min-w-52">
					<AgendaMeta
						icon={<Clock4 className="h-3.5 w-3.5" />}
						label="Scheduled"
						value={scheduledFor}
					/>
					<AgendaMeta
						icon={<RotateCcw className="h-3.5 w-3.5" />}
						label="Repeats"
						value={occurrence.recurrenceSummary ?? "One time"}
					/>
				</div>
			</div>
		</div>
	)
}

function AgendaMeta({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode
	label: string
	value: string
}) {
	return (
		<div className="flex items-center justify-between gap-3 rounded-2xl bg-orange-50/70 px-3 py-2">
			<span className="inline-flex items-center gap-1.5 font-bold text-[10px] text-neutral-500 uppercase tracking-widest">
				{icon}
				{label}
			</span>
			<span className="font-medium text-neutral-900 text-xs">{value}</span>
		</div>
	)
}
