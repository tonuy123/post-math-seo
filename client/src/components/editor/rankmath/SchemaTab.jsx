import { useState } from 'react';
import { Select } from '../../ui/Input';
import { Wand2 } from 'lucide-react';

/**
 * <SchemaTab /> — "Schema" tab.
 * Mirrors the WordPress Rank Math "Schema" tab (slim version):
 *   • Description blurb
 *   • Schema type select (Article / Product / Event / Recipe)
 *   • "Schema Generator" button stub
 *
 * Controlled: receives `value` (current schemaType) and `onChange(type)`.
 * `onOpenGenerator` is optional — if provided, the button calls it
 * (handy when the host app wants to open a full schema builder modal).
 */
const SCHEMA_TYPES = [
  { value: 'article', label: 'Bài viết' },
  { value: 'product', label: 'Sản phẩm' },
  { value: 'event',   label: 'Sự kiện' },
  { value: 'recipe',  label: 'Công thức nấu ăn' },
];

export function SchemaTab({ value, onChange, onOpenGenerator }) {
  const [localType, setLocalType] = useState(value ?? 'article');
  const current = value ?? localType;

  const handleChange = (e) => {
    const next = e.target.value;
    setLocalType(next);
    onChange?.(next);
    // eslint-disable-next-line no-console
    console.log('[SchemaTab] schemaType →', next);
  };

  const handleOpenGenerator = () => {
    // eslint-disable-next-line no-console
    console.log('[SchemaTab] open Schema Generator for type:', current);
    onOpenGenerator?.(current);
  };

  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-ink-secondary leading-relaxed">
        Định cấu hình Đánh dấu Schema cho các trang của bạn. Schema giúp các
        công cụ tìm kiếm hiểu rõ hơn về nội dung và có thể tạo kết quả nổi
        bật phong phú trên Google.
      </p>

      <div className="flex flex-col gap-1 max-w-xs">
        <label htmlFor="schema-type" className="text-ink-secondary font-medium">
          Schema đang sử dụng
        </label>
        <Select
          id="schema-type"
          value={current}
          onChange={handleChange}
        >
          {SCHEMA_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <button
          type="button"
          onClick={handleOpenGenerator}
          className="inline-flex items-center gap-2 px-4 py-2 rounded bg-wp-blue text-white text-sm font-semibold hover:bg-wp-blue/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-wp-blue/40"
        >
          <Wand2 size={16} />
          Trình tạo Schema
        </button>
      </div>
    </div>
  );
}