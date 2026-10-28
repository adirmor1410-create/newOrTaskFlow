import { useState, useMemo } from 'react';
import {
  Calendar,
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pencil,
  Plus,
  ChevronLeft,
  Users,
  Layers,
} from 'lucide-react';
import type { Team, Project, Task, Column, User, Priority, ProjectVersion } from '../../api/mock';
import { Avatar, diffDays, PriorityBadge, ProgressBar } from '../../components/ui';
import { GanttChart } from '../../components/GanttChart';
import { TaskDrawer } from '../tasks/TaskDrawer';

interface TeamChartProps {
  team: Team;
  projects: Project[];
  tasks: Task[];
  columns: Column[];
  users: User[];
  currentUserId?: number;
  versions?: ProjectVersion[];
  onCreateVersion?: (name: string, releaseDate?: string) => ProjectVersion;
  onOpenVersionManager?: () => void;
  onSelectProject: (projectId: number) => void;
  onEditTeam: (team: Team) => void;
  onAddProject: (teamId: number) => void;
  onUpdateTask?: (id: number, patch: Partial<Task>) => void;
  onDeleteTask?: (id: number) => void;
}

export function TeamChart({
  team,
  projects,
  tasks,
  columns,
  users,
  currentUserId,
  versions = [],
  onCreateVersion,
  onOpenVersionManager,
  onSelectProject,
  onEditTeam,
  onAddProject,
  onUpdateTask,
  onDeleteTask,
}: TeamChartProps) {
  const [teamTab, setTeamTab] = useState<'overview' | 'gantt'>('overview');
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  // Projects of this team
  const teamProjects = useMemo(() => {
    return projects.filter((p) => (p.team_id || p.teamId) === team.id);
  }, [projects, team.id]);

  const teamProjectIds = useMemo(() => new Set(teamProjects.map((p) => p.id)), [teamProjects]);

  // Tasks belonging to this team's projects
  const teamTasks = useMemo(() => {
    return tasks.filter((t) => teamProjectIds.has(t.project_id || t.projectId));
  }, [tasks, teamProjectIds]);

  const doneColIds = useMemo(() => {
    return new Set(
      columns
        .filter((c) => c.name.includes('הושלם') || c.name.toLowerCase().includes('done'))
        .map((c) => c.id)
    );
  }, [columns]);

  const totalTasks = teamTasks.length;
  const completedTasks = teamTasks.filter((t) => doneColIds.has(t.column_id || t.columnId)).length;
  const overdueTasks = teamTasks.filter(
    (t) =>
      (t.due_date || t.dueDate) !== null &&
      diffDays((t.due_date || t.dueDate)!) < 0 &&
      !doneColIds.has(t.column_id || t.columnId)
  ).length;

  const completionPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Stats per project in this team
  const projectStats = useMemo(() => {
    return teamProjects.map((p) => {
      const pTasks = teamTasks.filter((t) => (t.project_id || t.projectId) === p.id);
      const pDone = pTasks.filter((t) => doneColIds.has(t.column_id || t.columnId)).length;
      const pInProgress = pTasks.filter((t) => {
        const col = columns.find((c) => c.id === (t.column_id || t.columnId));
        return col && (col.name.includes('בעבודה') || col.name.toLowerCase().includes('progress'));
      }).length;
      const pTodo = Math.max(0, pTasks.length - pDone - pInProgress);
      const pct = pTasks.length > 0 ? Math.round((pDone / pTasks.length) * 100) : 0;

      return {
        project: p,
        total: pTasks.length,
        done: pDone,
        inProgress: pInProgress,
        todo: pTodo,
        pct,
      };
    });
  }, [teamProjects, teamTasks, columns, doneColIds]);

  // Team Workload
  const memberWorkload = useMemo(() => {
    // Current team members OR users who have tasks in this team
    const relevantUsers = users.filter(
      (u) => team.member_user_ids.includes(u.id) || teamTasks.some((t) => (t.assignee_id || t.assigneeId) === u.id)
    );
    return relevantUsers.map((u) => {
      const isCurrentMember = team.member_user_ids.includes(u.id);
      const uTasks = teamTasks.filter((t) => (t.assignee_id || t.assigneeId) === u.id);
      const uDone = uTasks.filter((t) => doneColIds.has(t.column_id || t.columnId)).length;
      return {
        user: u,
        isCurrentMember,
        total: uTasks.length,
        done: uDone,
        pct: uTasks.length > 0 ? Math.round((uDone / uTasks.length) * 100) : 0,
      };
    });
  }, [team.member_user_ids, users, teamTasks, doneColIds]);

  return (
    <div className="analytics-view-container">
      {/* Header Banner with actions */}
      <div className="dashboard-header-banner">
        <div className="header-banner-left">
          <span className="team-avatar-big" style={{ backgroundColor: team.color }}>
            <Users size={22} color="#FFF" />
          </span>
          <div>
            <h2>תרשים צוות: {team.name}</h2>
            <p className="meta">{team.description}</p>
          </div>
        </div>

        <div className="header-banner-actions">
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => onEditTeam(team)}
          >
            <Pencil size={13} />
            <span>ערוך פרטי צוות</span>
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => onAddProject(team.id)}
          >
            <Plus size={14} />
            <span>הוסף פרויקט לצוות</span>
          </button>
        </div>
      </div>

      {/* Team Tabs Switcher */}
      <div className="view-mode-tabs" role="tablist" style={{ marginBottom: 18 }}>
        <button
          type="button"
          role="tab"
          aria-selected={teamTab === 'overview'}
          className={`view-tab-btn ${teamTab === 'overview' ? 'active' : ''}`}
          onClick={() => setTeamTab('overview')}
        >
          <FolderKanban size={15} />
          <span>סקירת צוות ופרויקטים</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={teamTab === 'gantt'}
          className={`view-tab-btn ${teamTab === 'gantt' ? 'active' : ''}`}
          onClick={() => setTeamTab('gantt')}
        >
          <Calendar size={15} />
          <span>תרשים גאנט לצוות (Team Gantt)</span>
        </button>
      </div>

      {teamTab === 'gantt' ? (
        <GanttChart
          tasks={teamTasks}
          projects={teamProjects}
          teams={[team]}
          users={users}
          columns={columns}
          onOpenTask={(id) => setOpenTaskId(id)}
          defaultGroupBy="project"
        />
      ) : (
        <>
          {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">פרויקטים בצוות</span>
            <span className="stat-card-icon icon-progress">
              <FolderKanban size={18} />
            </span>
          </div>
          <div className="stat-card-value text-primary">{teamProjects.length}</div>
          <div className="stat-card-meta">פרויקטים פעילים תחת הצוות</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">סך כל המשימות</span>
            <span className="stat-card-icon icon-total">
              <Layers size={18} />
            </span>
          </div>
          <div className="stat-card-value">{totalTasks}</div>
          <div className="stat-card-meta">בכל הפרויקטים של הצוות</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">משימות שהושלמו</span>
            <span className="stat-card-icon icon-done">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="stat-card-value text-success">{completedTasks}</div>
          <div className="stat-card-meta text-success">{completionPct}% הושלמו</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">משימות באיחור</span>
            <span className="stat-card-icon icon-overdue">
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="stat-card-value text-danger">{overdueTasks}</div>
          <div className="stat-card-meta">
            {overdueTasks > 0 ? 'דורש מעקב' : 'אין משימות באיחור 🎉'}
          </div>
        </div>
      </div>

      {/* Main Section: Projects Comparison in this Team */}
      <div className="analytics-panel full-width">
        <div className="panel-header">
          <div>
            <h3>תרשים פרויקטים בצוות זה</h3>
            <span className="meta">התקדמות וביצועים של כל פרויקט המשויך לצוות</span>
          </div>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => onAddProject(team.id)}
          >
            <Plus size={13} />
            <span>פרויקט חדש</span>
          </button>
        </div>

        {teamProjects.length === 0 ? (
          <div className="empty-panel-box">
            <FolderKanban size={32} className="text-muted" />
            <p>עדיין לא שויכו פרויקטים לצוות זה.</p>
            <button
              type="button"
              className="btn primary sm"
              onClick={() => onAddProject(team.id)}
            >
              הוסף את הפרויקט הראשון לצוות
            </button>
          </div>
        ) : (
          <div className="team-projects-chart-list">
            {projectStats.map(({ project: p, total, done, inProgress, todo, pct }) => (
              <div key={p.id} className="team-project-progress-card">
                <div className="project-card-header">
                  <div className="project-brand-meta">
                    <span className="project-color-badge" style={{ backgroundColor: p.color }} />
                    <span className="project-name-bold">{p.name}</span>
                    <span className="project-key-tag">{p.key}</span>
                  </div>

                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => onSelectProject(p.id)}
                  >
                    <span>פתח לוח פרויקט</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>

                <p className="project-card-desc">{p.description}</p>

                <div className="project-progress-details">
                  <div className="progress-labels-row">
                    <span className="progress-pct-num">{pct}% הושלמו</span>
                    <span className="meta">
                      {done} מתוך {total} משימות
                    </span>
                  </div>

                  <div className="segmented-progress-bar">
                    <div
                      className="seg-bar seg-done"
                      style={{ width: `${(done / (total || 1)) * 100}%` }}
                      title={`הושלם: ${done}`}
                    />
                    <div
                      className="seg-bar seg-prog"
                      style={{ width: `${(inProgress / (total || 1)) * 100}%` }}
                      title={`בעבודה: ${inProgress}`}
                    />
                    <div
                      className="seg-bar seg-todo"
                      style={{ width: `${(todo / (total || 1)) * 100}%` }}
                      title={`לביצוע: ${todo}`}
                    />
                  </div>

                  <div className="seg-legend">
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: 'var(--success)' }} />
                      <span>הושלם ({done})</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: 'var(--primary)' }} />
                      <span>בעבודה ({inProgress})</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot" style={{ backgroundColor: 'var(--p-low)' }} />
                      <span>לביצוע ({todo})</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Team Member Workload */}
      <div className="analytics-panel full-width">
        <div className="panel-header">
          <h3>חלוקת עומס בין עובדי הצוות</h3>
          <span className="meta">משימות פעילות בפרויקטי הצוות</span>
        </div>

        <div className="workload-cards-grid">
          {memberWorkload.map(({ user, isCurrentMember, total: uTotal, done: uDone, pct }) => (
            <div key={user.id} className="workload-card">
              <div className="workload-card-head">
                <Avatar name={user.name} size={36} showStatus isOnline={user.is_active !== false && user.isActive !== false} />
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <h4>{user.name}</h4>
                    {!isCurrentMember && (
                      <span className="former-member-badge" title="העובד הועבר לצוות אחר - משימות העבר נשמרו בצוות זה כמבוקש">
                        משימות שמורות
                      </span>
                    )}
                  </div>
                  <span className="meta">{user.roleLabel || user.role || user.username}</span>
                </div>
              </div>
              <div className="workload-card-stats">
                <div className="workload-numbers">
                  <span>{uTotal} משימות</span>
                  <span className="text-success">{uDone} הושלמו ({pct}%)</span>
                </div>
                <ProgressBar value={uDone} max={uTotal || 1} height={6} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )}

  {/* In-place Task Details Drawer when task clicked in Team Gantt */}
  {openTaskId && (() => {
    const openTask = tasks.find((t) => t.id === openTaskId);
    if (!openTask) return null;
    const openTaskProject = projects.find((p) => p.id === (openTask.project_id || openTask.projectId));
    return (
      <TaskDrawer
        task={openTask}
        project={openTaskProject}
        projects={projects}
        teams={[team]}
        columns={columns}
        users={users}
        currentUserId={currentUserId}
        versions={versions}
        onCreateVersion={onCreateVersion}
        onOpenVersionManager={onOpenVersionManager}
        onChange={(patch) => onUpdateTask?.(openTask.id, patch)}
        onDelete={(taskId) => {
          onDeleteTask?.(taskId);
          setOpenTaskId(null);
        }}
        onClose={() => setOpenTaskId(null)}
      />
    );
  })()}
</div>
  );
}
