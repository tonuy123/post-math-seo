import { useEffect, useRef, useState } from 'react';
import {
  X, Plus, Star, Loader2, CheckSquare, Square,
} from 'lucide-react';

/**
 * Two-column modal: left = keyword manager, right = Google Trends placeholder.
 *
 * Local state machine:
 *   open=true   → draftKeywords seeded from `keywords` prop
 *   user edits  → only `draftKeywords` mutates
 *   user clicks "Close & use selected keywords" → calls `onSave(draftKeywords)`
 *   user clicks X / overlay / "Huỷ" / presses ESC → discards draft, calls `onClose`
 *
 * Props:
 *   open       : boolean
 *   keywords   : string[]   current upstream value (strings only)
 *   onClose    : () => void
 *   onSave     : (next: string[]) => void   receives the FINAL string[]
 *
 * Internal draft shape:
 *   draftKeywords : Array<{ text: string, checked: boolean }>
 *   Keeping `checked` co-located with `text` avoids the Set-out-of-sync
 *   bug class and lets the save handler map/filter in one pass.
 */
export function KeywordManagerModal({ open, keywords, onClose, onSave }) {
  // Local draft — never escapes the modal until "Close & use …".
  const [draft, setDraft]           = useState(() => toDraft(keywords));
  const [input, setInput]           = useState('');
  const [trendLoading, setLoading]  = useState(true);
  const addInputRef                 = useRef(null);

  // Reseed draft each time the modal re-opens.
  useEffect(() => {
    if (!open) return;
    setDraft(toDraft(keywords));
    setInput('');
    // Simulate a chart fetch.
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 1200);
    return () => clearTimeout(t);
  }, [open, keywords]);

  // ESC closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  /* ── mutations ────────────────────────────────────────────────────── */

  const add = () => {
    const v = input.trim();
    if (!v) return;
    if (draft.some((k) => k.text.toLowerCase() === v.toLowerCase())) {
      setInput('');
      return;
    }
    // New keywords default to checked — that's what the user just typed.
    setDraft((d) => [...d, { text: v, checked: true }]);
    setInput('');
  };

  const removeAt = (idx) => {
    setDraft((d) => d.filter((_, i) => i !== idx));
  };

  const toggleChecked = (idx) => {
    setDraft((d) => d.map((k, i) => (i === idx ? { ...k, checked: !k.checked } : k)));
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add();
    }
  };

  /**
   * CRITICAL: this is the only path through which data leaves the modal.
   * - Filter to only items the user kept checked.
   * - Map back to a plain string[] (the parent owns that shape).
   * - Call onSave FIRST, then onClose, so the parent can update state
   *   without the modal unmounting mid-render with stale data.
   */
  const save = () => {
    const next = draft.filter((k) => k.checked).map((k) => k.text);
    onSave(next);
    onClose();
  };

  const selectedCount = draft.filter((k) => k.checked).length;

  /* ── render ──────────────────────────────────────────────────────── */

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="kw-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-4xl bg-white rounded shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-wp-gray">
          <h3 id="kw-modal-title" className="text-sm font-semibold text-ink-primary">
            Quản lý từ khoá & Google Trends
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="inline-flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:bg-wp-gray focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30"
          >
            <X size={14} />
          </button>
        </header>

        {/* Two-column body */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-hidden">

          {/* ─── LEFT COLUMN ─── keyword manager ─── */}
          <section className="flex flex-col border-b md:border-b-0 md:border-r border-wp-gray">

            {/* Add row */}
            <div className="px-5 py-3 border-b border-wp-gray bg-gray-50">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-secondary mb-1.5">
                Thêm từ khoá mới
              </label>
              <div className="flex items-stretch gap-2">
                <input
                  ref={addInputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  placeholder="Nhập từ khoá rồi nhấn Enter"
                  className="flex-1 min-w-0 px-3 py-1.5 text-sm rounded border border-wp-gray-dark bg-white focus:outline-none focus:border-wp-blue focus:ring-2 focus:ring-wp-blue/20"
                />
                <button
                  type="button"
                  onClick={add}
                  disabled={!input.trim()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-wp-blue hover:bg-wp-blue/90 active:bg-wp-blue/95 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30"
                >
                  <Plus size={14} strokeWidth={2.5} />
                  <span>Thêm</span>
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-3 py-2 min-h-[200px] max-h-[calc(90vh-220px)]">
              {draft.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-xs text-ink-muted italic py-10">
                  Chưa có từ khoá nào. Hãy thêm ở ô phía trên.
                </div>
              ) : (
                <ul className="flex flex-col">
                  {draft.map((item, idx) => {
                    const isPrimary = idx === 0;
                    return (
                      <li
                        key={`${item.text}-${idx}`}
                        className="flex items-center gap-2 px-2 py-2 rounded hover:bg-wp-gray/40 group"
                      >
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={() => toggleChecked(idx)}
                          aria-label={item.checked ? 'bỏ chọn' : 'chọn'}
                          className="inline-flex items-center justify-center w-5 h-5 rounded text-wp-blue hover:bg-wp-blue/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30"
                        >
                          {item.checked
                            ? <CheckSquare size={16} />
                            : <Square      size={16} className="text-ink-muted" />}
                        </button>

                        {/* Keyword pill */}
                        <span className="flex-1 min-w-0 inline-flex items-center gap-1.5">
                          {isPrimary && <Star size={11} fill="currentColor" strokeWidth={0} className="text-wp-green flex-shrink-0" />}
                          <span className={[
                            'truncate text-sm font-medium',
                            isPrimary ? 'text-wp-green' : 'text-ink-primary',
                            item.checked ? '' : 'line-through text-ink-muted',
                          ].filter(Boolean).join(' ')}>
                            {item.text}
                          </span>
                          {isPrimary && (
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-wp-green bg-wp-green/10 px-1.5 py-0.5 rounded">
                              Primary
                            </span>
                          )}
                        </span>

                        {/* Remove */}
                        <button
                          type="button"
                          onClick={() => removeAt(idx)}
                          aria-label={`remove ${item.text}`}
                          className="inline-flex items-center justify-center w-6 h-6 rounded text-ink-muted hover:text-wp-red hover:bg-wp-red/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-red/30"
                        >
                          <X size={13} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer CTA — primary blue button */}
            <div className="px-5 py-3 border-t border-wp-gray bg-gray-50">
              <button
                type="button"
                onClick={save}
                disabled={draft.length === 0}
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded bg-wp-blue hover:bg-wp-blue/90 active:bg-wp-blue/95 text-white text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/40 shadow-sm"
              >
                <span>Đóng &amp; sử dụng các từ khoá đã chọn</span>
              </button>
              <p className="text-[11px] text-ink-muted text-center mt-1.5">
                Đã chọn <b className="text-ink-primary">{selectedCount}</b> / {draft.length} từ khoá
              </p>
            </div>
          </section>

          {/* ─── RIGHT COLUMN ─── Google Trends placeholder ─── */}
          <section className="flex flex-col bg-gray-50">
            <div className="px-5 py-3 border-b border-wp-gray bg-white">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-secondary">
                  Google Trends
                </span>
                <span className="text-[10px] text-ink-muted">(placeholder)</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  defaultValue="WW"
                  className="px-2.5 py-1.5 rounded border border-wp-gray-dark bg-white text-xs focus:outline-none focus:border-wp-blue focus:ring-2 focus:ring-wp-blue/20"
                >
                  <option value="WW">Toàn cầu</option>
                  <option value="VN">Việt Nam</option>
                  <option value="US">Hoa Kỳ</option>
                  <option value="JP">Nhật Bản</option>
                </select>
                <select
                  defaultValue="30d"
                  className="px-2.5 py-1.5 rounded border border-wp-gray-dark bg-white text-xs focus:outline-none focus:border-wp-blue focus:ring-2 focus:ring-wp-blue/20"
                >
                  <option value="7d">7 ngày qua</option>
                  <option value="30d">30 ngày qua</option>
                  <option value="12m">12 tháng qua</option>
                  <option value="5y">5 năm qua</option>
                </select>
              </div>
            </div>

            {/* Chart placeholder / skeleton */}
            <div className="flex-1 p-5 overflow-hidden">
              {trendLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 text-ink-muted">
                  <Loader2 size={20} className="animate-spin text-wp-blue" />
                  <span className="text-xs">Loading…</span>
                </div>
              ) : (
                <div className="h-full flex flex-col gap-3">
                  {/* Skeleton bars */}
                  <div className="flex-1 bg-white border border-wp-gray rounded p-4">
                    <div className="flex items-end justify-around h-full gap-1.5">
                      {[28, 42, 36, 58, 51, 64, 72, 68, 80, 74, 62, 88, 76, 90, 84, 70, 56, 64, 72, 80].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-gradient-to-t from-wp-blue/60 to-wp-blue/30 rounded-sm hover:from-wp-blue hover:to-wp-blue/70 transition"
                          style={{ height: `${h}%` }}
                          title={`${h}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-ink-muted">
                    <span>0</span>
                    <span>10</span>
                    <span>20 ngày qua</span>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert the parent-owned string[] into the modal's working shape.
 * Every existing keyword starts CHECKED — the user's selection state
 * from inside the modal is what controls what gets saved back.
 */
function toDraft(keywords) {
  return (keywords || []).map((k) => ({ text: String(k), checked: true }));
}