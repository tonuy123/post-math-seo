/**
 * Loading overlay context (replaces legacy `showLoading(true/false)`).
 *
 * Implementation notes:
 *  - Each `showLoading()` call returns a token; callers pass it to
 *    `hideLoading(token)`. If the token doesn't match the most recent
 *    show, the hide is a no-op. This keeps the overlay balanced even when
 *    React StrictMode double-invokes effects or when components unmount
 *    mid-request.
 *  - A hard 8s safety net hides the overlay if a token is never released.
 *  - The overlay is rendered in a portal so its z-index is consistent.
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

    // Safety net: if the caller forgets to release, drop the overlay.
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
    // Only honor the hide if it matches the latest outstanding show.
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