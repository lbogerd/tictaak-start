import { format } from "date-fns"
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
import { getTaskPrintStatus, recursOnLabels } from "~/logic/dates/taskDates"
import type { Category, Task } from "~/logic/db/schema"
import { Badge } from "../ui/Badge"
import { Button } from "../ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card"

type TaskCardProps = {
	task: Task & { category: Category }
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
	const { nextPrintDate, isDue, isUpcoming, isPrintedForCurrentCycle } =
		getTaskPrintStatus(task)

	const recursOn = recursOnLabels(task.recursOnDays ?? [])

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
					<span className="font-bold text-base sm:text-lg">{task.title}</span>
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
								className="h-9 px-4"
							>
								<Printer className="mr-2 h-4 w-4" /> Print
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
										className="h-9 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
									>
										<RotateCcw className="mr-2 h-4 w-4" /> Unarchive
									</Button>
								)
							: onArchive && (
									<Button
										type="button"
										variant="ghost"
										size="icon"
										onClick={() => onArchive(task)}
										title="Archive"
										className="h-9 w-9 text-rose-400 hover:bg-rose-50 hover:text-rose-600"
									>
										<Archive className="h-4 w-4 opacity-70" />
									</Button>
								)}
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

			<CardContent className="flex flex-col gap-3 pt-6">
				<div className="flex flex-col gap-4 text-sm sm:flex-row sm:items-center sm:justify-between">
					{nextPrintDate && (
						<DetailRow
							label="Next print"
							value={
								<span className="font-medium text-neutral-900">
									{format(nextPrintDate, "EEE, MMM d, yyyy")}
								</span>
							}
						/>
					)}

					<DetailRow
						label="Category"
						className="justify-end sm:ml-auto"
						value={
							<span className="inline-flex items-center gap-1.5">
								<Tags className="size-3.5 text-orange-400" />
								<span className="font-medium text-neutral-900">
									{task.category.name}
								</span>
							</span>
						}
					/>
				</div>

				{recursOn.length > 0 && (
					<div className="flex flex-wrap items-center gap-2">
						<span className="text-muted-foreground text-xs">Repeats:</span>
						<div className="flex flex-wrap gap-1.5">
							{recursOn.map((d) => (
								<Badge
									key={d}
									variant="secondary"
									className="bg-orange-50 px-2 py-0.5 text-orange-700 hover:bg-orange-100"
								>
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
