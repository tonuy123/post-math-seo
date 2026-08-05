import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Trash2, X, Eye, BarChart3 } from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input, Label, Select, Textarea } from '../../components/ui/Input';
import { useTinyMCE } from '../../hooks/useTinyMCE';
import { useToast } from '../../context/ToastContext';
import { useConfirm } from '../../context/ConfirmContext';
import { useLoading } from '../../context/LoadingContext';
import { useAuth } from '../../context/AuthContext';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';
import { useCategories } from '../../hooks/useCategories';
import { postsApi } from '../../services/api/posts';
import { POST_STATUS, DEFAULT_BASE_DOMAIN } from '../../utils/constants';
import { generateSlug } from '../../utils/helpers';
import { RankMathSeoBox } from '../../components/editor/rankmath';
import { CategorySidebar } from '../../components/editor/CategorySidebar';
import { PostOptionsWidget } from '../../components/editor/PostOptionsWidget';
import { db } from '../../services/firebase/config';

// State `categories` lưu các ID của category (khớp với doc id trong Firestore).
// Khi lưu, ta giải mã chúng thành tên dễ đọc để document bài viết
// lưu một nhãn đọc được mà bộ lọc PostsList có thể so khớp
// trực tiếp — không cần join.



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
  const { user: currentUser } = useAuth();
  const { categories: allCats } = useCategories();

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

  // Lưu các TÊN đã tải từ doc bài viết để có thể tái giải mã chúng
  // thành Firestore ID khi snapshot của collection `categories` được cập nhật.
  // (Listener của Firestore chạy bất đồng bộ, nên các ID không sẵn sàng
  // ở lần đầu tiên ta đọc bài viết.)
  const [postCategoryNames, setPostCategoryNames] = useState([]);

  // Real-time + metadata bài viết (tác giả, lần xuất bản đầu, số lần sửa đổi,
  // toàn bộ lịch sử editors). Tất cả đều lấy từ document bài viết — không bao giờ
  // hard-code.
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [postMeta, setPostMeta]       = useState({
    authorName:       '',
    firstPublishedAt: null,
    revisionCount:    0,
    editors:          [],
  });

  // Task 3+6: theo dõi trạng thái dirty. Chụp snapshot các giá trị đã tải ban đầu để
  // phát hiện xem người dùng có thay đổi gì trước khi lưu hay không.
  const initialRef = useRef(null);
  const [isDirty, setIsDirty] = useState(false);
  useUnsavedChangesGuard(isDirty);

  // Reset snapshot mỗi khi bắt đầu tải một bài viết khác.
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

  // Sao chép nội dung TinyMCE vào state `content` theo thời gian thực để
  // các consumer phía sau (ví dụ <RankMathSeoBox /> chấm điểm dựa trên sự
  // hiện diện của focus keywords trong nội dung) có thể tính lại sau mỗi lần gõ phím.
  // Nếu không có bước này, điểm SEO sẽ bị kẹt ở giá trị tải cùng bài viết
  // — thường là 0 đối với bài viết mới.
  useEffect(() => {
    const inst = editor.editorRef?.current;
    if (!inst) return undefined;
    const onInput = () => setContent(inst.getContent() || '');
    inst.on('input keyup change undo redo', onInput);
    return () => {
      try { inst.off('input keyup change undo redo', onInput); } catch { /* bỏ qua */ }
    };
  }, [editor]);

  // Luồng khôi phục: khi URL kết thúc bằng /restore, gọi API restore rồi chuyển hướng.
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

