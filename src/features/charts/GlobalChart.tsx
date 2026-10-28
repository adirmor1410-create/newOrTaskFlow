import { useMemo } from 'react';
import {
  BarChart3,
  CheckCircle2,
  FolderKanban,
  Layers,
  Sparkles,
  TrendingUp,
  Users,
  ChevronLeft,
} from 'lucide-react';
import type { Team, Project, Task, Column } from '../../api/mock';
import { ProgressBar } from '../../components/ui';

interface GlobalChartProps {
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  columns: Column[];
  onSelectTeam: (teamId: number) => void;
  onSelectProject: (projectId: number) => void;
}

export function GlobalChart({
  teams,
  projects,
  tasks,
  columns,
  onSelectTeam,
  onSelectProject,
}: GlobalChartProps) {
  const totalTeams = teams.length;
  const totalProjects = projects.length;
  const totalTasks = tasks.length;

  const doneColIds = useMemo(() => {
    return new Set(columns.filter((c) => c.name.includes('הושלם') || c.name.toLowerCase().includes('done')).map((c) => c.id));
  }, [columns]);

  const completedTasks = tasks.filter((t) => doneColIds.has(t.column_id || t.columnId)).length;
  const overallPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Compute stats per team
  const teamsStats = useMemo(() => {
    return teams.map((team) => {
      const teamProjects = projects.filter((p) => (p.team_id || p.teamId) === team.id);
      const teamProjectIds = new Set(teamProjects.map((p) => p.id));
      const teamTasks = tasks.filter((t) => teamProjectIds.has(t.project_id || t.projectId));
      const teamDone = teamTasks.filter((t) => doneColIds.has(t.column_id || t.columnId)).length;
      const teamInProgress = teamTasks.filter((t) => {
        const col = columns.find((c) => c.id === (t.column_id || t.columnId));
        return col && (col.name.includes('בעבודה') || col.name.toLowerCase().includes('progress'));
      }).length;
      const teamTodo = teamTasks.length - teamDone - teamInProgress;
      const pct = teamTasks.length > 0 ? Math.round((teamDone / teamTasks.length) * 100) : 0;

      return {
        team,
        projectsCount: teamProjects.length,
        projects: teamProjects,
        totalTasks: teamTasks.length,
        doneCount: teamDone,
        inProgressCount: teamInProgress,
        todoCount: Math.max(0, teamTodo),
        completionRate: pct,
      };
    });
  }, [teams, projects, tasks, columns, doneColIds]);

  return (
    <div className="analytics-view-container">
      {/* Header Banner */}
      <div className="dashboard-header-banner">
        <div>
          <h2>תרשים כללי - מבט-על ארגוני</h2>
          <p className="meta">סקירה השוואתית בין כלל הצוותים, הפרויקטים והמשימות בארגון</p>
        </div>
      </div>

      {/* High-level KPIs */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">סך כל הצוותים</span>
            <span className="stat-card-icon icon-total">
              <Users size={18} />
            </span>
          </div>
          <div className="stat-card-value text-primary">{totalTeams}</div>
          <div className="stat-card-meta">מחלקות פעילות</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">סך הפרויקטים</span>
            <span className="stat-card-icon icon-progress">
              <FolderKanban size={18} />
            </span>
          </div>
          <div className="stat-card-value">{totalProjects}</div>
          <div className="stat-card-meta">פרויקטים בכל הצוותים</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">סך המשימות</span>
            <span className="stat-card-icon icon-total">
              <Layers size={18} />
            </span>
          </div>
          <div className="stat-card-value">{totalTasks}</div>
          <div className="stat-card-meta">{completedTasks} משימות הושלמו</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">אחוז ביצוע ארגוני</span>
            <span className="stat-card-icon icon-done">
              <TrendingUp size={18} />
            </span>
          </div>
          <div className="stat-card-value text-success">{overallPct}%</div>
          <div className="stat-card-meta">עמידה ביעדים כלל-ארגונית</div>
        </div>
      </div>

      {/* Main Chart: Teams Comparison */}
      <div className="analytics-panel full-width">
        <div className="panel-header">
          <div>
            <h3>תרשים השוואת ביצועים לפי צוותים</h3>
            <span className="meta">התפלגות עומס, כמות פרויקטים וקצב סיום משימות</span>
          </div>
        </div>

        <div className="teams-comparison-list">
          {teamsStats.map(({ team, projectsCount, projects: teamProjs, totalTasks: tCount, doneCount, inProgressCount, todoCount, completionRate }) => (
            <div key={team.id} className="team-comparison-card">
              <div className="team-card-top">
                <div className="team-brand-row">
                  <span className="team-color-pillar" style={{ backgroundColor: team.color }} />
                  <div>
                    <h4 className="team-card-name" onClick={() => onSelectTeam(team.id)}>
                      {team.name}
                    </h4>
                    <span className="meta">{team.description}</span>
                  </div>
                </div>

                <div className="team-card-actions">
                  <span className="team-projects-count-pill">
                    <FolderKanban size={13} />
                    <span>{projectsCount} פרויקטים</span>
                  </span>
                  <button
                    type="button"
                    className="btn secondary sm"
                    onClick={() => onSelectTeam(team.id)}
                  >
                    <span>צפה בתרשים צוות</span>
                    <ChevronLeft size={14} />
                  </button>
                </div>
              </div>

              {/* Progress & Breakdown */}
              <div className="team-card-stats-row">
                <div className="team-kpis-mini">
                  <div className="mini-kpi">
                    <span className="mini-kpi-val">{tCount}</span>
                    <span className="mini-kpi-lbl">משימות</span>
                  </div>
                  <div className="mini-kpi">
                    <span className="mini-kpi-val text-success">{doneCount}</span>
                    <span className="mini-kpi-lbl">הושלמו</span>
                  </div>
                  <div className="mini-kpi">
                    <span className="mini-kpi-val text-primary">{inProgressCount}</span>
                    <span className="mini-kpi-lbl">בעבודה</span>
                  </div>
                  <div className="mini-kpi">
                    <span className="mini-kpi-val text-muted">{todoCount}</span>
                    <span className="mini-kpi-lbl">לביצוע</span>
                  </div>
                </div>

                <div className="team-progress-bar-wrap">
                  <div className="progress-labels-row">
                    <span className="progress-pct-num">{completionRate}% הושלמו</span>
                    <span className="meta">{doneCount}/{tCount} משימות</span>
                  </div>
                  <div className="segmented-progress-bar">
                    <div
                      className="seg-bar seg-done"
                      style={{ width: `${(doneCount / (tCount || 1)) * 100}%` }}
                      title={`הושלם: ${doneCount}`}
                    />
                    <div
                      className="seg-bar seg-prog"
                      style={{ width: `${(inProgressCount / (tCount || 1)) * 100}%` }}
                      title={`בעבודה: ${inProgressCount}`}
                    />
                    <div
                      className="seg-bar seg-todo"
                      style={{ width: `${(todoCount / (tCount || 1)) * 100}%` }}
                      title={`לביצוע: ${todoCount}`}
                    />
                  </div>
                </div>
              </div>

              {/* Projects in this team tags */}
              {teamProjs.length > 0 && (
                <div className="team-sub-projects-chips">
                  <span className="chips-label">פרויקטים:</span>
                  {teamProjs.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="project-jump-chip"
                      onClick={() => onSelectProject(p.id)}
                      title={`מעבר לפרויקט ${p.name}`}
                    >
                      <span className="project-dot" style={{ backgroundColor: p.color }} />
                      <span>{p.name} ({p.key})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
