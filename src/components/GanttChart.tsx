import { useMemo, useState, useRef, useEffect } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Filter,
  Layers,
  Sparkles,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Task, Project, Team, User, Priority, Column } from '../api/mock';
import { Avatar, PriorityBadge } from './ui';

interface GanttChartProps {
  tasks: Task[];
  projects: Project[];
  teams: Team[];
  users: User[];
  columns?: Column[];
  onOpenTask: (taskId: number) => void;
  defaultGroupBy?: 'project' | 'team' | 'none';
}

type ZoomLevel = 'compact' | 'normal' | 'spacious';

const ZOOM_CONFIG: Record<ZoomLevel, { width: number; label: string }> = {
  compact: { width: 34, label: 'קומפקטי' },
  normal: { width: 48, label: 'רגיל' },
  spacious: { width: 64, label: 'מורחב' },
};

/**
 * Parses an ISO date string ("YYYY-MM-DD" or full ISO) strictly into a local midnight Date.
 * Strips out time components to eliminate timezone / DST shifts.
 */
function parseToMidnightDate(val?: string | null): Date | null {
  if (!val) return null;
  const match = val.slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10), 0, 0, 0, 0);
  }
  const dt = new Date(val);
  if (isNaN(dt.getTime())) return null;
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 0, 0, 0, 0);
}

/**
 * Calculates exact calendar days difference between two midnight dates using UTC
 * to eliminate Daylight Saving Time 23/25 hour day discrepancies.
 */
function calendarDaysBetween(from: Date, to: Date): number {
  const utc1 = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const utc2 = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((utc2 - utc1) / 86400000);
}

