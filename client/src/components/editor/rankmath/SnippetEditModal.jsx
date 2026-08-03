import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Textarea, Label } from '../../ui/Input';
import { Button } from '../../ui/Button';
import {
  TITLE_MIN, TITLE_MAX,
  DESC_MIN,  DESC_MAX,
} from './lib/seoConstants';

/**
 * Modal form for editing the SERP snippet fields.
 *
 * Layout (top → bottom):
 *   1. Header — title + close X
 *   2. Live SERP preview (Google-style card that mirrors the inputs)
 *   3. Inputs — Title, Permalink, Description
 *        Each text input has a coloured progress bar + char counter,
 *        and gray helper text underneath.
 *
 * Props:
 *   - open       : boolean
 *   - onClose    : () => void
 *   - value      : { metaTitle, metaDescription, slug }
 *   - onSave     : (next) => void
 *   - baseDomain : string  (used in the SERP URL preview, optional)
 *
 * The modal owns a LOCAL DRAFT so the user can cancel without
 * polluting parent state. On Save, commits back via onSave.
 */

/* ── Progress-bar helpers ───────────────────────────────────────────── */

/**
 * Returns a tailwind colour class for the progress-bar fill, based on
 * how the current length compares to the optimal range.
 *
 * Rules (per the spec):
 *   • empty / way too long  → red
 *   • close but not optimal → orange / yellow
 *   • in optimal range      → green
 */
function lengthTone(len, min, max) {
  if (len === 0)              return 'bg-gray-300';
  if (len < min * 0.6)        return 'bg-red-500';
  if (len < min)              return 'bg-orange-500';
  if (len <= max)             return 'bg-green-500';
  if (len <= max * 1.2)       return 'bg-orange-500';
  return 'bg-red-500';
}

/** Text colour for the counter, mirrors the same semantics as the bar. */
function counterTone(len, min, max) {
  if (len === 0)              return 'text-ink-muted';
  if (len < min * 0.6)        return 'text-red-600';
  if (len < min)              return 'text-orange-600';
  if (len <= max)             return 'text-green-600';
  if (len <= max * 1.2)       return 'text-orange-600';
  return 'text-red-600';
}

/* ── Small reusable sub-component for a text-field + progress bar ── */

function LengthMeter({ value, min, max }) {
  const len = value.length;
  const pct = Math.min(100, Math.round((len / max) * 100));
  const barClass  = lengthTone(len, min, max);
  const toneClass = counterTone(len, min, max);

  return (
    <div className="flex items-center justify-between gap-3 mt-1.5">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${barClass} transition-all duration-150`}
          style={{ width: `${pct}%` }}
          aria-hidden="true"
        />
      </div>
      <span className={`text-[11px] tabular-nums font-medium ${toneClass}`}>
        {len}/{max}
      </span>
    </div>
  );
}

/* ── Main modal ────────────────────────────────────────────────────── */

export function SnippetEditModal({ open, onClose, value, onSave, baseDomain }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value || {});
  const titleRef = useRef(null);

  // Sync local draft whenever the modal opens with a new value.
  useEffect(() => {
    if (open) setDraft(value || {});
  }, [open, value]);

  // Focus the first field when opened.
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(() => titleRef.current?.focus(), 30);
    return () => clearTimeout(id);
  }, [open]);

  // Close on ESC.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Live SERP URL — mirrors the real Google result path.
  const fullUrl = useMemo(() => {
    const base = baseDomain || 'https://example.com/';
    const slug = (draft.slug || '').replace(/^\/+/, '');
    return `${base.replace(/\/$/, '/')}${slug}`;
  }, [baseDomain, draft.slug]);

  if (!open) return null;

  const titleVal = draft.metaTitle || '';
  const descVal  = draft.metaDescription || '';
  const slugVal  = draft.slug || '';

  const handleSave = (e) => {
    e?.preventDefault?.();
    onSave(draft);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="snippet-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full sm:max-w-3xl bg-white rounded-t sm:rounded shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Header ───────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-[#f6f7f7]">
          <h3 id="snippet-modal-title" className="text-sm font-semibold text-ink-primary">
            {t('editSnippet', 'Chỉnh sửa đoạn trích')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-200 text-ink-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/40"
          >
            <X size={16} />
          </button>
        </header>

        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">

          {/* ── Scrollable body ───────────────────────────────────── */}
          <div className="p-5 flex flex-col gap-5 overflow-y-auto">

            {/* ─── TOP: Live SERP Preview ─────────────────────────── */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-2">
                Xem trước trên Google
              </div>
              <div className="font-sans px-4 py-3 bg-white rounded-md border border-gray-200">
                {/* URL */}
                <div className="text-xs text-[#5f6368] truncate" dir="ltr">
                  {fullUrl}
                </div>
                {/* Title */}
                <div className="text-[#1a0dab] text-[20px] leading-[1.3] hover:underline cursor-pointer break-words mt-0.5 line-clamp-2">
                  {titleVal || (
                    <span className="italic text-ink-muted text-base">(chưa có tiêu đề SEO)</span>
                  )}
                </div>
                {/* Description */}
                <div className="text-[#4d5156] text-sm leading-snug mt-0.5 break-words line-clamp-2">
                  {descVal || (
                    <span className="italic text-ink-muted">(chưa có meta description)</span>
                  )}
                </div>
              </div>
            </div>

            {/* ─── BOTTOM: Input Forms ────────────────────────────── */}

            {/* Title */}
            <div>
              <Label htmlFor="seo-title">Tiêu đề SEO</Label>
              <Input
                id="seo-title"
                ref={titleRef}
                value={titleVal}
                onChange={(e) => setDraft((d) => ({ ...d, metaTitle: e.target.value }))}
                placeholder="Nhập tiêu đề hiển thị trên Google"
              />
              <LengthMeter value={titleVal} min={TITLE_MIN} max={TITLE_MAX} />
              <p className="mt-1.5 text-xs text-gray-500">
                Đây là nội dung sẽ xuất hiện ở dòng đầu tiên của kết quả tìm kiếm
                trên Google. Nên có độ dài từ {TITLE_MIN} đến {TITLE_MAX} ký tự.
              </p>
            </div>

            {/* Permalink */}
            <div>
              <Label htmlFor="seo-slug">Đường dẫn URL</Label>
              <Input
                id="seo-slug"
                value={slugVal}
                onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
                placeholder="ten-bai-viet"
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Đường dẫn tĩnh (slug) của bài viết — nên ngắn gọn, chứa từ khóa
                chính và chỉ dùng chữ thường, số, dấu gạch ngang.
              </p>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="seo-desc">Mô tả Meta</Label>
              <Textarea
                id="seo-desc"
                rows={4}
                value={descVal}
                onChange={(e) => setDraft((d) => ({ ...d, metaDescription: e.target.value }))}
                placeholder="Mô tả ngắn gọn nội dung bài viết (sẽ hiển thị dưới tiêu đề trên Google)"
              />
              <LengthMeter value={descVal} min={DESC_MIN} max={DESC_MAX} />
              <p className="mt-1.5 text-xs text-gray-500">
                Đây là nội dung sẽ xuất hiện bên dưới tiêu đề trên Google. Nên có
                độ dài từ {DESC_MIN} đến {DESC_MAX} ký tự để hiển thị tối ưu.
              </p>
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────────── */}
          <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-[#f6f7f7]">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              {t('cancel', 'Hủy')}
            </Button>
            <Button type="submit" variant="primary" size="md" leftIcon={<Save size={14} />}>
              {t('save', 'Lưu')}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}