/**
 * useCategories — real-time subscription to the `categories` collection.
 *
 * Returns: { categories, loading, error }
 *   categories: Array<{ id, name, postCount?, createdAt? }>
 *   loading   : boolean
 *   error     : Error | null
 *
 * Internally mirrors the listener used by <CategorySidebar /> so the
 * PostsList filter dropdown and the editor sidebar stay perfectly in sync
 * with whatever categories the user creates / renames inside Firebase.
 *
 * Lives at /hooks/useCategories.js — co-located with usePosts.js for easy
 * discovery.
 */
import { useEffect, useState } from 'react';
import {
  collection, onSnapshot, orderBy, query,
} from 'firebase/firestore';
import { db } from '../services/firebase/config';

export function useCategories({ sortBy = 'name' } = {}) {
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    // Mirror CategorySidebar's null-safe behaviour. If Web SDK isn't
    // configured yet, the consumer can fall back to a hardcoded list.
    if (!db) {
      setLoading(false);
      return undefined;
    }

    const colRef = collection(db, 'categories');
    // Sort alphabetically by `name` so dropdown options appear in the
    // order users expect ("Công Nghệ" before "Marketing"). For
    // popularity sorts the consumer can re-sort the returned array.
    const q = sortBy === 'popular'
      ? query(colRef, orderBy('postCount', 'desc'))
      : (sortBy === 'recent'
          ? query(colRef, orderBy('createdAt', 'desc'))
          : query(colRef, orderBy('name', 'asc')));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error('[useCategories] Firestore error:', err);
        setError(err);
        setLoading(false);
      },
    );

    return unsub;
  }, [sortBy]);

  return { categories, loading, error };
}
