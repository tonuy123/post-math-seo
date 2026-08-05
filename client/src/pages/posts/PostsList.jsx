import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search, ChevronLeft, ChevronRight, Trash2, RotateCcw, X,
  Files, Send, FileText, Lock, ListChecks,
} from 'lucide-react';

import { usePosts } from '../../hooks/usePosts';
import { useCategories } from '../../hooks/useCategories';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { StatusBadge } from '../../components/ui/Badge';
import { Avatar } from '../../components/ui/Avatar';
import { useConfirm } from '../../context/ConfirmContext';
import { useToast } from '../../context/ToastContext';
import { postsApi } from '../../services/api/posts';
import { POSTS_PER_PAGE } from '../../utils/constants';
import { formatDate } from '../../utils/helpers';

// Local filter list with dedicated icons. Order: All → Published → Drafts → Private → Trash.
const FILTERS = [
  { key: 'all',       labelKey: 'allPosts',   Icon: Files,    active: 'bg-wp-blue text-white',   idle: 'text-wp-blue bg-wp-blue/10 hover:bg-wp-blue/20' },
  { key: 'published', labelKey: 'published',  Icon: Send,     active: 'bg-wp-green text-white',  idle: 'text-wp-green bg-wp-green/10 hover:bg-wp-green/20' },
  { key: 'draft',     labelKey: 'drafts',     Icon: FileText, active: 'bg-wp-orange text-white', idle: 'text-wp-orange bg-wp-orange/10 hover:bg-wp-orange/20' },
  { key: 'private',   labelKey: 'privateTab', Icon: Lock,     active: 'bg-wp-red text-white',    idle: 'text-wp-red bg-wp-red/10 hover:bg-wp-red/20' },
  { key: 'trashed',   labelKey: 'trash',      Icon: Trash2,   active: 'bg-gray-600 text-white',  idle: 'text-gray-600 bg-gray-500/10 hover:bg-gray-500/20' },
];

