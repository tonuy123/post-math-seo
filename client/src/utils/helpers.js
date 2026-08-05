/**
 * Trình tạo slug — sao chép từ hàm `generateSlug()` cũ.
 * Ví dụ: "Hello World!" -> "hello-world"
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
 * Định dạng ngày / Firestore Timestamp để hiển thị trên bảng.
 * Sao chép từ `formatDate()` trong code cũ.
 */
export function formatDate(date, locale = 'en-US') {
  if (!date) return '-';
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Đọc một File và trả về Base64 data URL của nó.
 * Dùng cho ảnh đại diện và avatar (bản cũ dùng FileReader API).
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}