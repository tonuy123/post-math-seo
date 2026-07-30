import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Send, Lock, Trash2, Plus } from 'lucide-react';

import { usePosts } from '../../hooks/usePosts';
import { Button } from '../../components/ui/Button';

export default function Dashboard() {
  const { t } = useTranslation();
  const { posts, loading } = usePosts();
  const navigate = useNavigate();

  const stats = useMemo(() => {
    const safePosts = posts || [];
    return {
      all:       safePosts.filter(p => p.status !== 'trashed').length,
      published: safePosts.filter(p => p.status === 'published').length,
      drafts:    safePosts.filter(p => p.status === 'draft').length,
      private:   safePosts.filter(p => p.status === 'private').length,
      trash:     safePosts.filter(p => p.status === 'trashed').length,
    };
  }, [posts]);

  const tiles = [
    { key: 'all',       label: t('allPosts'),    icon: FileText, color: 'bg-wp-blue'   },
    { key: 'published', label: t('published'),   icon: Send,     color: 'bg-wp-green'  },
    { key: 'drafts',    label: t('drafts'),      icon: FileText, color: 'bg-wp-orange' },
    { key: 'private',   label: t('privateTab'),  icon: Lock,     color: 'bg-wp-red'    },
    { key: 'trash',     label: t('trash'),       icon: Trash2,   color: 'bg-gray-500'  },
  ];

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-ink-primary">{t('dashboard')}</h2>
        <Button variant="primary" leftIcon={<Plus size={16} />} onClick={() => navigate('/posts/new')}>
          {t('addNew')}
        </Button>
      </div>

      {loading ? (
        <div className="text-ink-muted">Loading...</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {tiles.map(({ key, label, icon: Icon, color }) => (
            <Link
              key={key}
              to={`/posts?filter=${key}`}
              className="bg-white border border-wp-gray rounded shadow-sm p-4 flex items-center gap-3 hover:shadow-md transition"
            >
              <div className={`w-10 h-10 grid place-items-center rounded ${color} text-white`}>
                <Icon size={20} />
              </div>
              <div>
                <div className="text-2xl font-semibold text-ink-primary leading-none">{stats[key]}</div>
                <div className="text-xs text-ink-muted mt-1">{label}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}