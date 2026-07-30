








/**
 * Slug helper — mirrors legacy `generateSlug()`.
 */
function generateSlug(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
}

module.exports = { generateSlug };