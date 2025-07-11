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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/Tabs"

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
	const [mode, setMode] = useState<"now" | "later">("now")
	const [schedulingType, setSchedulingType] = useState<"once" | "recurring">(
		"once",
	)
	const [scheduledDate, setScheduledDate] = useState<Date | undefined>(
		undefined,
	)
	const [recurringType, setRecurringType] = useState<"every-day" | "weekdays">(
		"every-day",
	)
	const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([])

	const handleCreateNow = () => {
		if (!taskText.trim()) return
		onCreateTask?.({
			text: taskText,
			categoryId: selectedCategory,
		})
		setTaskText("")
		setSelectedCategory("")
	}

	const handlePlanLater = () => {
		if (!taskText.trim()) return
		onPlanTask?.({
			text: taskText,
			categoryId: selectedCategory,
			schedulingType,
			scheduledDate,
			recurringType: schedulingType === "recurring" ? recurringType : undefined,
			selectedWeekdays: schedulingType === "recurring" ? selectedWeekdays : [],
		})

		setTaskText("")
		setSelectedCategory("")
		setScheduledDate(undefined)
		setRecurringType("every-day")
		setSelectedWeekdays([])
	}

	return (
		<Card className="px-4 sm:px-6">
			<Tabs
				value={mode}
				onValueChange={(value) => setMode(value as "now" | "later")}
			>
				<TabsList className="mb-4">
					<TabsTrigger value="now">Create Now</TabsTrigger>
					<TabsTrigger value="later">Plan Later</TabsTrigger>
				</TabsList>

				<TabsContent value="now">
					<form
						onSubmit={(e) => {
							e.preventDefault()
							handleCreateNow()
						}}
					>
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

							<Button type="submit" className="w-full sm:w-auto" gradient>
								Create Task
							</Button>
						</div>
					</form>
				</TabsContent>

				<TabsContent value="later">
					<form
						onSubmit={(e) => {
							e.preventDefault()
							handlePlanLater()
						}}
					>
						<div className="flex flex-col gap-4">
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
										categories={[
											{ id: "1", name: "Work" },
											{ id: "2", name: "Personal" },
											{ id: "3", name: "Hobby" },
										]}
										value={selectedCategory}
										onChange={setSelectedCategory}
									/>
								</div>
							</div>

							<div className="flex flex-col gap-4 sm:flex-row">
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
											onSelect={setScheduledDate}
											autoFocus
										/>
									</PopoverContent>
								</Popover>

								{schedulingType === "recurring" && (
									<div className="flex w-full flex-col gap-3">
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

										{recurringType === "weekdays" && (
											<WeekdaySelector
												selectedDays={selectedWeekdays}
												onChange={setSelectedWeekdays}
											/>
										)}
									</div>
								)}

								<Button type="submit" className="w-full sm:w-auto">
									Plan Task
								</Button>
							</div>
						</div>
					</form>
				</TabsContent>
			</Tabs>
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
		<div className="flex flex-wrap gap-1">
			{weekdays.map((day) => (
				<Button
					key={day.id}
					type="button"
					variant={selectedDays.includes(day.id) ? "default" : "outline"}
					size="sm"
					className="h-8 w-8 rounded-full p-0"
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
					Add new category...
				</SelectItem>
			</SelectContent>
		</Select>
	)
}
