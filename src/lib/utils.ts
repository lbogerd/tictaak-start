import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Utility function to conditionally join class names together.
 * It merges the class names using `twMerge` to handle conflicts and duplicates.
 * @param inputs - An array of class names or conditional class names.
 * @return A single string with the merged class names.
 * @example
 * cn("text-red-500", condition && "bg-blue-500", "p-4")
 * // Returns "text-red-500 bg-blue-500 p-4" if condition is
 * // true, otherwise "text-red-500 p-4".
 */
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}
