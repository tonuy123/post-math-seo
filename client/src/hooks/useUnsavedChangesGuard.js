/**
 * useUnsavedChangesGuard
 * ----------------------
 * Cảnh báo người dùng khi form đang dirty mà họ cố:
 *   - đóng tab / reload (beforeunload, native browser confirm)
 *   - điều hướng trong SPA qua React Router (chặn bằng history.pushState patch)
 *
 * Vì project đang dùng <BrowserRouter><Routes/></BrowserRouter> thường (không phải
 * createBrowserRouter), `useBlocker` của react-router-dom không khả dụng. Thay vào
 * đó ta patch window.history: popstate/pushState/replaceState — khi isDirty=true,
 * hook sẽ chặn chuyển route và gọi onConfirm/onCancel callback.
 *
 * Props:
 *   isDirty    : boolean — form có thay đổi chưa lưu không
 *   message?   : string  — nội dung dialog xác nhận (mặc định i18n key 'unsavedChanges')
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

export function useUnsavedChangesGuard(isDirty, message) {
  const { t } = useTranslation();
  const dirtyRef = useRef(isDirty);
  const blockedUrlRef = useRef(null);

  useEffect(() => { dirtyRef.current = isDirty; }, [isDirty]);

  const promptText = message || t('unsavedChanges', {
    defaultValue: 'Bạn có thay đổi chưa được lưu. Rời trang sẽ mất những thay đổi này?',
  });

  // 1) beforeunload — khi user đóng tab / reload / đóng window.
  useEffect(() => {
    function handler(e) {
      if (!dirtyRef.current) return undefined;
      e.preventDefault();
      e.returnValue = promptText;
      return e.returnValue;
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [promptText]);

  // 2) Chuyển route trong SPA — patch history.pushState/replaceState + lắng nghe popstate.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const origPush = window.history.pushState.bind(window.history);
    const origReplace = window.history.replaceState.bind(window.history);

    // fallback đồng bộ dùng confirm gốc của trình duyệt
    function confirmLeaveSync() {
      // eslint-disable-next-line no-alert
      return window.confirm(promptText);
    }

    function guardedPush(state, title, url) {
      if (!dirtyRef.current) return origPush(state, title, url);
      // Nếu không có dialog tuỳ chỉnh bất đồng bộ, fallback về confirm đồng bộ
      if (!window.showUnsavedChangesDialog) {
        if (!confirmLeaveSync()) return; // người dùng huỷ — giữ nguyên URL cũ
        dirtyRef.current = false;
        blockedUrlRef.current = null;
        return origPush(state, title, url);
      }
      // Nếu code của app gọi history.pushState khi đang dirty và có custom dialog,
      // ta không thể chờ đợi nó một cách đồng bộ ở đây. Fallback về confirm gốc để
      // các caller pushState không bị chặn bất ngờ.
      if (!confirmLeaveSync()) return;
      dirtyRef.current = false;
      blockedUrlRef.current = null;
      return origPush(state, title, url);
    }

    function guardedReplace(state, title, url) {
      return origReplace(state, title, url);
    }

    window.history.pushState = guardedPush;
    window.history.replaceState = guardedReplace;

    function onPopState() {
      if (!dirtyRef.current) return;
      // browser đã thay đổi URL rồi (back/forward). Đẩy user về lại URL cũ và hỏi xác nhận.
      const current = window.location.href;
      if (blockedUrlRef.current && blockedUrlRef.current !== current) {
        // chưa kịp revert thì revert ngay
        origPush(null, '', blockedUrlRef.current);
      }

      if (window.showUnsavedChangesDialog) {
        // hỏi bằng custom dialog bất đồng bộ; khi hoàn tất thì thực hiện hành động
        window.showUnsavedChangesDialog(promptText).then((ok) => {
          if (!ok) {
            if (blockedUrlRef.current) origPush(null, '', blockedUrlRef.current);
            return;
          }
          // người dùng OK → cho phép rời
          dirtyRef.current = false;
          window.history.pushState = origPush;
          window.history.back();
        });
        return;
      }

      // fallback về confirm đồng bộ
      if (!confirmLeaveSync()) {
        if (blockedUrlRef.current) origPush(null, '', blockedUrlRef.current);
      } else {
        // người dùng OK → cho phép rời
        dirtyRef.current = false;
        window.history.pushState = origPush;
        window.history.back();
      }
    }

    function onClickCapture(e) {
      if (!dirtyRef.current) return;
      const a = e.target?.closest?.('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href || href.startsWith('#')) return;
      // Chỉ can thiệp với điều hướng nội bộ
      try {
        const target = new URL(href, window.location.origin);
        if (target.origin !== window.location.origin) return;
      } catch { return; }
      e.preventDefault();
      e.stopPropagation();

      if (window.showUnsavedChangesDialog) {
        // custom dialog bất đồng bộ
        window.showUnsavedChangesDialog(promptText).then((ok) => {
          if (!ok) return;
          dirtyRef.current = false;
          window.location.assign(href);
        });
        return;
      }

      // fallback về confirm đồng bộ
      if (!confirmLeaveSync()) return;
      dirtyRef.current = false;
      window.location.assign(href);
    }

    // Cập nhật URL "hiện tại đang bảo vệ" mỗi khi user ở yên (dùng pushState an toàn)
    blockedUrlRef.current = window.location.href;
    const id = setInterval(() => {
      if (!dirtyRef.current && blockedUrlRef.current !== window.location.href) {
        blockedUrlRef.current = window.location.href;
      }
    }, 250);

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onClickCapture, true);

    return () => {
      clearInterval(id);
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onClickCapture, true);
      window.history.pushState = origPush;
      window.history.replaceState = origReplace;
    };
  }, [promptText]);
}