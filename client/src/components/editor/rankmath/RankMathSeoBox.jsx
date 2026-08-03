import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Star, ChevronDown } from 'lucide-react';

import { Input } from '../../ui/Input';
import { SeoTabs }        from './SeoTabs';
import { SnippetPreview } from './SnippetPreview';
import { FocusKeywordInput } from './FocusKeywordInput';
import { SeoChecklist }   from './SeoChecklist';
import { SnippetEditModal } from './SnippetEditModal';
import { AdvancedTab }     from './AdvancedTab';
import { SchemaTab }       from './SchemaTab';
import { SocialTab }       from './SocialTab';
import { SocialSnippetModal } from './SocialSnippetModal';
import { calculateSeoScore } from './lib/calculateSeoScore';

/**
 * <RankMathSeoBox /> — top-level SEO panel for the post editor sidebar.
 *
 * STATE OWNERSHIP
 * ---------------
 * This component is the SINGLE SOURCE OF TRUTH for all SEO data:
 *
 *   seoState = {
 *     focusKeywords   : string[]   // multi-keyword list, index 0 = primary
 *     metaTitle       : string
 *     metaDescription : string
 *     slug            : string
 *     isCornerstone   : boolean    // "Bài viết cốt lõi"
 *     content         : string     // raw HTML from the post body, used by
 *                                  // the readability / content checks
 *   }
 *
 * The host (e.g. <PostEditor />) owns persistence: it passes `value`
 * (initial) and receives `onChange` whenever any field updates. The
 * modal draft is internal and never escapes the modal.
 *
 * DATA FLOW
 * ---------
 *   field input → setField(patch)   →  setSeoState → React re-render
 *                  └─→ seoState is memoised → calculateSeoScore(state)
 *                        └─→ score, checks   →  <SeoChecklist />,
 *                                              <FocusKeywordInput />
 *                                              badge, etc.
 *
 * Every sub-component is CONTROLLED — they receive values + callbacks,
 * never mutate state directly. That keeps the score engine in sync.
 *
 * ⚠️ IMPORTANT — expected `value` prop shape from the host page:
 *   <RankMathSeoBox
 *     value={{
 *       focusKeywords  : string[]              // e.g. ['nghiep vu bao mau']
 *       metaTitle      : string                // SEO title
 *       metaDescription: string                // Meta description
 *       slug           : string                // URL slug
 *       isCornerstone  : boolean               // "Bài viết cốt lõi"
 *       content        : string                // ⚠️ REQUIRED — raw HTML
 *                                            // from your editor (TinyMCE,
 *                                            // Quill, etc.). Without this
 *                                            // the score stays 0 because
 *                                            // content-based checks can't
 *                                            // run.
 *       baseDomain?    : string                // for Internal/External
 *                                            // link classification
 *     }}
 *     onChange={...}
 *   />
 */