// Tải bài viết hiện có
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
      // Document bài viết lưu TÊN category (nhãn tiếng Việt) để con người
      // dễ đọc. Ánh xạ ngược chúng thành Firestore doc ID để sidebar
      // tích đúng các ô. `allCats` đến bất đồng bộ qua useCategories();
      // mảng `categories` rỗng là trạng thái ban đầu vô hại (việc ánh xạ tạo ra Set rỗng).
      // Ta chạy lại việc ánh xạ này ngay khi `allCats` được điền — xem
      // effect ngay bên dưới.
      setPostCategoryNames(p.categories || []);
      setTags(p.tags || []);
      setFeaturedImage(p.featuredImage || null);
      setContent(p.content || '');
      // Tương thích ngược: server có thể đã lưu định dạng cũ
      // ({focusKeyword}) hoặc định dạng mới ({focusKeywords[]}). Xử lý cả hai.
      const legacyFocus = p.seo?.focusKeyword;
      const newFocus    = p.seo?.focusKeywords;
      const focusKeywords = Array.isArray(newFocus)
        ? newFocus
        : (legacyFocus ? [legacyFocus] : []);

      // Giữ NGUYÊN toàn bộ seo đã lưu trong DB (advanced, schemaType,
      // social*, isCornerstone, ...) — chỉ override 4 key chuẩn hoá,
      // tránh mất data khi reload rồi save đè lại.
      setSeo({
        ...(p.seo || {}),
        focusKeywords,
        metaTitle:       p.seo?.metaTitle       ?? p.seo?.seoTitle       ?? p.title   ?? '',
        slug:            p.seo?.slug            ?? p.seo?.seoSlug        ?? p.slug    ?? '',
        metaDescription: p.seo?.metaDescription ?? p.seo?.seoDescription ?? p.excerpt ?? '',
      });
      editor.setContent(p.content || '');
      setLoaded(true);

      // Metadata bài viết cho PostOptionsWidget. Tất cả các trường đều tuỳ chọn
      // — fallback về các giá trị mặc định an toàn để widget không bao giờ hiện dữ liệu "giả".
      // Thứ tự giải mã tác giả: object author lồng nhau → authorName phẳng →
      // chuỗi createdBy → fallback về người dùng đang đăng nhập (danh tính thật,
      // không phải chỗ trống).
      const meFallback = currentUser?.displayName || currentUser?.username || currentUser?.email || '';
      setPostMeta({
        authorName:       p.author?.displayName
                        ?? p.author?.username
                        ?? p.authorName
                        ?? p.createdBy
                        ?? meFallback,
        firstPublishedAt:  p.firstPublishedAt ?? p.publishedAt ?? null,
        revisionCount:     p.revisionCount ?? 0,
        editors:           p.editors ?? [],
      });
      // "Lần sửa cuối" ban đầu — lấy từ updatedAt nếu backend cung cấp.
      setLastSavedAt(p.updatedAt ?? p.lastSavedAt ?? null);
    }).catch((e) => {
      hideLoading(token);
      showToast(e.message, 'error');
      navigate('/posts');
    });
    return () => hideLoading(token);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Giải mã các TÊN category đã lưu → Firestore ID khi snapshot categories
  // đã sẵn sàng. Chạy lại mỗi khi danh sách categories thay đổi
  // (ví dụ: một category mới được thêm giữa chừng khi đang sửa) để sidebar
  // luôn đồng bộ.
  useEffect(() => {
    if (!postCategoryNames.length) return;
    if (!allCats || !allCats.length) return;
    setCategories(new Set(
      postCategoryNames
        .map((name) => allCats.find((c) => c.name === name)?.id)
        .filter(Boolean),
    ));
  }, [allCats, postCategoryNames]);

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
    // Task 6: đảm bảo `status` luôn là giá trị POST_STATUS hợp lệ trong payload,
    // fallback về DRAFT nếu dropdown bất ngờ mất giá trị.
    const finalStatus = [POST_STATUS.DRAFT, POST_STATUS.PUBLISHED, POST_STATUS.PRIVATE].includes(status)
      ? status
      : POST_STATUS.DRAFT;
    // Giải mã các ID category đã chọn → tên dễ đọc để document bài viết
    // lưu những gì người dùng thực sự thấy ("Công Nghệ") thay vì các
    // Firestore ID khó hiểu. Fallback về giá trị gốc nếu không tìm thấy.
    const categoryNames = [...categories].map((id) => {
      const found = (allCats || []).find((c) => c.id === id);
      return found ? found.name : id;
    });
    return {
      title, slug: seoSlug,
      categories: categoryNames,
      tags, status: finalStatus, excerpt, content: body, schedule,
      featuredImage,
      // Gửi CẢ định dạng cũ + mới để mọi phiên bản server đều hoạt động.
      // Từ khoá chính được sao chép vào `focusKeyword` cũ cho các API cũ.
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
  // Ghi dấu "lần sửa cuối" + tăng số lần sửa đổi + ghi nhận người dùng này là
          // một editor, để PostOptionsWidget phản ánh đúng thực tế.
          const nowIso = new Date().toISOString();
          const me = currentUser?.displayName || currentUser?.username || currentUser?.email || 'Unknown';
          setLastSavedAt(nowIso);
          setPostMeta((m) => ({
            authorName:       m.authorName || me,
            firstPublishedAt: m.firstPublishedAt ?? null,
            revisionCount:    (m.revisionCount || 0) + 1,
            editors: [
              ...m.editors,
              { displayName: me, editedAt: nowIso },
            ],
          }));
          showToast(t('postSavedSuccess'), 'success');
          navigate(`/posts/${res.post.id}/edit`, { replace: true });
        } else {
          await postsApi.update(id, payload);
          // "Lần sửa cuối" theo thời gian thực — cập nhật đồng hồ ngay khi lưu thành công.
          const nowIso = new Date().toISOString();
          const me = currentUser?.displayName || currentUser?.username || currentUser?.email || 'Unknown';
          setLastSavedAt(nowIso);
          setPostMeta((m) => ({
            ...m,
            revisionCount: (m.revisionCount || 0) + 1,
            editors: [
              ...m.editors,
              { displayName: me, editedAt: nowIso },
            ],
          }));
        showToast(t('postUpdatedSuccess'), 'success');
        // Reset dirty để guard chống điều hướng không kích hoạt khi rời khỏi trang.
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
        {/* Nội dung chính */}
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

          {/* Rank Math SEO — chuyển ra khỏi sidebar 320px để nó có
             không gian thoáng. Nằm ngay dưới khối Excerpt, đủ
             chiều rộng của cột Nội dung chính. */}
          <div className="w-full">
            <RankMathSeoBox
              value={{ ...seo, content }}
              onChange={(next) => setSeo((prev) => ({ ...prev, ...next }))}
              baseDomain={DEFAULT_BASE_DOMAIN}
            />
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-5">
          {/* Tùy chọn bài viết — trạng thái, lịch hẹn, tác giả, số lần sửa, editors.
              Nằm ở vị trí trên cùng để người dùng thấy metadata bài viết trước. */}
          <PostOptionsWidget
            status={status}
            firstPublishedAt={postMeta.firstPublishedAt}
            schedule={schedule}
            authorName={postMeta.authorName}
            revisionCount={postMeta.revisionCount}
            lastSavedAt={lastSavedAt}
            currentUserName={currentUser?.displayName || currentUser?.username || currentUser?.email || ''}
            editors={postMeta.editors}
          />

          {/* Xuất bản */}
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

          {/* Categories — dùng Firebase qua <CategorySidebar />
             (thay thế khối CATEGORY_LABEL hardcode cũ). */}
          <CategorySidebar
            selected={[...categories]}
            onChange={(ids) => setCategories(new Set(ids))}
            db={db}
          />

          {/* Thẻ */}
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

          {/* Ảnh đại diện */}
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

          {/* Thống kê bài viết — tạm ẩn, chưa nối GA4 */}
          <div className="bg-white border border-wp-gray-dark rounded">
            <div className="p-4 text-center">
              <BarChart3 size={16} className="mx-auto mb-1.5 text-gray-400" />
              <p className="text-sm text-ink-muted m-0">Chưa kết nối GA4</p>
            </div>
          </div>

          {/* Thùng rác */}
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