import { addDays, isAfter, startOfDay } from "date-fns"
import { useState } from "react"
import { useHotkey } from "../../hooks/useHotkey"
import { Button } from "../ui/Button"
import { Calendar } from "../ui/Calendar"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/Popover"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/Select"
import { Separator } from "../ui/Separator"

export function CreateTask({
	categories,
	onCreateTask,
	onPlanTask,
}: {
	categories: { id: string; name: string }[]
	onCreateTask?: (task: { text: string; categoryId: string }) => void
	onPlanTask?: (task: {
		text: string
		categoryId: string
		schedulingType: "once" | "recurring"
		scheduledDate?: Date
		recurringType?: "every-day" | "weekdays"
		selectedWeekdays?: string[]
	}) => void
}) {
	const [taskText, setTaskText] = useState("")
	const [selectedCategory, setSelectedCategory] = useState("")
	const [showScheduling, setShowScheduling] = useState(false)
	const [schedulingType, setSchedulingType] = useState<"once" | "recurring">(
		"once",
	)
	// Default to tomorrow when scheduling is enabled
	const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
		undefined,
	)

	// Get tomorrow's date
	const getTomorrowDate = () => addDays(new Date(), 1)

	// Check if date is valid for scheduling (tomorrow or later)
	const isValidScheduleDate = (date: Date) => {
		const today = startOfDay(new Date())
		return isAfter(startOfDay(date), today)
	}
	const [recurringType, setRecurringType] = useState<"every-day" | "weekdays">(
		"every-day",
	)
	const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([])

	const handleSubmit = () => {
		if (!taskText.trim()) return

		if (showScheduling && scheduledDate) {
			// Plan task for later
			onPlanTask?.({
				text: taskText,
				categoryId: selectedCategory,
				schedulingType,
				scheduledDate,
				recurringType:
					schedulingType === "recurring" ? recurringType : undefined,
				selectedWeekdays:
					schedulingType === "recurring" ? selectedWeekdays : [],
			})
		} else {
			// Create task now
			onCreateTask?.({
				text: taskText,
				categoryId: selectedCategory,
			})
		}

		// Reset form
		setTaskText("")
		setSelectedCategory("")
		setShowScheduling(false)
		setScheduledDate(undefined)
		setRecurringType("every-day")
		setSelectedWeekdays([])
	}

	return (
		<Card className="px-4 sm:px-6">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					handleSubmit()
				}}
			>
				<div className="flex flex-col gap-4">
					{/* Main task input and category row */}
					<div className="flex flex-col gap-4 sm:flex-row">
						<Input
							type="text"
							placeholder="What needs to be done?"
							className="w-full sm:flex-1"
							value={taskText}
							onChange={(e) => setTaskText(e.target.value)}
						/>

						<div className="w-full sm:w-auto">
							<CategoryDropdown
								categories={categories}
								value={selectedCategory}
								onChange={setSelectedCategory}
							/>
						</div>

						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setShowScheduling(!showScheduling)
								// Set default to tomorrow when enabling scheduling
								if (!showScheduling && !scheduledDate) {
									setScheduledDate(getTomorrowDate())
								}
							}}
							className="w-full sm:w-auto"
						>
							{showScheduling ? "Remove Schedule" : "Schedule Later"}
						</Button>

						<Button type="submit" className="w-full sm:w-auto" gradient>
							{showScheduling && scheduledDate ? "Plan Task" : "Create Task"}
						</Button>
					</div>

					{/* Collapsible scheduling controls */}
					{showScheduling && (
						<div className="flex flex-col gap-4 border-t pt-4">
							<div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
								<Select
									value={schedulingType}
									onValueChange={(value) =>
										setSchedulingType(value as "once" | "recurring")
									}
								>
									<SelectTrigger className="w-full sm:w-44">
										<SelectValue placeholder="📅 Schedule Type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="once">One-time</SelectItem>
										<SelectItem value="recurring">Recurring</SelectItem>
									</SelectContent>
								</Select>

								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="w-full justify-start text-left font-normal sm:flex-1"
										>
											{scheduledDate
												? scheduledDate.toLocaleDateString()
												: "📅 Pick a date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0">
										<Calendar
											mode="single"
											selected={scheduledDate}
											onSelect={(date) => {
												// Only allow selection of valid dates (tomorrow or later)
												if (date && isValidScheduleDate(date)) {
													setScheduledDate(date)
												}
											}}
											disabled={(date) => !isValidScheduleDate(date)}
											autoFocus
										/>
									</PopoverContent>
								</Popover>

								{schedulingType === "recurring" && (
									<Select
										value={recurringType}
										onValueChange={(value) =>
											setRecurringType(value as "every-day" | "weekdays")
										}
									>
										<SelectTrigger className="w-full sm:w-44">
											<SelectValue placeholder="🔄 Repeat" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="every-day">Every day</SelectItem>
											<SelectItem value="weekdays">Specific days</SelectItem>
										</SelectContent>
									</Select>
								)}
							</div>

							{/* Weekday selector - separate row when recurring + specific days */}
							{schedulingType === "recurring" &&
								recurringType === "weekdays" && (
									<div className="flex w-full">
										<WeekdaySelector
											selectedDays={selectedWeekdays}
											onChange={setSelectedWeekdays}
										/>
									</div>
								)}
						</div>
					)}
				</div>
			</form>
		</Card>
	)
}

