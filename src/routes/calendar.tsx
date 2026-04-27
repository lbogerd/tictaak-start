import { createFileRoute } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { addDays, format, isBefore, isSameDay } from "date-fns"
import { CalendarClock, RotateCcw } from "lucide-react"
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
			<div className="mb-8 flex items-center justify-between border-orange-200/50 border-b pb-4">
				<div className="flex items-baseline gap-3">
					<h3 className="font-semibold text-xl">7-Day Agenda</h3>
					<span className="text-neutral-500 text-sm">
						{format(startDate, "MMM d")} – {format(endDate, "MMM d, yyyy")}
					</span>
				</div>
				<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
					{totalOccurrences}{" "}
					{totalOccurrences === 1 ? "occurrence" : "occurrences"}
				</span>
			</div>

			<div className="mb-10 grid grid-cols-4 gap-2 sm:grid-cols-7">
				{days.map((day) => (
					<div
						key={day.date.toISOString()}
						className={cn(
							"rounded-2xl border px-3 py-3",
							day.occurrences.length > 0
								? "border-orange-200 bg-white shadow-orange-900/5 shadow-sm"
								: "border-orange-100/70 bg-white/50 opacity-60",
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

			<div className="space-y-10">
				{days.map((day) => (
					<AgendaDaySection key={day.date.toISOString()} day={day} />
				))}
			</div>
		</div>
	)
}

function AgendaDaySection({ day }: { day: AgendaDay }) {
	return (
		<div>
			<div className="mb-4 flex items-center justify-between border-orange-200/50 border-b pb-4">
				<div>
					<h3 className="font-semibold text-xl">{day.label}</h3>
					<p className="text-neutral-500 text-xs">
						{format(day.date, "EEEE, MMM d")}
					</p>
				</div>
				<span className="rounded-full bg-orange-100 px-3 py-1 font-medium text-orange-700 text-sm">
					{day.occurrences.length}{" "}
					{day.occurrences.length === 1 ? "occurrence" : "occurrences"}
				</span>
			</div>

			{day.occurrences.length > 0 ? (
				<ul className="grid gap-4 sm:grid-cols-1">
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
	const statusText = status.isPrinted
		? "Printed"
		: status.isSkipped
			? "Skipped"
			: status.isDue
				? "Due"
				: "Scheduled"
	const scheduledFor = occurrence.scheduledFor
		? format(occurrence.scheduledFor, "EEEE, MMM d, yyyy")
		: "No open occurrence"

	return (
		<div className="relative overflow-hidden rounded-3xl border-none bg-white shadow-orange-900/5 shadow-xl transition-all hover:shadow-2xl hover:shadow-orange-900/10">
			{/* Ticket "punches" */}
			<div className="absolute top-1/2 -left-3 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-orange-50" />
			<div className="absolute top-1/2 -right-3 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-orange-50" />

			{/* Perforated line - aligned with side punches */}
			<div className="absolute top-1/2 h-0 w-full border-orange-100 border-t-2 border-dashed" />

			<div className="px-6 pt-6 pb-8">
				<div className="flex items-start justify-between gap-3">
					<div className="space-y-1">
						<p className="font-medium text-orange-600 text-xs uppercase tracking-[0.2em]">
							{occurrence.categoryName}
						</p>
						<p className="font-black text-2xl text-neutral-950 sm:text-3xl">
							{occurrence.title}
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2 pt-1">
						<Badge
							variant={status.isDue ? "default" : "outline"}
							className={cn(
								"py-1",
								status.isDue
									? "border-transparent bg-pink-500 text-white"
									: status.isPrinted
										? "border-emerald-200 bg-emerald-50 text-emerald-700"
										: status.isSkipped
											? "border-amber-200 bg-amber-50 text-amber-700"
											: "border-orange-200 bg-orange-50 text-orange-700",
							)}
						>
							{statusText}
						</Badge>
					</div>
				</div>
			</div>

			<div className="px-6 pb-6">
				<div className="flex flex-wrap gap-x-12 gap-y-4">
					<DetailRow
						label="Scheduled for"
						icon={<CalendarClock className="h-3.5 w-3.5" />}
						value={scheduledFor}
					/>
					{occurrence.recurrenceSummary && (
						<DetailRow
							label="Repeats"
							icon={<RotateCcw className="h-3.5 w-3.5" />}
							value={occurrence.recurrenceSummary}
						/>
					)}
				</div>
			</div>
		</div>
	)
}

function DetailRow({
	label,
	icon,
	value,
}: {
	label: string
	icon: React.ReactNode
	value: string
}) {
	return (
		<div className="flex flex-col gap-0.5">
			<span className="inline-flex items-center gap-1.5 font-bold text-[10px] text-neutral-400 uppercase tracking-widest">
				{icon}
				{label}
			</span>
			<span className="font-medium text-neutral-900 text-sm">{value}</span>
		</div>
	)
}
