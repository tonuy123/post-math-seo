import { Pencil } from 'lucide-react';

/**
 * <SocialTab /> — tab "Mạng xã hội".
 *
 * UI ban đầu (bản gọn):
 *   • Tiêu đề + 2 đoạn mô tả ngắn
 *   • CTA chính mở modal chỉnh sửa đoạn trích mạng xã hội.
 *
 * Props:
 *   - onOpenSocialModal : () => void   (sẽ được nối dây bởi component chủ sau này)
 *
 * Hiện tại nút chỉ ghi log ra console để UI có thể tương tác
 * ngay cả trước khi modal đầy đủ được xây dựng.
 */
export function SocialTab({ onOpenSocialModal }) {
  const handleClick = () => {
    onOpenSocialModal?.();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Tiêu đề */}
      <h4 className="text-sm font-semibold text-gray-800">
        Xem trước Mạng xã hội
      </h4>

      {/* Mô tả */}
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