import { type CSSProperties, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Calendar,
  CheckCircle2,
  Clock,
  Equal,
  Flame,
  HelpCircle,
} from 'lucide-react';
import { he } from '../i18n/he';
import type { Priority, Tag } from '../api/mock';

const AVATAR_COLORS = [
  'linear-gradient(135deg, #3B82F6, #1D4ED8)',
  'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  'linear-gradient(135deg, #EC4899, #BE185D)',
  'linear-gradient(135deg, #F97316, #C2410C)',
  'linear-gradient(135deg, #10B981, #047857)',
  'linear-gradient(135deg, #06B6D4, #0E7490)',
  'linear-gradient(135deg, #6366F1, #4338CA)',
];

export function Avatar({
  name,
  size = 28,
  showStatus,
  isOnline = true,
}: {
  name: string;
  size?: number;
  showStatus?: boolean;
  isOnline?: boolean;
}) {
  const parts = name.trim().split(/\s+/);
  const initials = parts.length > 1
    ? `${parts[0][0]}${parts[parts.length - 1][0]}`
    : name.slice(0, 2);

  const hash = [...name].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  const bg = AVATAR_COLORS[hash % AVATAR_COLORS.length];

  return (
    <div
      className="avatar-wrap"
      style={{ width: size, height: size }}
      title={name}
      aria-label={name}
    >
      <span
        className="avatar"
        style={{
          width: size,
          height: size,
          fontSize: Math.max(10, Math.floor(size * 0.38)),
          background: bg,
        }}
      >
        {initials}
      </span>
      {showStatus && (
        <span
          className={`avatar-status ${isOnline ? 'online' : 'offline'}`}
          aria-hidden
        />
      )}
    </div>
  );
}

const PRIO_CONFIG: Record<
  Priority,
  { icon: typeof ArrowDown; color: string; bg: string; text: string }
> = {
  LOW: { icon: ArrowDown, color: 'var(--p-low)', bg: 'var(--p-low-bg)', text: he.priority.LOW },
  MEDIUM: { icon: Equal, color: 'var(--p-medium)', bg: 'var(--p-medium-bg)', text: he.priority.MEDIUM },
  HIGH: { icon: ArrowUp, color: 'var(--p-high)', bg: 'var(--p-high-bg)', text: he.priority.HIGH },
  CRITICAL: { icon: Flame, color: 'var(--p-critical)', bg: 'var(--p-critical-bg)', text: he.priority.CRITICAL },
};

export const pvar = (p: Priority) => `var(--p-${p.toLowerCase()})`;

export function PriorityBadge({
  priority,
  showLabel = true,
  size = 'md',
}: {
  priority: Priority;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}) {
  const cfg = PRIO_CONFIG[priority];
  const Icon = cfg.icon;

  return (
    <span
      className={`prio-badge prio-${priority.toLowerCase()} ${size}`}
      title={`${he.filters.priority}: ${cfg.text}`}
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
      }}
    >
      <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2.5} aria-hidden />
      {showLabel && <span className="prio-text">{cfg.text}</span>}
    </span>
  );
}

export const diffDays = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.round((target - today) / 864e5);
};

export const fmtDate = (s: string, short = false) => {
  const [y, m, d] = s.split('-');
  return short ? `${d}/${m}` : `${d}/${m}/${y}`;
};

export function DueDate({ date }: { date: string }) {
  const n = diffDays(date);

  let state: 'overdue' | 'today' | 'tomorrow' | 'soon' | 'future' = 'future';
  let label = '';

  if (n < 0) {
    state = 'overdue';
    const abs = Math.abs(n);
    label = abs === 1 ? 'איחור של יום' : `${he.due.overdue} ${abs} ${he.due.daysAgo}`;
  } else if (n === 0) {
    state = 'today';
    label = he.due.today;
  } else if (n === 1) {
    state = 'tomorrow';
    label = he.due.tomorrow;
  } else if (n <= 3) {
    state = 'soon';
    label = `${he.due.inDays} ${n} ${he.due.daysAgo}`;
  } else {
    label = fmtDate(date, true);
  }

  const Icon = state === 'overdue' ? AlertTriangle : state === 'today' || state === 'tomorrow' ? Clock : Calendar;

  return (
    <span className={`due-pill ${state}`} title={`תאריך יעד: ${fmtDate(date)}`}>
      <Icon size={12} strokeWidth={2.2} aria-hidden />
      <span dir="rtl">{label}</span>
    </span>
  );
}

