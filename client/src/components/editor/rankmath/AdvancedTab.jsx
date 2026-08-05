import { useState } from 'react';
import { Input, Select } from '../../ui/Input';

/**
 * <AdvancedTab /> — tab "Nâng cao".
 * Phản chiếu tab "Advanced" của WordPress Rank Math:
 *   • Robots meta (index/noindex/noarchive/v.v.)
 *   • Meta robots nâng cao (đoạn trích / video / bản xem trước ảnh tối đa)
 *   • Canonical URL
 *
 * Controlled: nhận `value` (object) và `onChange(patch)` từ component chủ.
 * Rút lui về các giá trị mặc định hợp lý để UI cũng hoạt động độc lập.
 */
const ROBOTS_META = [
  // Cột 1
  { key: 'index',         label: 'Chỉ mục',                     defaultChecked: true  },
  { key: 'nofollow',      label: 'Nofollow',                    defaultChecked: false },
  { key: 'noImageIndex',  label: 'Không lập chỉ mục hình ảnh',  defaultChecked: false },
  // Cột 2
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
  // Gộp value đầu vào với các giá trị mặc định để state điền một phần vẫn hoạt động.
  const merged = {
    robots: { ...DEFAULT_VALUE.robots,  ...(value?.robots   ?? {}) },
    advanced: { ...DEFAULT_VALUE.advanced, ...(value?.advanced ?? {}) },
    canonicalUrl: value?.canonicalUrl ?? DEFAULT_VALUE.canonicalUrl,
  };

  // Bản phản chiếu cục bộ để checkbox / input vẫn tương tác được dù không có
  // onChange của component chủ (ví dụ dùng xem trước / độc lập). Khi có
  // `onChange`, ta cũng đẩy patch lên để có thể lưu trữ sau này.
  const [local, setLocal] = useState(merged);

  const current = { ...merged, ...local };

  const update = (patch) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    onChange?.(patch);
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
      {/* ── Nhóm 1: Robots Meta ───────────────────────────────────────── */}
      <fieldset className="border border-gray-300 rounded p-4">
        <legend className="px-2 text-sm font-semibold text-ink-primary">
          Siêu dữ liệu Robots
        </legend>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
          {/* Cột 1 */}
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
          {/* Cột 2 */}
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

      {/* ── Nhóm 2: Meta Robots nâng cao ───────────────────────────────── */}
      <fieldset className="border border-gray-300 rounded p-4">
        <legend className="px-2 text-sm font-semibold text-ink-primary">
          Meta Robots nâng cao
        </legend>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Đoạn trích tối đa */}
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

          {/* Bản xem trước video tối đa */}
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

          {/* Bản xem trước hình ảnh tối đa */}
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

      {/* ── Nhóm 3: Canonical URL ─────────────────────────────────────── */}
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