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

function CategoryDropdown({
	categories,
}: {
	categories: { id: string; name: string }[]
}) {
	return (
		<Select>
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
					<button type="button" className="w-full text-left">
						Add new category...
					</button>
				</SelectItem>
			</SelectContent>
		</Select>
	)
}
