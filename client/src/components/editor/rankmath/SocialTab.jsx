import { Pencil } from 'lucide-react';

/**
 * <SocialTab /> — "Mạng xã hội" tab.
 *
 * Initial UI (slim version):
 *   • Heading + 2 short description paragraphs
 *   • Primary CTA that opens the Social Snippet editor modal.
 *
 * Props:
 *   - onOpenSocialModal : () => void   (wired by parent later)
 *
 * For now the button just logs to the console so the UI is interactive
 * even before the full modal is built.
 */
export function SocialTab({ onOpenSocialModal }) {
  const handleClick = () => {
    // eslint-disable-next-line no-console
    console.log('Open Social Modal');
    onOpenSocialModal?.();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Heading */}
      <h4 className="text-sm font-semibold text-gray-800">
        Xem trước Mạng xã hội
      </h4>

      {/* Description */}
      <p className="text-sm text-gray-500">
        Tại đây, bạn có thể xem và chỉnh sửa hình thu nhỏ, tiêu đề và mô tả
        sẽ được hiển thị khi trang web của bạn được chia sẻ trên mạng xã hội.
      </p>
      <p className="text-sm text-gray-500">
        Nhấp vào nút bên dưới để xem và chỉnh sửa bản xem trước.
      </p>

      {/* CTA */}
      <div>
        <button
          type="button"
          onClick={handleClick}
          className="inline-flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white font-medium py-1.5 px-4 rounded text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
        >
          <Pencil size={13} />
          Chỉnh sửa đoạn trích
        </button>
      </div>
    </div>
  );
}