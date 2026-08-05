/**
 * Context dialog xác nhận — thay thế `showCustomConfirm(message, cb)` cũ.
 * Cách dùng:
 *   const confirm = useConfirm();
 *   confirm({ title: '...', onConfirm: () => {...} });
 */
import { createContext, useCallback, useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';

const ConfirmContext = createContext({ confirm: () => {} });

export function ConfirmProvider({ children }) {
  const { t } = useTranslation();
  const [state, setState] = useState(null); // { title, message, onConfirm, confirmLabel, cancelLabel, danger }

  const confirm = useCallback(({ title, message, onConfirm, confirmLabel, cancelLabel, danger }) => {
    setState({
      title: title || message,
      message: message || title,
      onConfirm,
      confirmLabel: confirmLabel || t('apply'),
      cancelLabel:  cancelLabel  || t('cancel'),
      danger: !!danger,
    });
  }, [t]);

  const close = useCallback(() => setState(null), []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <ConfirmModal
          {...state}
          onCancel={close}
          onConfirm={async () => {
            try { await state.onConfirm?.(); } finally { close(); }
          }}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}

function ConfirmModal({ message, onConfirm, onCancel, confirmLabel, cancelLabel, danger }) {
  return (
    <div className="fixed inset-0 z-[10001] bg-black/50 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 text-center animate-[modalIn_0.2s_ease-out]">
        <h3 className="text-lg font-semibold text-ink-primary mb-6 leading-relaxed">
          {message}
        </h3>
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={onCancel}
            className="min-w-[100px] px-4 py-2 rounded border border-wp-gray-dark text-ink-primary hover:bg-wp-gray transition"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={[
              'min-w-[100px] px-4 py-2 rounded text-white transition',
              danger ? 'bg-wp-red hover:bg-red-700' : 'bg-wp-blue hover:bg-wp-blue-hover',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}