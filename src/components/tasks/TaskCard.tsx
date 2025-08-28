import { format, isAfter, isBefore, isEqual, startOfDay } from "date-fns"
import {
	Archive,
	CalendarClock,
	CheckCircle2,
	Clock4,
	Printer,
	RotateCcw,
	Tags,
} from "lucide-react"
import { cn } from "~/logic/client/cn"
import type { Task } from "~/logic/db/schema"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card"

type TaskCardProps = {
	task: Task
	className?: string
	onPrint?: (task: Task) => void
	onArchive?: (task: Task) => void
	onUnarchive?: (task: Task) => void
	onEdit?: (task: Task) => void
}

export function TaskCard({
	task,
	className,
	onPrint,
	onArchive,
	onUnarchive,
	onEdit,
}: TaskCardProps) {
	const isArchived = Boolean(task.archivedAt)

	const today = startOfDay(new Date())
	const nextPrintDate = task.nextPrintDate
		? startOfDay(new Date(task.nextPrintDate))
		: undefined
	const lastPrintedAt = task.lastPrintedAt
		? new Date(task.lastPrintedAt)
		: undefined

	// Mirror service.getDue logic for UX state:
	// due when nextPrintDate <= today AND lastPrintedAt < nextPrintDate
	const isDue = Boolean(
		nextPrintDate &&
			(isBefore(nextPrintDate, today) || isEqual(nextPrintDate, today)) &&
			(!lastPrintedAt || isBefore(lastPrintedAt, nextPrintDate)),
	)

	const isUpcoming = Boolean(
		nextPrintDate && isAfter(nextPrintDate, today) && !isDue,
	)

	const isPrintedForCurrentCycle = Boolean(
		nextPrintDate && lastPrintedAt && !isBefore(lastPrintedAt, nextPrintDate),
	)

	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
	const recursOn = (task.recursOnDays ?? [])
		.filter((d): d is number => typeof d === "number")
		.map((d) => dayNames[(d + 7) % 7])

	return (
		<Card className={className}>
			<CardHeader className="gap-3">
				<CardTitle className="flex items-start justify-between gap-3">
					<span className="text-base sm:text-lg">{task.title}</span>
					<div className="flex items-center gap-2">
						{onEdit && (
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => onEdit(task)}
								title="Edit"
								className="hidden"
							>
								{/* Reserved for future edit action */}
							</Button>
						)}
						{onPrint && !isArchived && (
							<Button
								type="button"
								size="sm"
								onClick={() => onPrint(task)}
								title="Print ticket"
								gradient
							>
								<Printer /> Print
							</Button>
						)}
						{isArchived
							? onUnarchive && (
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => onUnarchive(task)}
										title="Unarchive"
										className="text-emerald-600 hover:bg-emerald-100"
									>
										<RotateCcw /> Unarchive
									</Button>
								)
							: onArchive && (
									<Button
										type="button"
										variant="outline"
										size="icon"
										onClick={() => onArchive(task)}
										title="Archive"
										className="border-0 text-rose-600 hover:bg-rose-100"
									>
										<Archive className="opacity-70" />
									</Button>
								)}
					</div>
				</CardTitle>

				<div className="flex flex-wrap items-center gap-2 text-sm">
					{isArchived && <StatusBadge variant="secondary" text="Archived" />}
					{nextPrintDate && !isArchived && isDue && (
						<StatusBadge
							icon={<CalendarClock className="size-4" />}
							text="Due"
							emphasize
						/>
					)}
					{nextPrintDate && !isArchived && isUpcoming && (
						<StatusBadge icon={<Clock4 className="size-4" />} text="Upcoming" />
					)}
					{isPrintedForCurrentCycle && !isArchived && (
						<StatusBadge
							icon={<CheckCircle2 className="size-4" />}
							text="Printed"
						/>
					)}
				</div>
			</CardHeader>

			<CardContent className="flex flex-col gap-3">
				<div className="grid gap-2 text-sm sm:grid-cols-2">
					{nextPrintDate && (
						<DetailRow
							className="md:justify-start"
							label="Next print"
							value={format(nextPrintDate, "EEE, MMM d, yyyy")}
						/>
					)}

					<DetailRow
						label="Category"
						className="md:justify-end"
						value={
							<span className="inline-flex items-center gap-1 text-muted-foreground">
								<Tags className="size-3.5 opacity-70" />
								<code className="rounded bg-muted/40 px-1.5 py-0.5 text-[11px]">
									{task.categoryId}
								</code>
							</span>
						}
					/>
				</div>

				{recursOn.length > 0 && (
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-muted-foreground text-xs">Repeats:</span>
						<div className="flex flex-wrap gap-1.5">
							{recursOn.map((d) => (
								<Badge key={d} variant="secondary" className="px-2 py-0.5">
									{d}
								</Badge>
							))}
						</div>
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
}: {
	text: string
	icon?: React.ReactNode
	variant?: React.ComponentProps<typeof Badge>["variant"]
	emphasize?: boolean
}) {
	return (
		<Badge
			variant={variant ?? (emphasize ? "default" : "outline")}
			className={cn(
				"py-1",
				emphasize
					? "font-bold hover:bg-inherit"
					: "font-normal text-muted-foreground",
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
