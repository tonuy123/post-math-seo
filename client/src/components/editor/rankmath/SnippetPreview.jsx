import { Pencil, AlertCircle } from 'lucide-react';
import { TITLE_MAX, DESC_MAX } from './lib/seoConstants';

/**
 * Visual clone of a Google SERP snippet.
 *
 * Typography follows Google Search result card:
 *   - URL  : small gray (~14px), #5f6368, may truncate
 *   - Title: large Google blue (#1a0dab), ~20px, line-clamp-2
 *   - Desc : medium gray, ~14px, line-clamp-2
 *
 * The "Edit Snippet" CTA is a solid blue button styled after the
 * WordPress primary button (bg-blue-600, hover:bg-blue-700).
 *
 * Props unchanged from previous version — this is a pure UI rewrite.
 */
export function SnippetPreview({ value, baseDomain, onEdit }) {
  const { metaTitle, metaDescription, slug } = value || {};

  const fullUrl = `${baseDomain || 'https://example.com/'}${slug || ''}`;
  const titleOverflow = (metaTitle?.length || 0) > TITLE_MAX;
  const descOverflow  = (metaDescription?.length || 0) > DESC_MAX;

  return (
    <div className="rounded border border-wp-gray bg-white p-4">
      {/* Header — section label + CTA */}
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

      {/* Snippet body — exact Google look */}
      <div className="font-sans">
        {/* URL — small, gray, truncate */}
        <div className="text-xs text-[#5f6368] truncate" dir="ltr">
          {fullUrl}
        </div>

        {/* Title — large, Google blue, hover underline, line-clamp-2 */}
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

        {/* Description — readable gray, line-clamp-2 */}
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

      {/* Length meters */}
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
