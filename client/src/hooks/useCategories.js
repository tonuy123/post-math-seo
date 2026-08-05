/**
 * useCategories — đăng ký nhận dữ liệu thời gian thực từ collection `categories`.
 *
 * Trả về: { categories, loading, error }
 *   categories: Array<{ id, name, postCount?, createdAt? }>
 *   loading   : boolean
 *   error     : Error | null
 *
 * Nội bộ sao chép listener mà <CategorySidebar /> dùng để
 * dropdown lọc của PostsList và sidebar editor luôn đồng bộ hoàn hảo
 * với mọi category mà người dùng tạo / đổi tên trong Firebase.
 *
 * Nằm tại /hooks/useCategories.js — đặt gần usePosts.js để dễ
 * tìm thấy.
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
    // Sao chép hành vi null-safe của CategorySidebar. Nếu Web SDK chưa
    // được cấu hình, consumer có thể fallback về danh sách hardcode.
    if (!db) {
      setLoading(false);
      return undefined;
    }

    const colRef = collection(db, 'categories');
    // Sắp xếp theo bảng chữ cái theo `name` để các lựa chọn dropdown xuất hiện
    // theo thứ tự người dùng mong đợi ("Công Nghệ" trước "Marketing"). Với
    // kiểu sắp xếp theo mức phổ biến, consumer có thể tự sắp xếp lại mảng trả về.
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
