import { useState, useMemo } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckSquare,
  FolderKanban,
  LayoutGrid,
  List,
  Milestone,
  RotateCcw,
  Search,
  Sparkles,
  TrendingUp,
  User as UserIcon,
  X,
} from 'lucide-react';
import { he } from '../../i18n/he';
import {
  ME,
  tags as allTags,
  type Team,
  type Project,
  type Task,
  type Column,
  type User,
  type Tag,
  type Priority,
  type ProjectVersion,
} from '../../api/mock';
import { Avatar, diffDays, PriorityBadge } from '../../components/ui';
import { GlobalChart } from './GlobalChart';
import { GanttChart } from '../../components/GanttChart';
import { ListView } from '../board/ListView';
import { Column as KanbanColumn } from '../board/Column';
import { TaskCard, CardOverlay } from '../board/TaskCard';
import { TaskDrawer } from '../tasks/TaskDrawer';
import { FilterChecklistMenu } from '../../components/FilterChecklistMenu';

type GlobalTabMode = 'chart' | 'board' | 'list' | 'gantt';

interface GlobalDashboardViewProps {
  teams: Team[];
  projects: Project[];
  tasks: Task[];
  columns: Column[];
  users: User[];
  tags?: Tag[];
  currentUserId?: number;
  versions?: ProjectVersion[];
  onCreateVersion?: (name: string, releaseDate?: string) => ProjectVersion;
  onOpenVersionManager?: () => void;
  onSelectTeam: (teamId: number) => void;
  onSelectProject: (projectId: number) => void;
  onUpdateTask: (id: number, patch: Partial<Task>) => void;
  onDeleteTask: (id: number) => void;
  onAddTask: (columnId: number, title: string, extra?: Partial<Task>) => void;
}

