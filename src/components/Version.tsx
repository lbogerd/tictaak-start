import { useEffect, useState } from "react"
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "~/components/ui/Popover"

/**
 * This component is used to display the version of the app. Only runs on client.
 * It fetches the version from the version.json file in the public directory.
 */
type VersionInfo = {
	package: string
	sha: string
	tag: string | null
	dirty: boolean
	commitTime: string
	buildTime: string
	mode: string
}

declare const __APP_VERSION__: string
declare const __APP_GIT_SHA__: string
declare const __APP_GIT_TAG__: string | null
declare const __APP_BUILD_TIME__: string
declare const __APP_COMMIT_TIME__: string
declare const __APP_DIRTY__: boolean
declare const __APP_MODE__: string

export default function Version() {
	const [info, setInfo] = useState<VersionInfo | null>(() => {
		// Try build-time constants first (they exist both dev & prod)
		if (typeof __APP_GIT_SHA__ !== "undefined") {
			return {
				package: __APP_VERSION__,
				sha: __APP_GIT_SHA__,
				tag: __APP_GIT_TAG__,
				dirty: __APP_DIRTY__,
				commitTime: __APP_COMMIT_TIME__,
				buildTime: __APP_BUILD_TIME__,
				mode: __APP_MODE__,
			}
		}
		return null
	})

	useEffect(() => {
		if (info) return
		fetch("/version.json")
			.then((r) => r.json())
			.then((data) => setInfo(data))
			.catch(() => {})
	}, [info])

	if (!info) return null

	const ident = info.sha || info.tag || info.buildTime
	const short = `${info.package} - ${ident}${info.dirty ? "+" : ""}`

	// Build the detailed title by iterating over entries instead of concatenating a single string
	const entries: [string, string][] = [
		["version", info.package],
		["sha", info.sha || "(n/a)"],
		["tag", info.tag ?? "(n/a)"],
		["mode", info.mode],
		["commit", info.commitTime || "(n/a)"],
		["build", info.buildTime || "(n/a)"],
	]

	return (
		<div className="text-center text-gray-500 text-xs">
			<Popover>
				<PopoverTrigger>
					<button
						type="button"
						className="m-0 bg-transparent p-0 text-gray-500 text-xs underline-offset-2 hover:underline"
					>
						{short}
					</button>
				</PopoverTrigger>
				<PopoverContent className="max-w-xs text-xs font-mono">
					<ul>
						{entries.map(([key, value]) => (
							<li
								key={key}
								className="flex justify-between py-1 border-b last:border-0"
							>
								<span className="italic">{key}</span>
								<span className="font-semibold">{value}</span>
							</li>
						))}
					</ul>
				</PopoverContent>
			</Popover>
		</div>
	)
}
