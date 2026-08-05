import { Pencil, AlertCircle } from 'lucide-react';
import { TITLE_MAX, DESC_MAX } from './lib/seoConstants';

/**
 * Bản sao trực quan của đoạn trích SERP Google.
 *
 * Kiểu chữ theo thẻ kết quả Tìm kiếm Google:
 *   - URL  : xám nhỏ (~14px), #5f6368, có thể cắt ngắn
 *   - Tiêu đề: xanh Google lớn (#1a0dab), ~20px, line-clamp-2
 *   - Mô tả : xám vừa, ~14px, line-clamp-2
 *
 * CTA "Chỉnh sửa đoạn trích" là nút xanh đặc được tạo kiểu theo
 * nút chính của WordPress (bg-blue-600, hover:bg-blue-700).
 *
 * Props không đổi so với phiên bản trước — đây chỉ là viết lại UI thuần.
 */
export function SnippetPreview({ value, baseDomain, onEdit }) {
  const { metaTitle, metaDescription, slug } = value || {};

  const fullUrl = `${baseDomain || 'https://example.com/'}${slug || ''}`;
  const titleOverflow = (metaTitle?.length || 0) > TITLE_MAX;
  const descOverflow  = (metaDescription?.length || 0) > DESC_MAX;

  return (
    <div className="rounded border border-wp-gray bg-white p-4">
      {/* Đầu — nhãn phần + CTA */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
          <AlertCircle size={12} className="text-ink-muted" />
          <span>SERP Preview</span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-1.5 rounded-sm text-sm font-medium transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/40"
        >
          <Pencil size={13} />
          <span>Chỉnh sửa đoạn trích</span>
        </button>
      </div>

      {/* Thân đoạn trích — đúng giao diện Google */}
      <div className="font-sans">
        {/* URL — nhỏ, xám, cắt ngắn */}
        <div className="text-xs text-[#5f6368] truncate" dir="ltr">
          {fullUrl}
        </div>

        {/* Tiêu đề — lớn, xanh Google, gạch chân khi hover, line-clamp-2 */}
        <div
          className={[
            'text-[#1a0dab] text-[20px] leading-[1.3] hover:underline cursor-pointer break-words mt-0.5',
            'line-clamp-2',
            titleOverflow && 'text-wp-orange',
          ].filter(Boolean).join(' ')}
        >
          {metaTitle || (
            <span className="italic text-ink-muted text-base">(chưa có tiêu đề SEO)</span>
          )}
        </div>

        {/* Mô tả — xám dễ đọc, line-clamp-2 */}
        <div
          className={[
            'text-[#4d5156] text-sm leading-snug mt-0.5 break-words',
            'line-clamp-2',
            descOverflow && 'text-wp-orange',
          ].filter(Boolean).join(' ')}
        >
          {metaDescription || (
            <span className="italic text-ink-muted">(chưa có meta description)</span>
          )}
        </div>
      </div>

      {/* Đồng hồ độ dài */}
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-3 pt-3 border-t border-wp-gray text-[11px] text-ink-muted">
        <span>
          Title:{' '}
          <b className={titleOverflow ? 'text-wp-orange' : 'text-ink-primary'}>
            {(metaTitle || '').length}
          </b>
          /{TITLE_MAX}
        </span>
        <span>
          Description:{' '}
          <b className={descOverflow ? 'text-wp-orange' : 'text-ink-primary'}>
            {(metaDescription || '').length}
          </b>
          /{DESC_MAX}
        </span>
      </div>
    </div>
  );
}
