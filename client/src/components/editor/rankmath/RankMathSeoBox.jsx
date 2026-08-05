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
 * <RankMathSeoBox /> — bảng SEO cấp cao nhất cho thanh bên của trình soạn thảo bài viết.
 *
 * TRÁCH NHIỆM STATE
 * -----------------
 * Component này là NGUỒN DỮ LIỆU DUY NHẤT (SINGLE SOURCE OF TRUTH) cho mọi dữ liệu SEO:
 *
 *   seoState = {
 *     focusKeywords   : string[]   // danh sách nhiều từ khoá, vị trí 0 = chính
 *     metaTitle       : string
 *     metaDescription : string
 *     slug            : string
 *     isCornerstone   : boolean    // "Bài viết cốt lõi"
 *     content         : string     // HTML thô từ thân bài, dùng cho
 *                                  // các tiêu chí khả năng đọc / nội dung
 *   }
 *
 * Component chủ (ví dụ <PostEditor />) sở hữu việc lưu trữ: nó truyền vào
 * `value` (ban đầu) và nhận `onChange` mỗi khi có trường nào cập nhật. Bản
 * nháp trong modal là nội bộ và không bao giờ thoát ra khỏi modal.
 *
 * LUỒNG DỮ LIỆU
 * -------------
 *   input trường → setField(patch)   →  setSeoState → React re-render
 *                  └─→ seoState được memoise → calculateSeoScore(state)
 *                        └─→ score, checks   →  <SeoChecklist />,
 *                                              <FocusKeywordInput />
 *                                              huy hiệu, v.v.
 *
 * Mọi component con đều là CONTROLLED — chúng nhận value + callback,
 * không bao giờ đột biến state trực tiếp. Điều đó giữ công cụ chấm điểm đồng bộ.
 *
 * ⚠️ QUAN TRỌNG — hình dạng prop `value` dự kiến từ trang chủ:
 *   <RankMathSeoBox
 *     value={{
 *       focusKeywords  : string[]              // ví dụ ['nghiep vu bao mau']
 *       metaTitle      : string                // Tiêu đề SEO
 *       metaDescription: string                // Meta description
 *       slug           : string                // đường dẫn URL (slug)
 *       isCornerstone  : boolean               // "Bài viết cốt lõi"
 *       content        : string                // ⚠️ BẮT BUỘC — HTML thô
 *                                            // từ trình soạn thảo của bạn (TinyMCE,
 *                                            // Quill, v.v.). Thiếu trường này
 *                                            // điểm sẽ đứng ở 0 vì các tiêu chí
 *                                            // dựa trên nội dung không thể
 *                                            // chạy.
 *       baseDomain?    : string                // để phân loại liên kết
 *                                            // Nội bộ/Ngoài
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

  // Refs để "bấm một dòng trong checklist → focus vào input tương ứng"
  const fieldRefs = {
    metaTitle:       useRef(null),
    metaDescription: useRef(null),
    slug:            useRef(null),
    content:         useRef(null),
  };

  // ─── Chuẩn hoá value đầu vào ──────────────────────────────────────────
  // Phòng thủ: component chủ có thể truyền mảng các object (ví dụ state
  // sót lại từ hình dạng cũ như { text, checked }) thay vì chuỗi đơn thuần.
  // Ta ép về string[] tại đây để công cụ chấm điểm không bao giờ gặp sai
  // kiểu dữ liệu — nguyên nhân số 1 của lỗi "điểm kẹt ở 0".
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
    onChange({ ...value, ...patch });
  }, [value, onChange]);

  // ─── Công cụ chấm điểm (chạy lại mỗi khi bất kỳ trường theo dõi nào thay đổi) ──
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

  // ─── Handler "focus trường" của checklist ──────────────────────────────
  const focusField = useCallback((fieldKey) => {
    setActiveTab('overview');
    setModalOpen(false);
    // Hai trong số các mục tiêu focus nằm bên trong modal — hãy mở modal trước.
    if (fieldKey === 'metaTitle' || fieldKey === 'metaDescription' || fieldKey === 'slug') {
      setModalOpen(true);
      // Modal tự focus vào input tiêu đề của nó; không cần làm gì thêm.
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
      {/* Đầu thẻ — tiêu đề + huy hiệu điểm (bấm để mở/đóng) */}
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
                {/* ── 1. Bản xem trước SERP nằm ở trên cùng ── */}
                <SnippetPreview
                  value={{
                    metaTitle:       seoState.metaTitle,
                    metaDescription: seoState.metaDescription,
                    slug:            seoState.slug,
                  }}
                  baseDomain={baseDomain}
                  onEdit={() => setModalOpen(true)}
                />

                {/* ── 2. Đường phân cách giữa bản xem trước đoạn trích & phần còn lại ── */}
                <hr className="my-5 border-gray-200" />

                {/* ── 3. Từ khoá trọng tâm + điểm trực tiếp ── */}
                <FocusKeywordInput
                  value={seoState.focusKeywords}
                  onChange={(kws) => setField({ focusKeywords: kws })}
                  score={{ score, tone }}
                />

                {/* ── 4. Công tắc bài viết cốt lõi ── */}
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

                {/* ── Bản sao ẩn cho trường content để focusField('content')
                      có thể cuộn tới nó ngay cả khi trình soạn thảo chủ dùng ref riêng. */}
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