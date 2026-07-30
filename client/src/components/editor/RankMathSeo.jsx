/**
 * Rank Math-style SEO panel.
 *
 * Computes a 0-100 score based on the focus keyword's presence in:
 *   - SEO Title
 *   - URL Slug
 *   - Meta Description
 *   - Post Content (and in the first paragraph for extra credit)
 *
 * Surfaces:
 *   - color-coded score badge (good / ok / bad)
 *   - checklist of passed / failed checks (each clickable to focus the field)
 *   - SERP preview (title + slug + description)
 *
 * Designed to drop into the sidebar of <PostEditor />.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

import { Input, Textarea, Label } from '../../components/ui/Input';

const TITLE_MIN = 40;
const TITLE_MAX = 60;
const DESC_MIN  = 110;
const DESC_MAX  = 160;

function computeScore({ focusKeyword, seoTitle, seoSlug, seoDescription, content }) {
  const checks = [];
  const kw = (focusKeyword || '').trim().toLowerCase();
  const title = (seoTitle || '').trim();
  const slug = (seoSlug || '').trim().toLowerCase();
  const desc = (seoDescription || '').trim();
  const body = (content || '').replace(/<[^>]*>/g, ' ').toLowerCase();

  if (!kw) {
    return { score: 0, label: 'scoreEmpty', tone: 'empty', checks: [] };
  }

  // Title contains kw
  const titleHas = title.toLowerCase().includes(kw);
  checks.push({ id: 'title-kw', ok: titleHas, label: 'Focus keyword in SEO title' });

  // Title length 40-60
  const titleLen = title.length;
  const titleLenOk = titleLen >= TITLE_MIN && titleLen <= TITLE_MAX;
  checks.push({
    id: 'title-len',
    ok: titleLenOk,
    label: `SEO title length is ${TITLE_MIN}-${TITLE_MAX} chars (currently ${titleLen})`,
  });

  // Slug contains kw
  const slugHas = slug.includes(kw);
  checks.push({ id: 'slug-kw', ok: slugHas, label: 'Focus keyword in URL slug' });

  // Description length 110-160
  const descLen = desc.length;
  const descLenOk = descLen >= DESC_MIN && descLen <= DESC_MAX;
  checks.push({
    id: 'desc-len',
    ok: descLenOk,
    label: `Meta description ${DESC_MIN}-${DESC_MAX} chars (currently ${descLen})`,
  });

  // Description contains kw
  const descHas = desc.toLowerCase().includes(kw);
  checks.push({ id: 'desc-kw', ok: descHas, label: 'Focus keyword in meta description' });

  // Content contains kw
  const contentHas = body.includes(kw);
  checks.push({ id: 'content-kw', ok: contentHas, label: 'Focus keyword in post content' });

  // First paragraph contains kw
  const firstPara = body.split(/\n|\./)[0] || '';
  const firstParaHas = firstPara.includes(kw);
  checks.push({ id: 'first-para', ok: firstParaHas, label: 'Focus keyword in first paragraph' });

  const passed = checks.filter(c => c.ok).length;
  const score = Math.round((passed / checks.length) * 100);

  let tone = 'bad';
  if (score >= 80) tone = 'good';
  else if (score >= 50) tone = 'ok';

  return { score, tone, checks };
}

export function RankMathSeo({ value, onChange, baseDomain }) {
  const { t } = useTranslation();
  const v = value || {};
  const set = (patch) => onChange({ ...v, ...patch });

  const { score, tone, checks } = useMemo(
    () => computeScore({
      focusKeyword:  v.focusKeyword,
      seoTitle:      v.seoTitle,
      seoSlug:       v.seoSlug,
      seoDescription:v.seoDescription,
      content:       v.content,
    }),
    [v.focusKeyword, v.seoTitle, v.seoSlug, v.seoDescription, v.content]
  );

  const toneClass = {
    good: 'bg-wp-green text-white',
    ok:   'bg-wp-orange text-white',
    bad:  'bg-wp-red text-white',
    empty:'bg-wp-gray text-ink-secondary',
  }[tone];

  const toneLabel = tone === 'empty' ? t('scoreEmpty')
                  : tone === 'good'   ? t('scoreGood')
                  : tone === 'ok'     ? t('scoreOk')
                  :                     t('scoreBad');

  const fullUrl = `${baseDomain || ''}${v.seoSlug || ''}`;

  return (
    <div className="bg-white border border-wp-gray-dark rounded">
      <div className="px-4 py-2.5 bg-[#f6f7f7] border-b border-wp-gray-dark flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-primary m-0">{t('rankMathSeo')}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${toneClass}`}>
          {tone === 'empty' ? '—' : `${score}/100`}
        </span>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Score + label */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full grid place-items-center font-bold ${toneClass}`}>
            {tone === 'empty' ? '?' : score}
          </div>
          <span className="text-sm font-medium text-ink-primary">{toneLabel}</span>
        </div>

        {/* Focus keyword */}
        <div>
          <Label htmlFor="seo-focus">{t('seoFocusKeyword')}</Label>
          <Input id="seo-focus" value={v.focusKeyword || ''} onChange={(e) => set({ focusKeyword: e.target.value })} />
        </div>

        {/* SEO Title */}
        <div>
          <Label htmlFor="seo-title">{t('seoTitle')}</Label>
          <Input id="seo-title" value={v.seoTitle || ''} onChange={(e) => set({ seoTitle: e.target.value })} />
          <div className="text-xs text-ink-muted mt-1">{(v.seoTitle || '').length} / {TITLE_MAX}</div>
        </div>

        {/* Slug */}
        <div>
          <Label htmlFor="seo-slug">{t('seoSlug')}</Label>
          <Input id="seo-slug" value={v.seoSlug || ''} onChange={(e) => set({ seoSlug: e.target.value })} />
        </div>

        {/* Description */}
        <div>
          <Label htmlFor="seo-desc">{t('seoDescription')}</Label>
          <Textarea id="seo-desc" rows={3} value={v.seoDescription || ''} onChange={(e) => set({ seoDescription: e.target.value })} />
          <div className="text-xs text-ink-muted mt-1">{(v.seoDescription || '').length} / {DESC_MAX}</div>
        </div>

        {/* Checklist */}
        {checks.length > 0 && (
          <ul className="flex flex-col gap-1.5 text-sm">
            {checks.map((c) => (
              <li key={c.id} className="flex items-start gap-2">
                {c.ok
                  ? <CheckCircle2 size={16} className="text-wp-green flex-shrink-0 mt-0.5" />
                  : <XCircle     size={16} className="text-wp-red   flex-shrink-0 mt-0.5" />}
                <span className={c.ok ? 'text-ink-secondary' : 'text-ink-primary'}>{c.label}</span>
              </li>
            ))}
          </ul>
        )}

        {/* SERP preview */}
        <div className="border-t border-wp-gray pt-3">
          <div className="text-xs text-ink-muted mb-1.5 flex items-center gap-1">
            <AlertCircle size={12} /> SERP Preview
          </div>
          <div className="text-[#1a0dab] text-base leading-snug hover:underline cursor-pointer truncate">
            {v.seoTitle || '(no SEO title)'}
          </div>
          <div className="text-wp-green text-xs truncate">{fullUrl}</div>
          <div className="text-ink-secondary text-xs line-clamp-2">
            {v.seoDescription || '(no meta description)'}
          </div>
        </div>
      </div>
    </div>
  );
}