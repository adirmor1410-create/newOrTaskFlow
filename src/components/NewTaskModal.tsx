import { useState, useEffect, useRef } from 'react';
import {
  Calendar,
  Check,
  FolderKanban,
  Hash,
  Milestone,
  Sparkles,
  Tag as TagIcon,
  User,
  Users,
  X,
} from 'lucide-react';
import { he } from '../i18n/he';
import {
  ME,
  type Column,
  type Priority,
  type Tag,
  type Task,
  type User as UserType,
  type Subtask,
  type Project,
  type Team,
  type ProjectVersion,
} from '../api/mock';
import { Avatar, PriorityBadge } from './ui';

export interface NewTaskPayload {
  projectId: number;
  project_id?: number;
  teamId?: number | null;
  team_id?: number | null;
  title: string;
  description: string;
  columnId: number;
  column_id?: number;
  priority: Priority;
  assigneeId: number | null;
  assignee_id?: number | null;
  minionIds?: number[];
  minion_ids?: number[];
  startDate?: string | null;
  start_date?: string | null;
  dueDate: string | null;
  due_date?: string | null;
  tagIds: number[];
  tag_ids?: number[];
  subtasks?: Subtask[];
  jiraKey?: string;
  jira_key?: string;
  targetVersion?: string;
  target_version?: string;
}

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: NewTaskPayload) => void;
  columns: Column[];
  users: UserType[];
  tags?: Tag[];
  teams?: Team[];
  projects?: Project[];
  currentUserId?: number;
  versions?: ProjectVersion[];
  onCreateVersion?: (name: string, releaseDate?: string) => ProjectVersion;
  defaultColumnId?: number;
  projectId?: number;
  teamId?: number;
}

