import { format } from "date-fns"
import { ThermalPrinter, PrinterTypes } from "node-thermal-printer"
import { env } from "~/env"
import type { Category, Task } from "~/logic/db/schema"

type PrintableTask = Task & { category: Category }

function createPrinter(printerUrl: string) {
	return new ThermalPrinter({
		type: PrinterTypes.EPSON,
		interface: printerUrl,
		options: { timeout: 5000 },
	})
}

export async function printTaskTicket(task: PrintableTask) {
	const printerUrl = env.PRINTER_URL
	if (!printerUrl) {
		throw new Error("PRINTER_URL is not configured for thermal printing.")
	}

	const printer = createPrinter(printerUrl)
	const isConnected = await printer.isPrinterConnected()
	if (!isConnected) {
		throw new Error(`Thermal printer not reachable at ${printerUrl}.`)
	}

	printer.alignCenter()
	printer.setTextDoubleHeight()
	printer.bold(true)
	printer.println("TASK")
	printer.bold(false)
	printer.setTextNormal()
	printer.drawLine()
	printer.alignLeft()

	printer.println(`Title: ${task.title}`)
	printer.println(`Category: ${task.category.name}`)
	if (task.nextPrintDate) {
		printer.println(
			`Scheduled: ${format(new Date(task.nextPrintDate), "EEE, MMM d, yyyy")}`,
		)
	}
	printer.println(`Printed: ${format(new Date(), "EEE, MMM d, yyyy h:mm a")}`)
	printer.newLine()
	printer.cut()

	await printer.execute()
}
