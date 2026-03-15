import { format } from "date-fns"
import {
	Archive,
	CalendarClock,
	CheckCircle2,
	Clock4,
	Printer,
	RotateCcw,
	SkipForward,
	Tags,
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
	const headlineLabel = isArchived
		? "Archived task"
		: status.isPrinted
			? "Printed on"
			: status.isSkipped
				? "Skipped on"
				: status.isDue
					? "Due"
					: status.isPlanned
						? "Scheduled for"
						: "Occurrence"
	const headlineValue = occurrence.scheduledFor
		? format(occurrence.scheduledFor, "EEE, MMM d")
		: "No scheduled date"
	const detailDate = occurrence.scheduledFor
		? format(occurrence.scheduledFor, "EEEE, MMM d, yyyy")
		: "No open occurrence"

	return (
		<Card
			className={cn(
				"relative overflow-hidden border-none bg-white shadow-orange-900/5 shadow-xl transition-all hover:shadow-2xl hover:shadow-orange-900/10",
				className,
			)}
		>
			{/* Ticket "punches" */}
			<div className="-left-3 -translate-y-1/2 absolute top-1/2 z-10 h-6 w-6 rounded-full bg-orange-50" />
			<div className="-right-3 -translate-y-1/2 absolute top-1/2 z-10 h-6 w-6 rounded-full bg-orange-50" />

			{/* Perforated line - aligned with side punches */}
			<div className="absolute top-1/2 h-0 w-full border-orange-100 border-t-2 border-dashed" />

			<CardHeader className="gap-3 pb-6">
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
						{isArchived
							? onUnarchive && (
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
								)
							: null}
					</div>
				</CardTitle>

				<div className="flex flex-wrap items-center gap-2 text-sm">
					{isArchived && (
						<StatusBadge
							variant="secondary"
							text="Archived"
							className="bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200"
						/>
					)}
					{occurrence.scheduledFor && !isArchived && status.isDue && (
						<StatusBadge
							icon={<CalendarClock className="size-4" />}
							text="Due"
							emphasize
						/>
					)}
					{occurrence.scheduledFor && !isArchived && status.isPlanned && (
						<StatusBadge icon={<Clock4 className="size-4" />} text="Planned" />
					)}
					{status.isPrinted && !isArchived && (
						<StatusBadge
							icon={<CheckCircle2 className="size-4" />}
							text="Printed"
						/>
					)}
					{status.isSkipped && !isArchived && <StatusBadge text="Skipped" />}
				</div>
			</CardHeader>

			<CardContent className="flex flex-col gap-3 pt-6">
				<DetailRow
					label="Task"
					value={
						<span className="font-semibold text-neutral-950 text-sm sm:text-base">
							{occurrence.title}
						</span>
					}
				/>
				<div className="grid gap-3 text-sm sm:grid-cols-2">
					<DetailRow
						label="Scheduled for"
						value={
							<span className="font-medium text-neutral-900">{detailDate}</span>
						}
					/>
					<DetailRow
						label="Category"
						value={
							<span className="inline-flex items-center gap-1.5">
								<Tags className="size-3.5 text-orange-400" />
								<span className="font-medium text-neutral-900">
									{occurrence.categoryName}
								</span>
							</span>
						}
					/>
				</div>

				{occurrence.recurrenceSummary && (
					<DetailRow
						label="Repeats"
						value={
							<span className="font-medium text-neutral-900">
								{occurrence.recurrenceSummary}
							</span>
						}
					/>
				)}

				{status.isPrinted && occurrence.printedAt && (
					<DetailRow
						label="Printed at"
						value={
							<span className="font-medium text-neutral-900">
								{format(occurrence.printedAt, "EEE, MMM d 'at' p")}
							</span>
						}
					/>
				)}

				{status.isSkipped && occurrence.skippedAt && (
					<DetailRow
						label="Skipped at"
						value={
							<span className="font-medium text-neutral-900">
								{format(occurrence.skippedAt, "EEE, MMM d 'at' p")}
							</span>
						}
					/>
				)}

				{onArchive && !isArchived && (
					<div className="pt-2">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => onArchive(occurrence)}
							className="h-8 px-2 text-rose-500 hover:bg-rose-50 hover:text-rose-600"
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
				emphasize ? "font-bold" : "font-normal text-muted-foreground",
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
	...props
}: {
	label: string
	value: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
	const { className, ...rest } = props
	return (
		<div
			{...rest}
			className={cn(
				"flex items-center justify-between gap-3 text-xs",
				className,
			)}
		>
			<span className="text-muted-foreground">{label}</span>
			<span className="truncate">{value}</span>
		</div>
	)
}

export type { TaskCardProps }
