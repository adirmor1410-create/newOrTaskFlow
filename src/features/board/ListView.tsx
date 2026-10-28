import { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Circle,
  Clock,
  ExternalLink,
  Filter,
  Layers,
  Milestone,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { he } from '../../i18n/he';
import type { Column, Priority, Project, Tag, Task, User } from '../../api/mock';
import { Avatar, diffDays, PriorityBadge } from '../../components/ui';

interface ListViewProps {
  tasks: Task[];
  columns: Column[];
  users: User[];
  currentUserId?: number;
  tags?: Tag[];
  project: Project;
  onOpenTask: (id: number) => void;
  onUpdateTask: (id: number, patch: Partial<Task>) => void;
  onDeleteTask: (id: number) => void;
  onAddTask: (columnId: number, title: string, extra?: Partial<Task>) => void;
  onAddColumn?: (name: string) => void;
}

type SortField = 'id' | 'title' | 'status' | 'priority' | 'assignee' | 'due';

export function ListView({
  tasks,
  columns,
  users,
  tags,
  project,
  onOpenTask,
  onUpdateTask,
  onDeleteTask,
  onAddTask,
  onAddColumn,
}: ListViewProps) {
  const doneColumnId = columns.find((c) => c.name.includes('הושלם'))?.id ?? 3;
  const todoColumnId = columns[0]?.id ?? 1;

  // Inline Title Editing state
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Sorting
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  // New Row state
  const [newTitle, setNewTitle] = useState('');
  const [newColumnId, setNewColumnId] = useState(columns[0]?.id || 1);
  const [newPriority, setNewPriority] = useState<Priority>('MEDIUM');
  const [newAssigneeId, setNewAssigneeId] = useState<number | null>(null);

  // New Column inline prompt state
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');

  // Handle Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedTasks = useMemo(() => {
    if (!sortField) return tasks;
    return [...tasks].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'id':
          comparison = a.id - b.id;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title, 'he');
          break;
        case 'status':
          comparison = a.columnId - b.columnId;
          break;
        case 'priority': {
          const weight: Record<Priority, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          comparison = weight[a.priority] - weight[b.priority];
          break;
        }
        case 'assignee': {
          const nameA = users.find((u) => u.id === a.assigneeId)?.name || '';
          const nameB = users.find((u) => u.id === b.assigneeId)?.name || '';
          comparison = nameA.localeCompare(nameB, 'he');
          break;
        }
        case 'due': {
          const dueA = a.dueDate || '9999';
          const dueB = b.dueDate || '9999';
          comparison = dueA.localeCompare(dueB);
          break;
        }
      }
      return sortAsc ? comparison : -comparison;
    });
  }, [tasks, sortField, sortAsc, users]);

  // Start editing title
  const startEditTitle = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTitle(task.title);
  };

  // Commit title edit
  const commitEditTitle = (taskId: number) => {
    if (editingTitle.trim()) {
      onUpdateTask(taskId, { title: editingTitle.trim() });
    }
    setEditingTaskId(null);
  };

  // Submit new row
  const handleAddNewRow = () => {
    if (!newTitle.trim()) return;
    onAddTask(newColumnId, newTitle.trim(), {
      priority: newPriority,
      assigneeId: newAssigneeId,
    });
    setNewTitle('');
  };

  // Submit new column
  const handleCreateColumn = () => {
    if (newColumnTitle.trim() && onAddColumn) {
      onAddColumn(newColumnTitle.trim());
      setNewColumnTitle('');
      setIsAddingColumn(false);
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown size={12} className="sort-icon-muted" />;
    return sortAsc ? (
      <ArrowUp size={12} className="sort-icon-active" />
    ) : (
      <ArrowDown size={12} className="sort-icon-active" />
    );
  };

  return (
    <div className="list-view-container">
      <div className="list-table-wrap">
        <table className="list-table editable-table">
          <thead>
            <tr>
              <th style={{ width: 44 }} aria-label="סטטוס השלמה"></th>

              <th style={{ width: 100 }} className="sortable-th" onClick={() => handleSort('id')}>
                <div className="th-content">
                  <span>מזהה</span>
                  {renderSortIcon('id')}
                </div>
              </th>

              <th className="sortable-th" onClick={() => handleSort('title')}>
                <div className="th-content">
                  <span>{he.list.title}</span>
                  {renderSortIcon('title')}
                </div>
              </th>

              <th style={{ width: 140 }} className="sortable-th" onClick={() => handleSort('status')}>
                <div className="th-content">
                  <span>{he.list.status}</span>
                  {renderSortIcon('status')}
                </div>
              </th>

              <th style={{ width: 135 }} className="sortable-th" onClick={() => handleSort('priority')}>
                <div className="th-content">
                  <span>{he.list.priority}</span>
                  {renderSortIcon('priority')}
                </div>
              </th>

              <th style={{ width: 170 }} className="sortable-th" onClick={() => handleSort('assignee')}>
                <div className="th-content">
                  <span>{he.list.assignee}</span>
                  {renderSortIcon('assignee')}
                </div>
              </th>

              <th style={{ width: 160 }} className="sortable-th" onClick={() => handleSort('due')}>
                <div className="th-content">
                  <span>{he.list.due}</span>
                  {renderSortIcon('due')}
                </div>
              </th>

              <th style={{ width: 130 }}>
                <div className="th-content">
                  <Milestone size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                  <span>גרסת יעד</span>
                </div>
              </th>

              <th style={{ width: 85 }} className="th-actions">
                {onAddColumn && (
                  <button
                    type="button"
                    className="btn-add-col-th"
                    onClick={() => setIsAddingColumn(!isAddingColumn)}
                    title={he.list.addColumn}
                  >
                    <Plus size={13} />
                    <span>{he.list.addColumn}</span>
                  </button>
                )}
              </th>
            </tr>
          </thead>

          <tbody>
            {/* New Column Header Row Prompt */}
            {isAddingColumn && (
              <tr className="add-column-banner-row">
                <td colSpan={9}>
                  <div className="add-col-banner">
                    <span className="add-col-title">הוספת עמודה/סטטוס חדש ללוח:</span>
                    <input
                      autoFocus
                      dir="auto"
                      className="field field-sm"
                      placeholder={he.list.columnName}
                      value={newColumnTitle}
                      onChange={(e) => setNewColumnTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateColumn();
                        if (e.key === 'Escape') setIsAddingColumn(false);
                      }}
                    />
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={handleCreateColumn}
                      disabled={!newColumnTitle.trim()}
                    >
                      הוסף עמודה
                    </button>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setIsAddingColumn(false)}
                    >
                      ביטול
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Existing Rows */}
            {sortedTasks.map((task) => {
              const isDone = task.columnId === doneColumnId;
              const assignee = users.find((u) => u.id === task.assigneeId);
              const col = columns.find((c) => c.id === task.columnId) || columns[0];
              const subtasks = task.subtasks || [];
              const completedSubtasks = subtasks.filter((s) => s.done).length;
              const isEditingThisTitle = editingTaskId === task.id;

              return (
                <tr key={task.id} className={`list-row ${isDone ? 'is-completed' : ''}`}>
                  {/* Complete checkbox */}
                  <td className="col-check">
                    <button
                      type="button"
                      className={`row-check-btn ${isDone ? 'checked' : ''}`}
                      onClick={() =>
                        onUpdateTask(task.id, {
                          columnId: isDone ? todoColumnId : doneColumnId,
                        })
                      }
                      title={isDone ? 'סמן כלא הושלם' : 'סמן כהושלם'}
                    >
                      {isDone ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                  </td>

                  {/* Key */}
                  <td className="col-key">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'flex-start' }}>
                      <span
                        className="issue-badge clickable-badge"
                        onClick={() => onOpenTask(task.id)}
                        title="לחץ לפתיחת המשימה"
                      >
                        {project.key}-{task.id}
                      </span>
                      {(task.jira_key || task.jiraKey) && (
                        <span className="jira-key-badge sm" title={`Jira: ${task.jira_key || task.jiraKey}`}>
                          {task.jira_key || task.jiraKey}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Title (Inline Editable) */}
                  <td className="col-title editable-cell">
                    {isEditingThisTitle ? (
                      <div className="inline-title-editor">
                        <input
                          autoFocus
                          dir="auto"
                          className="field inline-edit-input"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEditTitle(task.id);
                            if (e.key === 'Escape') setEditingTaskId(null);
                          }}
                          onBlur={() => commitEditTitle(task.id)}
                        />
                        <button
                          type="button"
                          className="btn-save-inline"
                          onMouseDown={() => commitEditTitle(task.id)}
                          title="שמור (Enter)"
                        >
                          <Check size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="list-title-cell">
                        <span
                          className={`task-row-title ${isDone ? 'strikethrough' : ''}`}
                          onClick={() => startEditTitle(task)}
                          title="לחץ לעריכה ישירה"
                        >
                          {task.title}
                        </span>

                        {(task.target_version || task.targetVersion) && (
                          <span className="target-version-badge sm" title={`גרסת יעד: ${task.target_version || task.targetVersion}`}>
                            {task.target_version || task.targetVersion}
                          </span>
                        )}

                        <button
                          type="button"
                          className="btn-row-pencil"
                          onClick={() => startEditTitle(task)}
                          title={he.list.editTitle}
                        >
                          <Pencil size={12} />
                        </button>

                        {subtasks.length > 0 && (
                          <span
                            className="list-subtasks-pill"
                            title={`${completedSubtasks}/${subtasks.length} תת-משימות`}
                          >
                            <CheckSquare size={12} />
                            <span>
                              {completedSubtasks}/{subtasks.length}
                            </span>
                          </span>
                        )}

                        {task.comments && task.comments.length > 0 && (
                          <span
                            className="list-comments-pill"
                            title={`${task.comments.length} תגובות`}
                          >
                            <MessageSquare size={12} />
                            <span>{task.comments.length}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Status (Inline Select) */}
                  <td className="col-status">
                    <select
                      className="status-inline-select editable-select"
                      value={task.columnId}
                      style={{ color: col.color }}
                      onChange={(e) =>
                        onUpdateTask(task.id, { columnId: Number(e.target.value) })
                      }
                    >
                      {columns.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Priority (Inline Select) */}
                  <td className="col-priority">
                    <select
                      className={`prio-inline-select prio-${task.priority.toLowerCase()}`}
                      value={task.priority}
                      onChange={(e) =>
                        onUpdateTask(task.id, { priority: e.target.value as Priority })
                      }
                    >
                      {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((p) => (
                        <option key={p} value={p}>
                          {he.priority[p]}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Assignee (Inline Select) */}
                  <td className="col-assignee">
                    <div className="table-assignee-select-wrap">
                      {assignee && <Avatar name={assignee.name} size={22} />}
                      <select
                        className="assignee-inline-select"
                        value={task.assigneeId ?? ''}
                        onChange={(e) =>
                          onUpdateTask(task.id, {
                            assigneeId: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      >
                        <option value="">{he.drawer.unassigned}</option>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>

                  {/* Due Date (Inline Editable) */}
                  <td className="col-due">
                    <div className="table-due-date-cell">
                      <input
                        type="date"
                        className="table-date-input"
                        value={task.dueDate ?? ''}
                        onChange={(e) =>
                          onUpdateTask(task.id, { dueDate: e.target.value || null })
                        }
                        title={task.dueDate ? `יעד: ${task.dueDate}` : he.list.noDueDate}
                      />
                      {task.dueDate && (
                        <button
                          type="button"
                          className="btn-clear-date"
                          onClick={() => onUpdateTask(task.id, { dueDate: null })}
                          title="נקה תאריך"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  </td>

                  {/* Target Version */}
                  <td className="col-version">
                    {(task.target_version || task.targetVersion) ? (
                      <span className="target-version-badge">
                        {task.target_version || task.targetVersion}
                      </span>
                    ) : (
                      <span className="text-muted-inline">-</span>
                    )}
                  </td>

                  {/* Row Actions */}
                  <td className="col-row-actions">
                    <div className="row-action-buttons">
                      <button
                        type="button"
                        className="btn-table-action"
                        onClick={() => onOpenTask(task.id)}
                        title={he.list.openDrawer}
                      >
                        <ExternalLink size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-table-action danger"
                        onClick={() => {
                          if (window.confirm(he.drawer.confirmDelete)) {
                            onDeleteTask(task.id);
                          }
                        }}
                        title={he.list.deleteRow}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Add New Row Inline at the bottom of table */}
            <tr className="add-new-row">
              <td className="col-check">
                <span className="new-row-plus-icon">
                  <Plus size={16} />
                </span>
              </td>
              <td className="col-key">
                <span className="issue-badge new-row-badge">{project.key}-חדש</span>
              </td>
              <td className="col-title">
                <input
                  dir="auto"
                  className="field new-row-input"
                  placeholder={he.list.addPrompt}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddNewRow();
                  }}
                />
              </td>
              <td className="col-status">
                <select
                  className="status-inline-select"
                  value={newColumnId}
                  onChange={(e) => setNewColumnId(Number(e.target.value))}
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="col-priority">
                <select
                  className="prio-inline-select"
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Priority)}
                >
                  {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {he.priority[p]}
                    </option>
                  ))}
                </select>
              </td>
              <td className="col-assignee">
                <select
                  className="assignee-inline-select"
                  value={newAssigneeId ?? ''}
                  onChange={(e) =>
                    setNewAssigneeId(e.target.value ? Number(e.target.value) : null)
                  }
                >
                  <option value="">{he.drawer.unassigned}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="col-due">
                <span className="text-muted-inline">-</span>
              </td>
              <td className="col-version">
                <span className="text-muted-inline">-</span>
              </td>
              <td className="col-row-actions">
                <button
                  type="button"
                  className="btn primary sm"
                  onClick={handleAddNewRow}
                  disabled={!newTitle.trim()}
                  title={he.list.addRow}
                >
                  <Plus size={13} />
                  <span>הוסף</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