export function NewTaskModal({
  isOpen,
  onClose,
  onSubmit,
  columns,
  users,
  tags,
  teams = [],
  projects = [],
  versions = [],
  onCreateVersion,
  defaultColumnId,
  projectId = 1,
  teamId,
  currentUserId,
}: NewTaskModalProps) {
  const activeUserId = currentUserId ?? ME;
  const [selectedProjectId, setSelectedProjectId] = useState<number>(projectId);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(teamId ?? null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [columnId, setColumnId] = useState<number>(defaultColumnId ?? 1);
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [assigneeId, setAssigneeId] = useState<number | null>(activeUserId);
  const [minionIds, setMinionIds] = useState<number[]>([]);
  const [jiraKey, setJiraKey] = useState('');
  const [targetVersion, setTargetVersion] = useState('');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDate, setNewVersionDate] = useState('');
  const [startDate, setStartDate] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  // Synchronize when project or team changes
  useEffect(() => {
    if (isOpen) {
      const projId = projectId || (projects[0]?.id ?? 1);
      setSelectedProjectId(projId);

      const foundProj = projects.find((p) => p.id === projId);
      const effectiveTeamId = foundProj ? (foundProj.team_id || foundProj.teamId) : (teamId ?? teams[0]?.id ?? 1);
      setSelectedTeamId(effectiveTeamId);

      // Default Jira Key suggestion based on project key
      const projKey = foundProj?.key || 'PROJ';
      setJiraKey(`${projKey}-${Math.floor(100 + Math.random() * 900)}`);
      setTargetVersion('v2.1.0');

      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setAssigneeId(activeUserId);
      setMinionIds([]);
      setIsCreatingVersion(false);
      const today = new Date().toISOString().slice(0, 10);
      setStartDate(today);
      setDueDate('');
      setSelectedTagIds([]);

      // Relevant columns for chosen project
      const relevantCols = columns.filter((c) => (c.project_id || c.projectId) === projId);
      const effectiveCols = relevantCols.length > 0 ? relevantCols : columns;
      setColumnId(defaultColumnId ?? (effectiveCols[0]?.id || 1));

      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, projectId, teamId, projects, teams, columns, defaultColumnId]);

  // When user selects a different project in modal
  const handleProjectChange = (newProjId: number) => {
    setSelectedProjectId(newProjId);
    const foundProj = projects.find((p) => p.id === newProjId);
    if (foundProj) {
      setSelectedTeamId(foundProj.team_id || foundProj.teamId);
      setJiraKey(`${foundProj.key}-${Math.floor(100 + Math.random() * 900)}`);
      const projCols = columns.filter((c) => (c.project_id || c.projectId) === newProjId);
      if (projCols.length > 0) {
        setColumnId(projCols[0].id);
      }
    }
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleCreate();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, title, description, columnId, priority, assigneeId, dueDate, selectedTagIds, jiraKey, targetVersion, selectedProjectId, selectedTeamId]);

  if (!isOpen) return null;

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  // Filter columns relevant to the selected project
  const availableColumns = columns.filter((c) => (c.project_id || c.projectId) === selectedProjectId);
  const finalColumns = availableColumns.length > 0 ? availableColumns : columns;

  const handleCreate = () => {
    if (!title.trim() || projects.length === 0) return;

    onSubmit({
      projectId: selectedProjectId,
      project_id: selectedProjectId,
      teamId: selectedTeamId,
      team_id: selectedTeamId,
      title: title.trim(),
      description: description.trim(),
      columnId,
      column_id: columnId,
      priority,
      assigneeId,
      assignee_id: assigneeId,
      minionIds,
      minion_ids: minionIds,
      jiraKey: jiraKey.trim() || undefined,
      jira_key: jiraKey.trim() || undefined,
      targetVersion: targetVersion.trim() || undefined,
      target_version: targetVersion.trim() || undefined,
      startDate: startDate || null,
      start_date: startDate || null,
      dueDate: dueDate || null,
      due_date: dueDate || null,
      tagIds: selectedTagIds,
      tag_ids: selectedTagIds,
      subtasks: [],
    });

    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={he.modal.createTitle}>
      <div className="modal-container task-modal-expanded" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon-badge">
              <Sparkles size={18} />
            </span>
            <div>
              <h3>{he.modal.createTitle}</h3>
              <p className="modal-subtitle">הגדרת פרטי המשימה, שיוך לצוות ופרויקט, מספר Jira וגרסת יעד</p>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} title={he.drawer.close} aria-label={he.drawer.close}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          {projects.length === 0 && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', fontSize: '0.875rem', marginBottom: 16, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
              ⚠️ לא קיימים פרויקטים במערכת. יש ליצור פרויקט תחילה לפני שניתן להוסיף משימות.
            </div>
          )}

          {/* Title */}
          <div className="form-group">
            <label htmlFor="task-title-input" className="form-label required">
              {he.modal.titleLabel}
            </label>
            <input
              id="task-title-input"
              ref={inputRef}
              dir="auto"
              className="field input-lg"
              placeholder={he.modal.titlePlaceholder}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreate();
                }
              }}
            />
          </div>

          {/* Project & Team Association Row */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">
                <FolderKanban size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                שיוך לפרויקט
              </label>
              <select
                className="field"
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(Number(e.target.value))}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.key})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Users size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                שיוך לצוות
              </label>
              <select
                className="field"
                value={selectedTeamId ?? ''}
                onChange={(e) => setSelectedTeamId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">ללא צוות ספציפי</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Jira Key & Target Version Row */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">
                <Hash size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                מספר/מזהה Jira
              </label>
              <input
                dir="ltr"
                className="field"
                placeholder="לדוגמה: ALP-1045"
                value={jiraKey}
                onChange={(e) => setJiraKey(e.target.value.toUpperCase())}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <Milestone size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                גרסת יעד (Target Version)
              </label>
              {!isCreatingVersion ? (
                <select
                  className="field"
                  value={targetVersion}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setIsCreatingVersion(true);
                    } else {
                      setTargetVersion(e.target.value);
                    }
                  }}
                >
                  <option value="">ללא גרסת יעד</option>
                  {versions.map((ver) => {
                    const dateStr = ver.release_date || ver.releaseDate;
                    return (
                      <option key={ver.id} value={ver.name}>
                        {ver.name} {dateStr ? `(יעד: ${new Date(dateStr).toLocaleDateString('he-IL')})` : ''}
                      </option>
                    );
                  })}
                  {targetVersion && !versions.some((v) => v.name === targetVersion) && (
                    <option value={targetVersion}>{targetVersion} (מותאם אישית)</option>
                  )}
                  <option value="__NEW__">+ צור גרסה חדשה...</option>
                </select>
              ) : (
                <div className="inline-quick-version-form">
                  <input
                    type="text"
                    className="field field-xs"
                    placeholder="שם גרסה (למשל: v2.3)"
                    value={newVersionName}
                    onChange={(e) => setNewVersionName(e.target.value)}
                    autoFocus
                  />
                  <input
                    type="date"
                    className="field field-xs"
                    title="תאריך שחרור"
                    value={newVersionDate}
                    onChange={(e) => setNewVersionDate(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn primary xs"
                    disabled={!newVersionName.trim()}
                    onClick={() => {
                      if (newVersionName.trim()) {
                        const trimmed = newVersionName.trim();
                        if (onCreateVersion) onCreateVersion(trimmed, newVersionDate || undefined);
                        setTargetVersion(trimmed);
                        setNewVersionName('');
                        setNewVersionDate('');
                        setIsCreatingVersion(false);
                      }
                    }}
                  >
                    צור והחל
                  </button>
                  <button
                    type="button"
                    className="btn ghost xs"
                    onClick={() => setIsCreatingVersion(false)}
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Column Status & Priority */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">{he.modal.columnLabel}</label>
              <select
                className="field"
                value={columnId}
                onChange={(e) => setColumnId(Number(e.target.value))}
              >
                {finalColumns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">{he.modal.priorityLabel}</label>
              <div className="priority-select-row">
                {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as Priority[]).map((p) => {
                  const active = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      className={`prio-toggle-btn ${active ? 'active' : ''}`}
                      onClick={() => setPriority(p)}
                    >
                      <PriorityBadge priority={p} showLabel={false} size="sm" />
                      <span>{he.priority[p]}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Assignee & Dates */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">
                <User size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                {he.modal.assigneeLabel}
              </label>
              <select
                className="field"
                value={assigneeId ?? ''}
                onChange={(e) => setAssigneeId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{he.drawer.unassigned}</option>
                {users
                  .filter((u) => u.is_active !== false && u.isActive !== false)
                  .map((u) => {
                    const uTeam = teams.find((t) => t.member_user_ids.includes(u.id));
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} {uTeam ? `[${uTeam.name}]` : ''} ({u.roleLabel || u.role})
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">
                <Calendar size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                תאריך יעד (Due Date)
              </label>
              <input
                type="date"
                className="field"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {/* Minions ("מיניונים" - Co-assignees) */}
          <div className="form-group">
            <label className="form-label">
              <Users size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
              מיניונים למשימה (משויכים נוספים)
            </label>
            {minionIds.length > 0 && (
              <div className="minions-pills-list" style={{ marginBottom: 6 }}>
                {minionIds.map((mid) => {
                  const mUser = users.find((u) => u.id === mid);
                  return (
                    <span key={mid} className="minion-pill-item">
                      <Avatar name={mUser?.name || `עובד ${mid}`} size={18} />
                      <span className="minion-pill-name">{mUser?.name || mid}</span>
                      <button
                        type="button"
                        className="minion-remove-btn"
                        onClick={() => setMinionIds((prev) => prev.filter((id) => id !== mid))}
                        title="הסר מיניון"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            <select
              className="field"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const uid = Number(e.target.value);
                  if (!minionIds.includes(uid)) {
                    setMinionIds((prev) => [...prev, uid]);
                  }
                  e.target.value = '';
                }
              }}
            >
              <option value="" disabled>
                + צרף מיניון / שותף נוסף למשימה...
              </option>
              {users
                .filter((u) => u.is_active !== false && u.isActive !== false && u.id !== assigneeId && !minionIds.includes(u.id))
                .map((u) => {
                  const uTeam = teams.find((t) => t.member_user_ids.includes(u.id));
                  return (
                    <option key={u.id} value={u.id}>
                      {u.name} {uTeam ? `[${uTeam.name}]` : ''} ({u.roleLabel || u.role})
                    </option>
                  );
                })}
            </select>
          </div>

          {/* Start Date (for precision Gantt) */}
          <div className="form-row-grid">
            <div className="form-group">
              <label className="form-label">
                <Calendar size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                תאריך התחלה (לדיוק בגאנט)
              </label>
              <input
                type="date"
                className="field"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">{he.modal.descLabel}</label>
            <textarea
              dir="auto"
              className="field textarea-md"
              rows={3}
              placeholder={he.modal.descPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <footer className="modal-footer">
          <div className="shortcut-hint">
            <kbd>Ctrl</kbd> + <kbd>Enter</kbd> ליצירה מהירה
          </div>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              {he.modal.cancel}
            </button>
            <button
              type="button"
              className="btn primary"
              disabled={!title.trim() || projects.length === 0}
              onClick={handleCreate}
            >
              <Sparkles size={15} />
              {he.modal.submit}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
