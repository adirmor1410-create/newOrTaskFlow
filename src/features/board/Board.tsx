import { useMemo, useState } from 'react';
import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Filter,
  Layers,
  Milestone,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { he } from '../../i18n/he';
import {
  ME,
  tags,
  users,
  type Priority,
  type Task,
  type Column as ColumnType,
  type Project,
  type Team,
  type ProjectVersion,
} from '../../api/mock';
import { Avatar, diffDays, PriorityBadge } from '../../components/ui';
import { Column } from './Column';
import { CardOverlay, TaskCard } from './TaskCard';
import { ListView } from './ListView';
import { AnalyticsView } from './AnalyticsView';
import { GanttChart } from '../../components/GanttChart';
import { TaskDrawer } from '../tasks/TaskDrawer';
import { EditColumnModal } from '../../components/EditColumnModal';
import { FilterChecklistMenu } from '../../components/FilterChecklistMenu';

interface BoardProps {
  project: Project;
  projects?: Project[];
  teams?: Team[];
  columns: ColumnType[];
  tasks: Task[];
  view: 'board' | 'list' | 'analytics' | 'gantt';
  mineOnly: boolean;
  onToggleMineOnly: () => void;
  globalSearch: string;
  currentUserId?: number;
  versions?: ProjectVersion[];
  onCreateVersion?: (name: string, releaseDate?: string) => ProjectVersion;
  onOpenVersionManager?: () => void;
  onUpdateTask: (id: number, patch: Partial<Task>) => void;
  onDeleteTask: (id: number) => void;
  onAddTask: (columnId: number, title: string, extra?: Partial<Task>) => void;
  onAddColumn: (name: string, color?: string) => void;
  onEditColumn: (columnId: number, name: string, color: string) => void;
  onDeleteColumn: (columnId: number) => void;
  onEditProject?: (project: Project) => void;
}

