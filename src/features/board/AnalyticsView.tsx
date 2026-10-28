import { useMemo } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  Columns,
  FolderKanban,
  Layers,
  Pencil,
  TrendingUp,
  Users,
} from 'lucide-react';
import { he } from '../../i18n/he';
import type { Column, Priority, Project, Task, User } from '../../api/mock';
import { Avatar, diffDays, PriorityBadge, ProgressBar } from '../../components/ui';

interface AnalyticsViewProps {
  tasks: Task[];
  columns: Column[];
  users: User[];
  project: Project;
  onEditProject?: (project: Project) => void;
}

export function AnalyticsView({
  tasks,
  columns,
  users,
  project,
  onEditProject,
}: AnalyticsViewProps) {
  const total = tasks.length;
  const doneColumnId = columns.find((c) => c.name.includes('הושלם') || c.name.toLowerCase().includes('done'))?.id ?? 3;
  const inProgressColumnId = columns.find((c) => c.name.includes('בעבודה') || c.name.toLowerCase().includes('progress'))?.id ?? 2;
  const todoColumnId = columns[0]?.id ?? 1;

  const completed = tasks.filter((t) => (t.column_id || t.columnId) === doneColumnId).length;
  const inProgress = tasks.filter((t) => (t.column_id || t.columnId) === inProgressColumnId).length;
  const todo = tasks.filter((t) => (t.column_id || t.columnId) === todoColumnId).length;
  const overdue = tasks.filter(
    (t) => (t.due_date || t.dueDate) !== null && diffDays((t.due_date || t.dueDate)!) < 0 && (t.column_id || t.columnId) !== doneColumnId
  ).length;

  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const prioCounts = useMemo(() => {
    const res: Record<Priority, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    tasks.forEach((t) => {
      res[t.priority] = (res[t.priority] || 0) + 1;
    });
    return res;
  }, [tasks]);

  const columnStats = useMemo(() => {
    return columns.map((col) => {
      const colTasks = tasks.filter((t) => (t.column_id || t.columnId) === col.id);
      const pct = total > 0 ? Math.round((colTasks.length / total) * 100) : 0;
      return {
        column: col,
        count: colTasks.length,
        pct,
      };
    });
  }, [columns, tasks, total]);

  const userStats = useMemo(() => {
    return users.map((u) => {
      const userTasks = tasks.filter((t) => (t.assignee_id || t.assigneeId) === u.id);
      const userDone = userTasks.filter((t) => (t.column_id || t.columnId) === doneColumnId).length;
      return {
        user: u,
        count: userTasks.length,
        done: userDone,
        pct: userTasks.length > 0 ? Math.round((userDone / userTasks.length) * 100) : 0,
      };
    });
  }, [tasks, users, doneColumnId]);

  return (
    <div className="analytics-view-container">
      {/* Header Banner */}
      <div className="dashboard-header-banner">
        <div className="header-banner-left">
          <span className="project-color-badge" style={{ backgroundColor: project.color, width: 14, height: 14 }} />
          <div>
            <h2>תרשים פרויקט: {project.name} ({project.key})</h2>
            <p className="meta">{project.description}</p>
          </div>
        </div>

        {onEditProject && (
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => onEditProject(project)}
          >
            <Pencil size={13} />
            <span>ערוך פרויקט</span>
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">{he.stats.total}</span>
            <span className="stat-card-icon icon-total">
              <Layers size={18} />
            </span>
          </div>
          <div className="stat-card-value">{total}</div>
          <div className="stat-card-meta">בפרויקט {project.name}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">{he.stats.completed}</span>
            <span className="stat-card-icon icon-done">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="stat-card-value text-success">{completed}</div>
          <div className="stat-card-meta text-success">{completionPct}% הושלמו</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">{he.stats.inProgress}</span>
            <span className="stat-card-icon icon-progress">
              <Clock size={18} />
            </span>
          </div>
          <div className="stat-card-value text-primary">{inProgress}</div>
          <div className="stat-card-meta">{todo} ממתינות לביצוע</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">{he.stats.overdue}</span>
            <span className="stat-card-icon icon-overdue">
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="stat-card-value text-danger">{overdue}</div>
          <div className="stat-card-meta">
            {overdue > 0 ? 'דורש טיפול מיידי' : 'אין משימות באיחור! 🎉'}
          </div>
        </div>
      </div>

      {/* Main Charts & Breakdown */}
      <div className="analytics-panels-grid">
        {/* Dynamic Columns Breakdown */}
        <div className="analytics-panel">
          <div className="panel-header">
            <h3>התפלגות לפי עמודות הפרויקט</h3>
            <span className="meta">{columns.length} עמודות דינמיות</span>
          </div>

          <div className="columns-progress-list">
            {columnStats.map(({ column: col, count, pct }) => (
              <div key={col.id} className="col-bar-row">
                <div className="col-bar-label">
                  <span className="col-dot" style={{ backgroundColor: col.color }} />
                  <span className="col-name">{col.name}</span>
                  <span className="meta">({count})</span>
                </div>
                <div className="col-bar-track">
                  <div
                    className="col-bar-fill"
                    style={{ width: `${pct}%`, backgroundColor: col.color }}
                  />
                </div>
                <span className="col-bar-pct">{pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Distribution */}
        <div className="analytics-panel">
          <div className="panel-header">
            <h3>{he.stats.priorityDist}</h3>
            <span className="meta">פירוט רמות דחיפות</span>
          </div>

          <div className="priority-bars-list">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((p) => {
              const count = prioCounts[p];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={p} className="prio-bar-row">
                  <div className="prio-bar-label">
                    <PriorityBadge priority={p} size="sm" />
                    <span className="prio-bar-count">{count} משימות</span>
                  </div>
                  <div className="prio-bar-track">
                    <div
                      className={`prio-bar-fill prio-fill-${p.toLowerCase()}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="prio-bar-pct">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Team Workload */}
        <div className="analytics-panel full-width">
          <div className="panel-header">
            <h3>עומס עבודה בפרויקט זה</h3>
            <span className="meta">{users.length} חברי צוות</span>
          </div>

          <div className="workload-cards-grid">
            {userStats.map(({ user, count, done, pct }) => (
              <div key={user.id} className="workload-card">
                <div className="workload-card-head">
                  <Avatar name={user.name} size={36} showStatus isOnline={true} />
                  <div>
                    <h4>{user.name}</h4>
                    <span className="meta">{user.role || 'חבר צוות'}</span>
                  </div>
                </div>
                <div className="workload-card-stats">
                  <div className="workload-numbers">
                    <span>{count} משימות פעילות</span>
                    <span className="text-success">{done} הושלמו ({pct}%)</span>
                  </div>
                  <ProgressBar value={done} max={count || 1} height={6} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