export function GlobalDashboardView({
  teams,
  projects,
  tasks,
  columns,
  users,
  tags = allTags,
  currentUserId,
  versions = [],
  onCreateVersion,
  onOpenVersionManager,
  onSelectTeam,
  onSelectProject,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
}: GlobalDashboardViewProps) {
  const [globalTab, setGlobalTab] = useState<GlobalTabMode>('board');
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);

  // Filters State for Global View
  const [localSearch, setLocalSearch] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<(number | 'unassigned')[]>([]);
  const [selectedColumnIds, setSelectedColumnIds] = useState<number[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [hasSubtasksOnly, setHasSubtasksOnly] = useState(false);

  // Generic global columns for the organization board view (6 standard stages matching default columns)
  const globalStageColumns: Column[] = [
    { id: 1, project_id: 0, projectId: 0, name: 'לביצוע', color: '#64748B', sort_order: 1, version: 1 },
    { id: 2, project_id: 0, projectId: 0, name: 'בדיקות קוואס', color: '#3B82F6', sort_order: 2, version: 1 },
    { id: 3, project_id: 0, projectId: 0, name: 'בדיקות שילובים', color: '#8B5CF6', sort_order: 3, version: 1 },
    { id: 4, project_id: 0, projectId: 0, name: 'הושלם', color: '#10B981', sort_order: 4, version: 1 },
    { id: 5, project_id: 0, projectId: 0, name: 'תקלה', color: '#EF4444', sort_order: 5, version: 1 },
    { id: 6, project_id: 0, projectId: 0, name: 'בוטל', color: '#94A3B8', sort_order: 6, version: 1 },
  ];

  // Map tasks into generic stages for global board
  const getMappedStageId = (task: Task) => {
    const colId = task.column_id || task.columnId;
    const col = columns.find((c) => c.id === colId);
    if (!col) return 1;
    const name = col.name.toLowerCase();

    // 1. Keyword-based matching
    if (name.includes('בוטל') || name.includes('cancel')) {
      return 6;
    }
    if (name.includes('תקלה') || name.includes('bug') || name.includes('defect') || name.includes('שגיאה') || name.includes('error')) {
      return 5;
    }
    if (
      name.includes('הושלם') ||
      name.includes('done') ||
      name.includes('deployed') ||
      name.includes('סיום') ||
      name.includes('אושר') ||
      name.includes('סגור')
    ) {
      return 4;
    }
    if (name.includes('שילוב') || name.includes('אינטגרציה') || name.includes('integration')) {
      return 3;
    }
    if (
      name.includes('קוואס') ||
      name.includes('qa') ||
      name.includes('בדיקה') ||
      name.includes('review') ||
      name.includes('אימות') ||
      name.includes('טסט') ||
      name.includes('בעבודה') ||
      name.includes('progress') ||
      name.includes('פיתוח') ||
      name.includes('מחקר')
    ) {
      return 2;
    }
    if (
      name.includes('לביצוע') ||
      name.includes('todo') ||
      name.includes('פתוח') ||
      name.includes('רעיונות') ||
      name.includes('backlog')
    ) {
      return 1;
    }

    // 2. Positional fallback based on column index within its project
    const projId = task.project_id || task.projectId;
    const projCols = columns
      .filter((c) => (c.project_id || c.projectId) === projId)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (projCols.length > 0) {
      const idx = projCols.findIndex((c) => c.id === colId);
      if (idx >= 0 && idx < 6 && projCols.length === 6) {
        return idx + 1;
      }
      if (idx === 0) return 1;
      if (idx === projCols.length - 1 && projCols.length > 1) return 4;
      if (projCols.length === 3) {
        return idx === 1 ? 2 : 4;
      }
      if (projCols.length >= 4) {
        const ratio = idx / (projCols.length - 1);
        if (ratio <= 0.2) return 1;
        if (ratio <= 0.4) return 2;
        if (ratio <= 0.6) return 3;
        if (ratio <= 0.8) return 4;
        return 5;
      }
    }

    return 1;
  };

  const dummyProject: Project = {
    id: 0,
    team_id: 0,
    teamId: 0,
    name: 'כלל הארגון',
    key: 'ORG',
    description: 'כל הפרויקטים והמשימות בארגון',
    color: 'var(--primary)',
    created_by: 1,
    created_at: '',
    updated_at: '',
    is_archived: 0,
    sort_order: 0,
    version: 1,
  };

  // Filter toggles
  const togglePriority = (p: Priority) => {
    setSelectedPriorities((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const toggleAssignee = (id: number | 'unassigned') => {
    setSelectedAssigneeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleColumn = (colId: number) => {
    setSelectedColumnIds((prev) =>
      prev.includes(colId) ? prev.filter((item) => item !== colId) : [...prev, colId]
    );
  };

  const toggleVersion = (ver: string) => {
    setSelectedVersions((prev) =>
      prev.includes(ver) ? prev.filter((item) => item !== ver) : [...prev, ver]
    );
  };

  const clearAllFilters = () => {
    setLocalSearch('');
    setSelectedPriorities([]);
    setSelectedAssigneeIds([]);
    setSelectedColumnIds([]);
    setSelectedVersions([]);
    setMineOnly(false);
    setOverdueOnly(false);
    setHasSubtasksOnly(false);
  };

  const query = localSearch.trim().toLowerCase();

  // Filtered tasks across the entire organization
  const visibleTasks = useMemo(() => {
    return tasks.filter((t) => {
      // 1. Text Search (title, description, jira_key, project name)
      if (query) {
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description.toLowerCase().includes(query);
        const matchesJira = (t.jira_key || t.jiraKey || '').toLowerCase().includes(query);
        const proj = projects.find((p) => p.id === (t.project_id || t.projectId));
        const matchesProj = proj ? proj.name.toLowerCase().includes(query) || proj.key.toLowerCase().includes(query) : false;
        if (!matchesTitle && !matchesDesc && !matchesJira && !matchesProj) return false;
      }

      // 2. Priority Checklist
      if (selectedPriorities.length > 0 && !selectedPriorities.includes(t.priority)) {
        return false;
      }

      // 3. Assignee Checklist (supports specific users, unassigned & minions)
      const taskAssigneeId = t.assignee_id !== undefined ? t.assignee_id : t.assigneeId;
      const taskMinionIds = t.minion_ids || t.minionIds || [];
      const activeUid = currentUserId ?? ME;
      if (mineOnly && taskAssigneeId !== activeUid && !taskMinionIds.includes(activeUid)) {
        return false;
      }
      if (selectedAssigneeIds.length > 0) {
        const matchesAssignee = selectedAssigneeIds.some((uid) => {
          if (uid === 'unassigned') return taskAssigneeId === null;
          return taskAssigneeId === uid || taskMinionIds.includes(uid as number);
        });
        if (!matchesAssignee) return false;
      }

      // 4. Column / Status Checklist
      const taskColId = t.column_id || t.columnId;
      if (selectedColumnIds.length > 0 && !selectedColumnIds.includes(taskColId)) {
        return false;
      }

      // 5. Target Versions Checklist
      if (selectedVersions.length > 0) {
        const taskVer = (t.target_version || t.targetVersion)?.trim();
        if (!taskVer || !selectedVersions.includes(taskVer)) return false;
      }

      // 6. Overdue
      if (overdueOnly) {
        const dueDate = t.due_date || t.dueDate;
        const isOverdue = dueDate !== null && diffDays(dueDate) < 0;
        if (!isOverdue) return false;
      }

      // 7. Subtasks
      if (hasSubtasksOnly && (!t.subtasks || t.subtasks.length === 0)) {
        return false;
      }

      return true;
    });
  }, [
    tasks,
    query,
    projects,
    selectedPriorities,
    selectedAssigneeIds,
    selectedColumnIds,
    selectedVersions,
    mineOnly,
    overdueOnly,
    hasSubtasksOnly,
  ]);

  const hasActiveFilters = Boolean(
    query ||
      selectedPriorities.length > 0 ||
      selectedAssigneeIds.length > 0 ||
      selectedColumnIds.length > 0 ||
      selectedVersions.length > 0 ||
      mineOnly ||
      overdueOnly ||
      hasSubtasksOnly
  );

  // Drag and Drop state & sensors for Global Board
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setDraggedTaskId(Number(e.active.id));
  };

  const handleDragCancel = () => {
    setDraggedTaskId(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedTaskId(null);
    if (!over) return;

    const targetStageId = Number(over.id);
    const taskId = Number(active.id);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const projId = task.project_id || task.projectId;
    const projCols = columns
      .filter((c) => (c.project_id || c.projectId) === projId)
      .sort((a, b) => a.sort_order - b.sort_order);

    let targetCol: Column | undefined;
    if (projCols.length > 0) {
      if (targetStageId === 6) {
        targetCol =
          projCols.find((c) => {
            const n = c.name.toLowerCase();
            return n.includes('בוטל') || n.includes('cancel');
          }) || projCols[projCols.length - 1];
      } else if (targetStageId === 5) {
        targetCol =
          projCols.find((c) => {
            const n = c.name.toLowerCase();
            return (
              n.includes('תקלה') ||
              n.includes('bug') ||
              n.includes('defect') ||
              n.includes('שגיאה')
            );
          }) || (projCols.length >= 5 ? projCols[4] : projCols[projCols.length - 1]);
      } else if (targetStageId === 4) {
        targetCol =
          projCols.find((c) => {
            const n = c.name.toLowerCase();
            return (
              n.includes('הושלם') ||
              n.includes('done') ||
              n.includes('סיום') ||
              n.includes('אושר') ||
              n.includes('סגור') ||
              n.includes('deployed')
            );
          }) || (projCols.length >= 4 ? projCols[3] : projCols[projCols.length - 1]);
      } else if (targetStageId === 3) {
        targetCol =
          projCols.find((c) => {
            const n = c.name.toLowerCase();
            return (
              n.includes('שילוב') ||
              n.includes('אינטגרציה') ||
              n.includes('integration')
            );
          }) || (projCols.length >= 3 ? projCols[2] : projCols[0]);
      } else if (targetStageId === 2) {
        targetCol =
          projCols.find((c) => {
            const n = c.name.toLowerCase();
            return (
              n.includes('קוואס') ||
              n.includes('qa') ||
              n.includes('בדיקה') ||
              n.includes('review') ||
              n.includes('בעבודה') ||
              n.includes('progress')
            );
          }) || (projCols.length > 1 ? projCols[1] : projCols[0]);
      } else {
        // targetStageId === 1 (Todo / לביצוע)
        targetCol =
          projCols.find((c) => {
            const n = c.name.toLowerCase();
            return (
              n.includes('לביצוע') ||
              n.includes('todo') ||
              n.includes('פתוח') ||
              n.includes('רעיונות') ||
              n.includes('backlog')
            );
          }) || projCols[0];
      }
    }

    const finalColId = targetCol ? targetCol.id : targetStageId;
    onUpdateTask(taskId, { column_id: finalColId, columnId: finalColId });
  };

  // Lookups for open task details drawer & drag overlay
  const openTask = tasks.find((t) => t.id === openTaskId);
  const draggedTask = tasks.find((t) => t.id === draggedTaskId);
  const openTaskProject = openTask
    ? projects.find((p) => p.id === (openTask.project_id || openTask.projectId)) || dummyProject
    : dummyProject;
  const openTaskProjectColumns = openTask
    ? columns.filter((c) => (c.project_id || c.projectId) === (openTask.project_id || openTask.projectId))
    : columns;

  return (
    <div className="global-dashboard-container">
      {/* Top Header & Tabs Switcher */}
      <div className="global-view-tabs-row">
        <div className="view-mode-tabs" role="tablist" aria-label="תצוגות ארגוניות">
          <button
            type="button"
            role="tab"
            aria-selected={globalTab === 'board'}
            className={`view-tab-btn ${globalTab === 'board' ? 'active' : ''}`}
            onClick={() => setGlobalTab('board')}
          >
            <LayoutGrid size={15} />
            <span>לוח כללי (Board)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={globalTab === 'list'}
            className={`view-tab-btn ${globalTab === 'list' ? 'active' : ''}`}
            onClick={() => setGlobalTab('list')}
          >
            <List size={15} />
            <span>רשימה כללית (List)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={globalTab === 'gantt'}
            className={`view-tab-btn ${globalTab === 'gantt' ? 'active' : ''}`}
            onClick={() => setGlobalTab('gantt')}
          >
            <Calendar size={15} />
            <span>גאנט ארגוני (Gantt)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={globalTab === 'chart'}
            className={`view-tab-btn ${globalTab === 'chart' ? 'active' : ''}`}
            onClick={() => setGlobalTab('chart')}
          >
            <BarChart3 size={15} />
            <span>תרשים כללי (Analytics)</span>
          </button>
        </div>
      </div>

      {/* Global Filters Toolbar (for Board, List, Gantt) */}
      {globalTab !== 'chart' && (
        <div className="filters-toolbar" role="search" style={{ marginTop: 4 }}>
          <div className="filters-toolbar-main">
            {/* Search Input */}
            <div className="filter-item-search">
              <Search size={14} className="filter-search-icon" aria-hidden />
              <input
                className="filter-search-input"
                dir="auto"
                placeholder="חיפוש משימות בכלל הארגון (כותרת, תיאור, Jira, פרויקט)..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
              {localSearch && (
                <button
                  type="button"
                  className="filter-clear-icon-btn"
                  onClick={() => setLocalSearch('')}
                  title="נקה חיפוש"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Checklist Filter Menu */}
            <FilterChecklistMenu
              tasks={tasks}
              columns={columns}
              users={users}
              tags={tags}
              filterState={{
                priorities: selectedPriorities,
                assigneeIds: selectedAssigneeIds,
                columnIds: selectedColumnIds,
                versions: selectedVersions,
                mineOnly,
                overdueOnly,
                hasSubtasksOnly,
              }}
              onTogglePriority={togglePriority}
              onToggleAssignee={toggleAssignee}
              onToggleColumn={toggleColumn}
              onToggleVersion={toggleVersion}
              onToggleMineOnly={() => setMineOnly((prev) => !prev)}
              onToggleOverdueOnly={() => setOverdueOnly((prev) => !prev)}
              onToggleHasSubtasksOnly={() => setHasSubtasksOnly((prev) => !prev)}
              onClearAll={clearAllFilters}
            />

            {/* Version Management Trigger */}
            {onOpenVersionManager && (
              <button
                type="button"
                className="btn-filter-checklist"
                onClick={onOpenVersionManager}
                title="ניהול גרסאות ותאריכי שחרור"
              >
                <Milestone size={14} />
                <span>גרסאות ({versions.length})</span>
              </button>
            )}

            {/* Counter and clear button */}
            <div className="filters-end-group">
              {hasActiveFilters && (
                <button
                  type="button"
                  className="btn-clear-filters"
                  onClick={clearAllFilters}
                  title="איפוס מסננים"
                >
                  <RotateCcw size={13} />
                  <span>איפוס</span>
                </button>
              )}

              <span className="filters-count-indicator">
                {he.filters.showing} <strong>{visibleTasks.length}</strong> {he.filters.outOf}{' '}
                {tasks.length} {he.filters.tasks}
              </span>
            </div>
          </div>

          {/* Active Filter Tags Row (Shown only when selections are made) */}
          {hasActiveFilters && (
            <div className="active-filter-pills-row">
              <span className="active-pills-label">מסננים נבחרים:</span>

              {selectedPriorities.map((p) => (
                <button
                  key={p}
                  type="button"
                  className="active-pill"
                  onClick={() => togglePriority(p)}
                  title="הסר מסנן עדיפות"
                >
                  <PriorityBadge priority={p} size="sm" showLabel={false} />
                  <span>{he.priority[p]}</span>
                  <X size={12} className="pill-x-icon" />
                </button>
              ))}

              {selectedAssigneeIds.map((uid) => {
                const u = users.find((usr) => usr.id === uid);
                const name =
                  uid === 'unassigned'
                    ? 'ללא שיוך'
                    : (u?.display_name && u.display_name !== u.computer_username && u.display_name !== u.computerUsername)
                    ? u.display_name
                    : (u?.name && u.name !== u.computer_username && u.name !== u.computerUsername)
                    ? u.name
                    : (u?.computer_username === 'adir7' || u?.computerUsername === 'adir7' || u?.username === 'adir7')
                    ? 'אדיר מור'
                    : u?.display_name || u?.name || `עובד ${uid}`;
                return (
                  <button
                    key={uid}
                    type="button"
                    className="active-pill"
                    onClick={() => toggleAssignee(uid)}
                    title="הסר מסנן אחראי"
                  >
                    <Avatar name={name} size={18} />
                    <span>{name}</span>
                    <X size={12} className="pill-x-icon" />
                  </button>
                );
              })}

              {selectedColumnIds.map((cid) => {
                const col = columns.find((c) => c.id === cid);
                return (
                  <button
                    key={cid}
                    type="button"
                    className="active-pill"
                    onClick={() => toggleColumn(cid)}
                    title="הסר מסנן סטטוס"
                  >
                    <span className="status-dot" style={{ backgroundColor: col?.color || '#888' }} />
                    <span>{col?.name || `סטטוס ${cid}`}</span>
                    <X size={12} className="pill-x-icon" />
                  </button>
                );
              })}

              {selectedVersions.map((v) => (
                <button
                  key={v}
                  type="button"
                  className="active-pill"
                  onClick={() => toggleVersion(v)}
                  title="הסר מסנן גרסה"
                >
                  <Milestone size={12} />
                  <span>{v}</span>
                  <X size={12} className="pill-x-icon" />
                </button>
              ))}

              {mineOnly && (
                <button
                  type="button"
                  className="active-pill"
                  onClick={() => setMineOnly(false)}
                  title="הסר מסנן משימות שלי"
                >
                  <UserIcon size={12} />
                  <span>שלי בלבד</span>
                  <X size={12} className="pill-x-icon" />
                </button>
              )}

              {overdueOnly && (
                <button
                  type="button"
                  className="active-pill"
                  onClick={() => setOverdueOnly(false)}
                  title="הסר מסנן באיחור"
                >
                  <AlertTriangle size={12} className="text-danger" />
                  <span>באיחור</span>
                  <X size={12} className="pill-x-icon" />
                </button>
              )}

              {hasSubtasksOnly && (
                <button
                  type="button"
                  className="active-pill"
                  onClick={() => setHasSubtasksOnly(false)}
                  title="הסר מסנן תת-משימות"
                >
                  <CheckSquare size={12} />
                  <span>עם תת-משימות</span>
                  <X size={12} className="pill-x-icon" />
                </button>
              )}

              <button
                type="button"
                className="btn-clear-active-pills"
                onClick={clearAllFilters}
              >
                <RotateCcw size={11} />
                <span>נקה הכל</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 1. Global Kanban Board */}
      {globalTab === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="kanban-board-canvas" style={{ marginTop: 12 }}>
            {globalStageColumns.map((col) => {
              const colTasks = visibleTasks.filter((t) => getMappedStageId(t) === col.id);
              return (
                <KanbanColumn
                  key={col.id}
                  col={col}
                  count={colTasks.length}
                  onAdd={(title) => {
                    const firstColId = columns[0]?.id || 1;
                    onAddTask(firstColId, title);
                  }}
                >
                  {colTasks.map((t) => {
                    const proj = projects.find((p) => p.id === (t.project_id || t.projectId)) || dummyProject;
                    const assignee = users.find((u) => u.id === (t.assignee_id || t.assigneeId));
                    const taskMinions = users.filter((u) => (t.minion_ids || t.minionIds || []).includes(u.id));
                    return (
                      <TaskCard
                        key={t.id}
                        task={t}
                        project={proj}
                        assignee={assignee}
                        minions={taskMinions}
                        onOpen={() => setOpenTaskId(t.id)}
                      />
                    );
                  })}
                </KanbanColumn>
              );
            })}
          </div>

          <DragOverlay>
            {draggedTask ? (
              <CardOverlay
                task={draggedTask}
                project={projects.find((p) => p.id === (draggedTask.project_id || draggedTask.projectId)) || dummyProject}
                assignee={users.find((u) => u.id === (draggedTask.assignee_id || draggedTask.assigneeId))}
                minions={users.filter((u) => (draggedTask.minion_ids || draggedTask.minionIds || []).includes(u.id))}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* 2. Global List View */}
      {globalTab === 'list' && (
        <ListView
          tasks={visibleTasks}
          columns={columns}
          users={users}
          tags={tags}
          project={dummyProject}
          onOpenTask={(id) => setOpenTaskId(id)}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onAddTask={onAddTask}
        />
      )}

      {/* 3. Global Gantt View */}
      {globalTab === 'gantt' && (
        <GanttChart
          tasks={visibleTasks}
          projects={projects}
          teams={teams}
          users={users}
          columns={columns}
          onOpenTask={(id) => setOpenTaskId(id)}
        />
      )}

      {/* 4. Global Chart */}
      {globalTab === 'chart' && (
        <GlobalChart
          teams={teams}
          projects={projects}
          tasks={tasks}
          columns={columns}
          onSelectTeam={onSelectTeam}
          onSelectProject={onSelectProject}
        />
      )}

      {/* In-place Task Details Drawer (Opens right here without navigating away!) */}
      {openTask && (
        <TaskDrawer
          task={openTask}
          project={openTaskProject}
          projects={projects}
          teams={teams}
          columns={openTaskProjectColumns.length > 0 ? openTaskProjectColumns : columns}
          users={users}
          currentUserId={currentUserId}
          tags={tags}
          versions={versions}
          onCreateVersion={onCreateVersion}
          onOpenVersionManager={onOpenVersionManager}
          onChange={(patch) => onUpdateTask(openTask.id, patch)}
          onDelete={onDeleteTask}
          onClose={() => setOpenTaskId(null)}
        />
      )}
    </div>
  );
}
