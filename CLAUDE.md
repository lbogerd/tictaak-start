# Rules for Agents and LLMs like Claude and Copilot
These rules are designed to help agents keep on track. Do not deviate from these rules.

## Technical Guidelines
The most important technical guidelines for this project are as follows. Read these carefully and follow them strictly.

### Technical Dos

- Use **comments** to explain important decisions and complex logic.
- Use **`shacn/ui`** as the base for UI components. Install new components as needed.
- Use **`tailwind-variants`** (`tv({ ... })`) for component variants, **NOT** `cva`.
- Prefer using the **color palette** defined in `src/colors.css` by using mostly `primary`, `secondary`, and `accent` colors.
- Use **`@tanstack/react-router`** and **`@tanstack/react-start`** for:
  - Routing and navigation within the application.
  - Data loading via `loader` functions.
  - **ALWAYS USE SERVER FUNCTIONS** - `createServerFn({ ... }).handler(...)` - for data handling. See page example below for more details.
- Use **named exports** for modules.
- Use **ESM (ECMAScript Modules)** syntax for imports and exports.

### Technical Don'ts

- Do **NOT** use barrel files like `index.ts` or `index.js` to export modules.
- Do **NOT** use `export * from '...'` syntax.
- Do **NOT** use `export default` syntax.
- Do **NOT** worry about error handling as this will be handled by the framework.

### Simple Component Code Example

Take a look at `src/components/Button.tsx` for an example of how to use `tailwind-variants` to create a button component with variants.

### Simple Page Code Example

```ts
import { createFileRoute, useRouter } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { z } from "zod"
import { db } from "~/lib/db"
import { UsersDisplay } from "~/components/users/UsersDisplay"
import { CreateUserForm } from "~/components/users/CreateUserForm"

export const getUsersSchema = z.object({
	includeAdmin: z.boolean().optional(),
})

export const addUserSchema = z.object({
	name: z.string(),
	isAdmin: z.boolean(),
})

export const getUsersServerFn = createServerFn({
	method: "GET",
})
	.validator((includeAdmin: unknown) => {
		return getUsersSchema.parse({ includeAdmin })
	})
	.handler(async ({ includeAdmin }) => {
		const users = await db.user.findMany({
			where: {
				isAdmin: includeAdmin ? undefined : false,
			},
		})
		return users
	})

export const addUserServerFn = createServerFn({
	method: "POST",
})
	.validator((data: unknown) => {
		return addUserSchema.parse(data)
	})
	.handler(async ({ data }) => {
		const createdUser = await db.user.create({
			data
		})

		return createdUser
	})

export const Route = createFileRoute("/users", {
	component: UsersPage,
	loader: async () => {
		await getUsersServerFn()
	},
})

export const UsersPage = () => {
	const router = useRouter()
	const users = Route.useLoaderData()

	return (
		<div className="p-4 space-y-2">
			<h1 className="text-2xl font-bold">Users</h1>

			<UsersDisplay users={users} />

			<CreateUserForm
				handleSubmit={(newUser: z.infer<typeof addUserSchema>) => {
					addUserServerFn({ data: newUser }).then(() => router.invalidate())
				}}
			/>
		</div>
	)
}
```