/**
 * Formats a date or ISO string into friendly relative Hebrew time:
 * - הרגע / לפני X דקות
 * - היום ב-HH:MM
 * - אתמול ב-HH:MM
 * - לפני יומיים (2 ימים)
 * - לפני X ימים (עד שבוע)
 * - לפני שבוע / לפני שבועיים / לפני 3 שבועות
 * - לפני חודש / לפני חודשיים / לפני X חודשים
 * - לפני שנה / לפני שנתיים / לפני X שנים
 */
export function formatRelativeTime(dateInput?: string | Date | number | null): string {
  if (!dateInput) return '';
  const date =
    typeof dateInput === 'string' || typeof dateInput === 'number'
      ? new Date(dateInput)
      : dateInput;

  if (isNaN(date.getTime())) {
    return typeof dateInput === 'string' ? dateInput : '';
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  // Future check or right now
  if (diffMs < 0 || diffSec < 60) {
    return 'הרגע';
  }

  if (diffMin < 60) {
    return diffMin === 1 ? 'לפני דקה' : `לפני ${diffMin} דקות`;
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;
  const timeStr = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  if (date.getTime() >= todayStart) {
    return `היום ב-${timeStr}`;
  }
  if (date.getTime() >= yesterdayStart) {
    return `אתמול ב-${timeStr}`;
  }

  const daysAgo = Math.floor((todayStart - date.getTime()) / 86400000) + 1;

  if (daysAgo === 2) {
    return 'לפני יומיים';
  }
  if (daysAgo >= 3 && daysAgo <= 6) {
    return `לפני ${daysAgo} ימים`;
  }

  // Weeks (7 to 29 days)
  if (daysAgo >= 7 && daysAgo <= 13) {
    return 'לפני שבוע';
  }
  if (daysAgo >= 14 && daysAgo <= 20) {
    return 'לפני שבועיים';
  }
  if (daysAgo >= 21 && daysAgo <= 29) {
    return 'לפני 3 שבועות';
  }

  // Months (30 to 364 days)
  const monthsAgo = Math.floor(daysAgo / 30);
  if (monthsAgo <= 1) {
    return 'לפני חודש';
  }
  if (monthsAgo === 2) {
    return 'לפני חודשיים';
  }
  if (monthsAgo >= 3 && monthsAgo <= 11) {
    return `לפני ${monthsAgo} חודשים`;
  }

  // Years (365+ days)
  const yearsAgo = Math.floor(daysAgo / 365);
  if (yearsAgo <= 1) {
    return 'לפני שנה';
  }
  if (yearsAgo === 2) {
    return 'לפני שנתיים';
  }
  return `לפני ${yearsAgo} שנים`;
}

export function TagChip({ tag, onRemove }: { tag: Tag; onRemove?: () => void }) {
  return (
    <span
      className="tag-chip"
      style={{ '--tag-color': tag.color } as CSSProperties}
      title={tag.name}
    >
      <span className="tag-dot" style={{ backgroundColor: tag.color }} />
      <span className="tag-name">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          className="tag-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`הסר תגית ${tag.name}`}
        >
          ×
        </button>
      )}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  color = 'var(--primary)',
  height = 5,
  showLabel = false,
}: {
  value: number;
  max: number;
  color?: string;
  height?: number;
  showLabel?: boolean;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;

  return (
    <div className="progress-container">
      {showLabel && (
        <div className="progress-label">
          <span>{pct}% הושלם</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className="progress-track" style={{ height }}>
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            backgroundColor: pct === 100 ? 'var(--success)' : color,
          }}
        />
      </div>
    </div>
  );
}

export function StatusBadge({ name, color }: { name: string; color: string }) {
  return (
    <span className="status-badge" style={{ '--col': color } as CSSProperties}>
      <span className="status-badge-dot" style={{ background: color }} />
      <span>{name}</span>
    </span>
  );
}
