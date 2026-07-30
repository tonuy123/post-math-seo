/**
 * TinyMCE wrapper hook. Mirrors the legacy `initializeTinyMCE()` config
 * (height, plugins, toolbar, content_style).
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
            if (cancelled) return;
            try {
              editor.setContent(pendingRef.current || '');
            } catch {
              /* editor may have been torn down — ignore */
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
        try { window.tinymce?.remove?.(selector); } catch { /* noop */ }
      };
    }

    return () => {
      cancelled = true;
      try { window.tinymce?.remove?.(selector); } catch { /* noop */ }
      editorRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selector]);

  const getContent = () => editorRef.current?.getContent?.() ?? '';
  const setContent = (html) => {
    const value = html ?? '';
    if (editorRef.current?.setContent) {
      try { editorRef.current.setContent(value); } catch { /* ignore */ }
    } else {
      // Editor not ready yet — stash so the init handler picks it up.
      pendingRef.current = value;
    }
  };

  return { getContent, setContent, editorRef };
}