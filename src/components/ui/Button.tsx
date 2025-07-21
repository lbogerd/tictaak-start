import { Slot } from "@radix-ui/react-slot"
import type * as React from "react"
import { tv, type VariantProps } from "tailwind-variants"

import { cn } from "~/lib/utils"

const buttonVariants = tv({
	base: "inline-flex items-center justify-center shadow-xs gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive tracking-wider hover:text-foreground",
	variants: {
		variant: {
			default:
				"bg-primary text-primary-foreground from-primary to-primary-light shadow-primary-light focus-visible:ring-primary/20 dark:focus-visible:ring-primary/40 dark:bg-primary/60",
			secondary:
				"bg-secondary text-secondary-foreground from-secondary to-secondary-light shadow-secondary-light focus-visible:ring-secondary/20 dark:focus-visible:ring-secondary/40 dark:bg-secondary/60",
			accent:
				"bg-accent text-accent-foreground from-accent to-accent-light shadow-accent-light focus-visible:ring-accent/20 dark:focus-visible:ring-accent/40 dark:bg-accent/60",
			ghost:
				"bg-transparent text-foreground shadow-none hover:bg-secondary/10 focus-visible:ring-secondary/20 dark:hover:bg-secondary/20 dark:focus-visible:ring-secondary/40",
			outline:
				"border border-border bg-transparent text-foreground shadow-none hover:bg-primary/10 focus-visible:ring-primary/20 dark:hover:bg-primary/20 dark:focus-visible:ring-primary/40",
		},
		size: {
			default: "h-9 px-4 py-2 has-[>svg]:px-3",
			sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
			lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
			icon: "size-9",
		},
		gradient: {
			true: "bg-gradient-to-r",
		},
	},
	defaultVariants: {
		variant: "default",
		size: "default",
		gradient: false,
	},
})

function Button({
	className,
	variant,
	size,
	gradient,
	asChild = false,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean
	}) {
	const Comp = asChild ? Slot : "button"

	return (
		<Comp
			data-slot="button"
			className={cn(buttonVariants({ variant, size, className, gradient }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
