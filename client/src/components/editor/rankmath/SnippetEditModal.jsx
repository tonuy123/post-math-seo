import { useEffect, useRef, useState } from 'react';
import { X, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, Textarea, Label } from '../../ui/Input';
import { Button } from '../../ui/Button';
import { TITLE_MAX, DESC_MAX } from './lib/seoConstants';

/**
 * Modal form for editing the SERP snippet fields.
 *
 * Props:
 *   - open       : boolean
 *   - onClose    : () => void
 *   - value      : { metaTitle, metaDescription, slug }
 *   - onSave     : (next: { metaTitle, metaDescription, slug }) => void
 *
 * Owns a LOCAL draft so the user can cancel without polluting parent
 * state. On Save, commits back via onSave.
 */
export function SnippetEditModal({ open, onClose, value, onSave }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(value || {});
  const titleRef = useRef(null);

  // Sync local draft whenever the modal opens with a new value.
  useEffect(() => {
    if (open) setDraft(value || {});
  }, [open, value]);

  // Focus the first field when opened.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => titleRef.current?.focus(), 30);
      return () => clearTimeout(id);
    }
  }, [open]);

  // Close on ESC.
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const titleOverflow = (draft.metaTitle || '').length > TITLE_MAX;
  const descOverflow  = (draft.metaDescription || '').length > DESC_MAX;

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
      <div className="w-full sm:max-w-lg bg-white rounded-t sm:rounded shadow-xl overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-wp-gray">
          <h3 id="snippet-modal-title" className="text-sm font-semibold text-ink-primary">
            {t('editSnippet')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="close"
            className="inline-flex items-center justify-center w-7 h-7 rounded hover:bg-wp-gray focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30"
          >
            <X size={14} />
          </button>
        </header>

        <form onSubmit={handleSave} className="p-4 flex flex-col gap-4 max-h-[80vh] overflow-y-auto">
          <div>
            <Label htmlFor="seo-title">{t('seoTitle')}</Label>
            <Input
              id="seo-title"
              ref={titleRef}
              value={draft.metaTitle || ''}
              onChange={(e) => setDraft((d) => ({ ...d, metaTitle: e.target.value }))}
            />
            <div className={['text-xs mt-1', titleOverflow ? 'text-wp-orange' : 'text-ink-muted'].join(' ')}>
              {(draft.metaTitle || '').length} / {TITLE_MAX}
            </div>
          </div>

          <div>
            <Label htmlFor="seo-desc">{t('seoDescription')}</Label>
            <Textarea
              id="seo-desc"
              rows={4}
              value={draft.metaDescription || ''}
              onChange={(e) => setDraft((d) => ({ ...d, metaDescription: e.target.value }))}
            />
            <div className={['text-xs mt-1', descOverflow ? 'text-wp-orange' : 'text-ink-muted'].join(' ')}>
              {(draft.metaDescription || '').length} / {DESC_MAX}
            </div>
          </div>

          <div>
            <Label htmlFor="seo-slug">{t('seoSlug')}</Label>
            <Input
              id="seo-slug"
              value={draft.slug || ''}
              onChange={(e) => setDraft((d) => ({ ...d, slug: e.target.value }))}
              placeholder="my-post-slug"
            />
          </div>

          <footer className="flex items-center justify-end gap-2 pt-2 border-t border-wp-gray">
            <Button type="button" variant="secondary" size="md" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button type="submit" variant="primary" size="md" leftIcon={<Save size={14} />}>
              {t('save')}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  );
}