export function Board({
  project,
  projects = [],
  teams = [],
  columns,
  tasks,
  view,
  mineOnly,
  onToggleMineOnly,
  globalSearch,
  currentUserId,
  versions = [],
  onCreateVersion,
  onOpenVersionManager,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onEditProject,
}: BoardProps) {
  const [openTaskId, setOpenTaskId] = useState<number | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<number | null>(null);

  // Column Editing Modal
  const [columnToEdit, setColumnToEdit] = useState<ColumnType | null>(null);

  // Adding new column in Kanban
  const [isAddingKanbanCol, setIsAddingKanbanCol] = useState(false);
  const [newKanbanColTitle, setNewKanbanColTitle] = useState('');

  // Local checklist filter states
  const [localSearch, setLocalSearch] = useState('');
  const [selectedPriorities, setSelectedPriorities] = useState<Priority[]>([]);
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<(number | 'unassigned')[]>([]);
  const [selectedColumnIds, setSelectedColumnIds] = useState<number[]>([]);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [hasSubtasksOnly, setHasSubtasksOnly] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    })
  );

  // Combined search query
  const query = (globalSearch || localSearch).trim().toLowerCase();

  // Tasks for current project
  const projectTasks = useMemo(() => {
    return tasks.filter((t) => (t.project_id || t.projectId) === project.id);
  }, [tasks, project.id]);

  // Columns for current project
  const projectColumns = useMemo(() => {
    const list = columns.filter((c) => (c.project_id || c.projectId) === project.id);
    return list.length > 0 ? list : columns;
  }, [columns, project.id]);

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

  // Filtered visible tasks with multi-category support
  const visibleTasks = useMemo(() => {
    return projectTasks.filter((t) => {
      // 1. Text Search (title, description, jira_key)
      if (query) {
        const matchesTitle = t.title.toLowerCase().includes(query);
        const matchesDesc = t.description.toLowerCase().includes(query);
        const matchesJira = (t.jira_key || t.jiraKey || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesJira) return false;
      }

      // 2. Multi-Priority Filter (can select multiple simultaneously)
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
    projectTasks,
    query,
    selectedPriorities,
    mineOnly,
    selectedAssigneeIds,
    selectedColumnIds,
    selectedVersions,
    overdueOnly,
    hasSubtasksOnly,
  ]);

  const hasActiveFilters = Boolean(
    query ||
      selectedPriorities.length > 0 ||
      selectedAssigneeIds.length > 0 ||
      selectedColumnIds.length > 0 ||
      selectedVersions.length > 0 ||
      overdueOnly ||
      hasSubtasksOnly ||
      mineOnly
  );

  const clearAllFilters = () => {
    setLocalSearch('');
    setSelectedPriorities([]);
    setSelectedAssigneeIds([]);
    setSelectedColumnIds([]);
    setSelectedVersions([]);
    setOverdueOnly(false);
    setHasSubtasksOnly(false);
    if (mineOnly) onToggleMineOnly();
  };

  const handleCreateKanbanCol = () => {
    if (newKanbanColTitle.trim()) {
      onAddColumn(newKanbanColTitle.trim());
      setNewKanbanColTitle('');
      setIsAddingKanbanCol(false);
    }
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setDraggedTaskId(null);
    if (over) {
      const colId = Number(over.id);
      onUpdateTask(Number(active.id), { column_id: colId, columnId: colId });
    }
  };

  const getTaskProps = (t: Task) => {
    const taskMinionIds = t.minion_ids || t.minionIds || [];
    return {
      task: t,
      project,
      assignee: users.find((u) => u.id === (t.assignee_id || t.assigneeId)),
      minions: users.filter((u) => taskMinionIds.includes(u.id)),
    };
  };

  const openTask = tasks.find((t) => t.id === openTaskId);
  const draggedTask = tasks.find((t) => t.id === draggedTaskId);

  return (
    <div className="board-view-wrapper">
      {/* Filters Toolbar */}
      <div className="filters-toolbar" role="search">
        <div className="filters-toolbar-main">
          {/* Global / Local Search Bar */}
          <div className="filter-item-search">
            <Search size={14} className="filter-search-icon" aria-hidden />
            <input
              className="filter-search-input"
              dir="auto"
              placeholder="חיפוש משימות לפי כותרת, תיאור, קוד Jira..."
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

          {/* Unified Checklist Popover Filter Menu */}
          <FilterChecklistMenu
            tasks={projectTasks}
            columns={projectColumns}
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
            onToggleMineOnly={onToggleMineOnly}
            onToggleOverdueOnly={() => setOverdueOnly(!overdueOnly)}
            onToggleHasSubtasksOnly={() => setHasSubtasksOnly(!hasSubtasksOnly)}
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
                title={he.filters.clear}
              >
                <RotateCcw size={13} />
                <span>איפוס</span>
              </button>
            )}

            <span className="filters-count-indicator">
              {he.filters.showing} <strong>{visibleTasks.length}</strong> {he.filters.outOf}{' '}
              {projectTasks.length} {he.filters.tasks}
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
              const col = projectColumns.find((c) => c.id === cid);
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
                onClick={onToggleMineOnly}
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

      {/* Main View Render: Board / List / Analytics */}
      {view === 'board' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={(e: DragStartEvent) => setDraggedTaskId(Number(e.active.id))}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDraggedTaskId(null)}
          accessibility={{
            screenReaderInstructions: { draggable: he.dragHelp },
            announcements: {
              onDragStart: ({ active }) => `התחלת גרירת משימה ${active.id}`,
              onDragOver: ({ active, over }) =>
                over ? `מעל עמודה ${over.id}` : undefined,
              onDragEnd: ({ active, over }) => {
                const t = tasks.find((x) => x.id === Number(active.id));
                const c = projectColumns.find((x) => x.id === Number(over?.id));
                return t && c ? he.moved(t.title, c.name) : undefined;
              },
              onDragCancel: ({ active }) => `ביטול גרירת משימה ${active.id}`,
            },
          }}
        >
          <div className="kanban-board-canvas">
            {projectColumns.map((col) => {
              const colTasks = visibleTasks.filter((t) => (t.column_id || t.columnId) === col.id);
              return (
                <Column
                  key={col.id}
                  col={col}
                  count={colTasks.length}
                  onAdd={(title) => onAddTask(col.id, title)}
                  onEdit={(colToEdit) => setColumnToEdit(colToEdit)}
                >
                  {colTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      {...getTaskProps(t)}
                      onOpen={() => setOpenTaskId(t.id)}
                    />
                  ))}
                </Column>
              );
            })}

            {/* Kanban Add Column Column */}
            <div className="kanban-add-column-zone">
              {isAddingKanbanCol ? (
                <div className="inline-add-col-card">
                  <input
                    autoFocus
                    dir="auto"
                    className="field field-sm"
                    placeholder="שם העמודה החדשה..."
                    value={newKanbanColTitle}
                    onChange={(e) => setNewKanbanColTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateKanbanCol();
                      if (e.key === 'Escape') setIsAddingKanbanCol(false);
                    }}
                  />
                  <div className="inline-add-actions">
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={handleCreateKanbanCol}
                      disabled={!newKanbanColTitle.trim()}
                    >
                      הוסף עמודה
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setIsAddingKanbanCol(false)}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn-add-kanban-col"
                  onClick={() => setIsAddingKanbanCol(true)}
                >
                  <Plus size={16} />
                  <span>הוסף עמודה לפרויקט</span>
                </button>
              )}
            </div>
          </div>

          <DragOverlay>
            {draggedTask && <CardOverlay {...getTaskProps(draggedTask)} />}
          </DragOverlay>
        </DndContext>
      )}

      {view === 'list' && (
        <ListView
          tasks={visibleTasks}
          columns={projectColumns}
          users={users}
          currentUserId={currentUserId}
          tags={tags}
          project={project}
          onOpenTask={(id) => setOpenTaskId(id)}
          onUpdateTask={onUpdateTask}
          onDeleteTask={onDeleteTask}
          onAddTask={onAddTask}
          onAddColumn={onAddColumn}
        />
      )}

      {view === 'gantt' && (
        <GanttChart
          tasks={visibleTasks}
          projects={[project]}
          teams={teams}
          users={users}
          columns={projectColumns}
          onOpenTask={(id) => setOpenTaskId(id)}
        />
      )}

      {view === 'analytics' && (
        <AnalyticsView
          tasks={projectTasks}
          columns={projectColumns}
          users={users}
          project={project}
          onEditProject={onEditProject}
        />
      )}

      {/* Task Drawer */}
      {openTask && (
        <TaskDrawer
          task={openTask}
          project={project}
          projects={projects}
          teams={teams}
          columns={projectColumns}
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

      {/* Edit Existing Column Modal */}
      <EditColumnModal
        isOpen={columnToEdit !== null}
        onClose={() => setColumnToEdit(null)}
        column={columnToEdit}
        onSave={(colId, name, color) => onEditColumn(colId, name, color)}
        onDelete={(colId) => onDeleteColumn(colId)}
      />
    </div>
  );
}
