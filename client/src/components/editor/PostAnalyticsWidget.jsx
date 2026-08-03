import { Eye, MousePointerClick, BarChart3, Clock, Percent, RefreshCw } from 'lucide-react';

/**
 * <PostAnalyticsWidget /> — small analytics card for the right sidebar.
 *
 * Layout
 *   ┌────────────────────────────────────────┐
 *   │  Thống kê bài viết                     │
 *   │                                        │
 *   │             ╭───────╮                  │
 *   │            │  85%   │   ← donut chart  │
 *   │            │ Điểm SEO│                  │
 *   │             ╰───────╯                  │
 *   │                                        │
 *   │  ┌──────┐  ┌──────┐                    │
 *   │  │ 1,245│  │ 12%  │                    │
 *   │  │Lượt xem│Tỷ lệ   │                  │
 *   │  └──────┘  └──────┘                    │
 *   │  ┌──────┐  ┌──────┐                    │
 *   │  │ 3.4% │  │ 2p 14s│                   │
 *   │  │ CTR  │  │ TG TB│                    │
 *   │  └──────┘  └──────┘                    │
 *   └────────────────────────────────────────┘
 *
 * Props (all from real post data):
 *   - seoScore      : number   0..100
 *   - views         : number
 *   - bounceRate    : number   0..100   (%)
 *   - ctr           : number   0..100   (%)
 *   - avgTimeOnPage : number   seconds  (rendered as 2p 14s)
 *   - isLoading     : boolean
 *
 * Math note — SVG donut:
 *   For a circle with radius R, the circumference is C = 2πR.
 *   To draw `p` percent (0..1) of the ring we use:
 *       strokeDasharray = C
 *       strokeDashoffset = C * (1 - p)
 *   The circle starts drawing from 3 o'clock by default, so we rotate -90°
 *   to begin at 12 o'clock.
 */

const SIZE       = 140;
const STROKE     = 12;
const RADIUS     = (SIZE - STROKE) / 2;
const CIRCUM     = 2 * Math.PI * RADIUS;

/* Donut chart */
function Donut({ value }) {
  const safe = Math.max(0, Math.min(100, value || 0));
  const offset = CIRCUM * (1 - safe / 100);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={SIZE} height={SIZE} className="-rotate-90">
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="none" stroke="#e5e7eb" strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
          fill="none" stroke="url(#donut-gradient)"
          strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={CIRCUM} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
        <defs>
          <linearGradient id="donut-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#10b981" /> {/* emerald-500 */}
            <stop offset="100%" stopColor="#3b82f6" /> {/* blue-500 */}
          </linearGradient>
        </defs>
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-2xl font-bold text-ink-primary leading-none">
          {Math.round(safe)}%
        </span>
        <span className="text-[11px] text-ink-muted mt-1">Điểm SEO</span>
      </div>
    </div>
  );
}

/* Helpers */
const nf = new Intl.NumberFormat('vi-VN');

/** Format seconds → "1p 24s" / "0p 09s" / "12s" */
function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r}s`;
  return `${m}p ${String(r).padStart(2, '0')}s`;
}

/* Main widget */
export function PostAnalyticsWidget({
  seoScore      = 0,
  views         = 0,
  bounceRate    = 0,
  ctr           = 0,
  avgTimeOnPage = 0,
  isLoading     = false,
  onRefresh,
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-7 w-7 bg-gray-200 rounded-full animate-pulse" />
        </div>
        <div className="flex justify-center mb-4">
          <div className="w-[140px] h-[140px] rounded-full bg-gray-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-12 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-ink-primary m-0 flex items-center gap-1.5">
          <BarChart3 size={14} className="text-blue-500" />
          Thống kê bài viết
        </h3>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Làm mới thống kê"
          title="Làm mới thống kê"
          disabled={!onRefresh}
          className="inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-500"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Donut chart */}
      <div className="flex items-center justify-center py-2">
        <Donut value={seoScore} />
      </div>

      {/* Stats grid — 2x2 */}
      <div className="grid grid-cols-2 gap-3 mt-3">
        <Stat icon={Eye}             color="blue"   value={nf.format(views)}          label="Lượt xem" />
        <Stat icon={MousePointerClick} color="orange" value={`${Math.round(bounceRate)}%`} label="Tỷ lệ thoát" />
        <Stat icon={Percent}         color="green"  value={`${(Number(ctr) || 0).toFixed(1)}%`} label="CTR" />
        <Stat icon={Clock}           color="purple" value={formatDuration(avgTimeOnPage)}      label="Thời gian TB" />
      </div>
    </div>
  );
}

/* Small reusable stat tile */
function Stat({ icon: Icon, color, value, label }) {
  const colorMap = {
    blue:   'text-blue-500',
    orange: 'text-orange-500',
    green:  'text-green-500',
    purple: 'text-purple-500',
  };
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-gray-50 border border-gray-200">
      <Icon size={16} className={`${colorMap[color] || 'text-gray-500'} shrink-0`} />
      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-sm font-semibold text-ink-primary tabular-nums truncate">
          {value}
        </span>
        <span className="text-[11px] text-ink-muted truncate">{label}</span>
      </div>
    </div>
  );
}