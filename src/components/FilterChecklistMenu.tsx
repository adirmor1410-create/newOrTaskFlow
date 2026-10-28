import { useState, useRef, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronDown,
  Filter,
  Layers,
  Milestone,
  RotateCcw,
  Sparkles,
  User as UserIcon,
  X,
} from 'lucide-react';
import { he } from '../i18n/he';
import { ME, type Column, type Priority, type Tag, type Task, type User } from '../api/mock';
import { Avatar, diffDays, PriorityBadge } from './ui';

export interface FilterState {
  priorities: Priority[];
  assigneeIds: (number | 'unassigned')[];
  columnIds: number[];
  versions: string[];
  mineOnly: boolean;
  overdueOnly: boolean;
  hasSubtasksOnly: boolean;
}

interface FilterChecklistMenuProps {
  tasks: Task[];
  columns: Column[];
  users: User[];
  tags?: Tag[];
  filterState: FilterState;
  onTogglePriority: (p: Priority) => void;
  onToggleAssignee: (id: number | 'unassigned') => void;
  onToggleColumn: (id: number) => void;
  onToggleVersion: (version: string) => void;
  onToggleMineOnly: () => void;
  onToggleOverdueOnly: () => void;
  onToggleHasSubtasksOnly: () => void;
  onClearAll: () => void;
}

