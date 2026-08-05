/**
 * TinyMCE wrapper hook. Mirrors the legacy `initializeTinyMCE()` config
 * (height, plugins, toolbar, content_style).
 *
 * Cleanup contract (CRITICAL — prevents the floating toolbar from
 * remaining in document.body after the React tree is unmounted):
 *   1. `window.tinymce.remove(selector)` — destroy the editor bound to
 *      our textarea.
 *   2. `window.tinymce.remove()` — nuclear sweep that destroys ANY
 *      remaining orphaned editor instances (defensive — covers the case
 *      where a re-init left a previous instance dangling).
 *   3. Manually remove the floating UI nodes that TinyMCE injects into
 *      document.body: `.tox-toolbar`, `.tox-toolbar-overlord`,
 *      `.tox-pop`, `.tox-menuwrapper`, `.tox-collection`,
 *      `.tox-tinymce-aux`, `.tox-shadowhost`. These are NOT children of
 *      the editor root and survive `tinymce.remove()` in some scenarios.
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

// Nodes that TinyMCE injects directly into document.body. Removing them
// by class name is safe because TinyMCE is the only library in this
// project that uses the `.tox-*` namespace.
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
 * Tear down every TinyMCE-related node that may have escaped into
 * document.body. Idempotent — safe to call multiple times.
 */
function removeOrphanedTinyMCEDOM() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  if (!body) return;

  // 1) Destroy every editor instance the global still knows about.
  if (window.tinymce && typeof window.tinymce.remove === 'function') {
    try {
      // No-arg form destroys ALL editors. Use it as the ultimate safety
      // net so a half-initialised instance can't keep its toolbar alive.
      window.tinymce.remove();
    } catch {
      /* editor may already be gone — ignore */
    }
  }

  // 2) Sweep any auxiliary containers that TinyMCE appended to <body>
  // but did not clean up (the toolbar/popover injection pattern).
  TOX_AUX_SELECTORS.forEach((sel) => {
    body.querySelectorAll(sel).forEach((node) => {
      // Only nuke nodes that either have a `tox-` class or are direct
      // children of <body>. Guards against accidentally removing
      // unrelated DOM that happens to match.
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
              // Component unmounted while TinyMCE was initialising —
              // destroy the editor immediately so its toolbar never
              // reaches document.body.
              try { editor.remove(); } catch { /* ignore */ }
              return;
            }
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
        // Targeted destroy first (covers the typical hot path).
        try { window.tinymce?.remove?.(selector); } catch { /* noop */ }
        // Then a full sweep so any toolbar already injected into body
        // is removed even if the editor itself never finished booting.
        removeOrphanedTinyMCEDOM();
        editorRef.current = null;
      };
    }

    return () => {
      cancelled = true;
      // Targeted destroy.
      try { window.tinymce?.remove?.(selector); } catch { /* noop */ }
      // Full sweep for the floating UI nodes TinyMCE injects into
      // document.body. Without this the toolbar survives navigation.
      removeOrphanedTinyMCEDOM();
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
