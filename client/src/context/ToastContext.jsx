/**
 * Toast context — replaces the legacy `showToast()` helper.
 * Usage:
 *   const { showToast } = useToast();
 *   showToast('Saved!', 'success');
 */
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext({ showToast: () => {} });

let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = ++_id;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

function ToastViewport({ toasts, dismiss }) {
  return (
    <div className="fixed bottom-5 right-5 z-[1000] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={[
            'flex items-center gap-2 px-4 py-3 rounded shadow-md text-white text-sm animate-[slideIn_0.3s_ease]',
            t.type === 'success' && 'bg-wp-green',
            t.type === 'error'   && 'bg-wp-red',
            t.type === 'info'    && 'bg-wp-blue',
          ].filter(Boolean).join(' ')}
        >
          {t.type === 'success' && <CheckCircle2 size={16} />}
          {t.type === 'error'   && <XCircle size={16} />}
          {t.type === 'info'    && <Info size={16} />}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="opacity-70 hover:opacity-100"
            aria-label="dismiss"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}