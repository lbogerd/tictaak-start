import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import type { CSSProperties } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
	const { theme = "system" } = useTheme()

	return (
		<Sonner
			theme={theme as ToasterProps["theme"]}
			className="toaster group !font-sans"
			offset={16}
			mobileOffset={{ bottom: 12, left: 12, right: 12 }}
			icons={{
				success: <CircleCheckIcon className="size-4" />,
				info: <InfoIcon className="size-4" />,
				warning: <TriangleAlertIcon className="size-4" />,
				error: <OctagonXIcon className="size-4" />,
				loading: <Loader2Icon className="size-4 animate-spin" />,
			}}
			toastOptions={{
				classNames: {
					toast:
						"group toast !flex-wrap !font-sans rounded-xl border border-orange-200/70 bg-white/90 text-neutral-900 shadow-lg shadow-orange-200/40 backdrop-blur-sm",
					title: "font-semibold text-sm tracking-tight text-neutral-900",
					description: "text-neutral-600 text-xs",
					content: "min-w-0 basis-[calc(100%-1.75rem)] grow gap-1",
					icon: "text-current",
					closeButton:
						"!border-orange-200/70 !bg-white !text-neutral-600 hover:!bg-orange-50 hover:!text-neutral-900",
					actionButton:
						"!mt-3 !h-9 !rounded-md !bg-gradient-to-r !from-rose-500 !to-orange-500 !px-4 !py-2 !font-semibold !text-neutral-50 !tracking-wide",
					cancelButton:
						"!mt-3 !h-9 !rounded-md !border !border-orange-200 !bg-orange-100/70 !px-4 !py-2 !font-semibold !text-neutral-800",
					success:
						"!border-status-success-border/70 !bg-gradient-to-br !from-status-success-bg !to-status-success-bg-alt !text-status-success-fg",
					info: "!border-status-info-border/70 !bg-gradient-to-br !from-status-info-bg !to-status-info-bg-alt !text-status-info-fg",
					warning:
						"!border-status-warning-border/70 !bg-gradient-to-br !from-status-warning-bg !to-status-warning-bg-alt !text-status-warning-fg",
					error:
						"!border-status-error-border/70 !bg-gradient-to-br !from-status-error-bg !to-status-error-bg-alt !text-status-error-fg",
					loading:
						"!border-status-loading-border/70 !bg-gradient-to-br !from-status-loading-bg !to-status-loading-bg-alt !text-status-loading-fg",
				},
				style: {
					"--normal-bg": "var(--popover)",
					"--normal-text": "var(--popover-foreground)",
					"--normal-border": "var(--border)",
					"--toast-button-margin-start": "0",
					"--toast-button-margin-end": "0.5rem",
				} as CSSProperties,
			}}
			style={
				{
					"--border-radius": "var(--radius)",
					"--width": "min(22rem, calc(100vw - 1rem))",
				} as CSSProperties
			}
			{...props}
		/>
	)
}

export { Toaster }
