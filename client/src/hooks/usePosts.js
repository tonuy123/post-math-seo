/**
 * Posts hook — wraps the postsApi with React state, refresh, and pagination.
 */
import { useCallback, useEffect, useState } from 'react';
import { postsApi } from '../services/api/posts';

export function usePosts() {
  const [posts, setPosts]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  const refresh = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const { posts: list } = await postsApi.list(params);
      setPosts(list ?? []);
    } catch (e) {
      setError(e.message || 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { posts, loading, error, refresh, setPosts };
}