export function FilterChecklistMenu({
  tasks,
  columns,
  users,
  filterState,
  onTogglePriority,
  onToggleAssignee,
  onToggleColumn,
  onToggleVersion,
  onToggleMineOnly,
  onToggleOverdueOnly,
  onToggleHasSubtasksOnly,
  onClearAll,
}: FilterChecklistMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Total active filter count
  const activeCount =
    filterState.priorities.length +
    filterState.assigneeIds.length +
    filterState.columnIds.length +
    (filterState.versions?.length || 0) +
    (filterState.mineOnly ? 1 : 0) +
    (filterState.overdueOnly ? 1 : 0) +
    (filterState.hasSubtasksOnly ? 1 : 0);

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Counts calculation
  const getPriorityCount = (p: Priority) =>
    tasks.filter((t) => t.priority === p).length;

  const getAssigneeCount = (uid: number | 'unassigned') => {
    if (uid === 'unassigned') {
      return tasks.filter((t) => (t.assignee_id || t.assigneeId) === null).length;
    }
    return tasks.filter((t) => (t.assignee_id || t.assigneeId) === uid).length;
  };

  const getColumnCount = (colId: number) =>
    tasks.filter((t) => (t.column_id || t.columnId) === colId).length;

  const availableVersions = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => {
      const v = (t.target_version || t.targetVersion)?.trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [tasks]);

  const getVersionCount = (ver: string) =>
    tasks.filter((t) => (t.target_version || t.targetVersion) === ver).length;

  const overdueCount = tasks.filter((t) => {
    const due = t.due_date || t.dueDate;
    return due !== null && diffDays(due) < 0;
  }).length;

  const hasSubtasksCount = tasks.filter(
    (t) => t.subtasks && t.subtasks.length > 0
  ).length;

  const myTasksCount = tasks.filter(
    (t) => (t.assignee_id || t.assigneeId) === ME
  ).length;

  return (
    <div className="filter-checklist-wrapper" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        className={`btn-filter-trigger ${isOpen ? 'open' : ''} ${activeCount > 0 ? 'has-active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        <Filter size={15} className="filter-trigger-icon" />
        <span>סינון ומסננים</span>
        {activeCount > 0 && <span className="active-filter-badge">{activeCount}</span>}
        <ChevronDown size={14} className={`chevron-indicator ${isOpen ? 'rotate' : ''}`} />
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div className="filter-checklist-popover" role="dialog" aria-label="תפריט סינון">
          <div className="checklist-popover-header">
            <div className="popover-title-row">
              <span className="popover-title">
                <Filter size={14} style={{ verticalAlign: 'middle', marginInlineEnd: 6 }} />
                תפריט סינון (Checklist)
              </span>
              {activeCount > 0 && (
                <button
                  type="button"
                  className="btn-clear-menu"
                  onClick={onClearAll}
                  title="אפס את כל המסננים"
                >
                  <RotateCcw size={12} />
                  <span>נקה הכל ({activeCount})</span>
                </button>
              )}
            </div>
            <p className="popover-subtitle">בחר קטגוריות וערכים מרובים לצמצום תוצאות המשימות</p>
          </div>

          {/* Checklist Sections Body */}
          <div className="checklist-sections-scroll">
            {/* 1. Quick Attributes Section */}
            <div className="checklist-section">
              <span className="checklist-section-title">מאפיינים מהירים</span>
              <div className="checklist-items-list">
                <label className={`checklist-item ${filterState.mineOnly ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={filterState.mineOnly}
                    onChange={onToggleMineOnly}
                  />
                  <UserIcon size={14} className="item-icon text-primary" />
                  <span className="item-label">משימות שלי בלבד</span>
                  <span className="item-count">({myTasksCount})</span>
                </label>

                <label className={`checklist-item ${filterState.overdueOnly ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={filterState.overdueOnly}
                    onChange={onToggleOverdueOnly}
                  />
                  <AlertTriangle size={14} className="item-icon text-danger" />
                  <span className="item-label">משימות באיחור</span>
                  <span className="item-count">({overdueCount})</span>
                </label>

                <label className={`checklist-item ${filterState.hasSubtasksOnly ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={filterState.hasSubtasksOnly}
                    onChange={onToggleHasSubtasksOnly}
                  />
                  <CheckSquare size={14} className="item-icon text-muted" />
                  <span className="item-label">כולל תת-משימות</span>
                  <span className="item-count">({hasSubtasksCount})</span>
                </label>
              </div>
            </div>

            <div className="checklist-divider" />

            {/* 2. Priority Section */}
            <div className="checklist-section">
              <span className="checklist-section-title">עדיפות</span>
              <div className="checklist-items-list">
                {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as Priority[]).map((p) => {
                  const isChecked = filterState.priorities.includes(p);
                  const count = getPriorityCount(p);
                  return (
                    <label key={p} className={`checklist-item ${isChecked ? 'checked' : ''}`}>
                      <input
                        type="checkbox"
                        className="custom-checkbox"
                        checked={isChecked}
                        onChange={() => onTogglePriority(p)}
                      />
                      <PriorityBadge priority={p} size="sm" showLabel={false} />
                      <span className="item-label">{he.priority[p]}</span>
                      <span className="item-count">({count})</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="checklist-divider" />

            {/* 3. Assignee Section */}
            <div className="checklist-section">
              <span className="checklist-section-title">אחראי משימה</span>
              <div className="checklist-items-list">
                {users
                  .filter((u) => u.is_active !== false && u.isActive !== false)
                  .map((u) => {
                    const isChecked = filterState.assigneeIds.includes(u.id);
                    const count = getAssigneeCount(u.id);
                    // Strictly human display name, never raw computer username
                    const displayName =
                      (u.display_name && u.display_name !== u.computer_username && u.display_name !== u.computerUsername)
                        ? u.display_name
                        : (u.name && u.name !== u.computer_username && u.name !== u.computerUsername)
                        ? u.name
                        : (u.computer_username === 'adir7' || u.computerUsername === 'adir7' || u.username === 'adir7')
                        ? 'אדיר מור'
                        : (u.display_name || u.name || 'משתמש');

                    return (
                      <label key={u.id} className={`checklist-item ${isChecked ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          className="custom-checkbox"
                          checked={isChecked}
                          onChange={() => onToggleAssignee(u.id)}
                        />
                        <Avatar name={displayName} size={20} />
                        <span className="item-label">{displayName}</span>
                        <span className="item-count">({count})</span>
                      </label>
                    );
                  })}

                <label className={`checklist-item ${filterState.assigneeIds.includes('unassigned') ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    className="custom-checkbox"
                    checked={filterState.assigneeIds.includes('unassigned')}
                    onChange={() => onToggleAssignee('unassigned')}
                  />
                  <span className="unassigned-dot" />
                  <span className="item-label">ללא שיוך עובד</span>
                  <span className="item-count">({getAssigneeCount('unassigned')})</span>
                </label>
              </div>
            </div>

            {/* 4. Column / Status Section */}
            {columns.length > 0 && (
              <>
                <div className="checklist-divider" />
                <div className="checklist-section">
                  <span className="checklist-section-title">עמודה / סטטוס</span>
                  <div className="checklist-items-list">
                    {columns.map((c) => {
                      const isChecked = filterState.columnIds.includes(c.id);
                      const count = getColumnCount(c.id);
                      return (
                        <label key={c.id} className={`checklist-item ${isChecked ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={isChecked}
                            onChange={() => onToggleColumn(c.id)}
                          />
                          <span className="status-dot" style={{ backgroundColor: c.color }} />
                          <span className="item-label">{c.name}</span>
                          <span className="item-count">({count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* 5. Target Versions Section */}
            {availableVersions.length > 0 && (
              <>
                <div className="checklist-divider" />
                <div className="checklist-section">
                  <span className="checklist-section-title">גרסת יעד (Target Version)</span>
                  <div className="checklist-items-list">
                    {availableVersions.map((v) => {
                      const isChecked = (filterState.versions || []).includes(v);
                      const count = getVersionCount(v);
                      return (
                        <label key={v} className={`checklist-item ${isChecked ? 'checked' : ''}`}>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={isChecked}
                            onChange={() => onToggleVersion(v)}
                          />
                          <span className="target-version-badge">{v}</span>
                          <span className="item-count">({count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer with Apply / Close */}
          <div className="checklist-popover-footer">
            <span className="footer-active-hint">
              {activeCount > 0 ? `${activeCount} מסננים נבחרו` : 'לא נבחרו מסננים'}
            </span>
            <button
              type="button"
              className="btn primary sm"
              onClick={() => setIsOpen(false)}
            >
              החל סינון
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
