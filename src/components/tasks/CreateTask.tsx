import { addDays, format, isAfter, startOfDay } from "date-fns"
import {
	Calendar1,
	CalendarClock,
	CalendarOff,
	CalendarSync,
	Plus,
	Tag,
	Trash2,
} from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "~/lib/client/cn"
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
	suggestions,
	onCreateTask,
	onPlanTask,
	onCreateCategory,
	onArchiveCategory,
}: {
	categories: { id: string; name: string }[]
	suggestions: {
		title: string
		count: number
		lastUsed: string
		categoryId: string
	}[]
	onCreateTask?: (task: { text: string; categoryId: string }) => void
	onPlanTask?: (task: {
		text: string
		categoryId: string
		schedulingType: "once" | "recurring"
		scheduledDate?: Date
		recurringType?: "every-day" | "weekdays"
		selectedWeekdays?: string[]
	}) => void
	onCreateCategory?: (name: string) => Promise<string>
	onArchiveCategory?: (id: string) => Promise<void>
}) {
	const [taskText, setTaskText] = useState("")
	const [selectedCategory, setSelectedCategory] = useState("")
	const [showScheduling, setShowScheduling] = useState(false)
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [activeSuggestion, setActiveSuggestion] = useState(-1)
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
		setShowScheduling(false)
		setScheduledDate(undefined)
		setRecurringType("every-day")
		setSelectedWeekdays([])
	}

	const filteredSuggestions = suggestions
		.filter((suggestion) =>
			suggestion.title.toLowerCase().includes(taskText.trim().toLowerCase()),
		)
		.filter((suggestion) => suggestion.title.trim() !== taskText.trim())
		.slice(0, 6)

	const suggestionsOpen =
		showSuggestions &&
		taskText.trim().length > 0 &&
		filteredSuggestions.length > 0

	const applySuggestion = (suggestion: (typeof suggestions)[number]) => {
		setTaskText(suggestion.title)
		if (suggestion.categoryId) {
			setSelectedCategory(
				validCategoryIds.has(suggestion.categoryId)
					? suggestion.categoryId
					: "",
			)
		}
		setShowSuggestions(false)
	}

	const validCategoryIds = useMemo(
		() => new Set(categories.map((category) => category.id)),
		[categories],
	)

	useEffect(() => {
		if (typeof window === "undefined") return

		if (selectedCategory && !validCategoryIds.has(selectedCategory)) {
			localStorage.removeItem("tictaak:lastCategoryId")
			setSelectedCategory("")
			return
		}

		if (!selectedCategory) {
			const storedCategory = localStorage.getItem("tictaak:lastCategoryId")
			if (storedCategory && validCategoryIds.has(storedCategory)) {
				setSelectedCategory(storedCategory)
			} else if (storedCategory) {
				localStorage.removeItem("tictaak:lastCategoryId")
			}
		}
	}, [selectedCategory, validCategoryIds])

	useEffect(() => {
		if (typeof window === "undefined") return

		if (selectedCategory && validCategoryIds.has(selectedCategory)) {
			localStorage.setItem("tictaak:lastCategoryId", selectedCategory)
		}
	}, [selectedCategory, validCategoryIds])

	useEffect(() => {
		setActiveSuggestion(filteredSuggestions.length > 0 ? 0 : -1)
	}, [filteredSuggestions.length])

	return (
		<Card className="overflow-hidden border-none bg-white p-1 shadow-2xl shadow-orange-900/10">
			<form
				onSubmit={(e) => {
					e.preventDefault()
					handleSubmit()
				}}
				className="p-4 sm:p-6"
			>
				<div className="flex flex-col gap-6">
					{/* Main task input and category row */}
					<div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
						<div className="relative flex-1">
							<Popover
								open={suggestionsOpen}
								onOpenChange={(open) => setShowSuggestions(open)}
							>
								<PopoverTrigger asChild>
									<Input
										type="text"
										placeholder="What needs to be done?"
										className="h-12 w-full border border-orange-200/60 bg-white px-4 shadow-sm ring-offset-transparent focus-visible:border-orange-300 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-orange-200"
										value={taskText}
										onChange={(e) => {
											setTaskText(e.target.value)
											if (!showSuggestions) {
												setShowSuggestions(true)
											}
										}}
										onFocus={() => setShowSuggestions(true)}
										onKeyDown={(event) => {
											if (!filteredSuggestions.length) return

											if (event.key === "ArrowDown") {
												event.preventDefault()
												setShowSuggestions(true)
												setActiveSuggestion((prev) =>
													prev >= filteredSuggestions.length - 1 ? 0 : prev + 1,
												)
											}

											if (event.key === "ArrowUp") {
												event.preventDefault()
												setShowSuggestions(true)
												setActiveSuggestion((prev) =>
													prev <= 0 ? filteredSuggestions.length - 1 : prev - 1,
												)
											}

											if (event.key === "Enter" && activeSuggestion >= 0) {
												event.preventDefault()
												const suggestion = filteredSuggestions[activeSuggestion]
												if (suggestion) {
													applySuggestion(suggestion)
												}
											}

											if (event.key === "Escape") {
												setShowSuggestions(false)
											}
										}}
									/>
								</PopoverTrigger>
								<PopoverContent
									className="w-[var(--radix-popover-trigger-width)] rounded-xl border-orange-100 p-2 shadow-xl"
									align="start"
									side="bottom"
									onOpenAutoFocus={(event) => event.preventDefault()}
								>
									<div className="max-h-56 overflow-auto">
										{filteredSuggestions.map((suggestion, index) => (
											<button
												key={suggestion.title}
												type="button"
												className={cn(
													"flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-neutral-700 text-sm transition hover:bg-orange-50 hover:text-orange-700",
													activeSuggestion === index &&
														"bg-orange-50 text-orange-700",
												)}
												onClick={() => applySuggestion(suggestion)}
											>
												<span className="truncate">{suggestion.title}</span>
												<span className="ml-4 rounded-full bg-orange-100 px-2 py-0.5 text-orange-700 text-xs">
													{suggestion.count}x
												</span>
											</button>
										))}
									</div>
								</PopoverContent>
							</Popover>
						</div>

						<div className="flex flex-wrap items-stretch gap-3">
							<div className="w-full sm:w-auto">
								<CategoryDropdown
									categories={categories}
									value={selectedCategory}
									onChange={setSelectedCategory}
									onCreateCategory={onCreateCategory}
									onArchiveCategory={onArchiveCategory}
								/>
							</div>

							<Button
								type="button"
								variant="ghost"
								onClick={() => {
									setShowScheduling(!showScheduling)
									// Set default to tomorrow when enabling scheduling
									if (!showScheduling && !scheduledDate) {
										setScheduledDate(getTomorrowDate())
									}
								}}
								className={cn(
									"h-12 w-full border-none sm:w-auto",
									showScheduling
										? "bg-orange-100 text-orange-700 hover:bg-orange-200"
										: "text-neutral-500 hover:bg-orange-50 hover:text-orange-600",
								)}
							>
								{showScheduling ? (
									<>
										<CalendarOff className="mr-2 h-4 w-4" />
										<span>Scheduled</span>
									</>
								) : (
									<>
										<CalendarClock className="mr-2 h-4 w-4" />
										<span>Schedule</span>
									</>
								)}
							</Button>

							<Button
								type="submit"
								className="h-12 w-full px-8 font-bold sm:w-auto"
								gradient
								disabled={!taskText.trim() || !selectedCategory}
							>
								{showScheduling && scheduledDate ? "Plan Task" : "Create Task"}
							</Button>
						</div>
					</div>

					{/* Collapsible scheduling controls */}
					{showScheduling && (
						<div className="fade-in slide-in-from-top-2 flex animate-in flex-col gap-4 rounded-2xl bg-orange-50/30 p-4 duration-300">
							<div className="flex flex-col gap-4 sm:flex-row sm:items-center">
								<div className="flex items-center gap-2 text-orange-700 text-sm sm:mr-2">
									<CalendarSync className="h-4 w-4" />
									<span className="font-medium">Schedule Settings</span>
								</div>

								<Select
									value={schedulingType}
									onValueChange={(value) =>
										setSchedulingType(value as "once" | "recurring")
									}
								>
									<SelectTrigger
										size="lg"
										className="w-full border-orange-200 bg-white shadow-sm sm:w-40"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="once">
											<div className="flex items-center gap-2">
												<Calendar1 className="h-4 w-4" />
												<span>One-time</span>
											</div>
										</SelectItem>
										<SelectItem value="recurring">
											<div className="flex items-center gap-2">
												<CalendarSync className="h-4 w-4" />
												<span>Recurring</span>
											</div>
										</SelectItem>
									</SelectContent>
								</Select>

								{schedulingType === "recurring" && (
									<Select
										value={recurringType}
										onValueChange={(value) =>
											setRecurringType(value as "every-day" | "weekdays")
										}
									>
										<SelectTrigger
											size="lg"
											className="w-full border-orange-200 bg-white shadow-sm sm:w-40"
										>
											<SelectValue placeholder="🔄 Repeat" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="every-day">Every day</SelectItem>
											<SelectItem value="weekdays">Specific days</SelectItem>
										</SelectContent>
									</Select>
								)}

								<Popover>
									<PopoverTrigger asChild>
										<Button
											variant="outline"
											className="h-12 w-full justify-start border-orange-200 bg-white text-left font-normal shadow-sm sm:flex-1"
										>
											<Calendar1 className="mr-2 h-4 w-4 text-orange-400" />
											{scheduledDate
												? format(scheduledDate, "PPP")
												: "Pick a date"}
										</Button>
									</PopoverTrigger>
									<PopoverContent className="w-auto p-0" align="start">
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
							</div>

							{/* Weekday selector - separate row when recurring + specific days */}
							{schedulingType === "recurring" &&
								recurringType === "weekdays" && (
									<div className="fade-in slide-in-from-left-2 flex w-full animate-in duration-300">
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
		{ id: "mon", name: "M", full: "Monday" },
		{ id: "tue", name: "T", full: "Tuesday" },
		{ id: "wed", name: "W", full: "Wednesday" },
		{ id: "thu", name: "T", full: "Thursday" },
		{ id: "fri", name: "F", full: "Friday" },
		{ id: "sat", name: "S", full: "Saturday" },
		{ id: "sun", name: "S", full: "Sunday" },
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
					variant="outline"
					size="sm"
					className={cn(
						"h-10 w-10 rounded-full border-orange-100 p-0 font-medium transition-all",
						selectedDays.includes(day.id)
							? "bg-orange-500 text-white hover:bg-orange-600"
							: "bg-white text-neutral-600 hover:bg-orange-50 hover:text-orange-600",
					)}
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
			className="h-12 w-full border border-orange-200/60 bg-white shadow-sm ring-offset-transparent focus:ring-2 focus:ring-orange-200 sm:w-44"
			autoFocus
		/>
	)
}

function CategoryDropdown({
	categories,
	value,
	onChange,
	onCreateCategory,
	onArchiveCategory,
}: {
	categories: { id: string; name: string }[]
	value?: string
	onChange?: (value: string) => void
	onCreateCategory?: (name: string) => Promise<string>
	onArchiveCategory?: (id: string) => Promise<void>
}) {
	const [isAddingNew, setIsAddingNew] = useState(false)

	const handleAddNew = () => {
		setIsAddingNew(true)
	}

	const handleSubmit = async (name: string) => {
		if (onCreateCategory) {
			const newId = await onCreateCategory(name)
			onChange?.(newId)
		}
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
			<SelectTrigger
				size="lg"
				className="w-full border border-orange-200/60 bg-white shadow-sm ring-offset-transparent focus:ring-2 focus:ring-orange-200 sm:w-44"
			>
				<SelectValue
					placeholder={
						<div className="flex items-center gap-2 text-neutral-500">
							<Tag className="size-4 opacity-80" />
							<span>Category</span>
						</div>
					}
				/>
			</SelectTrigger>

			<SelectContent className="rounded-xl border-orange-100 shadow-xl">
				{categories.map((category) => (
					<SelectItem
						key={category.id}
						value={category.id}
						className="group rounded-lg pr-2 focus:bg-orange-50 focus:text-orange-700"
					>
						<span className="flex w-full items-center justify-between gap-3">
							<span>{category.name}</span>
							{onArchiveCategory && (
								<button
									type="button"
									className="rounded-md p-1 text-neutral-400 opacity-0 transition hover:bg-orange-100 hover:text-orange-600 group-hover:opacity-100"
									onPointerDown={(event) => {
										event.preventDefault()
										event.stopPropagation()
									}}
									onClick={async (event) => {
										event.preventDefault()
										event.stopPropagation()
										await onArchiveCategory(category.id)
										if (value === category.id) {
											onChange?.("")
										}
									}}
									aria-label={`Delete category ${category.name}`}
									title="Delete category"
								>
									<Trash2 className="h-4 w-4" />
								</button>
							)}
						</span>
					</SelectItem>
				))}

				<Separator className="my-1 bg-orange-100" />

				<SelectItem
					value="add-new"
					className="rounded-lg text-orange-600 focus:bg-orange-100 focus:text-orange-700"
				>
					<div className="flex items-center gap-2">
						<Plus className="h-4 w-4" />
						<span>Add new category...</span>
					</div>
				</SelectItem>
			</SelectContent>
		</Select>
	)
}
