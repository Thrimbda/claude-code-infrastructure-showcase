import crypto from "crypto";

/**
 * Generate a task ID from the display name.
 * Uses slugify for readable IDs, falls back to hash if needed.
 */
export function generateTaskId(name: string): string {
  // Simple slugify: lowercase, replace spaces/punctuation with hyphens
  let slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^\w\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/[\s_]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, "") // Trim hyphens from start/end
    .substring(0, 50); // Limit length

  // If slug is empty or too short, use hash
  if (!slug || slug.length < 3) {
    const hash = crypto.createHash("md5").update(name).digest("hex").substring(0, 8);
    return `task-${hash}`;
  }

  return slug;
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Format datetime as YYYY-MM-DD HH:mm
 */
export function formatDateTime(date: Date): string {
  const dateStr = formatDate(date);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${dateStr} ${hours}:${minutes}`;
}

/**
 * Escape special regex characters in a string
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
