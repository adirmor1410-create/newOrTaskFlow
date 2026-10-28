import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Clock,
  Download,
  File,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  MessageSquare,
  Milestone,
  Paperclip,
  Pencil,
  Plus,
  Send,
  Settings,
  Sparkles,
  Trash2,
  UploadCloud,
  User,
  Users,
  X,
} from 'lucide-react';
import { he } from '../../i18n/he';
import {
  ME,
  type Column,
  type Priority,
  type Tag,
  type Task,
  type User as UserType,
  type Project,
  type Team,
  type Comment,
  type Subtask,
  type ProjectVersion,
  type FileAttachment,
} from '../../api/mock';
import { Avatar, PriorityBadge, ProgressBar, formatRelativeTime } from '../../components/ui';

function formatFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getFileIcon(mimeType: string, filename: string) {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
    return <ImageIcon size={18} className="text-primary" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext)) {
    return <FileText size={18} style={{ color: '#EF4444' }} />;
  }
  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileSpreadsheet size={18} style={{ color: '#10B981' }} />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <FileArchive size={18} style={{ color: '#F59E0B' }} />;
  }
  if (['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json', 'py', 'java', 'c', 'cpp'].includes(ext)) {
    return <FileCode size={18} style={{ color: '#8B5CF6' }} />;
  }
  return <File size={18} style={{ color: '#64748B' }} />;
}

interface TaskDrawerProps {
  task: Task;
  project?: Project;
  projects?: Project[];
  teams?: Team[];
  columns: Column[];
  users: UserType[];
  tags?: Tag[];
  currentUserId?: number;
  versions?: ProjectVersion[];
  onCreateVersion?: (name: string, releaseDate?: string) => ProjectVersion;
  onOpenVersionManager?: () => void;
  onChange: (patch: Partial<Task>) => void;
  onDelete?: (taskId: number) => void;
  onClose: () => void;
}

