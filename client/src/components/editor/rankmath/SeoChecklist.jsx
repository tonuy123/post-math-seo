import { useState } from 'react';
import {
  ChevronDown, CheckCircle2, XCircle, AlertCircle, Check, X,
} from 'lucide-react';
import { CHECKLIST_SECTIONS } from './lib/seoConstants';
import { groupChecksBySection } from './lib/calculateSeoScore';

/**
 * Checklist dạng accordion thu gọn được nhóm theo phần.
 *
 * Cấu trúc hiển thị (phản chiếu thanh bên Rank Math):
 *   <div accordion>
 *     <button header> [Tiêu đề]                [Huy hiệu ✓/x]    [Chevron ▾] </button>
 *     <div body>                                              ↓
 *       <ul> [✓ label] / [✗ label] / [⚠ label] ...               </ul>
 *     </div>
 *   </div>
 *
 * State: mỗi phần có trạng thái mở/đóng riêng. Mặc định tất cả MỞ
 * (`useState(true)`) để khớp UX "mọi thứ được mở rộng" trong ảnh chụp màn hình.
 * Nếu muốn mặc định đóng hết, hãy sửa bộ khởi tạo.
 *
 * Logic huy hiệu:
 *   - Tất cả mục đạt  -> viên xanh lá "✓ Tất cả đều tốt"
 *   - Có mục trượt    -> viên đỏ "✗ [N] lỗi"
 *
 * Các mục dùng ba icon:
 *   - CheckCircle2 (xanh lá) khi đạt
 *   - AlertCircle  (cam) khi trượt VÀ có thể bấm (có fieldKey)
 *   - XCircle      (đỏ) khi trượt VÀ không có fieldKey
 *
 * Props không đổi so với danh sách phẳng trước đây — đây chỉ là viết lại UI.
 */
export function SeoChecklist({ checks = [], onFocus }) {
  const groups = groupChecksBySection(checks, CHECKLIST_SECTIONS);

  if (groups.length === 0) {
    return (
      <div className="text-xs text-ink-muted italic px-1 py-3 border border-dashed border-wp-gray rounded">
        Chưa có tiêu chí nào được chấm.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {groups.map(({ section, items }) => (
        <SectionAccordion
          key={section.id}
          section={section}
          items={items}
          onFocus={onFocus}
        />
      ))}
    </div>
  );
}

// ─── Component con accordion theo phần ─────────────────────────────────────

function SectionAccordion({ section, items, onFocus }) {
  // Mặc định ĐÓNG — người dùng mở rộng từng phần bằng cách bấm chevron.
  const [open, setOpen] = useState(false);

  const passedCount = items.filter((i) => i.passed).length;
  const failedCount = items.length - passedCount;
  const allPassed   = failedCount === 0 && items.length > 0;

  return (
    <div className="rounded border border-wp-gray bg-white overflow-hidden">
      {/* Đầu — nền xám, tiêu đề đậm, huy hiệu, chevron */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={`seo-checks-${section.id}`}
        className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30"
      >
        {/* Tiêu đề phần */}
        <span className="text-[13px] font-bold uppercase tracking-wider text-ink-primary">
          {section.label}
        </span>

        {/* Bộ đếm nhỏ (đạt/tổng) */}
        <span className="text-[11px] text-ink-muted font-medium tabular-nums">
          {passedCount}/{items.length}
        </span>

        <span className="flex-1" />

        {/* Huy hiệu — xanh nếu tất cả đạt, đỏ nếu có bất kỳ mục trượt */}
        {allPassed ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-wp-green/10 text-wp-green border border-wp-green/30">
            <Check size={11} strokeWidth={3} />
            <span>Tất cả đều tốt</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-wp-red/10 text-wp-red border border-wp-red/30">
            <X size={11} strokeWidth={3} />
            <span>{failedCount} lỗi</span>
          </span>
        )}

        {/* Chevron */}
        <ChevronDown
          size={16}
          className={[
            'text-ink-muted transition-transform duration-200 flex-shrink-0',
            open ? 'rotate-0' : '-rotate-90',
          ].join(' ')}
        />
      </button>

      {/* Thân — nền trắng, danh sách các tiêu chí */}
      {open && (
        <ul id={`seo-checks-${section.id}`} className="px-3 py-2 divide-y divide-wp-gray">
          {items.map((c) => {
            const interactive = typeof onFocus === 'function' && c.fieldKey;
            return (
              <li key={c.id} className="py-1.5 first:pt-0 last:pb-0">
                {interactive ? (
                  <button
                    type="button"
                    onClick={() => onFocus(c.fieldKey)}
                    className="w-full flex items-start gap-2 text-left rounded px-1.5 py-1 -mx-1.5 hover:bg-wp-blue/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/30 transition"
                  >
                    <CheckIcon passed={c.passed} hasField={!!c.fieldKey} />
                    <span className={[
                      'text-[13px] leading-snug',
                      c.passed ? 'text-ink-secondary' : 'text-ink-primary',
                    ].join(' ')}>
                      {c.label}
                    </span>
                  </button>
                ) : (
                  <div className="flex items-start gap-2 px-1.5 py-1 -mx-1.5">
                    <CheckIcon passed={c.passed} hasField={false} />
                    <span className={[
                      'text-[13px] leading-snug',
                      c.passed ? 'text-ink-secondary' : 'text-ink-primary',
                    ].join(' ')}>
                      {c.label}
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Hàm trợ giúp icon nhỏ (tích xanh lá / cảnh báo cam / x đỏ) ────────────

function CheckIcon({ passed, hasField }) {
  if (passed) {
    return <CheckCircle2 size={15} className="text-wp-green flex-shrink-0 mt-0.5" />;
  }
  if (hasField) {
    return <AlertCircle size={15} className="text-wp-orange flex-shrink-0 mt-0.5" />;
  }
  return <XCircle size={15} className="text-wp-red flex-shrink-0 mt-0.5" />;
}
