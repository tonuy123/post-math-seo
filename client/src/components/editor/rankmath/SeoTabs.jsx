import { useState } from 'react';
import {
  Settings, Sliders, Code2, Share2,
} from 'lucide-react';

/**
 * Dải tab cho bảng Rank Math. Chỉ thuần trình bày; id tab đang kích hoạt
 * do <RankMathSeoBox /> sở hữu.
 *
 * Các tab được viết cứng bằng tiếng Việt để khớp với phần còn lại của UI CMS.
 * Icon dùng lucide-react để hiển thị giống hệt nhau trên mọi trình duyệt.
 *
 * Trạng thái kích hoạt: gạch dưới xanh đậm (2px) + chữ ink-primary + icon đặc.
 * Không kích hoạt: chữ mờ + icon dạng viền, hover nâng lên ink-primary.
 */
const SEO_TABS = [
  { id: 'overview', label: 'Tổng quan',   Icon: Settings },
  { id: 'advanced', label: 'Nâng cao',    Icon: Sliders  },
  { id: 'schema',   label: 'Schema',      Icon: Code2    },
  { id: 'social',   label: 'Mạng xã hội', Icon: Share2   },
];

export function SeoTabs({ value, onChange }) {
  return (
    <div
      role="tablist"
      aria-label="SEO settings tabs"
      className="flex items-stretch flex-wrap border-b border-wp-gray bg-white px-2"
    >
      {SEO_TABS.map(({ id, label, Icon }) => {
        const isActive = value === id;
        return (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`seo-tab-panel-${id}`}
            onClick={() => onChange(id)}
            className={[
              'relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/40 rounded-t',
              isActive
                ? 'text-wp-blue'
                : 'text-ink-muted hover:text-ink-primary',
            ].join(' ')}
          >
            <Icon
              size={15}
              strokeWidth={isActive ? 2.4 : 1.8}
              className={isActive ? 'text-wp-blue' : 'text-ink-muted'}
            />
            <span>{label}</span>
            {/* Chỉ báo gạch chân phía dưới */}
            <span
              aria-hidden="true"
              className={[
                'absolute left-2 right-2 -bottom-px h-0.5 rounded-t transition-colors',
                isActive ? 'bg-wp-blue' : 'bg-transparent',
              ].join(' ')}
            />
          </button>
        );
      })}
    </div>
  );
}
