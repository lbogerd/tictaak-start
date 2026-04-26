import { format } from "date-fns"
import {
	Archive,
	CalendarClock,
	Printer,
	RotateCcw,
	SkipForward,
} from "lucide-react"
import { cn } from "~/lib/client/cn"
import { getTaskOccurrenceStatus } from "~/lib/dates/taskDates"
import type { TaskOccurrence } from "~/lib/services/task.service"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card"

type TaskCardProps = {
	occurrence: TaskOccurrence
	className?: string
	onPrint?: (occurrence: TaskOccurrence) => void
	onArchive?: (occurrence: TaskOccurrence) => void
	onUnarchive?: (occurrence: TaskOccurrence) => void
	onSkip?: (occurrence: TaskOccurrence) => void
}

export function TaskCard({
	occurrence,
	className,
	onPrint,
	onArchive,
	onUnarchive,
	onSkip,
}: TaskCardProps) {
	const isArchived = Boolean(occurrence.archivedAt)
	const status = getTaskOccurrenceStatus(occurrence)
	const isProjectedRecurrence = Boolean(
		!occurrence.instanceId && occurrence.recurrenceSummary && !status.isHandled,
	)
	const headlineLabel = occurrence.categoryName || "Task"
	const headlineValue = occurrence.title
	const detailDate = occurrence.scheduledFor
		? format(occurrence.scheduledFor, "EEEE, MMM d, yyyy")
		: "No open occurrence"
	const statusText = isArchived
		? "Archived task"
		: status.isPrinted
			? "Printed"
			: status.isSkipped
				? "Skipped"
				: status.isDue
					? "Due"
					: status.isPlanned
						? "Scheduled"
						: "Occurrence"

	return (
		<Card
			className={cn(
				"relative overflow-hidden border-none bg-white shadow-orange-900/5 shadow-xl transition-all hover:shadow-2xl hover:shadow-orange-900/10",
				className,
			)}
		>
			{/* Ticket "punches" */}
			<div className="absolute top-1/2 -left-3 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-orange-50" />
			<div className="absolute top-1/2 -right-3 z-10 h-6 w-6 -translate-y-1/2 rounded-full bg-orange-50" />

			{/* Perforated line - aligned with side punches */}
			<div className="absolute top-1/2 h-0 w-full border-orange-100 border-t-2 border-dashed" />

			<CardHeader className="gap-3 pb-8">
				<CardTitle className="flex items-start justify-between gap-3">
					<div className="space-y-1">
						<p className="font-medium text-orange-600 text-xs uppercase tracking-[0.2em]">
							{headlineLabel}
						</p>
						<p className="font-black text-2xl text-neutral-950 sm:text-3xl">
							{headlineValue}
						</p>
					</div>
					<div className="flex items-center gap-2">
						{isProjectedRecurrence && (
							<StatusBadge
								variant="outline"
								text="To be planned"
								className="border-orange-200 text-orange-700"
							/>
						)}
						{statusText !== "Scheduled" && statusText !== "Occurrence" && (
							<StatusBadge
								variant={status.isDue ? "default" : "secondary"}
								text={statusText}
								emphasize={status.isDue}
							/>
						)}
						{onSkip && status.isDue && !isArchived && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => onSkip(occurrence)}
								title="Skip this occurrence"
								className="h-9 border-amber-200 text-amber-600 hover:bg-amber-50"
							>
								<SkipForward className="mr-2 h-4 w-4" /> Skip
							</Button>
						)}
						{onPrint && !isArchived && !status.isHandled && (
							<Button
								type="button"
								size="sm"
								onClick={() => onPrint(occurrence)}
								title={status.isDue ? "Print now" : "Print this occurrence now"}
								gradient
								className="h-9 px-4"
							>
								<Printer className="mr-2 h-4 w-4" /> Print now
							</Button>
						)}
						{isArchived && onUnarchive && (
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => onUnarchive(occurrence)}
								title="Unarchive"
								className="h-9 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
							>
								<RotateCcw className="mr-2 h-4 w-4" /> Unarchive
							</Button>
						)}
					</div>
				</CardTitle>
			</CardHeader>

			<CardContent className="flex flex-col gap-5 pt-6">
				<div className="flex flex-wrap gap-x-12 gap-y-4">
					<DetailRow
						label="Scheduled for"
						icon={<CalendarClock className="h-3.5 w-3.5" />}
						value={detailDate}
					/>
					{occurrence.recurrenceSummary && (
						<DetailRow
							label="Repeats"
							icon={<RotateCcw className="h-3.5 w-3.5" />}
							value={occurrence.recurrenceSummary}
						/>
					)}
					{status.isPrinted && occurrence.printedAt && (
						<DetailRow
							label="Printed at"
							icon={<Printer className="h-3.5 w-3.5" />}
							value={format(occurrence.printedAt, "EEE, MMM d 'at' p")}
						/>
					)}
					{status.isSkipped && occurrence.skippedAt && (
						<DetailRow
							label="Skipped at"
							icon={<SkipForward className="h-3.5 w-3.5" />}
							value={format(occurrence.skippedAt, "EEE, MMM d 'at' p")}
						/>
					)}
				</div>

				{onArchive && !isArchived && (
					<div className="flex justify-start pt-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onArchive(occurrence)}
							className="-ml-2 h-8 px-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
						>
							<Archive className="mr-2 h-4 w-4" /> Archive task
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	)
}

function StatusBadge({
	text,
	icon,
	variant,
	emphasize,
	className,
}: {
	text: string
	icon?: React.ReactNode
	variant?: React.ComponentProps<typeof Badge>["variant"]
	emphasize?: boolean
	className?: string
}) {
	return (
		<Badge
			variant={variant ?? (emphasize ? "default" : "outline")}
			className={cn(
				"py-1",
				emphasize ? "font-bold" : "font-normal",
				(!variant || variant === "outline") && "text-muted-foreground",
				className,
			)}
		>
			<span className="inline-flex items-center gap-1.5">
				{icon}
				{text}
			</span>
		</Badge>
	)
}

function DetailRow({
	label,
	value,
	icon,
	...props
}: {
	label: string
	value: React.ReactNode
	icon?: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
	const { className, ...rest } = props
	return (
		<div {...rest} className={cn("flex flex-col gap-1", className)}>
			<span className="flex items-center gap-1.5 font-bold text-[10px] text-muted-foreground uppercase tracking-widest">
				{icon}
				{label}
			</span>
			<span className="whitespace-nowrap font-medium text-neutral-900 text-sm">
				{value}
			</span>
		</div>
	)
}

export type { TaskCardProps }