export function GanttChart({
  tasks,
  projects,
  teams,
  users,
  columns = [],
  onOpenTask,
  defaultGroupBy = 'project',
}: GanttChartProps) {
  const [groupBy, setGroupBy] = useState<'project' | 'team' | 'none'>(defaultGroupBy);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('normal');
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const todayMarkerRef = useRef<HTMLDivElement>(null);

  const cellWidth = ZOOM_CONFIG[zoomLevel].width;

  // Helper: check if a task is completed (status "הושלם" or has completed_at)
  const checkIsTaskCompleted = (task: Task) => {
    if (task.completed_at || task.completedAt) return true;
    const col = columns.find((c) => c.id === (task.column_id || task.columnId));
    if (col && (col.name.includes('הושלם') || col.name.toLowerCase().includes('done'))) {
      return true;
    }
    const colId = task.column_id || task.columnId;
    return colId % 100 === 4 || colId === 4;
  };

  // Calculate timeline calendar bounds, individual days, and month groups
  const { minCal, maxCal, totalDays, daysList, monthGroups, todayIndex } = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    let earliest = new Date(todayMidnight);
    earliest.setDate(earliest.getDate() - 7); // At least 7 days in the past

    let latest = new Date(todayMidnight);
    latest.setDate(latest.getDate() + 14); // At least 14 days into future

    tasks.forEach((t) => {
      const s = parseToMidnightDate(t.start_date || t.startDate);
      const due = parseToMidnightDate(t.due_date || t.dueDate);
      const comp = parseToMidnightDate(t.completed_at || t.completedAt);
      const cr = parseToMidnightDate(t.created_at);

      if (s && s < earliest) earliest = new Date(s);
      if (due && due > latest) latest = new Date(due);
      if (comp && comp > latest) latest = new Date(comp);
      if (cr && cr < earliest) earliest = new Date(cr);
    });

    // Add generous padding days
    earliest.setDate(earliest.getDate() - 3);
    latest.setDate(latest.getDate() + 5);

    const count = calendarDaysBetween(earliest, latest) + 1;

    const days: {
      date: Date;
      index: number;
      dayNum: number;
      monthNum: number;
      year: number;
      dayName: string;
      dateStr: string;
      fullDateStr: string;
      isToday: boolean;
      isWeekend: boolean;
    }[] = [];

    const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    const monthNames = [
      'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
      'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
    ];

    for (let i = 0; i < count; i++) {
      const d = new Date(earliest);
      d.setDate(earliest.getDate() + i);
      const isToday = calendarDaysBetween(todayMidnight, d) === 0;
      const dayOfWeek = d.getDay();
      days.push({
        date: d,
        index: i,
        dayNum: d.getDate(),
        monthNum: d.getMonth() + 1,
        year: d.getFullYear(),
        dayName: dayNames[dayOfWeek],
        dateStr: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        fullDateStr: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
        isToday,
        isWeekend: dayOfWeek === 5 || dayOfWeek === 6, // Friday/Saturday in Israel
      });
    }

    // Group into month header sections
    const months: { label: string; daysCount: number }[] = [];
    let curMonth = -1;
    let curMonthDays = 0;
    let curYear = -1;

    days.forEach((d) => {
      if (d.monthNum !== curMonth || d.year !== curYear) {
        if (curMonthDays > 0) {
          months.push({
            label: `${monthNames[curMonth - 1]} ${curYear}`,
            daysCount: curMonthDays,
          });
        }
        curMonth = d.monthNum;
        curYear = d.year;
        curMonthDays = 1;
      } else {
        curMonthDays++;
      }
    });

    if (curMonthDays > 0) {
      months.push({
        label: `${monthNames[curMonth - 1]} ${curYear}`,
        daysCount: curMonthDays,
      });
    }

    const tIndex = calendarDaysBetween(earliest, todayMidnight);

    return {
      minCal: earliest,
      maxCal: latest,
      totalDays: count,
      daysList: days,
      monthGroups: months,
      todayIndex: tIndex,
    };
  }, [tasks]);

  const timelineTotalWidth = totalDays * cellWidth;

  // Jump to Today
  const handleScrollToToday = () => {
    if (todayMarkerRef.current) {
      todayMarkerRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  };

  // Auto-scroll to today once on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (todayMarkerRef.current) {
        todayMarkerRef.current.scrollIntoView({
          behavior: 'auto',
          inline: 'center',
          block: 'nearest',
        });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Precision task bar geometry calculation
  const getTaskBarGeometry = (task: Task) => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const isDone = checkIsTaskCompleted(task);

    const rawStart = parseToMidnightDate(task.start_date || task.startDate);
    const rawDue = parseToMidnightDate(task.due_date || task.dueDate);
    const rawCompleted = parseToMidnightDate(task.completed_at || task.completedAt);
    const rawCreated = parseToMidnightDate(task.created_at);

    // 1. Determine Start Date
    let start = rawStart || rawCreated;
    // 2. Determine End Date (Actual completion date for completed tasks!)
    let end: Date | null = null;
    if (isDone) {
      end = rawCompleted || rawDue || todayMidnight;
    } else {
      end = rawDue;
    }

    // Default fallbacks if one or both dates are missing
    if (!start && !end) {
      start = new Date(todayMidnight);
      end = new Date(todayMidnight);
      end.setDate(end.getDate() + 2);
    } else if (!start && end) {
      start = new Date(end);
      start.setDate(start.getDate() - 1);
    } else if (start && !end) {
      end = new Date(start);
      end.setDate(end.getDate() + 2);
    }

    if (end! < start!) {
      end = new Date(start!);
    }

    // Calculate exact day offsets relative to timeline start
    const startDayIndex = calendarDaysBetween(minCal, start!);
    const endDayIndex = calendarDaysBetween(minCal, end!);

    // Clamped indices inside the visible timeline range
    const clampedStartIndex = Math.max(0, Math.min(totalDays - 1, startDayIndex));
    const clampedEndIndex = Math.max(clampedStartIndex, Math.min(totalDays - 1, endDayIndex));

    // INCLUSIVE DAYS: if task starts on 26/10 and ends on 28/10, covered days = (28 - 26) + 1 = 3 days!
    const coveredDays = Math.max(1, clampedEndIndex - clampedStartIndex + 1);

    // In RTL: day 0 is on the right, day N is on the left
    const rightPx = clampedStartIndex * cellWidth + 1;
    const widthPx = Math.max(26, coveredDays * cellWidth - 2);

    const isOverdue = !isDone && rawDue ? todayMidnight > rawDue : false;
    const isFinishedLate = isDone && rawCompleted && rawDue ? rawCompleted > rawDue : false;
    const isFinishedEarly = isDone && rawCompleted && rawDue ? rawCompleted < rawDue : false;

    const startDateStr = `${String(start!.getDate()).padStart(2, '0')}/${String(start!.getMonth() + 1).padStart(2, '0')}`;
    const endDateStr = `${String(end!.getDate()).padStart(2, '0')}/${String(end!.getMonth() + 1).padStart(2, '0')}`;
    const plannedDueStr = rawDue
      ? `${String(rawDue.getDate()).padStart(2, '0')}/${String(rawDue.getMonth() + 1).padStart(2, '0')}`
      : null;

    return {
      rightPx,
      widthPx,
      isDone,
      isOverdue,
      isFinishedLate,
      isFinishedEarly,
      startDateStr,
      endDateStr,
      plannedDueStr,
      durationDays: coveredDays,
      startDayIndex,
      endDayIndex,
    };
  };

  // Grouping tasks
  const groupedSections = useMemo(() => {
    if (groupBy === 'project') {
      return projects.map((p) => ({
        id: `proj-${p.id}`,
        title: p.name,
        color: p.color,
        subtitle: `קוד: ${p.key}`,
        tasks: tasks.filter((t) => (t.project_id || t.projectId) === p.id),
      }));
    } else if (groupBy === 'team') {
      return teams.map((team) => {
        const teamProjectIds = new Set(
          projects.filter((p) => (p.team_id || p.teamId) === team.id).map((p) => p.id)
        );
        return {
          id: `team-${team.id}`,
          title: team.name,
          color: team.color,
          subtitle: `${teamProjectIds.size} פרויקטים`,
          tasks: tasks.filter((t) => teamProjectIds.has(t.project_id || t.projectId)),
        };
      });
    } else {
      return [
        {
          id: 'all',
          title: 'כל המשימות',
          color: 'var(--primary)',
          subtitle: `${tasks.length} משימות בלוח הזמנים`,
          tasks,
        },
      ];
    }
  }, [groupBy, projects, teams, tasks]);

  return (
    <div className="gantt-container">
      {/* Controls Bar */}
      <div className="gantt-controls-bar">
        <div className="gantt-controls-left">
          <span className="gantt-title">לוח גאנט וציר זמן מדויק</span>
          <span className="meta">
            תאריכים מדויקים לפי תאריכי התחלה וסיום בפועל • סה"כ {totalDays} ימים בציר הזמן
          </span>
        </div>

        <div className="gantt-controls-right">
          {/* Quick Jump to Today */}
          <button
            type="button"
            className="btn xs secondary outline"
            onClick={handleScrollToToday}
            title="קפוץ לתאריך של היום בציר הזמן"
            style={{ gap: 5 }}
          >
            <Compass size={13} />
            <span>היום</span>
          </button>

          {/* Zoom Level Switcher */}
          <div className="gantt-zoom-switch">
            {(['compact', 'normal', 'spacious'] as ZoomLevel[]).map((lvl) => (
              <button
                key={lvl}
                type="button"
                className={`zoom-btn ${zoomLevel === lvl ? 'active' : ''}`}
                onClick={() => setZoomLevel(lvl)}
                title={`תצוגה ${ZOOM_CONFIG[lvl].label} (${ZOOM_CONFIG[lvl].width}px ליום)`}
              >
                {ZOOM_CONFIG[lvl].label}
              </button>
            ))}
          </div>

          {/* Grouping Switcher */}
          <div className="gantt-group-switch">
            <span className="group-label">קיבוץ:</span>
            <button
              type="button"
              className={`group-btn ${groupBy === 'project' ? 'active' : ''}`}
              onClick={() => setGroupBy('project')}
            >
              פרויקט
            </button>
            <button
              type="button"
              className={`group-btn ${groupBy === 'team' ? 'active' : ''}`}
              onClick={() => setGroupBy('team')}
            >
              צוות
            </button>
            <button
              type="button"
              className={`group-btn ${groupBy === 'none' ? 'active' : ''}`}
              onClick={() => setGroupBy('none')}
            >
              הכל
            </button>
          </div>
        </div>
      </div>

      {/* Main Gantt Canvas */}
      <div className="gantt-canvas-wrap" ref={canvasRef}>
        <div className="gantt-layout-grid">
          {/* Left fixed table column (Task Names) */}
          <div className="gantt-tasks-sidebar">
            <div className="gantt-header-cell task-sidebar-header">
              <span>משימה ופרטים ({tasks.length})</span>
            </div>

            <div className="gantt-sidebar-body">
              {groupedSections.map((sec) => (
                <div key={sec.id} className="gantt-sidebar-group">
                  <div className="gantt-group-header-row">
                    <span className="group-color-dot" style={{ backgroundColor: sec.color }} />
                    <span className="group-title-text">{sec.title}</span>
                    <span className="group-count-pill">{sec.tasks.length}</span>
                  </div>

                  {sec.tasks.map((task) => {
                    const assignee = users.find((u) => u.id === (task.assignee_id || task.assigneeId));
                    const jira = task.jira_key || task.jiraKey;

                    return (
                      <div
                        key={task.id}
                        className={`gantt-task-row-label ${hoveredTask?.id === task.id ? 'hovered' : ''}`}
                        onClick={() => onOpenTask(task.id)}
                        onMouseEnter={() => setHoveredTask(task)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        <div className="task-row-meta-left">
                          {jira && <span className="jira-key-badge sm">{jira}</span>}
                          <span className="task-title-clamp" title={task.title}>
                            {task.title}
                          </span>
                        </div>

                        <div className="task-row-meta-right">
                          {assignee && <Avatar name={assignee.name} size={20} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Right scrolling precision timeline grid */}
          <div
            className="gantt-timeline-area"
            style={{ width: timelineTotalWidth, minWidth: timelineTotalWidth }}
          >
            {/* Header: Tier 1 Months + Tier 2 Days */}
            <div className="gantt-header-timeline">
              {/* Months Tier */}
              <div className="gantt-header-months-row">
                {monthGroups.map((mg, idx) => (
                  <div
                    key={idx}
                    className="gantt-month-cell"
                    style={{
                      width: mg.daysCount * cellWidth,
                      minWidth: mg.daysCount * cellWidth,
                      flex: `0 0 ${mg.daysCount * cellWidth}px`,
                    }}
                  >
                    <span>{mg.label}</span>
                  </div>
                ))}
              </div>

              {/* Days Tier */}
              <div className="gantt-header-days-row">
                {daysList.map((d) => (
                  <div
                    key={d.index}
                    className={`gantt-day-header ${d.isToday ? 'today' : ''} ${d.isWeekend ? 'weekend' : ''}`}
                    style={{
                      width: cellWidth,
                      minWidth: cellWidth,
                      maxWidth: cellWidth,
                      flex: `0 0 ${cellWidth}px`,
                    }}
                    title={`${d.fullDateStr} (יום ${d.dayName})`}
                  >
                    <span className="day-name">{d.dayName}</span>
                    <span className="day-num">{d.dayNum}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Bars Grid */}
            <div className="gantt-timeline-body" style={{ width: timelineTotalWidth }}>
              {/* Vertical Today Line */}
              {todayIndex >= 0 && todayIndex < totalDays && (
                <div
                  ref={todayMarkerRef}
                  className="gantt-today-line"
                  style={{ right: todayIndex * cellWidth + cellWidth / 2 }}
                  title="היום"
                >
                  <span className="today-line-badge">היום</span>
                </div>
              )}

              {groupedSections.map((sec) => (
                <div key={sec.id} className="gantt-body-group">
                  {/* Empty group header spacing row */}
                  <div
                    className="gantt-group-timeline-spacer"
                    style={{ width: timelineTotalWidth }}
                  />

                  {/* Task Bars */}
                  {sec.tasks.map((task) => {
                    const geom = getTaskBarGeometry(task);
                    const proj = projects.find((p) => p.id === (task.project_id || task.projectId));
                    const isHovered = hoveredTask?.id === task.id;
                    const barColor = proj?.color || 'var(--primary)';
                    const jira = task.jira_key || task.jiraKey;
                    const targetVer = task.target_version || task.targetVersion;

                    const isCompleted = geom.isDone;

                    // Tooltip text
                    let tooltip = `${task.title}\n`;
                    if (isCompleted) {
                      tooltip += `הושלם בפועל: ${geom.endDateStr}`;
                      if (geom.plannedDueStr && geom.plannedDueStr !== geom.endDateStr) {
                        tooltip += ` (יעד מקורי: ${geom.plannedDueStr})`;
                      }
                      tooltip += ` • משך: ${geom.durationDays} ימים`;
                    } else {
                      tooltip += `טווח תאריכים: ${geom.startDateStr} עד ${geom.endDateStr} • משך: ${geom.durationDays} ימים`;
                      if (geom.isOverdue) tooltip += ' [באיחור!]';
                    }

                    return (
                      <div
                        key={task.id}
                        className={`gantt-timeline-task-row ${isHovered ? 'hovered' : ''}`}
                        style={{
                          width: timelineTotalWidth,
                          backgroundSize: `${cellWidth}px 100%`,
                        }}
                        onMouseEnter={() => setHoveredTask(task)}
                        onMouseLeave={() => setHoveredTask(null)}
                      >
                        <div
                          className={`gantt-bar-item ${isCompleted ? 'is-completed' : ''} ${
                            geom.isOverdue ? 'is-overdue' : ''
                          }`}
                          style={{
                            right: geom.rightPx,
                            width: geom.widthPx,
                            backgroundColor: isCompleted
                              ? '#10B981'
                              : geom.isOverdue
                              ? '#EF4444'
                              : barColor,
                          }}
                          onClick={() => onOpenTask(task.id)}
                          title={tooltip}
                        >
                          <div className="bar-inner-content">
                            {isCompleted ? (
                              <CheckCircle2 size={12} className="bar-completed-icon" />
                            ) : geom.isOverdue ? (
                              <AlertTriangle size={12} className="bar-overdue-icon" />
                            ) : null}

                            {jira && <span className="bar-jira-pill">{jira}</span>}
                            <span className="bar-title">{task.title}</span>

                            {targetVer && <span className="bar-version-pill">{targetVer}</span>}

                            {isCompleted ? (
                              <span className="bar-completed-text">הושלם ב-{geom.endDateStr}</span>
                            ) : (
                              <span className="bar-date-range-text">
                                {geom.startDateStr} - {geom.endDateStr} ({geom.durationDays} ימים)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
