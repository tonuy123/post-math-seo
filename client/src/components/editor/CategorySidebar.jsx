import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, query, orderBy,
} from 'firebase/firestore';
import { ChevronDown, Plus, ChevronRight, Loader2 } from 'lucide-react';

/**
 * CategorySidebar — trình quản lý danh mục Firebase thời gian thực cho trình soạn thảo bài viết.
 *
 * Collection Firebase: `categories`
 * Hình dạng document: { id, name, postCount }
 *
 * Props:
 *   - selected : string[]          ID của các danh mục đang được tích chọn.
 *   - onChange  : (next: string[]) => void
 *   - db       : Firestore          instance (truyền từ component chủ)
 *
 * Tính năng:
 *   - Accordion ở đầu (bảng thu gọn được)
 *   - Hai tab: "Tất cả danh mục" / "Dùng nhiều nhất"
 *   - Bộ lắng nghe onSnapshot thời gian thực — danh sách cập nhật tức thì khi có thay đổi
 *   - "Dùng nhiều nhất" sắp xếp theo postCount GIẢM DẦN
 *   - Biểu mẫu "+ Thêm Danh Mục" nội tuyến có thể bật/tắt → addDoc Firebase
 */
export function CategorySidebar({ selected = [], onChange, db }) {
  // ── UI state ────────────────────────────────────────────────────────
  const [open,         setOpen]         = useState(true);
  const [activeTab,    setActiveTab]    = useState('all');      // 'all' | 'popular'
  const [expanded,     setExpanded]     = useState(new Set());
  const [isAddFormOpen, setAddFormOpen] = useState(false);
  const [newName,      setNewName]      = useState('');
  const [adding,       setAdding]      = useState(false);

  // ── Dữ liệu thời gian thực Firebase ──────────────────────────────────
  const [categories, setCategories] = useState([]);   // Array<{ id, name, postCount }>
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    if (!db) { setLoading(false); return; }

    const col  = collection(db, 'categories');
    const q    = activeTab === 'popular'
      ? query(col, orderBy('postCount', 'desc'))
      : query(col);
    const unsub = onSnapshot(
      q,
      (snap) => {
        setCategories(
          snap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
        setLoading(false);
      },
      (err) => {
        console.error('[CategorySidebar] Firestore error:', err);
        setLoading(false);
      },
    );
    return unsub;
  }, [db, activeTab]);

  // ── Handlers ───────────────────────────────────────────────────────
  const toggle = (id) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onChange?.(next);
  };

  const expand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name || !db) return;

    setAdding(true);
    try {
      await addDoc(collection(db, 'categories'), {
        name,
        postCount: 0,
        createdAt: Date.now(),
      });
      setNewName('');
      setAddFormOpen(false);
    } catch (err) {
      console.error('[CategorySidebar] addDoc error:', err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="bg-white border border-wp-gray-dark rounded">
      {/* ── Nút chuyển đổi accordion ở đầu ── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-[#f6f7f7] border-b border-wp-gray-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30"
      >
        <h3 className="text-sm font-semibold text-ink-primary m-0">Danh mục</h3>
        <ChevronDown
          size={16}
          className={[
            'text-ink-muted transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          ].join(' ')}
        />
      </button>

      {open && (
        <>
          {/* ── Chuyển tab ── */}
          <div className="flex border-b border-wp-gray text-xs">
            {[
              { id: 'all',     label: 'Tất cả danh mục' },
              { id: 'popular', label: 'Dùng nhiều nhất' },
            ].map((t) => {
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={[
                    'relative px-4 py-2 font-medium transition',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30',
                    isActive
                      ? 'text-wp-blue'
                      : 'text-ink-muted hover:text-ink-primary',
                  ].join(' ')}
                >
                  {t.label}
                  <span
                    aria-hidden="true"
                    className={[
                      'absolute left-0 right-0 -bottom-px h-0.5',
                      isActive ? 'bg-wp-blue' : 'bg-transparent',
                    ].join(' ')}
                  />
                </button>
              );
            })}
          </div>

          {/* ── Danh sách cuộn được ── */}
          <div className="p-2 max-h-64 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-ink-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Đang tải…</span>
              </div>
            ) : categories.length === 0 ? (
              <div className="text-xs text-ink-muted italic text-center py-6">
                Chưa có danh mục nào.
              </div>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {categories.map((cat) => {
                  const isChecked = selected.includes(cat.id);
                  return (
                    <li key={cat.id}>
                      <label className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-wp-gray/40 cursor-pointer text-sm group">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggle(cat.id)}
                          className="w-4 h-4 accent-wp-blue flex-shrink-0"
                        />
                        <span className={[
                          'flex-1 truncate transition-colors',
                          isChecked
                            ? 'text-ink-primary font-medium'
                            : 'text-ink-secondary group-hover:text-ink-primary',
                        ].join(' ')}>
                          {cat.name}
                        </span>
                        {activeTab === 'popular' && (
                          <span className="text-[11px] text-ink-muted tabular-nums flex-shrink-0">
                            {cat.postCount ?? 0}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Nút chuyển đổi biểu mẫu thêm ── */}
          <div className="px-4 py-2 border-t border-wp-gray bg-[#fafafa]">
            {!isAddFormOpen ? (
              <button
                type="button"
                onClick={() => setAddFormOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-wp-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30 rounded px-1"
              >
                <Plus size={12} strokeWidth={2.5} />
                <span>Thêm Danh Mục</span>
              </button>
            ) : (
              <form
                onSubmit={handleAddSubmit}
                className="flex flex-col gap-2"
              >
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Tên danh mục mới"
                  autoFocus
                  className="w-full px-2.5 py-1.5 text-xs rounded border border-wp-gray-dark bg-white focus:outline-none focus:border-wp-blue focus:ring-2 focus:ring-wp-blue/20"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={adding || !newName.trim()}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-wp-blue hover:bg-wp-blue/90 active:bg-wp-blue/95 text-white text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/40"
                  >
                    {adding ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Plus size={11} strokeWidth={2.5} />
                    )}
                    <span>{adding ? 'Đang thêm…' : 'Thêm'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAddFormOpen(false); setNewName(''); }}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded border border-wp-gray text-xs font-medium text-ink-secondary hover:border-wp-red hover:text-wp-red transition focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-red/40"
                  >
                    Huỷ
                  </button>
                </div>
              </form>
            )}
          </div>
        </>
      )}
    </div>
  );
}
