/**
 * Utilities for creating reusable TanStack Router search middlewares.
 *
 * A search middleware lets you massage the search params before they are
 * validated / persisted. Common use-case: omitting default / falsy values so
 * the URL stays clean.
 */

/**
 * Rule describing how to optionally transform and/or omit a search param.
 * If `map` is provided its return value replaces the original value before
 * omission logic runs. If `shouldOmit` returns true (or, by default, the
 * transformed value is strictly `false`, `undefined` or `null`) the key is
 * removed from the serialized search params.
 */
export interface SearchParamRule<
	TSearch,
	K extends keyof TSearch = keyof TSearch,
> {
	/** The search param key to operate on */
	key: K
	/** Optional value transformer (run before omission check) */
	map?: (value: TSearch[K], full: TSearch) => TSearch[K] | undefined | null
	/** Custom predicate to decide omission. Overrides default heuristic when supplied */
	shouldOmit?: (value: TSearch[K] | undefined | null, full: TSearch) => boolean
}

/**
 * Factory to build a search middleware that applies one or more rules.
 *
 * Example:
 * const cleanDefaults = createSearchParamFilter<{ includeArchived?: boolean }>([
 *   { key: 'includeArchived', shouldOmit: v => v === false }
 * ])
 *
 * Route config:
 * search: { middlewares: [cleanDefaults] }
 */
export function createSearchParamFilter<TSearch, TReturn = unknown>(
	rules: ReadonlyArray<SearchParamRule<TSearch>>,
) {
	return ({
		search,
		next,
	}: {
		search: TSearch
		next: (s: TSearch) => TReturn
	}) => {
		// Shallow clone so we can delete keys without mutating original
		const draft: Record<string, unknown> = {
			...(search as Record<string, unknown>),
		}

		for (const rule of rules) {
			const key = rule.key as string
			// Access through index signature with unknown to avoid any
			const original = (search as Record<string, unknown>)[
				key
			] as TSearch[keyof TSearch]
			const mapped = rule.map ? rule.map(original, search) : original

			const shouldOmit = rule.shouldOmit
				? rule.shouldOmit(mapped, search)
				: mapped === false || mapped === undefined || mapped === null

			if (shouldOmit) {
				delete draft[key]
			} else {
				draft[key] = mapped
			}
		}

		return next(draft as TSearch) as unknown as TSearch
	}
}

/**
 * Convenience helper for the common case of omitting a single key if its value
 * matches (strict equality) a provided value (defaults to false).
 */
export function createOmitValueSearchMiddleware<
	TSearch,
	K extends keyof TSearch,
>(key: K, omitValue: TSearch[K] = false as unknown as TSearch[K]) {
	return createSearchParamFilter<TSearch>([
		{ key, shouldOmit: (v) => v === omitValue },
	])
}
