import { useState } from 'react';
import { Input, Select } from '../../ui/Input';

/**
 * <AdvancedTab /> — "Nâng cao" tab.
 * Mirrors the WordPress Rank Math "Advanced" tab:
 *   • Robots meta (index/noindex/noarchive/etc.)
 *   • Advanced meta robots (max snippet / video / image preview)
 *   • Canonical URL
 *
 * Controlled: receives `value` (object) and `onChange(patch)` from parent.
 * Falls back to sensible defaults so the UI works standalone too.
 */
const ROBOTS_META = [
  // Column 1
  { key: 'index',         label: 'Chỉ mục',                     defaultChecked: true  },
  { key: 'nofollow',      label: 'Nofollow',                    defaultChecked: false },
  { key: 'noImageIndex',  label: 'Không lập chỉ mục hình ảnh',  defaultChecked: false },
  // Column 2
  { key: 'noIndex',       label: 'Không lập chỉ mục',           defaultChecked: false },
  { key: 'noArchive',     label: 'Không lưu trữ',               defaultChecked: false },
  { key: 'noSnippet',     label: 'Không có đoạn trích xuất',    defaultChecked: false },
];

const DEFAULT_VALUE = {
  robots: {
    index:        true,
    nofollow:     false,
    noImageIndex: false,
    noIndex:      false,
    noArchive:    false,
    noSnippet:    false,
  },
  advanced: {
    maxSnippet:    -1,
    maxVideoPreview: -1,
    maxImagePreview: 'large',
  },
  canonicalUrl: '',
};

export function AdvancedTab({ value, onChange }) {
  // Merge incoming value with defaults so partially-filled state still works.
  const merged = {
    robots: { ...DEFAULT_VALUE.robots,  ...(value?.robots   ?? {}) },
    advanced: { ...DEFAULT_VALUE.advanced, ...(value?.advanced ?? {}) },
    canonicalUrl: value?.canonicalUrl ?? DEFAULT_VALUE.canonicalUrl,
  };

  // Local mirror so checkboxes / inputs are interactive even without a parent
  // onChange (e.g. preview / standalone use). When `onChange` exists, we
  // also bubble the patch up so it can be persisted later.
  const [local, setLocal] = useState(merged);

  const current = { ...merged, ...local };

  const update = (patch) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    onChange?.(patch);
    // eslint-disable-next-line no-console
    console.log('[AdvancedTab] change', patch);
  };

  const setRobot = (key, checked) => {
    update({ robots: { ...current.robots, [key]: checked } });
  };

  const setAdvanced = (key, val) => {
    update({ advanced: { ...current.advanced, [key]: val } });
  };

  const col1 = ROBOTS_META.slice(0, 3);
  const col2 = ROBOTS_META.slice(3);

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* ── Group 1: Robots Meta ──────────────────────────────────────── */}
      <fieldset className="border border-gray-300 rounded p-4">
        <legend className="px-2 text-sm font-semibold text-ink-primary">
          Siêu dữ liệu Robots
        </legend>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {/* Column 1 */}
          <div className="flex flex-col gap-2">
            {col1.map(({ key, label, defaultChecked }) => (
              <label
                key={key}
                className="inline-flex items-center gap-2 text-ink-primary cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!current.robots[key]}
                  onChange={(e) => setRobot(key, e.target.checked)}
                  className="w-4 h-4 accent-wp-blue"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {/* Column 2 */}
          <div className="flex flex-col gap-2">
            {col2.map(({ key, label }) => (
              <label
                key={key}
                className="inline-flex items-center gap-2 text-ink-primary cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={!!current.robots[key]}
                  onChange={(e) => setRobot(key, e.target.checked)}
                  className="w-4 h-4 accent-wp-blue"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      {/* ── Group 2: Advanced Meta Robots ─────────────────────────────── */}
      <fieldset className="border border-gray-300 rounded p-4">
        <legend className="px-2 text-sm font-semibold text-ink-primary">
          Meta Robots nâng cao
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Max snippet */}
          <div className="flex flex-col gap-1">
            <label htmlFor="adv-max-snippet" className="text-ink-secondary">
              Đoạn trích tối đa
            </label>
            <Input
              id="adv-max-snippet"
              type="number"
              value={current.advanced.maxSnippet}
              onChange={(e) => setAdvanced('maxSnippet', Number(e.target.value))}
            />
          </div>

          {/* Max video preview */}
          <div className="flex flex-col gap-1">
            <label htmlFor="adv-max-video" className="text-ink-secondary">
              Bản xem trước video tối đa
            </label>
            <Input
              id="adv-max-video"
              type="number"
              value={current.advanced.maxVideoPreview}
              onChange={(e) => setAdvanced('maxVideoPreview', Number(e.target.value))}
            />
          </div>

          {/* Max image preview */}
          <div className="flex flex-col gap-1 md:col-span-2">
            <label htmlFor="adv-max-image" className="text-ink-secondary">
              Bản xem trước hình ảnh tối đa
            </label>
            <Select
              id="adv-max-image"
              value={current.advanced.maxImagePreview}
              onChange={(e) => setAdvanced('maxImagePreview', e.target.value)}
            >
              <option value="large">Lớn</option>
              <option value="standard">Chuẩn</option>
              <option value="small">Nhỏ</option>
            </Select>
          </div>
        </div>
      </fieldset>

      {/* ── Group 3: Canonical URL ────────────────────────────────────── */}
      <fieldset className="border border-gray-300 rounded p-4">
        <legend className="px-2 text-sm font-semibold text-ink-primary">
          URL chính tắc
        </legend>
        <div className="flex flex-col gap-1">
          <label htmlFor="adv-canonical" className="text-ink-secondary">
            Canonical URL
          </label>
          <Input
            id="adv-canonical"
            type="url"
            placeholder="https://domain.com/url-bai-viet/"
            value={current.canonicalUrl}
            onChange={(e) => update({ canonicalUrl: e.target.value })}
          />
        </div>
      </fieldset>
    </div>
  );
}