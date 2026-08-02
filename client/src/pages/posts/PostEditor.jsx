import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Trash2, X, Eye } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input, Label, Select, Textarea } from '../../components/ui/Input';
import { useTinyMCE } from '../../hooks/useTinyMCE';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useLoading } from '../../context/LoadingContext';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { postsApi } from '../../services/api/posts';
import { CATEGORIES, POST_STATUS, DEFAULT_BASE_DOMAIN } from '../../utils/constants';
import { generateSlug } from '../../utils/helpers';
import { RankMathSeoBox } from '../../components/editor/rankmath';
import { CategorySidebar } from '../../components/editor/CategorySidebar';
import { db } from '../../services/firebase/config';

const CATEGORY_LABEL = {
  tech: 'Technology', lifestyle: 'Lifestyle', business: 'Business',
  design: 'Design', marketing: 'Marketing',
};

export default function PostEditor() {
  const { id } = useParams();
  const location = useLocation();
  const isNew = !id || id === 'new';
  const isRestorePath = location.pathname.endsWith('/restore');
  const navigate = useNavigate();
  const [restoreMode, setRestoreMode] = useState(isRestorePath);
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const { showLoading, hideLoading } = useLoading();

  const [title, setTitle]             = useState('');
  const [slug, setSlug]               = useState('');
  const [excerpt, setExcerpt]         = useState('');
  const [status, setStatus]           = useState(POST_STATUS.DRAFT);
  const [schedule, setSchedule]       = useState('');
  const [categories, setCategories]   = useState(new Set());
  const [tags, setTags]               = useState([]);
  const [tagInput, setTagInput]       = useState('');
  const [featuredImage, setFeaturedImage] = useState(null);
  const [seo, setSeo]                 = useState({
    focusKeywords: [], metaTitle: '', slug: '', metaDescription: '',
  });
  const [content, setContent]         = useState('');
  const [loaded, setLoaded]           = useState(isNew);

  // Task 3+6: track dirty state. Snapshot the original loaded values so we can
  // detect whether the user changed anything before saving.
  const initialRef = useRef(null);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);

  // Reset snapshot whenever we start loading a different post.
  useEffect(() => {
    initialRef.current = null;
    setIsDirty(false);
  }, [id, isNew]);

  useEffect(() => {
    if (!loaded) return;
    const snap = {
      title, slug, excerpt, status, schedule,
      categories: [...categories], tags: [...tags], featuredImage,
      seo: { ...seo }, content,
    };
    if (!initialRef.current) {
      initialRef.current = snap;
      setIsDirty(false);
    } else {
      setIsDirty(JSON.stringify(snap) !== JSON.stringify(initialRef.current));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, title, slug, excerpt, status, schedule, categories, tags, featuredImage, seo, content]);

  const editor = useTinyMCE({
    selector: '#post-editor',
    initialContent: '',
  });

  // Mirror TinyMCE content into `content` state in real-time so that
  // downstream consumers (e.g. <RankMathSeoBox /> which scores content
  // presence of focus keywords) can recompute on every keystroke.
  // Without this, the SEO score is stuck at whatever was loaded with
  // the post — typically 0 for fresh posts.
  useEffect(() => {
    const inst = editor.editorRef?.current;
    if (!inst) return undefined;
    const onInput = () => setContent(inst.getContent() || '');
    inst.on('input keyup change undo redo', onInput);
    return () => {
      try { inst.off('input keyup change undo redo', onInput); } catch { /* ignore */ }
    };
  }, [editor]);

  // Restore flow: when URL ends in /restore, call restore API then redirect.
  useEffect(() => {
    if (!isRestorePath || !id) return undefined;
    const token = showLoading();
    postsApi.restore(id).then(() => {
      hideLoading(token);
      showToast(t('postRestoredSuccess'), 'success');
      navigate(`/posts/${id}/edit`, { replace: true });
    }).catch((e) => {
      hideLoading(token);
      showToast(e.message, 'error');
      navigate('/posts');
    });
    return () => hideLoading(token);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRestorePath, id]);

// Load existing post
  useEffect(() => {
    if (isNew) return undefined;
    const token = showLoading();
    postsApi.get(id).then((res) => {
      hideLoading(token);
      const p = res.post;
      if (!p) { showToast(t('postNotFound'), 'error'); navigate('/posts'); return; }
      setTitle(p.title || '');
      setSlug(p.slug || '');
      setExcerpt(p.excerpt || '');
      setStatus(p.status === 'trashed' ? POST_STATUS.DRAFT : (p.status || POST_STATUS.DRAFT));
      setSchedule(p.schedule || '');
      setCategories(new Set((p.categories || []).map(c => {
        const found = Object.entries(CATEGORY_LABEL).find(([, label]) => label === c);
        return found ? found[0] : null;
      }).filter(Boolean)));
      setTags(p.tags || []);
      setFeaturedImage(p.featuredImage || null);
      setContent(p.content || '');
      // Backwards-compat: server may have stored legacy shape
      // ({focusKeyword}) or new shape ({focusKeywords[]}). Handle both.
      const legacyFocus = p.seo?.focusKeyword;
      const newFocus    = p.seo?.focusKeywords;
      const focusKeywords = Array.isArray(newFocus)
        ? newFocus
        : (legacyFocus ? [legacyFocus] : []);

      setSeo({
        focusKeywords,
        metaTitle:       p.seo?.metaTitle       ?? p.seo?.seoTitle       ?? p.title   ?? '',
        slug:            p.seo?.slug            ?? p.seo?.seoSlug        ?? p.slug    ?? '',
        metaDescription: p.seo?.metaDescription ?? p.seo?.seoDescription ?? p.excerpt ?? '',
      });
      editor.setContent(p.content || '');
      setLoaded(true);
    }).catch((e) => {
      hideLoading(token);
      showToast(e.message, 'error');
      navigate('/posts');
    });
    return () => hideLoading(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function onTitleChange(e) {
    const v = e.target.value;
    setTitle(v);
    if (!slug || slug === generateSlug(title)) setSlug(generateSlug(v));
  }

  function toggleCategory(key) {
    setCategories(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function addTag(raw) {
    const value = (raw || '').trim().replace(/,/g, '');
    if (!value) return;
    if (tags.map(x => x.toLowerCase()).includes(value.toLowerCase())) {
      showToast(t('tagExists'), 'info');
      return;
    }
    setTags(prev => [...prev, value]);
  }

  function onTagKeyDown(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
  }

  async function onUploadFeatured(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) { showToast(t('invalidImage'), 'error'); return; }
    if (file.size > 524288) { showToast(t('imageTooLarge', { size: 512 }), 'error'); return; }
    showToast(t('processingImage'), 'info');
    const reader = new FileReader();
    reader.onload = (e) => { setFeaturedImage(e.target.result); showToast(t('imageUploaded'), 'success'); };
    reader.onerror = () => showToast(t('error'), 'error');
    reader.readAsDataURL(file);
  }

  function gatherPayload() {
    const body = editor.getContent() || '';
    setContent(body);
    const seoSlug = seo.slug || generateSlug(title);
    // Task 6: ensure `status` is always a valid POST_STATUS value in payload,
    // fall back to DRAFT if dropdown somehow lost its value.
    const finalStatus = [POST_STATUS.DRAFT, POST_STATUS.PUBLISHED, POST_STATUS.PRIVATE].includes(status)
      ? status
      : POST_STATUS.DRAFT;
    return {
      title, slug: seoSlug,
      categories: [...categories].map(k => CATEGORY_LABEL[k]),
      tags, status: finalStatus, excerpt, content: body, schedule,
      featuredImage,
      // Send BOTH legacy + new shape so any server version keeps working.
      // Primary keyword mirrors into legacy `focusKeyword` for old APIs.
      seo: {
        ...seo,
        focusKeyword:   seo.focusKeywords?.[0] ?? '',
        seoTitle:       seo.metaTitle,
        seoSlug:        seo.slug,
        seoDescription: seo.metaDescription,
      },
    };
  }

  async function save() {
    if (!title.trim()) {
      showToast(t('pleaseEnterTitle'), 'error');
      return;
    }
    // Giữ nguyên status từ dropdown (không đè bằng tham số ngoài).
    // Nếu dropdown rỗng/vô hiệu thì fallback draft.
    const payload = gatherPayload();
    if (!payload.status) payload.status = POST_STATUS.DRAFT;
    const token = showLoading();
    try {
      if (isNew) {
        const res = await postsApi.create(payload);
        showToast(t('postSavedSuccess'), 'success');
        navigate(`/posts/${res.post.id}/edit`, { replace: true });
      } else {
        await postsApi.update(id, payload);
        showToast(t('postUpdatedSuccess'), 'success');
        // Reset dirty so navigation guard doesn't fire as we leave.
        initialRef.current = null;
        setIsDirty(false);
        navigate('/posts');
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      hideLoading(token);
    }
  }

  function trash() {
    if (isNew) { navigate('/posts'); return; }
    confirm({
      message: t('confirmMoveToTrash'),
      onConfirm: async () => {
        const token = showLoading();
        try {
          await postsApi.trash(id);
          showToast(t('postTrashedSuccess'), 'success');
          initialRef.current = null;
          setIsDirty(false);
          navigate('/posts');
        } catch (e) { showToast(e.message, 'error'); }
        finally { hideLoading(token); }
      },
    });
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-wp-gray">
        <Button variant="secondary" size="md" leftIcon={<ArrowLeft size={16} />} onClick={() => navigate('/posts')}>
          {t('backToPosts')}
        </Button>
        <span className="text-xs text-ink-muted">{isNew ? t('addNew') : `ID: ${id}`}</span>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}>
        {/* Main */}
        <div className="flex flex-col gap-5 min-w-0">
          <input
            type="text"
            value={title}
            onChange={onTitleChange}
            placeholder={t('enterTitlePlaceholder')}
            className="w-full text-2xl font-semibold px-4 py-2.5 rounded border border-wp-gray-dark focus:outline-none focus:border-wp-blue"
          />

          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-[#f6f7f7] rounded">
            <span className="text-xs text-ink-muted">{t('permalink')}</span>
            <span className="text-xs text-ink-secondary font-mono">{DEFAULT_BASE_DOMAIN}</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="post-slug"
              className="flex-1 min-w-[150px] px-2 py-1 rounded border border-wp-gray-dark text-xs bg-white"
            />
            <a
              href={slug ? `${DEFAULT_BASE_DOMAIN}${slug}` : DEFAULT_BASE_DOMAIN}
              target="_blank"
              rel="noopener noreferrer"
              title="View"
              aria-label="View post"
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-wp-gray-dark bg-white text-xs text-wp-blue hover:bg-wp-blue hover:text-white transition"
            >
              <Eye size={12} />
              <span>View</span>
            </a>
          </div>

          <div className="border border-wp-gray-dark rounded overflow-hidden">
            <textarea id="post-editor" className="tinymce-editor" />
          </div>

          <div className="p-4 bg-white border border-wp-gray-dark rounded mb-4 w-full">
            <h3 className="text-sm font-semibold mb-2">{t('excerpt')}</h3>
            <Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder={t('excerptPlaceholder')} rows={3} />
          </div>

          {/* Rank Math SEO — moved out of the 320px sidebar so it has
             room to breathe. Sits right under the Excerpt block, full
             width of the Main column. */}
          <div className="w-full">
            <RankMathSeoBox
              value={{ ...seo, content, baseDomain: DEFAULT_BASE_DOMAIN }}
              onChange={(next) => setSeo(next)}
              baseDomain={DEFAULT_BASE_DOMAIN}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5">
          {/* Publish */}
          <div className="bg-white border border-wp-gray-dark rounded">
            <h3 className="px-4 py-2.5 bg-[#f6f7f7] border-b border-wp-gray-dark text-sm font-semibold m-0">{t('publish')}</h3>
            <div className="p-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <Label>{t('status')}</Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value={POST_STATUS.DRAFT}>{t('draftStatus')}</option>
                  <option value={POST_STATUS.PUBLISHED}>{t('publicStatus')}</option>
                  <option value={POST_STATUS.PRIVATE}>{t('privateStatus')}</option>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>{t('schedule')}</Label>
                <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} />
              </div>
              <div className="pt-2 border-t border-wp-gray">
                <Button variant="primary" size="sm" className="w-full" leftIcon={<Send size={14} />} onClick={save}>
                  {t('update')}
                </Button>
              </div>
            </div>
          </div>

          {/* Categories — Firebase-powered via <CategorySidebar />
             (replaces the old hardcoded CATEGORY_LABEL block). */}
          <CategorySidebar
            selected={[...categories]}
            onChange={(ids) => setCategories(new Set(ids))}
            db={db}
          />

          {/* Tags */}
          <div className="bg-white border border-wp-gray-dark rounded">
            <h3 className="px-4 py-2.5 bg-[#f6f7f7] border-b border-wp-gray-dark text-sm font-semibold m-0">{t('tags')}</h3>
            <div className="p-4 flex flex-col gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={onTagKeyDown}
                placeholder={t('tagsPlaceholder')}
              />
              <p className="text-xs text-ink-muted m-0">{t('tagsDescription')}</p>
              <div className="flex flex-wrap gap-1.5 min-h-[30px]">
                {tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-wp-gray rounded text-xs">
                    {tag}
                    <button onClick={() => setTags(prev => prev.filter(x => x !== tag))} className="text-ink-muted hover:text-wp-red">
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Featured image */}
          <div className="bg-white border border-wp-gray-dark rounded">
            <h3 className="px-4 py-2.5 bg-[#f6f7f7] border-b border-wp-gray-dark text-sm font-semibold m-0">{t('featuredImage')}</h3>
            <div className="p-4 flex flex-col gap-2">
              <div className="w-full h-[150px] rounded border-2 border-dashed border-wp-gray-dark bg-wp-gray flex items-center justify-center overflow-hidden text-ink-muted text-xs">
                {featuredImage
                  ? <img src={featuredImage} alt="featured" className="w-full h-full object-cover" />
                  : t('noFeaturedImage')}
              </div>
              <input type="file" id="featured-image" accept="image/*" className="hidden"
                     onChange={(e) => onUploadFeatured(e.target.files?.[0])} />
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" onClick={() => document.getElementById('featured-image').click()}>
                  {t('setFeaturedImage')}
                </Button>
                {featuredImage && (
                  <Button variant="secondary" size="sm" onClick={() => setFeaturedImage(null)}>
                    {t('remove')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Trash */}
          {!isNew && (
            <div className="bg-white border border-wp-gray-dark rounded">
              <div className="p-4">
                <Button variant="danger" size="md" leftIcon={<Trash2 size={14} />} onClick={trash}>
                  {t('moveToTrashBtn')}
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}