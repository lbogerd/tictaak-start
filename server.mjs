import { createReadStream, promises as fs } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"
import { Readable } from "node:stream"
import { fileURLToPath, pathToFileURL } from "node:url"

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const clientDir = path.join(rootDir, "dist", "client")
const serverEntryUrl = pathToFileURL(
	path.join(rootDir, "dist", "server", "server.js"),
).href
const port = Number(process.env.PORT ?? 3000)

const mimeTypes = new Map([
	[".css", "text/css; charset=utf-8"],
	[".html", "text/html; charset=utf-8"],
	[".ico", "image/x-icon"],
	[".js", "text/javascript; charset=utf-8"],
	[".json", "application/json; charset=utf-8"],
	[".map", "application/json; charset=utf-8"],
	[".png", "image/png"],
	[".svg", "image/svg+xml"],
	[".txt", "text/plain; charset=utf-8"],
	[".webmanifest", "application/manifest+json; charset=utf-8"],
	[".woff", "font/woff"],
	[".woff2", "font/woff2"],
])

const { default: serverEntry } = await import(serverEntryUrl).catch((error) => {
	throw new Error(
		"Failed to load dist/server/server.js. Run `pnpm build` before starting the production server.",
		{ cause: error },
	)
})

if (!serverEntry?.fetch) {
	throw new Error("dist/server/server.js does not export a fetch handler")
}

const server = createServer(async (req, res) => {
	try {
		const requestUrl = new URL(
			req.url ?? "/",
			`http://${req.headers.host ?? `localhost:${port}`}`,
		)

		const staticFile = await resolveStaticFile(requestUrl.pathname)
		if (staticFile && (req.method === "GET" || req.method === "HEAD")) {
			await sendStaticFile(res, staticFile, req.method === "HEAD")
			return
		}

		const request = new Request(requestUrl, {
			method: req.method,
			headers: toHeaders(req.headers),
			body:
				req.method === "GET" || req.method === "HEAD"
					? undefined
					: Readable.toWeb(req),
			duplex:
				req.method === "GET" || req.method === "HEAD" ? undefined : "half",
		})

		const response = await serverEntry.fetch(request)
		await sendWebResponse(res, response, req.method === "HEAD")
	} catch (error) {
		res.statusCode = 500
		res.setHeader("content-type", "text/plain; charset=utf-8")
		res.end(error instanceof Error ? error.message : "Internal Server Error")
	}
})

server.listen(port, () => {
	console.log(`Server listening on http://0.0.0.0:${port}`)
})

async function resolveStaticFile(pathname) {
	if (pathname === "/") {
		return null
	}

	const decodedPath = decodeURIComponent(pathname)
	const relativePath = decodedPath.replace(/^\/+/, "")
	if (!relativePath) {
		return null
	}

	const filePath = path.resolve(clientDir, relativePath)
	if (!isWithinDirectory(clientDir, filePath)) {
		return null
	}

	try {
		const stats = await fs.stat(filePath)
		return stats.isFile() ? filePath : null
	} catch {
		return null
	}
}

function isWithinDirectory(root, target) {
	const relativePath = path.relative(root, target)
	return relativePath &&
		!relativePath.startsWith("..") &&
		!path.isAbsolute(relativePath)
		? true
		: target === root
}

function toHeaders(nodeHeaders) {
	const headers = new Headers()

	for (const [key, value] of Object.entries(nodeHeaders)) {
		if (Array.isArray(value)) {
			for (const item of value) {
				headers.append(key, item)
			}
		} else if (value !== undefined) {
			headers.set(key, value)
		}
	}

	return headers
}

async function sendStaticFile(res, filePath, headOnly) {
	const stats = await fs.stat(filePath)
	const extension = path.extname(filePath)

	res.statusCode = 200
	res.setHeader(
		"content-type",
		mimeTypes.get(extension) ?? "application/octet-stream",
	)
	res.setHeader("content-length", stats.size)

	if (filePath.includes(`${path.sep}assets${path.sep}`)) {
		res.setHeader("cache-control", "public, max-age=31536000, immutable")
		res.setHeader("etag", `"${stats.size}-${stats.mtimeMs}"`)
	}

	if (headOnly) {
		res.end()
		return
	}

	createReadStream(filePath).pipe(res)
}

async function sendWebResponse(res, response, headOnly) {
	res.statusCode = response.status

	for (const [key, value] of response.headers) {
		res.setHeader(key, value)
	}

	if (headOnly || !response.body) {
		res.end()
		return
	}

	Readable.fromWeb(response.body).pipe(res)
}
