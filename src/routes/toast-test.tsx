import { createFileRoute } from "@tanstack/react-router"
import { toast } from "sonner"
import { Button } from "~/components/ui/Button"

export const Route = createFileRoute("/toast-test")({
	component: ToastTestPage,
})

function ToastTestPage() {
	return (
		<div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
			<div className="rounded-3xl border border-orange-200/60 bg-white/75 p-6 shadow-orange-100/40 shadow-xl backdrop-blur-sm sm:p-8">
				<div className="mb-6 border-orange-200/50 border-b pb-4">
					<h2 className="font-bold text-2xl tracking-tight">
						Toast playground
					</h2>
					<p className="mt-2 text-neutral-600 text-sm">
						Use these buttons to preview notification styles and behavior.
					</p>
				</div>

				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<Button
						onClick={() => toast("Simple toast message")}
						variant="outline"
					>
						Default toast
					</Button>
					<Button
						onClick={() => toast.success("Task created successfully")}
						className="border border-status-success-border/70 bg-status-success-bg text-status-success-fg hover:bg-status-success-bg-alt"
						variant="outline"
					>
						Success
					</Button>
					<Button
						onClick={() => toast.info("New release available")}
						className="border border-status-info-border/70 bg-status-info-bg text-status-info-fg hover:bg-status-info-bg-alt"
						variant="outline"
					>
						Info
					</Button>
					<Button
						onClick={() => toast.warning("Printer is running low on paper")}
						className="border border-status-warning-border/70 bg-status-warning-bg text-status-warning-fg hover:bg-status-warning-bg-alt"
						variant="outline"
					>
						Warning
					</Button>
					<Button
						onClick={() => toast.error("Print failed. Please retry.")}
						className="border border-status-error-border/70 bg-status-error-bg text-status-error-fg hover:bg-status-error-bg-alt"
						variant="outline"
					>
						Error
					</Button>
					<Button
						onClick={() => {
							const id = toast.loading("Syncing tasks...")
							setTimeout(() => {
								toast.success("Sync complete", { id })
							}, 1400)
						}}
						className="border border-status-loading-border/70 bg-status-loading-bg text-status-loading-fg hover:bg-status-loading-bg-alt"
						variant="outline"
					>
						Loading to success
					</Button>
				</div>

				<div className="mt-6 grid gap-3 sm:grid-cols-2">
					<Button
						variant="outline"
						onClick={() =>
							toast("Task scheduled for tomorrow", {
								description: "Print date updated to 9:00 AM",
								classNames: {
									cancelButton:
										"!mt-3 !ml-auto !h-9 !rounded-md !border !border-transparent !bg-transparent !px-4 !py-2 !font-semibold !text-neutral-700 hover:!bg-neutral-100/80 hover:!text-neutral-900",
									actionButton:
										"!mt-3 !h-9 !rounded-md !border !border-status-error-border/70 !bg-none !bg-status-error-bg !px-4 !py-2 !font-semibold !text-status-error-fg hover:!bg-status-error-bg-alt",
								},
								action: {
									label: "Undo",
									onClick: () => toast.info("Schedule reverted"),
								},
								cancel: {
									label: "Dismiss",
									onClick: () => toast("No changes were made"),
								},
							})
						}
					>
						Action + cancel
					</Button>
					<Button
						variant="secondary"
						onClick={() =>
							toast.promise(
								new Promise((resolve) => {
									setTimeout(resolve, 1600)
								}),
								{
									loading: "Saving task...",
									success: "Task saved",
									error: "Failed to save task",
								},
							)
						}
					>
						Promise toast
					</Button>
				</div>
			</div>
		</div>
	)
}
