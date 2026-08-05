import { useEffect, useState } from 'react';
import { ChevronDown, Users, User, Calendar, Clock, FileEdit } from 'lucide-react';

/**
 * <PostOptionsWidget /> — widget "Tùy chọn bài viết", nằm ở đầu thanh bên
 * phải. MỌI dữ liệu đều đến từ nguồn thật (không có giá trị giả).
 *
 * Bố cục
 *   ┌────────────────────────────────────────┐
 *   │  Tùy chọn bài viết                     │
 *   │                                        │
 *   │  [HUY HIỆU TRẠNG THÁI]  Trạng thái    │
 *   │  Ngày xuất bản đầu tiên: …            │
 *   │                                        │
 *   │  ─────────────────────────────────     │
 *   │  Người tạo: <author>                   │
 *   │  Số lần chỉnh sửa: N                  │
 *   │  Lần sửa cuối: <thời gian tương đối>  │
 *   │                                        │
 *   │  ─────────────────────────────────     │
 *   │  Người đang sửa: <currentUser>         │
 *   │  Đã chỉnh sửa bởi A, B, C  [Xem thêm]│
 *   │   ↓ danh sách mở rộng (bấm Ẩn để đóng) │
 *   └────────────────────────────────────────┘
 *
 * Props (tất cả từ dữ liệu thật):
 *   - status           : 'draft' | 'published' | 'private' | 'scheduled' | 'trashed'
 *   - firstPublishedAt : chuỗi ISO | null   (từ post doc)
 *   - schedule         : chuỗi ISO | null   (thời gian xuất bản trong tương lai)
 *   - authorName       : string              (post.author.displayName)
 *   - revisionCount    : number              (post.revisionCount)
 *   - lastSavedAt      : chuỗi ISO | null   (cập nhật mỗi lần bấm Lưu)
 *   - currentUserName  : string              (user.displayName đã đăng nhập)
 *   - editors          : Array<{ displayName, editedAt }>
 *                        toàn bộ lịch sử ai đã chỉnh sửa bài viết
 */

const STATUS_META = {
  draft:     { label: 'Bản nháp',     bg: 'bg-gray-100',   text: 'text-gray-700'   },
  published: { label: 'Đã xuất bản', bg: 'bg-green-100',  text: 'text-green-700'  },
  private:   { label: 'Riêng tư',    bg: 'bg-purple-100', text: 'text-purple-700' },
  scheduled: { label: 'Đã lên lịch', bg: 'bg-blue-100',   text: 'text-blue-700'   },
  trashed:   { label: 'Thùng rác',   bg: 'bg-red-100',    text: 'text-red-700'    },
};

/* ── Các hàm trợ giúp ────────────────────────────────────────────────── */

const RELATIVE = new Intl.RelativeTimeFormat('vi-VN', { numeric: 'auto' });
const ABS_DATE = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit',
});

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return ABS_DATE.format(d);
}

function fmtRelative(iso) {
  if (!iso) return 'Chưa lưu';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60)        return RELATIVE.format(diffSec,              'second');
  if (abs < 3600)      return RELATIVE.format(Math.round(diffSec / 60),         'minute');
  if (abs < 86400)     return RELATIVE.format(Math.round(diffSec / 3600),       'hour');
  if (abs < 86400 * 7) return RELATIVE.format(Math.round(diffSec / 86400),      'day');
  return RELATIVE.format(Math.round(diffSec / (86400 * 7)),                   'week');
}

/* Hook nhỏ: re-render mỗi phút để "Vừa xong / 2 phút trước" luôn mới */
function useMinuteTick() {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);
}

/* ── Component con: một hàng meta ───────────────────────────────────── */

function MetaRow({ Icon, label, value }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="inline-flex items-center gap-1.5 text-gray-500">
        <Icon size={12} />
        {label}
      </span>
      <span className="text-gray-700 font-medium text-right truncate">
        {value}
      </span>
    </div>
  );
}

/* ── Widget chính ────────────────────────────────────────────────────── */