// Counter pills shown next to each tab.
function FilterTabs({ value, onChange, counts }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 px-5 py-3 bg-white rounded-t border-b-2 border-wp-gray shadow-[0_4px_6px_-4px_rgba(0,0,0,0.08)] relative z-[1]">
      {FILTERS.map(({ key, labelKey, Icon, active, idle }) => {
        const isActive = value === key;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={[
              'inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-sm font-medium transition',
              isActive ? `${active} shadow-sm` : `${idle} bg-white`,
            ].join(' ')}
          >
            <Icon size={14} />
            <span>{labelKey}</span>
            {typeof counts[key] === 'number' && (
              <span className={[
                'inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-[11px] font-semibold',
                isActive ? 'bg-white/25 text-white' : 'bg-black/5 text-ink-secondary',
              ].join(' ')}>{counts[key]}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default function PostsList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { posts, loading, refresh } = usePosts();
  const { categories } = useCategories();
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('');
  const [author, setAuthor]         = useState('');
  // Selection lives as a plain string[] of post IDs. The checkbox column
  // is ALWAYS visible — no "selection mode" toggle. Toggling a row adds
  // or removes its id; the header checkbox reflects bulk state.
  const [selectedPosts, setSelectedPosts] = useState([]);
  const [page, setPage]             = useState(1);

  // -------- Filtering --------
  const filtered = useMemo(() => {
    let list = posts ?? [];
    if (filter === 'all')      list = list.filter(p => p.status !== 'trashed');
    else                       list = list.filter(p => p.status === filter);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => {
        const hay = [p.title, p.author, ...(p.categories || []), ...(p.tags || [])]
          .filter(Boolean).map(s => String(s).toLowerCase());
        return hay.some(f => f.includes(q));
      });
    }
    if (category && filter !== 'trashed') {
      list = list.filter(p => (p.categories || []).some(c => c.toLowerCase() === category.toLowerCase()));
    }
    if (author && filter !== 'trashed') {
      list = list.filter(p => (p.author || '').toLowerCase() === author.toLowerCase());
    }
    return list;
  }, [posts, filter, search, category, author]);

  const counts = useMemo(() => {
    const safePosts = posts ?? [];
    return {
      all:       safePosts.filter(p => p.status !== 'trashed').length,
      published: safePosts.filter(p => p.status === 'published').length,
      draft:     safePosts.filter(p => p.status === 'draft').length,
      private:   safePosts.filter(p => p.status === 'private').length,
      trashed:   safePosts.filter(p => p.status === 'trashed').length,
    };
  }, [posts]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const start       = (currentPage - 1) * POSTS_PER_PAGE;
  const pageItems   = filtered.slice(start, start + POSTS_PER_PAGE);

  const authors = useMemo(
    () => [...new Set((posts ?? []).map(p => p.author).filter(Boolean))].sort(),
    [posts]
  );

  // -------- Selection helpers (array-based) --------
  // Header checkbox is "checked" when every currently-displayed row is
  // also in the selection. If there's nothing to show, it's unchecked.
  const allOnPageChecked = pageItems.length > 0
    && pageItems.every(p => selectedPosts.includes(p.id));
  const someOnPageChecked = pageItems.some(p => selectedPosts.includes(p.id));

  function toggleOne(id) {
    setSelectedPosts((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  // Header onChange — per spec:
  //   • checking  → push every visible row id into selectedPosts
  //   • unchecking → clear the array
  function toggleAllVisible(e) {
    if (e.target.checked) {
      setSelectedPosts((prev) => {
        const merged = new Set(prev);
        pageItems.forEach((p) => merged.add(p.id));
        return [...merged];
      });
    } else {
      setSelectedPosts([]);
    }
  }

  function changeFilter(key) {
    setFilter(key);
    setPage(1);
    setSelectedPosts([]);
  }

  // -------- Bulk actions --------
  async function doBulk(action) {
    const ids = selectedPosts;
    if (!ids.length) return;
    try {
      await postsApi.bulk(action, ids);
      showToast(`Bulk ${action} complete`, 'success');
      setSelectedPosts([]);
      await refresh();
    } catch (e) {
      showToast(e.message, 'error');
    }
  }

  const trashLabel = {
    trash:   { fn: () => doBulk('trash'),   msg: t('confirmBulkTrash') },
    restore: { fn: () => doBulk('restore'), msg: t('confirmBulkRestore') },
    delete:  { fn: () => doBulk('delete'),  msg: t('confirmBulkPermanentDelete'), danger: true },
  };

  return (
    <section className="bg-white border border-wp-gray rounded shadow-sm overflow-hidden">
      <FilterTabs value={filter} onChange={changeFilter} counts={counts} />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 bg-white border-b-2 border-wp-gray">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category / Author filters — always visible, including the trash tab.
              Categories come from the Firestore `categories` collection (real-time)
              so the dropdown reflects exactly what users have created in the editor. */}
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 px-3 py-0 text-sm"
          >
            <option value="">{t('allCategories')}</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </Select>
          <Select
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="h-9 px-3 py-0 text-sm"
          >
            <option value="">{t('allAuthors')}</option>
            {authors.map(a => <option key={a} value={a}>{a}</option>)}
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="px-3 py-2 rounded border border-wp-gray-dark bg-white text-sm focus:outline-none focus:border-wp-blue focus:ring-2 focus:ring-wp-blue/20"
          />
          <Button variant="secondary" size="md" leftIcon={<Search size={14} />}>
            {t('search')}
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/*
            Requirement #2 — Embossed thead.
            - bg-gray-200 instead of the old bg-wp-gray
            - relative + z-10 + shadow-md so the header floats above
              the post rows below
            - font-bold + uppercase + tracking-wider for the column labels
          */}
          <thead className="bg-gray-200 relative z-10 shadow-md">
            <tr className="text-ink-primary uppercase text-xs tracking-wider">
              {/* Header checkbox — ALWAYS visible. Checked when every
                 currently-displayed row is in selectedPosts. Clicking
                 pushes all visible ids into the array; unchecking clears
                 the array. */}
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={allOnPageChecked}
                  ref={(el) => { if (el) el.indeterminate = !allOnPageChecked && someOnPageChecked; }}
                  onChange={toggleAllVisible}
                  aria-label="select all"
                  className="w-4 h-4 accent-wp-blue cursor-pointer"
                />
              </th>
              <th className="px-4 py-3 text-left font-bold">{t('title')}</th>
              <th className="px-4 py-3 text-left w-32 font-bold">{t('author')}</th>
              <th className="px-4 py-3 text-left w-40 font-bold">{t('categories')}</th>
              <th className="px-4 py-3 text-left w-44 font-bold">{t('tags')}</th>
              <th className="px-4 py-3 text-left w-32 font-bold">{t('date')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-10 text-center"><Spinner /></td></tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-16 text-ink-muted">
                  <div className="flex flex-col items-center gap-3">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    <p>{filter === 'trashed' ? t('trashedPostsEmpty') : t('createFirstPost')}</p>
                  </div>
                </td>
              </tr>
            )}

            {!loading && pageItems.map((p) => {
              const isSelected = selectedPosts.includes(p.id);
              return (
                <tr
                  key={p.id}
                  onClick={() => toggleOne(p.id)}
                  className={[
                    'border-t border-wp-gray transition cursor-pointer',
                    isSelected ? 'bg-wp-blue/10' : 'hover:bg-[#f6f7f7]',
                  ].join(' ')}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(p.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 accent-wp-blue cursor-pointer"
                      aria-label={`select ${p.title || 'post'}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={p.featuredImage} size="sm" alt={p.title} />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(filter === 'trashed' ? `/posts/${p.id}/restore` : `/posts/${p.id}/edit`);
                        }}
                        className={[
                          'font-medium',
                          isSelected ? 'text-wp-blue' : 'text-wp-blue hover:underline',
                        ].join(' ')}
                      >
                        {p.title || t('untitled')}
                      </button>
                    </div>
                    <div className="flex gap-2 mt-1 text-xs text-ink-muted ml-11">
                      {filter === 'trashed' ? (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); postsApi.restore(p.id).then(refresh); }}
                            className="hover:text-wp-blue"
                          >
                            {t('restorePost')}
                          </button>
                          <span>·</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirm({
                                message: t('confirmDeletePermanent'),
                                danger: true,
                                onConfirm: () => postsApi.remove(p.id).then(refresh),
                              });
                            }}
                            className="hover:text-wp-red"
                          >
                            {t('deletePermanently')}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/posts/${p.id}/edit`); }}
                            className="hover:text-wp-blue"
                          >
                            {t('editPost')}
                          </button>
                          <span>·</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              confirm({
                                message: t('confirmMoveToTrash'),
                                onConfirm: () => postsApi.trash(p.id).then(refresh),
                              });
                            }}
                            className="hover:text-wp-red"
                          >
                            {t('trash')}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.author || t('unknown')}</td>
                  <td className="px-4 py-3 text-xs">
                    {(p.categories || []).map(c => (
                      <span key={c} className="inline-block bg-wp-blue/10 text-wp-blue px-1.5 py-0.5 rounded mr-1 mb-1">{c}</span>
                    ))}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-muted">{(p.tags || []).join(', ')}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                    <div className="text-xs text-ink-muted mt-1">{formatDate(p.createdAt)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Bulk action bar */}
      {selectedPosts.length > 0 && (
        <div className="mx-5 mb-3 mt-3 flex items-center gap-3 px-4 py-3 rounded-lg border border-wp-blue/40 bg-wp-blue/10 text-ink-primary shadow-sm">
          <div className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-wp-blue text-white">
            <ListChecks size={14} />
          </div>
          <span className="font-semibold text-wp-blue">{selectedPosts.length} selected</span>
          <div className="flex-1" />
          {filter === 'trashed' ? (
            <>
              <Button variant="secondary" size="sm" leftIcon={<RotateCcw size={14} />}
                      onClick={() => confirm({ message: trashLabel.restore.msg, onConfirm: trashLabel.restore.fn })}>
                {t('bulkRestore')}
              </Button>
              <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />}
                      onClick={() => confirm({ message: trashLabel.delete.msg, danger: true, onConfirm: trashLabel.delete.fn })}>
                {t('bulkDelete')}
              </Button>
            </>
          ) : (
            <Button variant="danger" size="sm" leftIcon={<Trash2 size={14} />}
                    onClick={() => confirm({ message: trashLabel.trash.msg, onConfirm: trashLabel.trash.fn })}>
              {t('moveToTrashBtn')}
            </Button>
          )}
          {/*
            Requirement #4 — Deselect button styled as a solid blue chip
            (bg-blue-500 text-white hover:bg-blue-600 px-3 py-1 rounded).
          */}
          <button
            type="button"
            onClick={() => setSelectedPosts([])}
            className="inline-flex items-center gap-1 bg-blue-500 text-white hover:bg-blue-600 px-3 py-1 rounded text-sm font-medium transition"
          >
            <X size={14} />
            <span>{t('cancelSelection')}</span>
          </button>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-4 border-t border-wp-gray text-sm">
        <span className="text-ink-muted">
          {t('showing')} {filtered.length === 0 ? 0 : start + 1} - {Math.min(start + POSTS_PER_PAGE, filtered.length)} {t('posts')}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" disabled={currentPage <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  leftIcon={<ChevronLeft size={14} />}>
            {t('previous')}
          </Button>
          <span className="px-3 font-semibold text-ink-primary">{currentPage} / {totalPages}</span>
          <Button variant="secondary" size="sm" disabled={currentPage >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  rightIcon={<ChevronRight size={14} />}>
            {t('next')}
          </Button>
        </div>
      </div>
    </section>
  );
}