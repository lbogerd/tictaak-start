import { useState } from "react"
import { useHotkey } from "../../hooks/useHotkey"
import { Card } from "../ui/Card"
import { Input } from "../ui/Input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../ui/Select"
import { Separator } from "../ui/Separator"

export function CreateTask() {
	return (
		<Card className="px-6">
			<form action="">
				<div className="flex gap-4">
					<Input
						type="text"
						placeholder="What needs to be done?"
						className="mb-4"
					/>

					<div>
						<CategoryDropdown
							categories={[
								{ id: "1", name: "Work" },
								{ id: "2", name: "Personal" },
								{ id: "3", name: "Hobby" },
							]}
						/>
					</div>
				</div>
			</form>
		</Card>
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
			className="w-44"
			autoFocus
		/>
	)
}

function CategoryDropdown({
	categories,
}: {
	categories: { id: string; name: string }[]
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
			<AddNewCategoryInput
				onSubmit={handleSubmit}
				onCancel={handleCancel}
			/>
		)
	}

	return (
		<Select
			onValueChange={(value) => {
				if (value === "add-new") {
					handleAddNew()
				}
			}}
		>
			<SelectTrigger className="w-44">
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
