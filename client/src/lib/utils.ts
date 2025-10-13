import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | Date, includeTime = false): string {
  if (!dateString) return "No date set";

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";

    if (includeTime) {
      return date.toLocaleDateString("en-GB", {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }

    return date.toLocaleDateString("en-GB", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return "Invalid date";
  }
}
