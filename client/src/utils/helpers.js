/**
 * Slug generator — mirrors the legacy `generateSlug()` function.
 * Example: "Hello World!" -> "hello-world"
 */
export function generateSlug(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

/**
 * Format a date / Firestore Timestamp for table display.
 * Mirrors `formatDate()` from the legacy code.
 */
export function formatDate(date, locale = 'en-US') {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Read a File and return its Base64 data URL.
 * Used for featured images and avatars (legacy used FileReader API).
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}