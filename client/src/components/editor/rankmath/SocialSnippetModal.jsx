import { useEffect, useRef, useState } from 'react';
import { X, ImagePlus, Facebook, Upload } from 'lucide-react';
import { Input, Textarea, Label } from '../../ui/Input';

/**
 * <SocialSnippetModal /> — trình chỉnh sửa bản xem trước mạng xã hội Facebook.
 *
 * Phản chiếu modal "Xem trước mạng xã hội" trong WordPress Rank Math:
 *   • Chỉ có tab Facebook (Twitter đã bỏ tạm thời).
 *   • Thẻ xem trước được tạo kiểu như một bài đăng FB thật:
 *       - avatar xám tròn + tác giả + thời gian
 *       - vùng ảnh lớn có văn bản chỗ trống
 *       - thông tin liên kết kiểu OG (tên miền viết hoa, tiêu đề đậm, mô tả xám)
 *   • Các input bên dưới: tải ảnh lên, tiêu đề xã hội, mô tả xã hội.
 *
 * Props
 *   - isOpen   : boolean
 *   - onClose  : () => void
 *   - onSave   : (next) => void
 *   - value    : {
 *       socialTitle, socialDescription, socialImage,
 *       baseDomain  (dùng cho dòng tên miền xem trước)
 *     }
 *
 * Sở hữu BẢN NHÁP CỤC BỘ (LOCAL DRAFT) để người dùng có thể huỷ mà không
 * làm bẩn component chủ. Khi Lưu, commit ngược qua onSave.
 */

const NETWORK_TABS = [
  { id: 'facebook', label: 'Facebook', Icon: Facebook },
];

/* ── Thẻ xem trước kiểu Facebook ─────────────────────────────────── */

function FacebookPreviewCard({
  domain,
  title,
  description,
  imageUrl,
}) {
  return (
    <div className="border border-gray-200 rounded-md bg-white overflow-hidden">
      {/* Đầu thẻ — avatar + tác giả + thời gian */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="w-10 h-10 rounded-full bg-gray-300 shrink-0" aria-hidden="true" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-gray-900">Admin</span>
          <span className="text-xs text-gray-500">2 giờ</span>
        </div>
      </div>

      {/* Vùng ảnh — chỗ trống 1200x630 */}
      <div className="relative aspect-video bg-gray-700 flex items-center justify-center">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <span className="text-white/90 text-sm font-semibold tracking-widest">
            PLEASE UPLOAD IMAGE
          </span>
        )}
      </div>

      {/* Thông tin liên kết kiểu OG */}
      <div className="bg-gray-50 border-t border-gray-200 px-3 py-2.5">
        <div className="text-[11px] uppercase tracking-wider text-gray-500 truncate">
          {(domain || 'QUOCTEVIET.EDU.VN').toUpperCase()}
        </div>
        <div className="text-lg font-bold text-black break-words line-clamp-2 mt-0.5">
          {title || 'Tiêu đề mạng xã hội'}
        </div>
        <div className="text-sm text-gray-500 break-words line-clamp-2 mt-0.5">
          {description || 'Mô tả sẽ hiển thị khi chia sẻ trên mạng xã hội.'}
        </div>
      </div>
    </div>
  );
}

/* ── Modal chính ───────────────────────────────────────────────────── */

export function SocialSnippetModal({ isOpen, onClose, onSave, value }) {
  const [draft, setDraft] = useState({
    socialTitle:       '',
    socialDescription: '',
    socialImage:       '',
    ...(value || {}),
  });
  const fileInputRef = useRef(null);

  // Đồng bộ bản nháp khi mở.
  useEffect(() => {
    if (isOpen) {
      setDraft({
        socialTitle:       '',
        socialDescription: '',
        socialImage:       '',
        ...(value || {}),
      });
    }
  }, [isOpen, value]);

  // ESC để đóng.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setDraft((d) => ({ ...d, socialImage: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = (e) => {
    e?.preventDefault?.();
    onSave?.(draft);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full max-w-3xl rounded-md shadow-xl max-h-[90vh] overflow-y-auto">

        {/* ── Đầu trang ──────────────────────────────────────────────── */}
        <header className="flex items-center justify-between px-5 py-3 border-b border-gray-200 sticky top-0 bg-white z-10">
          <h3 id="social-modal-title" className="text-sm font-semibold text-gray-800">
            Xem trước trình chỉnh sửa đoạn trích
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100 text-gray-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          >
            <X size={16} />
          </button>
        </header>

        {/* ── Các tab mạng xã hội dính (sticky) ───────────────────── */}
        <div className="sticky top-[49px] z-10 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-center gap-2">
          {NETWORK_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-sm font-medium transition-colors bg-[#1877F2] text-white border border-[#1877F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSave} className="flex flex-col">

          {/* ── Thẻ xem trước trực tiếp ───────────────────────────────── */}
          <div className="px-5 pt-5">
            <FacebookPreviewCard
              domain={value?.baseDomain}
              title={draft.socialTitle}
              description={draft.socialDescription}
              imageUrl={draft.socialImage}
            />
          </div>

          {/* ── Phần các input ───────────────────────────────────────── */}
          <div className="p-5 flex flex-col gap-5">

            {/* Tải ảnh lên */}
            <div>
              <Label>Thêm hình ảnh</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 px-4 rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                >
                  <ImagePlus size={14} />
                  Thêm hình ảnh
                </button>
                {draft.socialImage && (
                  <button
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, socialImage: '' }))}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFile}
              />
              <p className="mt-1.5 text-xs text-gray-500">
                Kích thước khuyến nghị 1200x630px.
              </p>
            </div>

            {/* Tiêu đề xã hội */}
            <div>
              <Label htmlFor="social-title">Tiêu đề SEO</Label>
              <Input
                id="social-title"
                value={draft.socialTitle || ''}
                onChange={(e) => setDraft((d) => ({ ...d, socialTitle: e.target.value }))}
                placeholder="Tiêu đề khi chia sẻ trên mạng xã hội"
              />
            </div>

            {/* Mô tả xã hội */}
            <div>
              <Label htmlFor="social-desc">Thẻ mô tả</Label>
              <Textarea
                id="social-desc"
                rows={4}
                value={draft.socialDescription || ''}
                onChange={(e) => setDraft((d) => ({ ...d, socialDescription: e.target.value }))}
                placeholder="Mô tả khi chia sẻ trên mạng xã hội"
              />
            </div>
          </div>

          {/* ── Chân trang ───────────────────────────────────────────── */}
          <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-200 bg-gray-50 sticky bottom-0">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 rounded text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
            >
              <Upload size={14} />
              Lưu
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}