function WeekdaySelector({
	selectedDays,
	onChange,
}: {
	selectedDays: string[]
	onChange: (days: string[]) => void
}) {
	const weekdays = [
		{ id: "mon", name: "mon", full: "Monday" },
		{ id: "tue", name: "tue", full: "Tuesday" },
		{ id: "wed", name: "wed", full: "Wednesday" },
		{ id: "thu", name: "thu", full: "Thursday" },
		{ id: "fri", name: "fri", full: "Friday" },
		{ id: "sat", name: "sat", full: "Saturday" },
		{ id: "sun", name: "sun", full: "Sunday" },
	]

	const toggleDay = (dayId: string) => {
		if (selectedDays.includes(dayId)) {
			onChange(selectedDays.filter((id) => id !== dayId))
		} else {
			onChange([...selectedDays, dayId])
		}
	}

	return (
		<div className="flex flex-wrap gap-2 pt-1">
			{weekdays.map((day) => (
				<Button
					key={day.id}
					type="button"
					variant={selectedDays.includes(day.id) ? "accent" : "outline"}
					size="sm"
					className="h-8 min-w-12 rounded-sm px-2 font-normal capitalize"
					onClick={() => toggleDay(day.id)}
					title={day.full}
				>
					{day.name}
				</Button>
			))}
		</div>
	)
}

function AddNewCategoryInput({
	onSubmit,
	onCancel,
}: {
	onSubmit: (name: string) => void
	onCancel: () => void
}) {
	const [newCategoryName, setNewCategoryName] = useState("")

	const handleSubmit = () => {
		if (newCategoryName.trim()) {
			onSubmit(newCategoryName.trim())
			setNewCategoryName("")
		}
	}

	const handleEnterKey = useHotkey("Enter", handleSubmit)

	const handleCancel = () => {
		setNewCategoryName("")
		onCancel()
	}

	return (
		<Input
			type="text"
			placeholder="Enter category name"
			value={newCategoryName}
			onChange={(e) => setNewCategoryName(e.target.value)}
			onKeyDown={handleEnterKey}
			onBlur={handleCancel}
			className="w-full sm:w-44"
			autoFocus
		/>
	)
}

function CategoryDropdown({
	categories,
	value,
	onChange,
}: {
	categories: { id: string; name: string }[]
	value?: string
	onChange?: (value: string) => void
}) {
	const [isAddingNew, setIsAddingNew] = useState(false)

	const handleAddNew = () => {
		setIsAddingNew(true)
	}

	const handleSubmit = (name: string) => {
		console.log("New category:", name)
		setIsAddingNew(false)
	}

	const handleCancel = () => {
		setIsAddingNew(false)
	}

	if (isAddingNew) {
		return (
			<AddNewCategoryInput onSubmit={handleSubmit} onCancel={handleCancel} />
		)
	}

	return (
		<Select
			value={value}
			onValueChange={(selectedValue) => {
				if (selectedValue === "add-new") {
					handleAddNew()
				} else {
					onChange?.(selectedValue)
				}
			}}
		>
			<SelectTrigger className="w-full sm:w-44">
				<SelectValue
					placeholder="🏷️ Category"
					className="text-muted-foreground"
				/>
			</SelectTrigger>

			<SelectContent>
				{categories.map((category) => (
					<SelectItem key={category.id} value={category.id}>
						{category.name}
					</SelectItem>
				))}

				<Separator className="m-0.5" />

				<SelectItem
					value="add-new"
					className="text-blue-600 focus:bg-blue-100 focus:text-blue-600"
				>
					➕ Add new category...
				</SelectItem>
			</SelectContent>
		</Select>
	)
}
