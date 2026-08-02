import { useState, useRef, useCallback } from 'react';
import {
  X, Plus, Star, TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { KeywordManagerModal } from './KeywordManagerModal';

/**
 * Multi-keyword pill input with a live score badge AND a Trend modal.
 *
 * Props:
 *   - value         : string[]                 controlled array of keywords
 *   - onChange      : (next: string[]) => void
 *   - score         : { score, tone } | undefined
 *
 * Behaviour:
 *   - Primary keyword (index 0)  → green outline + ★ icon
 *   - Secondary keywords         → cycle through distinct colours
 *   - Type + Enter / comma       → commit immediately, clear draft
 *   - Type + click "+ Thêm"      → commit immediately, clear draft
 *   - Backspace on empty input   → pop the last pill
 *   - Trend button (right end)   → open <KeywordManagerModal />
 */
export function FocusKeywordInput({ value = [], onChange, score }) {
  const { t } = useTranslation();
  const [draft, setDraft]         = useState('');
  const [trendOpen, setTrendOpen] = useState(false);
  const inputRef = useRef(null);

  const commit = useCallback((raw) => {
    const next = (raw || '').trim();
    if (!next) return;
    if (value.some((k) => k.toLowerCase() === next.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  }, [value, onChange]);

  const removeAt = (idx) => {
    onChange(value.filter((_, i) => i !== idx));
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      // preventDefault stops any wrapping <form> from submitting.
      e.preventDefault();
      commit(draft);
    } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
      e.preventDefault();
      removeAt(value.length - 1);
    }
  };

  const scoreMeta = {
    good:  { bar: 'bg-wp-green',  text: 'text-wp-green'  },
    ok:    { bar: 'bg-wp-orange', text: 'text-wp-orange' },
    bad:   { bar: 'bg-wp-red',    text: 'text-wp-red'    },
    empty: { bar: 'bg-wp-gray',   text: 'text-ink-muted' },
  }[score?.tone || 'empty'];

  return (
    <div>
      {/* Label + live score */}
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
          {t('focusKeywords')}
        </label>
        {score && (
          <div className="inline-flex items-center gap-1.5">
            <span className={['text-xs font-bold tabular-nums', scoreMeta.text].join(' ')}>
              {score.tone === 'empty' ? '—' : `${score.score}/100`}
            </span>
            <div className="w-16 h-1.5 rounded-full bg-wp-gray overflow-hidden">
              <div
                className={['h-full transition-all duration-300', scoreMeta.bar].join(' ')}
                style={{ width: score.tone === 'empty' ? '0%' : `${score.score}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Pill + input container — single unified border */}
      <div
        className="flex flex-wrap items-center gap-1.5 min-h-[42px] px-2 py-1.5 rounded border border-wp-gray-dark bg-white focus-within:border-wp-blue focus-within:ring-2 focus-within:ring-wp-blue/20 transition"
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((kw, idx) => {
          const style = keywordStyle(idx, kw);
          const isPrimary = idx === 0;
          return (
            <span
              key={`${kw}-${idx}`}
              className={[
                'inline-flex items-center gap-1 pl-1.5 pr-1 py-0.5 rounded-full text-xs font-medium border',
                style.chip,
              ].join(' ')}
            >
              {isPrimary && <Star size={10} fill="currentColor" strokeWidth={0} className="flex-shrink-0" />}
              <span className="truncate max-w-[180px]">{kw}</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onClick={(e) => { e.stopPropagation(); removeAt(idx); }}
                aria-label={`remove ${kw}`}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-current"
              >
                <X size={11} />
              </button>
            </span>
          );
        })}

        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? t('focusKeywordPlaceholder') : t('addAnotherKeyword')}
          className="flex-1 min-w-[120px] px-1 py-0.5 text-sm bg-transparent outline-none placeholder:text-ink-muted"
        />

        {/* "+ Thêm" — onMouseDown keeps focus so blur doesn't race the click */}
        {draft.trim() && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              commit(draft);
            }}
            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium text-wp-blue bg-wp-blue/5 hover:bg-wp-blue/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30"
          >
            <Plus size={12} strokeWidth={2.5} />
            <span>Thêm</span>
          </button>
        )}

        {/* Trend button — opens KeywordManagerModal */}
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); setTrendOpen(true); }}
          title="Google Trends"
          aria-label="Google Trends"
          className="inline-flex items-center justify-center w-7 h-7 rounded text-ink-muted hover:text-wp-blue hover:bg-wp-blue/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30"
        >
          <TrendingUp size={14} />
        </button>
      </div>

      <p className="text-[11px] text-ink-muted mt-1">
        Nhấn Enter hoặc dấu phẩy để thêm từ khoá. Backspace trên ô trống để xoá từ khoá cuối.
      </p>

      {/* Modal — uncontrolled, owned until user clicks "use selected" */}
      <KeywordManagerModal
        open={trendOpen}
        keywords={value}
        onClose={() => setTrendOpen(false)}
        onSave={(next) => {
          onChange(next);
          setTrendOpen(false);
        }}
      />
    </div>
  );
}

// ─── Palette ────────────────────────────────────────────────────────────
//  Index 0 (primary) → solid green per Rank Math default.
//  Indices 1..n cycle through accent colours so the pill row reads as
//  "categorically distinct" rather than uniform.
const PALETTE = [
  // primary — keep at index 0
  { chip: 'border-wp-green text-wp-green bg-wp-green/10' },
  // accents
  { chip: 'border-wp-orange text-wp-orange bg-wp-orange/10' },
  { chip: 'border-purple-500 text-purple-700 bg-purple-500/10' },
  { chip: 'border-teal-500 text-teal-700 bg-teal-500/10' },
  { chip: 'border-sky-500 text-sky-700 bg-sky-500/10' },
  { chip: 'border-pink-500 text-pink-700 bg-pink-500/10' },
  { chip: 'border-amber-500 text-amber-700 bg-amber-500/10' },
  { chip: 'border-rose-500 text-rose-700 bg-rose-500/10' },
];

function keywordStyle(idx) {
  return PALETTE[idx % PALETTE.length];
}