export function PostOptionsWidget({
  status,
  firstPublishedAt,
  schedule,
  authorName,
  revisionCount,
  lastSavedAt,
  currentUserName,
  editors = [],
}) {
  const [expanded, setExpanded] = useState(false);
  useMinuteTick();

  /* ── Phần 1 — Trạng thái & lịch xuất bản ─────────────────────────────── */
  const meta = STATUS_META[status] || STATUS_META.draft;
  const firstPublishLine = firstPublishedAt
    ? fmtDate(firstPublishedAt)
    : schedule
      ? `${fmtDate(schedule)} (đã lên lịch)`
      : 'Chưa xuất bản';

  /* ── Phần 3 — Danh sách người chỉnh sửa (thu gọn / mở rộng) ──────────── */
  // Duy nhất theo displayName, sắp xếp theo editedAt giảm dần.
  const uniqueEditors = (() => {
    const seen = new Map();
    for (const e of editors) {
      const prev = seen.get(e.displayName);
      if (!prev || new Date(e.editedAt) > new Date(prev.editedAt)) {
        seen.set(e.displayName, e);
      }
    }
    return [...seen.values()].sort(
      (a, b) => new Date(b.editedAt) - new Date(a.editedAt),
    );
  })();

  const hasManyEditors = uniqueEditors.length > 2;
  const recentEditors  = uniqueEditors.slice(0, 2);
  const summaryLine    = uniqueEditors.map((e) => e.displayName).join(', ') || '—';

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 flex flex-col gap-4">

      {/* ─── Tiêu đề ──────────────────────────────────────────────── */}
      <h3 className="text-sm font-semibold text-ink-primary m-0 flex items-center gap-1.5">
        <FileEdit size={14} className="text-blue-500" />
        Tùy chọn bài viết
      </h3>

      {/* ─── Phần 1: Trạng thái + lịch xuất bản đầu tiên ──────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">Trạng thái</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${meta.bg} ${meta.text}`}>
            {meta.label}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <Calendar size={12} />
            Lần đầu xuất bản
          </span>
          <span className="text-gray-700 font-medium text-right">
            {firstPublishLine}
          </span>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* ─── Phần 2: Người tạo / số lần sửa / lần lưu cuối ──────────── */}
      <div className="flex flex-col gap-1.5">
        <MetaRow Icon={User}    label="Người tạo"      value={authorName || '—'} />
        <MetaRow Icon={FileEdit} label="Số lần sửa"    value={revisionCount ?? 0} />
        <MetaRow Icon={Clock}   label="Lần sửa cuối"  value={fmtRelative(lastSavedAt)} />
      </div>

      <hr className="border-gray-100" />

      {/* ─── Phần 3: Người chỉnh sửa ───────────────────────────────── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 text-gray-500">
            <User size={12} />
            Người đang sửa
          </span>
          <span className="text-gray-700 font-medium text-right truncate">
            {currentUserName || '—'}
          </span>
        </div>

        {/* Trạng thái thu gọn — một dòng + nút chuyển đổi */}
        {!expanded && (
          <div className="flex items-start justify-between gap-2 text-xs">
            <div className="text-gray-500 leading-relaxed min-w-0">
              {hasManyEditors ? (
                <>
                  Đã chỉnh sửa bởi{' '}
                  <span className="text-gray-700">
                    {recentEditors.map((e) => e.displayName).join(', ')}
                  </span>{' '}
                  và {uniqueEditors.length - recentEditors.length} người khác
                </>
              ) : (
                <>
                  Đã chỉnh sửa bởi{' '}
                  <span className="text-gray-700">{summaryLine}</span>
                </>
              )}
            </div>
            {hasManyEditors && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded"
              >
                <ChevronDown size={12} />
                Xem thêm
              </button>
            )}
          </div>
        )}

        {/* Trạng thái mở rộng — danh sách đầy đủ */}
        {expanded && (
          <div className="flex flex-col gap-1.5">
            <div className="text-[11px] uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
              <Users size={11} />
              Tất cả người đã chỉnh sửa ({uniqueEditors.length})
            </div>
            <ul className="flex flex-col gap-1.5">
              {uniqueEditors.map((e) => (
                <li key={e.displayName} className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-semibold text-gray-600 shrink-0">
                      {e.displayName?.[0]?.toUpperCase() || '?'}
                    </span>
                    <span className="truncate">{e.displayName}</span>
                  </span>
                  <span className="text-gray-500 tabular-nums">
                    {fmtRelative(e.editedAt)}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="self-start inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 font-medium text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 rounded"
            >
              <ChevronDown size={12} className="rotate-180" />
              Ẩn
            </button>
          </div>
        )}
      </div>
    </div>
  );
}