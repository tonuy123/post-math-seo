/**
 * Context overlay tải dữ liệu (thay thế `showLoading(true/false)` cũ).
 *
 * Ghi chú triển khai:
 *  - Mỗi lần gọi `showLoading()` trả về một token; caller truyền token đó vào
 *    `hideLoading(token)`. Nếu token không khớp với lần show gần nhất,
 *    việc hide là no-op. Điều này giữ overlay cân bằng ngay cả khi
 *    React StrictMode gọi kép effects hoặc khi component bị tháo gỡ
 *    giữa chừng yêu cầu.
 *  - Lưới an toàn cố định 8 giây sẽ ẩn overlay nếu token không bao giờ được giải phóng.
 *  - Overlay được render trong portal để z-index của nó nhất quán.
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2 } from 'lucide-react';

const SAFETY_TIMEOUT_MS = 8000;

const LoadingContext = createContext({
  showLoading: () => 0,
  hideLoading: () => {},
});

export function LoadingProvider({ children }) {
  const counterRef = useRef(0);
  const latestRef = useRef(0);
  const [active, setActive] = useState(false);

  const showLoading = useCallback(() => {
    counterRef.current += 1;
    latestRef.current += 1;
    const token = latestRef.current;
    if (!active) setActive(true);

    // Lưới an toàn: nếu caller quên giải phóng, hãy ẩn overlay.
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        if (latestRef.current === token && counterRef.current > 0) {
          counterRef.current = 0;
          setActive(false);
        }
      }, SAFETY_TIMEOUT_MS);
    }
    return token;
  }, [active]);

  const hideLoading = useCallback((token) => {
    // Chỉ thực hiện hide nếu nó khớp với lần show đang chờ gần nhất.
    if (typeof token === 'number' && token !== latestRef.current) return;
    counterRef.current = Math.max(0, counterRef.current - 1);
    if (counterRef.current === 0) setActive(false);
  }, []);

  const overlay = active && typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center">
          <Loader2 className="text-white animate-spin" size={48} />
          <p className="text-white mt-4">Loading...</p>
        </div>,
        document.body
      )
    : null;

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      {overlay}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  return useContext(LoadingContext);
}