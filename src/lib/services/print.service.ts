import { format } from "date-fns"
import { PrinterTypes, ThermalPrinter } from "node-thermal-printer"
import { env } from "~/env"
import type { Category, Task } from "~/lib/db/schema"

type PrintableTask = Task & { category: Category }

// Factory to encapsulate the printer configuration in one place.
function createPrinter(printerUrl: string) {
	return new ThermalPrinter({
		type: PrinterTypes.EPSON,
		interface: printerUrl,
		options: { timeout: 5000 },
	})
}

// Converts a task record into a physical ticket using a thermal printer.
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

	// header
	printer.alignCenter()
	printer.println("TicTaak")
	printer.drawLine("=")

	// body
	printer.alignLeft()

	// title
	printer.bold(true)
	printer.setTextQuadArea()

	printer.newLine()
	printer.println(`${task.title}`)

	printer.setTextNormal()
	printer.bold(false)

	// details
	printer.newLine()
	printer.println(`category: ${task.category.name}`)

	printer.newLine()
	printer.newLine()
	printer.println(format(task.createdAt, "dd/MM/yyyy HH:mm"))
	printer.newLine()

	// footer
	printer.drawLine("=")
	printer.cut()

	await printer.execute()
}