export function RankMathSeoBox({ value, onChange, baseDomain }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);

  // Refs for "click a checklist row → focus the matching input"
  const fieldRefs = {
    metaTitle:       useRef(null),
    metaDescription: useRef(null),
    slug:            useRef(null),
    content:         useRef(null),
  };

  // ─── Normalise incoming value ──────────────────────────────────────────
  // Defensive: parent may pass an array of objects (e.g. leftover state
  // from an older shape like { text, checked }) instead of plain strings.
  // We coerce to string[] here so the score engine never sees the wrong
  // type — which is the #1 cause of the "score stuck at 0" bug.
  const seoState = useMemo(() => {
    const rawKws = value?.focusKeywords ?? [];
    const focusKeywords = (Array.isArray(rawKws) ? rawKws : [])
      .map((k) => (typeof k === 'string' ? k : k?.text ?? ''))
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      focusKeywords,
      metaTitle:       value?.metaTitle       ?? '',
      metaDescription: value?.metaDescription ?? '',
      slug:            value?.slug            ?? '',
      isCornerstone:   value?.isCornerstone   ?? false,
      content:         value?.content         ?? '',
    };
  }, [value]);

  const setField = useCallback((patch) => {
    onChange({ ...seoState, ...patch });
  }, [seoState, onChange]);

  // ─── Score engine (re-runs whenever any tracked field changes) ────────
  const { score, tone, checks } = useMemo(
    () => calculateSeoScore(seoState),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      seoState.focusKeywords,
      seoState.metaTitle,
      seoState.metaDescription,
      seoState.slug,
      seoState.content,
    ],
  );

  const toneClass = {
    good:  'bg-wp-green text-white',
    ok:    'bg-wp-orange text-white',
    bad:   'bg-wp-red text-white',
    empty: 'bg-wp-gray-dark text-ink-secondary',
  }[tone];

  // ─── Checklist "focus field" handler ──────────────────────────────────
  const focusField = useCallback((fieldKey) => {
    setActiveTab('overview');
    setModalOpen(false);
    // Two of the focusable targets live inside the modal — open it first.
    if (fieldKey === 'metaTitle' || fieldKey === 'metaDescription' || fieldKey === 'slug') {
      setModalOpen(true);
      // The modal focuses its own title input; nothing else to do.
      return;
    }
    if (fieldKey === 'content') {
      fieldRefs.content.current?.focus?.();
      fieldRefs.content.current?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border border-wp-gray-dark rounded shadow-sm overflow-hidden">
      {/* Card header — title + score badge (clickable to toggle) */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#f6f7f7] border-b border-wp-gray-dark cursor-pointer hover:bg-[#eef0f1] transition-colors text-left"
      >
        <h3 className="text-sm font-semibold text-ink-primary m-0 flex items-center gap-1.5">
          <TrendingUp size={14} className="text-wp-blue" />
          {t('rankMathSeo')}
        </h3>
        <div className="flex items-center gap-2">
          <span className={['text-xs px-2 py-0.5 rounded-full font-semibold', toneClass].join(' ')}>
            {tone === 'empty' ? '—' : `${score}/100`}
          </span>
          <ChevronDown
            size={18}
            className={`transition-transform duration-200 text-ink-secondary ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {isOpen && (
        <>
          <SeoTabs value={activeTab} onChange={setActiveTab} />

          <div
            id={`seo-tab-panel-${activeTab}`}
            role="tabpanel"
            className="p-4 flex flex-col gap-4"
          >
            {activeTab === 'overview' && (
              <>
                {/* ── 1. SERP preview sits at the very top ── */}
                <SnippetPreview
                  value={{
                    metaTitle:       seoState.metaTitle,
                    metaDescription: seoState.metaDescription,
                    slug:            seoState.slug,
                  }}
                  baseDomain={baseDomain}
                  onEdit={() => setModalOpen(true)}
                />

                {/* ── 2. Divider between snippet preview & the rest ── */}
                <hr className="my-5 border-gray-200" />

                {/* ── 3. Focus keywords + live score ── */}
                <FocusKeywordInput
                  value={seoState.focusKeywords}
                  onChange={(kws) => setField({ focusKeywords: kws })}
                  score={{ score, tone }}
                />

                {/* ── 4. Cornerstone toggle ── */}
                <label className="inline-flex items-center gap-2 text-sm text-ink-primary cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={seoState.isCornerstone}
                    onChange={(e) => setField({ isCornerstone: e.target.checked })}
                    className="w-4 h-4 accent-wp-blue"
                  />
                  <Star size={14} className="text-wp-orange" />
                  <span>{t('isCornerstone', 'Bài viết cốt lõi')}</span>
                </label>

                {/* ── 5. Checklist ── */}
                <SeoChecklist checks={checks} onFocus={focusField} />

                {/* ── Hidden mirror for the content field so focusField('content')
                      can scroll to it even if the host editor uses its own ref. */}
                <Input
                  ref={fieldRefs.content}
                  type="hidden"
                  value=""
                  readOnly
                  tabIndex={-1}
                  aria-hidden="true"
                  className="sr-only"
                />
              </>
            )}

            {activeTab === 'advanced' && (
              <AdvancedTab
                value={value?.advanced}
                onChange={(patch) => {
                  setField({ advanced: { ...(value?.advanced ?? {}), ...patch } });
                }}
              />
            )}

            {activeTab === 'schema' && (
              <SchemaTab
                value={value?.schemaType}
                onChange={(schemaType) => setField({ schemaType })}
                onOpenGenerator={(schemaType) => {
                  // eslint-disable-next-line no-console
                  console.log('[RankMathSeoBox] open Schema Generator for:', schemaType);
                }}
              />
            )}

            {activeTab === 'social' && (
              <SocialTab
                onOpenSocialModal={() => setIsSocialModalOpen(true)}
              />
            )}

            {activeTab !== 'overview' && activeTab !== 'advanced' && activeTab !== 'schema' && activeTab !== 'social' && (
              <div className="text-sm text-ink-muted italic px-1 py-3">
                {t('seoTabPlaceholder', 'Tab này sẽ được bổ sung ở phiên bản sau.')}
              </div>
            )}
          </div>
        </>
      )}

      <SnippetEditModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        value={{
          metaTitle:       seoState.metaTitle,
          metaDescription: seoState.metaDescription,
          slug:            seoState.slug,
        }}
        onSave={(patch) => setField(patch)}
        baseDomain={baseDomain}
      />

      <SocialSnippetModal
        isOpen={isSocialModalOpen}
        onClose={() => setIsSocialModalOpen(false)}
        value={{
          socialTitle:       value?.socialTitle       ?? '',
          socialDescription: value?.socialDescription ?? '',
          socialImage:       value?.socialImage       ?? '',
          baseDomain,
        }}
        onSave={(patch) => setField(patch)}
      />
    </div>
  );
}