export function TaskDrawer({
  task,
  project,
  projects = [],
  teams = [],
  columns,
  users,
  currentUserId,
  versions = [],
  onCreateVersion,
  onOpenVersionManager,
  onChange,
  onDelete,
  onClose,
}: TaskDrawerProps) {
  const activeUserId = currentUserId ?? ME;
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [activeTab, setActiveTab] = useState<'comments' | 'history'>('comments');
  const [commentText, setCommentText] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState('');
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [editingSubtaskId, setEditingSubtaskId] = useState<number | null>(null);
  const [editingSubtaskText, setEditingSubtaskText] = useState('');
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [newVersionDate, setNewVersionDate] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [viewMode, setViewMode] = useState<'drawer' | 'modal'>(() => {
    return (localStorage.getItem('jira_task_view_mode') as 'drawer' | 'modal') || 'drawer';
  });

  const saveTimer = useRef<number>();

  const patch = (p: Partial<Task>) => {
    onChange(p);
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSaveStatus('saved'), 400);
  };

  const handleSmoothClose = () => {
    setIsClosing(true);
    setTimeout(() => onClose(), 180);
  };

  const toggleViewMode = () => {
    const nextMode = viewMode === 'drawer' ? 'modal' : 'drawer';
    setViewMode(nextMode);
    localStorage.setItem('jira_task_view_mode', nextMode);
  };

  // Lock body scroll while open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleSmoothClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const [commentImage, setCommentImage] = useState<{ url: string; name: string } | null>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  const handleCommentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCommentImage({ url: dataUrl, name: file.name });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleTaskFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const authorName = users.find((u) => u.id === activeUserId)?.name || 'משתמש';

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newAttachment: FileAttachment = {
          id: 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          url: dataUrl,
          uploaded_at: new Date().toISOString(),
          uploaded_by: activeUserId,
        };

        const existing = task.attachments || [];
        patch({
          attachments: [...existing, newAttachment],
          history: [
            ...(task.history || []),
            {
              id: Date.now(),
              text: `${authorName} צירף/ה קובץ למשימה: "${file.name}" (${formatFileSize(file.size)})`,
              created_at: new Date().toISOString(),
            } as any,
          ],
        });
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleDeleteTaskAttachment = (attId: string | number) => {
    const authorName = users.find((u) => u.id === activeUserId)?.name || 'משתמש';
    const target = (task.attachments || []).find((a) => a.id === attId);
    const updated = (task.attachments || []).filter((a) => a.id !== attId);
    patch({
      attachments: updated,
      history: [
        ...(task.history || []),
        {
          id: Date.now(),
          text: `${authorName} מחק/ה קובץ מהמשימה: "${target?.name || 'קובץ'}"`,
          created_at: new Date().toISOString(),
        } as any,
      ],
    });
  };

  const sendComment = () => {
    if (!commentText.trim() && !commentImage) return;
    const nowIso = new Date().toISOString();
    const newComment: Comment = {
      id: Date.now(),
      userId: activeUserId,
      user_id: activeUserId,
      text: commentText.trim(),
      image_url: commentImage ? commentImage.url : undefined,
      image_name: commentImage ? commentImage.name : undefined,
      created_at: nowIso,
      at: nowIso,
    };
    const authorName = users.find((u) => u.id === activeUserId)?.name || 'משתמש';
    const actionDesc = commentImage
      ? `${authorName} הוסיף/ה תגובה עם תמונה: "${(commentText.trim() || commentImage.name).slice(0, 30)}..."`
      : `${authorName} הוסיף/ה תגובה: "${commentText.trim().slice(0, 30)}..."`;
    const histEntry = {
      id: Date.now() + 1,
      text: actionDesc,
      created_at: nowIso,
    };
    patch({
      comments: [...(task.comments || []), newComment],
      history: [...(task.history || []), histEntry as any],
    });
    setCommentText('');
    setCommentImage(null);
  };

  const startEditComment = (c: Comment) => {
    // Only author can edit their own comment
    if ((c.userId || c.user_id) !== activeUserId) return;
    setEditingCommentId(c.id);
    setEditingCommentText(c.text);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const saveEditComment = (commentId: number) => {
    if (!editingCommentText.trim()) return;
    const nowIso = new Date().toISOString();
    const updatedComments = (task.comments || []).map((c) => {
      if (c.id === commentId) {
        return {
          ...c,
          text: editingCommentText.trim(),
          is_edited: true,
          updated_at: nowIso,
        };
      }
      return c;
    });
    const histEntry = {
      id: Date.now(),
      text: `נערכה תגובה: "${editingCommentText.trim().slice(0, 30)}..."`,
      created_at: nowIso,
    };
    patch({
      comments: updatedComments,
      history: [...(task.history || []), histEntry as any],
    });
    setEditingCommentId(null);
    setEditingCommentText('');
  };

  const deleteComment = (commentId: number) => {
    const target = task.comments?.find((c) => c.id === commentId);
    // Only author can delete their own comment
    if (!target || (target.userId || target.user_id) !== activeUserId) return;
    const nowIso = new Date().toISOString();
    const updatedComments = (task.comments || []).filter((c) => c.id !== commentId);
    patch({
      comments: updatedComments,
      history: [...(task.history || []), { id: Date.now(), text: 'נמחקה תגובה', created_at: nowIso } as any],
    });
  };

  const handleAddSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const currentColId = task.column_id || task.columnId || 1;
    const subtask: Subtask = {
      id: Date.now(),
      text: newSubtaskText.trim(),
      done: false,
      doneByColumn: { [currentColId]: false },
    };
    patch({ subtasks: [...(task.subtasks || []), subtask] });
    setNewSubtaskText('');
  };

  const startEditSubtask = (s: Subtask) => {
    setEditingSubtaskId(s.id);
    setEditingSubtaskText(s.text);
  };

  const cancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  const saveEditSubtask = (id: number) => {
    if (!editingSubtaskText.trim()) return;
    const oldSubtask = (task.subtasks || []).find((s) => s.id === id);
    const updated = (task.subtasks || []).map((s) =>
      s.id === id ? { ...s, text: editingSubtaskText.trim() } : s
    );
    const nowIso = new Date().toISOString();
    patch({
      subtasks: updated,
      history: [
        ...(task.history || []),
        { id: Date.now(), text: `עודכנה תת-משימה: "${oldSubtask?.text}" ← "${editingSubtaskText.trim()}"`, created_at: nowIso } as any,
      ],
    });
    setEditingSubtaskId(null);
    setEditingSubtaskText('');
  };

  const toggleSubtask = (subId: number) => {
    const currentColId = task.column_id || task.columnId || 1;
    const updated = (task.subtasks || []).map((s) => {
      if (s.id !== subId) return s;
      const nextDone = !s.done;
      const colMap = { ...(s.doneByColumn || {}) };
      colMap[currentColId] = nextDone;
      return { ...s, done: nextDone, doneByColumn: colMap };
    });
    patch({ subtasks: updated });
  };

  const deleteSubtask = (subId: number) => {
    const updated = (task.subtasks || []).map((s) => s).filter((s) => s.id !== subId);
    patch({ subtasks: updated });
  };

  const handleQuickCreateVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVersionName.trim()) return;
    const trimmed = newVersionName.trim();
    if (onCreateVersion) {
      onCreateVersion(trimmed, newVersionDate || undefined);
    }
    patch({
      target_version: trimmed,
      targetVersion: trimmed,
    });
    setNewVersionName('');
    setNewVersionDate('');
    setIsCreatingVersion(false);
  };

  const subtasks = task.subtasks || [];
  const completedSubtasks = subtasks.filter((s) => s.done).length;
  const projectKey = project?.key || 'TSK';
  const issueKey = `${projectKey}-${task.id}`;
  const d = he.drawer;

  // Active users for assignment (plus current assignee if inactive)
  const currentAssigneeId = task.assigneeId || task.assignee_id || null;
  const currentAssignee = users.find((u) => u.id === currentAssigneeId);
  const isCurrentInactive = currentAssignee && (currentAssignee.is_active === false || currentAssignee.isActive === false);
  const activeUsers = users.filter((u) => u.is_active !== false && u.isActive !== false);

  // Minions logic ("מיניונים" / co-assignees)
  const currentMinionIds = task.minion_ids || task.minionIds || [];
  const minionUsers = users.filter((u) => currentMinionIds.includes(u.id));
  const availableMinionUsers = activeUsers.filter(
    (u) => u.id !== currentAssigneeId && !currentMinionIds.includes(u.id)
  );

  const handleAddMinion = (uid: number) => {
    if (currentMinionIds.includes(uid)) return;
    const u = users.find((usr) => usr.id === uid);
    const next = [...currentMinionIds, uid];
    const nowIso = new Date().toISOString();
    patch({
      minion_ids: next,
      minionIds: next,
      history: [
        ...(task.history || []),
        { id: Date.now(), text: `נוסף מיניון/שותף למשימה: ${u?.name || uid}`, created_at: nowIso } as any,
      ],
    });
  };

  const handleRemoveMinion = (uid: number) => {
    const u = users.find((usr) => usr.id === uid);
    const next = currentMinionIds.filter((id) => id !== uid);
    const nowIso = new Date().toISOString();
    patch({
      minion_ids: next,
      minionIds: next,
      history: [
        ...(task.history || []),
        { id: Date.now(), text: `הוסר מיניון/שותף מהמשימה: ${u?.name || uid}`, created_at: nowIso } as any,
      ],
    });
  };

  const currentColumn = columns.find((c) => c.id === (task.column_id || task.columnId));
  const isCompletedColumn = currentColumn?.name.includes('הושלם') || currentColumn?.name.toLowerCase().includes('done');

  return createPortal(
    <div
      className={`drawer-root-wrapper ${isClosing ? 'is-closing' : ''} ${
        viewMode === 'modal' ? 'mode-modal' : 'mode-drawer'
      }`}
    >
      <div
        className="drawer-backdrop"
        onClick={handleSmoothClose}
        onWheel={(e) => e.stopPropagation()}
      />
      <aside
        className="task-drawer-panel"
        aria-label={task.title}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="drawer-header">
          <div className="drawer-header-left">
            <span className="issue-badge lg">{issueKey}</span>
            <span className="save-status-indicator" role="status">
              {saveStatus === 'saving' && <span className="saving-text">{d.saving}</span>}
              {saveStatus === 'saved' && <span className="saved-text">{d.saved}</span>}
            </span>
          </div>

          <div className="drawer-header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={toggleViewMode}
              title={viewMode === 'drawer' ? 'הרחב לחלון מרכזי (Modal)' : 'הצמד לחלונית צד (Drawer)'}
              aria-label={viewMode === 'drawer' ? 'הרחב לחלון מרכזי' : 'הצמד לחלונית צד'}
            >
              {viewMode === 'drawer' ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>

            {onDelete && (
              <button
                type="button"
                className="icon-btn danger-hover"
                title={d.deleteTask}
                aria-label={d.deleteTask}
                onClick={() => {
                  if (window.confirm(d.confirmDelete)) {
                    onDelete(task.id);
                    onClose();
                  }
                }}
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              type="button"
              className="icon-btn"
              onClick={handleSmoothClose}
              title={d.close}
              aria-label={d.close}
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Scrollable Body */}
        <div className="drawer-content">
          {/* Title */}
          <div className="drawer-section">
            <input
              dir="auto"
              className="drawer-title-input"
              value={task.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder={he.taskTitle}
              aria-label={he.taskTitle}
            />
          </div>

          {/* Properties Grid */}
          <div className="drawer-props-grid">
            <div className="prop-row">
              <span className="prop-label">{d.status}</span>
              <div className="prop-value">
                <select
                  className="field prop-select"
                  value={task.columnId || task.column_id}
                  onChange={(e) => {
                    const cid = Number(e.target.value);
                    patch({ columnId: cid, column_id: cid });
                  }}
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="prop-row">
              <span className="prop-label">מזהה Jira</span>
              <div className="prop-value">
                <input
                  dir="ltr"
                  className="field prop-text-input"
                  placeholder="לדוגמה: ALP-1042"
                  value={task.jira_key || task.jiraKey || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    patch({ jira_key: val, jiraKey: val });
                  }}
                />
              </div>
            </div>

            <div className="prop-row">
              <span className="prop-label">
                <Milestone size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                גרסת יעד
              </span>
              <div className="prop-value">
                {!isCreatingVersion ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
                    <select
                      className="field prop-select"
                      value={task.target_version || task.targetVersion || ''}
                      onChange={(e) => {
                        if (e.target.value === '__NEW__') {
                          setIsCreatingVersion(true);
                        } else {
                          const val = e.target.value;
                          patch({ target_version: val, targetVersion: val });
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
                      {(task.target_version || task.targetVersion) &&
                        !versions.some((v) => v.name === (task.target_version || task.targetVersion)) && (
                          <option value={task.target_version || task.targetVersion}>
                            {task.target_version || task.targetVersion} (נוכחית)
                          </option>
                        )}
                      <option value="__NEW__">+ צור גרסה חדשה...</option>
                    </select>
                    {onOpenVersionManager && (
                      <button
                        type="button"
                        className="icon-btn xs"
                        onClick={onOpenVersionManager}
                        title="פתח ניהול גרסאות מלא"
                      >
                        <Settings size={13} />
                      </button>
                    )}
                  </div>
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
                      title="תאריך יעד שחרור"
                      value={newVersionDate}
                      onChange={(e) => setNewVersionDate(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn primary xs"
                      disabled={!newVersionName.trim()}
                      onClick={handleQuickCreateVersion}
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

            {projects.length > 0 && (
              <div className="prop-row">
                <span className="prop-label">פרויקט</span>
                <div className="prop-value">
                  <select
                    className="field prop-select"
                    value={task.project_id || task.projectId}
                    onChange={(e) => {
                      const pid = Number(e.target.value);
                      const targetProj = projects.find((p) => p.id === pid);
                      patch({
                        projectId: pid,
                        project_id: pid,
                        teamId: targetProj ? (targetProj.team_id || targetProj.teamId) : task.teamId,
                        team_id: targetProj ? (targetProj.team_id || targetProj.teamId) : task.team_id,
                      });
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.key})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {teams.length > 0 && (
              <div className="prop-row">
                <span className="prop-label">צוות</span>
                <div className="prop-value">
                  <select
                    className="field prop-select"
                    value={task.team_id || task.teamId || ''}
                    onChange={(e) => {
                      const tid = e.target.value ? Number(e.target.value) : null;
                      patch({ teamId: tid, team_id: tid });
                    }}
                  >
                    <option value="">ללא שיוך צוות</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="prop-row">
              <span className="prop-label">{d.priority}</span>
              <div className="prop-value">
                <select
                  className="field prop-select"
                  value={task.priority}
                  onChange={(e) => patch({ priority: e.target.value as Priority })}
                >
                  {(Object.keys(he.priority) as Priority[]).map((p) => (
                    <option key={p} value={p}>
                      {he.priority[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="prop-row">
              <span className="prop-label">{d.assignee}</span>
              <div className="prop-value">
                <select
                  className="field prop-select"
                  value={task.assigneeId || task.assignee_id || ''}
                  onChange={(e) => {
                    const uid = e.target.value ? Number(e.target.value) : null;
                    const assignedUser = users.find((u) => u.id === uid);
                    const nowIso = new Date().toISOString();
                    const newEntry = assignedUser
                      ? `שויך לאחראי: ${assignedUser.name}`
                      : 'הוסר שיוך אחראי';
                    patch({
                      assigneeId: uid,
                      assignee_id: uid,
                      history: [...(task.history || []), { id: Date.now(), text: newEntry, created_at: nowIso } as any],
                    });
                  }}
                >
                  <option value="">{d.unassigned}</option>
                  {isCurrentInactive && (
                    <option value={currentAssignee!.id}>
                      {currentAssignee!.name} (עזב / לא פעיל)
                    </option>
                  )}
                  {activeUsers.map((u) => {
                    const uTeam = teams.find((t) => t.member_user_ids.includes(u.id));
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name} {uTeam ? `[${uTeam.name}]` : ''} {u.roleLabel || u.role ? `(${u.roleLabel || u.role})` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Minions ("מיניונים" - Co-assignees / Contributors) */}
            <div className="prop-row minions-prop-row">
              <span className="prop-label">
                <Users size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                מיניונים (שותפים)
              </span>
              <div className="prop-value minions-prop-value">
                {minionUsers.length > 0 && (
                  <div className="minions-pills-list">
                    {minionUsers.map((m) => (
                      <span key={m.id} className="minion-pill-item">
                        <Avatar name={m.name} size={18} />
                        <span className="minion-pill-name">{m.name}</span>
                        <button
                          type="button"
                          className="minion-remove-btn"
                          onClick={() => handleRemoveMinion(m.id)}
                          title={`הסר את ${m.name} מהמיניונים`}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {availableMinionUsers.length > 0 && (
                  <select
                    className="field prop-select minion-select-box"
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddMinion(Number(e.target.value));
                        e.target.value = '';
                      }
                    }}
                  >
                    <option value="" disabled>
                      + צרף מיניון / שותף למשימה...
                    </option>
                    {availableMinionUsers.map((u) => {
                      const uTeam = teams.find((t) => t.member_user_ids.includes(u.id));
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name} {uTeam ? `[${uTeam.name}]` : ''} ({u.roleLabel || u.role})
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>
            </div>

            <div className="prop-row">
              <span className="prop-label">תאריך התחלה</span>
              <div className="prop-value">
                <input
                  type="date"
                  className="field prop-date-input"
                  value={task.startDate || task.start_date || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    patch({ startDate: val, start_date: val });
                  }}
                />
              </div>
            </div>

            <div className="prop-row">
              <span className="prop-label">{d.due}</span>
              <div className="prop-value">
                <input
                  type="date"
                  className="field prop-date-input"
                  value={task.dueDate || task.due_date || ''}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    patch({ dueDate: val, due_date: val });
                  }}
                />
              </div>
            </div>

            {/* Creation Date (Automatic & Read-only) */}
            <div className="prop-row">
              <span className="prop-label">
                <Calendar size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                תאריך יצירה
              </span>
              <div className="prop-value">
                <div className="readonly-date-pill" title="תאריך יצירה נקבע אוטומטית בעת פתיחת המשימה ואינו ניתן לשינוי ידני">
                  <Calendar size={13} />
                  <span>{task.created_at || 'היום'}</span>
                  <span className="auto-pill-badge">אוטומטי</span>
                </div>
              </div>
            </div>

            {/* Actual Completion Date (Automatic & Read-only For Completed Tasks) */}
            {(isCompletedColumn || task.completed_at || task.completedAt) && (
              <div className="prop-row actual-completion-row">
                <span className="prop-label" style={{ color: '#10B981', fontWeight: 600 }}>
                  <CheckCircle2 size={13} style={{ verticalAlign: 'middle', marginInlineEnd: 4 }} />
                  תאריך סיום בפועל (הושלם)
                </span>
                <div className="prop-value">
                  <div
                    className="readonly-date-pill completed-date-badge"
                    title="תאריך סיום בפועל מתועד אוטומטית בהעברה לעמודת הושלם ואינו ניתן לשינוי ידני"
                  >
                    <CheckCircle2 size={13} color="#10B981" />
                    <span>{task.completed_at || task.completedAt}</span>
                    <span className="auto-pill-badge completed">אוטומטי</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Subtasks Section */}
          <div className="drawer-section">
            <div className="section-head">
              <div className="subtasks-header-info">
                <CheckSquare size={16} />
                <span className="section-title">{d.subtasks}</span>
                {subtasks.length > 0 && (
                  <span className="subtasks-count-pill">
                    {completedSubtasks}/{subtasks.length}
                  </span>
                )}
                {currentColumn && (
                  <span
                    className="subtask-env-badge"
                    title="סטטוס תת-המשימות נשמר ייעודית לסביבה זו. במעבר לסביבה חדשה הצ'קליסט מתאפס לבדיקה מחדש, ובחזרה משתחזר אוטומטית."
                  >
                    סביבה: {currentColumn.name}
                  </span>
                )}
              </div>
            </div>

            <div className="subtasks-env-info-bar">
              <span className="env-info-icon">🔄</span>
              {isCompletedColumn ? (
                <span>
                  סביבה נוכחית: <strong>{currentColumn?.name || 'הושלם'}</strong>. משימה זו הושלמה – תת-המשימות נשמרו בהתאם לבדיקות שבוצעו ללא איפוס.
                </span>
              ) : (
                <span>
                  סביבה נוכחית: <strong>{currentColumn?.name || 'נוכחית'}</strong>. במעבר בין סביבות בדיקה הצ'קליסט מתאפס לבדיקה מחדש, ובחזרה משתחזר אוטומטית. בהעברה ל"הושלם" הסטטוס נשמר.
                </span>
              )}
            </div>

            {subtasks.length > 0 && (
              <div className="drawer-subtasks-progress">
                <ProgressBar value={completedSubtasks} max={subtasks.length} height={6} />
              </div>
            )}

            <div className="subtasks-list">
              {subtasks.map((s) => {
                const isEditingThis = editingSubtaskId === s.id;
                return (
                  <div key={s.id} className={`subtask-item ${s.done ? 'is-done' : ''} ${isEditingThis ? 'is-editing' : ''}`}>
                    <button
                      type="button"
                      className="subtask-checkbox"
                      onClick={() => toggleSubtask(s.id)}
                      aria-label={s.done ? 'סמן כלא הושלם' : 'סמן כהושלם'}
                    >
                      {s.done ? <CheckCircle2 size={16} /> : <span className="custom-check-box" />}
                    </button>

                    {isEditingThis ? (
                      <div className="subtask-edit-row">
                        <input
                          dir="auto"
                          className="field subtask-edit-input"
                          value={editingSubtaskText}
                          onChange={(e) => setEditingSubtaskText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEditSubtask(s.id);
                            if (e.key === 'Escape') cancelEditSubtask();
                          }}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="btn primary xs"
                          onClick={() => saveEditSubtask(s.id)}
                          disabled={!editingSubtaskText.trim()}
                          title="שמור שינויים"
                        >
                          <Check size={12} />
                        </button>
                        <button
                          type="button"
                          className="btn ghost xs"
                          onClick={cancelEditSubtask}
                          title="ביטול"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="subtask-text-wrap">
                          <span
                            className="subtask-text"
                            dir="auto"
                            onDoubleClick={() => startEditSubtask(s)}
                            title="לחץ פעמיים לעריכה מהירה"
                          >
                            {s.text}
                          </span>

                          {/* Historical environment statuses */}
                          {(() => {
                            const curCId = task.column_id || task.columnId;
                            const otherCols = columns.filter(
                              (c) =>
                                c.id !== curCId &&
                                s.doneByColumn &&
                                s.doneByColumn[c.id] !== undefined
                            );
                            if (otherCols.length === 0) return null;
                            return (
                              <div
                                className="subtask-env-tags-list"
                                title={otherCols
                                  .map((c) => `${c.name}: ${s.doneByColumn![c.id] ? 'הושלם ✓' : 'לא הושלם ✗'}`)
                                  .join(' | ')}
                              >
                                {otherCols.map((c) => (
                                  <span
                                    key={c.id}
                                    className={`mini-env-tag ${s.doneByColumn![c.id] ? 'is-done' : 'is-pending'}`}
                                  >
                                    {c.name}: {s.doneByColumn![c.id] ? '✓' : '—'}
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                        </div>

                        <div className="subtask-actions">
                          <button
                            type="button"
                            className="subtask-action-btn"
                            onClick={() => startEditSubtask(s)}
                            title="ערוך תת-משימה"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            type="button"
                            className="subtask-del-btn"
                            onClick={() => deleteSubtask(s.id)}
                            title="הסר תת-משימה"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="add-subtask-row">
              <input
                dir="auto"
                className="field field-subtask"
                placeholder={d.subtaskPlaceholder}
                value={newSubtaskText}
                onChange={(e) => setNewSubtaskText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubtask();
                }}
              />
              <button
                type="button"
                className="btn secondary sm"
                onClick={handleAddSubtask}
                disabled={!newSubtaskText.trim()}
              >
                <Plus size={14} />
                <span>הוסף</span>
              </button>
            </div>
          </div>

          {/* Description Section */}
          <div className="drawer-section">
            <label className="section-title">{d.description}</label>
            <textarea
              dir="auto"
              className="field drawer-desc-textarea"
              rows={4}
              placeholder={d.descriptionPlaceholder}
              value={task.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </div>

          {/* Attachments Section */}
          <div className="drawer-section drawer-attachments-section">
            <div className="attachments-header-row">
              <div className="attachments-header-title">
                <Paperclip size={15} />
                <span className="section-title">קבצים ומסמכים מצורפים</span>
                {task.attachments && task.attachments.length > 0 && (
                  <span className="subtasks-count-pill">{task.attachments.length}</span>
                )}
              </div>
              <label className="btn-upload-file-label">
                <Plus size={13} />
                <span>צרף קובץ</span>
                <input
                  type="file"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleTaskFileUpload}
                />
              </label>
            </div>

            {task.attachments && task.attachments.length > 0 ? (
              <div className="attachments-grid">
                {task.attachments.map((att) => (
                  <div key={att.id} className="attachment-card">
                    <div className="attachment-card-left">
                      <span className="attachment-file-icon">
                        {getFileIcon(att.type, att.name)}
                      </span>
                      <div className="attachment-file-info">
                        <span className="attachment-filename" title={att.name}>
                          {att.name}
                        </span>
                        <span className="attachment-file-meta">
                          {formatFileSize(att.size)} • {new Date(att.uploaded_at).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                    </div>
                    <div className="attachment-card-actions">
                      <a
                        href={att.url}
                        download={att.name}
                        target="_blank"
                        rel="noreferrer"
                        className="icon-btn xs"
                        title="הורד קובץ"
                      >
                        <Download size={13} />
                      </a>
                      <button
                        type="button"
                        className="icon-btn xs text-danger"
                        onClick={() => handleDeleteTaskAttachment(att.id)}
                        title="מחק קובץ"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="attachments-empty-dropzone">
                <label className="dropzone-label">
                  <UploadCloud size={20} />
                  <span>לחץ כאן להעלאת קבצים למשימה (PDF, תמונות, מסמכים, זיפ)</span>
                  <input
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleTaskFileUpload}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Activity / Tabs Section */}
          <div className="drawer-section drawer-activity-section">
            <div className="drawer-tabs-header" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'comments'}
                className={`drawer-tab-btn ${activeTab === 'comments' ? 'active' : ''}`}
                onClick={() => setActiveTab('comments')}
              >
                <MessageSquare size={15} />
                <span>{d.comments} ({task.comments?.length || 0})</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'history'}
                className={`drawer-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <Clock size={15} />
                <span>{d.history}</span>
              </button>
            </div>

            {activeTab === 'comments' ? (
              <div className="comments-thread">
                <div className="comments-list">
                  {task.comments && task.comments.length > 0 ? (
                    task.comments.map((c) => {
                      const user = users.find((u) => u.id === (c.userId || c.user_id));
                      const isEditing = editingCommentId === c.id;
                      const commentTime = c.created_at || c.at;
                      const isAuthor = (c.userId || c.user_id) === activeUserId;
                      return (
                        <div className="comment-bubble" key={c.id}>
                          <Avatar name={user?.name || 'משתמש'} size={28} />
                          <div className="comment-body">
                            <div className="comment-author-row">
                              <div className="comment-author-meta">
                                <span className="comment-author">{user?.name || 'משתמש'}</span>
                                <span
                                  className="comment-time"
                                  title={commentTime ? new Date(commentTime).toLocaleString('he-IL') : ''}
                                >
                                  {formatRelativeTime(commentTime)}
                                </span>
                                {c.is_edited && (
                                  <span
                                    className="comment-edited-badge"
                                    title={c.updated_at ? `נערך: ${new Date(c.updated_at).toLocaleString('he-IL')}` : 'נערך'}
                                  >
                                    (נערך)
                                  </span>
                                )}
                              </div>
                              {/* Only the sender can edit or delete their own comment */}
                              {isAuthor && (
                                <div className="comment-actions-bar">
                                  {!isEditing && (
                                    <>
                                      <button
                                        type="button"
                                        className="icon-btn xs"
                                        onClick={() => startEditComment(c)}
                                        title="ערוך תגובה"
                                      >
                                        <Pencil size={12} />
                                      </button>
                                      <button
                                        type="button"
                                        className="icon-btn xs text-danger"
                                        onClick={() => deleteComment(c.id)}
                                        title="מחק תגובה"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {isEditing ? (
                              <div className="comment-edit-form">
                                <textarea
                                  dir="auto"
                                  className="field comment-edit-input"
                                  rows={2}
                                  value={editingCommentText}
                                  onChange={(e) => setEditingCommentText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) saveEditComment(c.id);
                                    if (e.key === 'Escape') cancelEditComment();
                                  }}
                                  autoFocus
                                />
                                <div className="comment-edit-actions">
                                  <button
                                    type="button"
                                    className="btn primary xs"
                                    onClick={() => saveEditComment(c.id)}
                                    disabled={!editingCommentText.trim()}
                                  >
                                    <Check size={12} />
                                    <span>שמור שינויים</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn ghost xs"
                                    onClick={cancelEditComment}
                                  >
                                    <X size={12} />
                                    <span>ביטול</span>
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="comment-text" dir="auto">
                                  {c.text}
                                </p>
                                {c.image_url && (
                                  <div className="comment-attached-media-wrap">
                                    <img
                                      src={c.image_url}
                                      alt={c.image_name || 'תמונה מצורפת'}
                                      className="comment-attached-image"
                                      onClick={() => window.open(c.image_url, '_blank')}
                                      title="לחץ לפתיחה בגודל מלא"
                                    />
                                    {c.image_name && (
                                      <span className="comment-image-caption">{c.image_name}</span>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-comments-text">אין עדיין תגובות. תהיו הראשונים להגיב!</p>
                  )}
                </div>

                <div className="comment-composer">
                  {commentImage && (
                    <div className="composer-image-preview-bar">
                      <div className="composer-preview-thumb">
                        <img src={commentImage.url} alt="תצוגה מקדימה" />
                      </div>
                      <span className="composer-preview-name">{commentImage.name}</span>
                      <button
                        type="button"
                        className="icon-btn xs text-danger"
                        onClick={() => setCommentImage(null)}
                        title="הסר תמונה"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  <textarea
                    dir="auto"
                    className="field comment-input"
                    rows={2}
                    placeholder={d.write}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendComment();
                    }}
                  />
                  <div className="composer-actions">
                    <div className="composer-tools-left">
                      <input
                        type="file"
                        ref={commentFileInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleCommentImageUpload}
                      />
                      <button
                        type="button"
                        className="btn ghost xs"
                        onClick={() => commentFileInputRef.current?.click()}
                        title="צרף תמונה לתגובה"
                      >
                        <ImageIcon size={14} />
                        <span>צרף תמונה</span>
                      </button>
                      <span className="composer-shortcut-hint">Ctrl+Enter לשליחה</span>
                    </div>

                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={sendComment}
                      disabled={!commentText.trim() && !commentImage}
                    >
                      <Send size={13} />
                      <span>{d.send}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <ul className="history-timeline">
                {task.history && task.history.length > 0 ? (
                  task.history.map((h, i) => {
                    const isObj = typeof h === 'object' && h !== null;
                    const text = isObj ? (h as any).text : String(h);
                    const histTime = isObj ? (h as any).created_at : (task.updated_at || task.created_at);
                    return (
                      <li key={i} className="history-entry">
                        <span className="history-bullet" />
                        <div className="history-content">
                          <span className="history-text">{text}</span>
                          <span
                            className="history-time"
                            title={histTime ? new Date(histTime).toLocaleString('he-IL') : ''}
                          >
                            {formatRelativeTime(histTime)}
                          </span>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="history-empty">{d.noHistory}</li>
                )}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}
