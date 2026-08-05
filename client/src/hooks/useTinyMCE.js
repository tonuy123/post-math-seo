/**
 * Hook bọc TinyMCE. Sao chép từ cấu hình `initializeTinyMCE()` cũ
 * (height, plugins, toolbar, content_style).
 *
 * Hợp đồng dọn dẹp (QUAN TRỌNG — ngăn toolbar nổi
 * còn sót lại trong document.body sau khi cây React bị tháo gỡ):
 *   1. `window.tinymce.remove(selector)` — phá huỷ editor gắn với
 *      textarea của chúng ta.
 *   2. `window.tinymce.remove()` — quét diện rộng phá huỷ MỌI
 *      instance editor mồ côi còn sót (phòng thủ — bao phủ trường hợp
 *      việc khởi tạo lại để lại instance trước đó lơ lửng).
 *   3. Tự tay xoá các node UI nổi mà TinyMCE chèn vào
 *      document.body: `.tox-toolbar`, `.tox-toolbar-overlord`,
 *      `.tox-pop`, `.tox-menuwrapper`, `.tox-collection`,
 *      `.tox-tinymce-aux`, `.tox-shadowhost`. Đây KHÔNG phải là con của
 *      editor root và chúng sống sót sau `tinymce.remove()` trong một số tình huống.
 */
import { useEffect, useRef } from 'react';

const TINYMCE_OPTIONS = {
  height: 750,
  menubar: false,
  statusbar: false,
  plugins: [
    'advlist', 'autolink', 'lists', 'link', 'image', 'charmap', 'preview',
    'anchor', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
    'insertdatetime', 'media', 'table', 'help', 'wordcount', 'emoticons',
  ],
  toolbar:
    'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | emoticons charmap | fullscreen preview code | removeformat',
  content_style: `
    body {
      font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 15px;
      line-height: 1.7;
      color: #1d2327;
      padding: 15px;
    }
    img { max-width: 100%; height: auto; }
  `,
  relative_urls: false,
  remove_script_host: false,
  convert_urls: true,
  image_advtab: true,
  image_description: true,
  paste_data_images: true,
  quickbars_insert_toolbar: 'quickimage quicktable',
};

// Các node mà TinyMCE chèn trực tiếp vào document.body. Xoá chúng
// theo tên class là an toàn vì TinyMCE là thư viện duy nhất trong
// project này dùng namespace `.tox-*`.
const TOX_AUX_SELECTORS = [
  '.tox-toolbar',
  '.tox-toolbar-overlord',
  '.tox-pop',
  '.tox-menuwrapper',
  '.tox-collection',
  '.tox-tinymce-aux',
  '.tox-shadowhost',
  '.tox-fullscreen-wrap',
];

/**
 * Dọn sạch mọi node liên quan đến TinyMCE có thể đã thoát ra
 * document.body. Có tính idempotent — an toàn khi gọi nhiều lần.
 */
function removeOrphanedTinyMCEDOM() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  if (!body) return;

  // 1) Phá huỷ mọi instance editor mà global vẫn còn biết đến.
  if (window.tinymce && typeof window.tinymce.remove === 'function') {
    try {
      // Dạng không tham số phá huỷ TẤT CẢ editor. Dùng nó như lưới an toàn
      // cuối cùng để một instance khởi tạo dở dang không thể giữ toolbar sống.
      window.tinymce.remove();
    } catch {
      /* editor có thể đã biến mất — bỏ qua */
    }
  }

  // 2) Quét mọi container phụ trợ mà TinyMCE chèn vào <body>
  // nhưng không dọn dẹp (mẫu chèn toolbar/popover).
  TOX_AUX_SELECTORS.forEach((sel) => {
    body.querySelectorAll(sel).forEach((node) => {
      // Chỉ phá những node có class `tox-` hoặc là con trực tiếp
      // của <body>. Tránh vô tình xoá
      // các DOM không liên quan tình cờ khớp.
      const cls = (node.className && node.className.toString()) || '';
      const isTox = cls.indexOf('tox-') !== -1;
      const isBodyChild = node.parentElement === body;
      if (isTox || isBodyChild) {
        node.remove();
      }
    });
  });
}

export function useTinyMCE({ selector, initialContent = '' }) {
  const editorRef = useRef(null);
  const pendingRef = useRef(initialContent);

  useEffect(() => {
    let cancelled = false;

    const tryInit = () => {
      if (typeof window === 'undefined' || !window.tinymce) return false;
      if (cancelled) return true;

      window.tinymce.init({
        ...TINYMCE_OPTIONS,
        selector,
        setup(editor) {
          editor.on('init', () => {
            if (cancelled) {
              // Component bị tháo gỡ trong khi TinyMCE đang khởi tạo —
              // phá huỷ editor ngay lập tức để toolbar không bao giờ
              // lọt vào document.body.
              try { editor.remove(); } catch { /* bỏ qua */ }
              return;
            }
            try {
              editor.setContent(pendingRef.current || '');
            } catch {
              /* editor có thể đã bị phá huỷ — bỏ qua */
            }
            editorRef.current = editor;
          });
        },
      });
      return true;
    };

    if (!tryInit()) {
      const interval = setInterval(() => {
        if (tryInit()) clearInterval(interval);
      }, 300);
      return () => {
        cancelled = true;
        clearInterval(interval);
        // Phá huỷ có chủ đích trước (bao phủ luồng thường gặp).
        try { window.tinymce?.remove?.(selector); } catch { /* không làm gì */ }
        // Sau đó quét toàn bộ để mọi toolbar đã chèn vào body
        // đều bị gỡ ngay cả khi editor chưa bao giờ khởi động xong.
        removeOrphanedTinyMCEDOM();
        editorRef.current = null;
      };
    }

    return () => {
      cancelled = true;
      // Phá huỷ có chủ đích.
      try { window.tinymce?.remove?.(selector); } catch { /* không làm gì */ }
      // Quét toàn bộ các node UI nổi mà TinyMCE chèn vào
      // document.body. Nếu không có bước này, toolbar sẽ sống sót sau điều hướng.
      removeOrphanedTinyMCEDOM();
      editorRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector]);

  const getContent = () => editorRef.current?.getContent?.() ?? '';
  const setContent = (html) => {
    const value = html ?? '';
    if (editorRef.current?.setContent) {
      try { editorRef.current.setContent(value); } catch { /* bỏ qua */ }
    } else {
      // Editor chưa sẵn sàng — lưu tạm để handler init nhặt nó lên.
      pendingRef.current = value;
    }
  };

  return { getContent, setContent, editorRef };
}
