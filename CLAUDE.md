# TicTaak – planned features

- Create tasks with title, optional notes, category, first‑print time, and optional weekday recurrence.
- Categories are managed in a fixed list; each task links to one (or none).
- Manual printing: user selects due tasks (or “print all due now”); each task prints as its own ESC/POS slip and one‑off tasks auto‑archive afterward.
- Views & filters: Due, Printed today, Future, All, Archived + full‑text / date / category search.

## Tech details

The most important technologies are:
- `React` with `TanStack Start` for the full stack
- `TanStack Router` for routing
- `Tailwind CSS` combined with `tailwind-variants` for styling
- `shadcn/ui` with slight modifications for the base UI components
- `Prisma` as the ORM
- `zod` for validation
- `date-fns` for date handling
- `lucide-react` for icons

### Example route including loader and data handling

```tsx
import { createFileRoute, Link } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { addYears } from "date-fns"
import { z } from "zod"
import { Button } from "~/components/ui/Button"
import { db } from "~/lib/db"

const getUserSchema = z.object({
	userId: z.string().uuid(),
})

const blockUserSchema = z.object({
	userId: z.string().uuid(),
	blockedUntil: z.date().optional(),
})

const getUserServerFn = createServerFn({ method: "GET" })
	.validator((user: unknown) => getUserSchema.parse(user))
	.handler(async ({ data }) => {
		return await db.user.findUnique({ where: { id: data.userId } })
	})

const blockUserServerFn = createServerFn({ method: "POST" })
	.validator((userBlockRequest: unknown) =>
		blockUserSchema.parse(userBlockRequest),
	)
	.handler(async ({ data }) => {
		return await db.user.update({
			where: { id: data.userId },
			data: { blocked: true, blockedUntil: data.blockedUntil },
		})
	})

export const Route = createFileRoute("/users/$userId")({
	loader: async ({ params: { userId } }) =>
		await getUserServerFn({ data: userId }),
	component: UserPage,
})

function UserPage() {
	const user = Route.useLoaderData()

	return (
		<div className="space-y-2">
			<h4 className="text-xl font-bold underline">{user.name}</h4>

			<div className="text-sm">{user.email}</div>

			<Link
				to="/users/$userId/posts"
				params={{
					userId: user.id,
				}}
				activeProps={{ className: "text-black font-bold" }}
				className="inline-block py-1 text-blue-800 hover:text-blue-600"
			>
				Posts
			</Link>

			<Button
				onClick={() => {
					blockUserServerFn({
						data: { userId: user.id, blockedUntil: addYears(new Date(), 1) },
					})
				}}
				disabled={user.blocked}
			>
				Block user
			</Button>
		</div>
	)
}

```
